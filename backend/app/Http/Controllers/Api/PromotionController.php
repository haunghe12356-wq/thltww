<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Promotion;
use App\Services\PromotionPricing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PromotionController extends Controller
{
    public function validateCode(Request $request, PromotionPricing $pricing): JsonResponse
    {
        $request->merge([
            'code' => is_string($request->input('code'))
                ? mb_strtoupper(trim($request->input('code')))
                : $request->input('code'),
        ]);
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);
        $promotion = Promotion::query()
            ->where('code', $data['code'])
            ->first();

        if (! $promotion) {
            throw ValidationException::withMessages([
                'code' => ['Mã khuyến mãi không hợp lệ hoặc đã ngừng áp dụng.'],
            ]);
        }

        $products = Product::query()
            ->whereIn('id', collect($data['items'])->pluck('product_id'))
            ->get()
            ->keyBy('id');
        if ($products->count() !== count($data['items'])) {
            throw ValidationException::withMessages([
                'items' => ['Một hoặc nhiều sản phẩm trong giỏ hàng không còn khả dụng.'],
            ]);
        }

        $subtotal = 0.0;
        $eligibleSubtotal = 0.0;
        $eligibleProductIds = $promotion->products()
            ->pluck('products.id')
            ->map(fn ($id): int => (int) $id)
            ->all();
        foreach ($data['items'] as $item) {
            $product = $products->get($item['product_id']);
            $unitPrice = $product->discountedPrice();
            $lineTotal = $unitPrice * $item['quantity'];
            $subtotal += $lineTotal;
            if ($eligibleProductIds === [] || in_array($product->id, $eligibleProductIds, true)) {
                $eligibleSubtotal += $lineTotal;
            }
        }

        $pricing->assertAvailable($promotion, $subtotal, 'code');
        $discountAmount = $pricing->discountAmount($promotion, $eligibleSubtotal, 'code');

        return response()->json([
            'data' => [
                'code' => $promotion->code,
                'discount_percent' => $promotion->discount_percent,
                'discount_amount' => $discountAmount,
                'subtotal' => round($subtotal, 2),
                'eligible_subtotal' => round($eligibleSubtotal, 2),
                'total' => round($subtotal - $discountAmount, 2),
            ],
        ]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
        ]);
        $query = Promotion::query()
            ->with('products:id,name')
            ->withCount(['orders as used_count' => fn (Builder $orders) => $orders->where('status', '!=', 'cancelled')])
            ->latest();

        if (! empty($filters['search'])) {
            $query->where('code', 'like', '%'.trim($filters['search']).'%');
        }

        if (($filters['status'] ?? null) === 'active') {
            $query->where('is_active', true);
        } elseif (($filters['status'] ?? null) === 'inactive') {
            $query->where('is_active', false);
        }

        $promotions = $query->paginate(min(max($request->integer('per_page', 10), 1), 100));

        return response()->json([
            'data' => $promotions->getCollection()->map(fn (Promotion $promotion): array => [
                ...$promotion->toArray(),
                'product_ids' => $promotion->products->pluck('id'),
            ]),
            'meta' => [
                'current_page' => $promotions->currentPage(),
                'last_page' => $promotions->lastPage(),
                'per_page' => $promotions->perPage(),
                'total' => $promotions->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedData($request);
        $productIds = $data['product_ids'];
        unset($data['product_ids']);
        $promotion = DB::transaction(function () use ($data, $productIds): Promotion {
            $promotion = Promotion::create($data);
            $promotion->products()->sync($productIds);

            return $promotion->load('products:id,name');
        });

        return response()->json(['data' => $promotion], 201);
    }

    public function update(Request $request, Promotion $promotion): JsonResponse
    {
        $data = $this->validatedData($request, $promotion);
        $productIds = $data['product_ids'];
        unset($data['product_ids']);
        DB::transaction(function () use ($promotion, $data, $productIds): void {
            $promotion->update($data);
            $promotion->products()->sync($productIds);
        });

        return response()->json(['data' => $promotion->refresh()->load('products:id,name')]);
    }

    public function destroy(Promotion $promotion): JsonResponse
    {
        $promotion->delete();

        return response()->json(['message' => 'Đã xóa mã khuyến mãi.']);
    }

    private function validatedData(Request $request, ?Promotion $promotion = null): array
    {
        $request->merge([
            'code' => is_string($request->input('code'))
                ? mb_strtoupper(trim($request->input('code')))
                : $request->input('code'),
        ]);

        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'alpha_dash',
                Rule::unique('promotions', 'code')->ignore($promotion?->id),
            ],
            'discount_percent' => ['required', 'integer', 'min:1', 'max:100'],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'minimum_order_amount' => ['nullable', 'numeric', 'min:0.01'],
            'maximum_discount_amount' => ['nullable', 'numeric', 'min:0.01'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'product_ids' => ['present', 'array'],
            'product_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('products', 'id')->whereNull('deleted_at'),
            ],
        ]);

        if (
            ! empty($data['starts_at'])
            && ! empty($data['ends_at'])
            && Carbon::parse($data['ends_at'])->lessThanOrEqualTo(Carbon::parse($data['starts_at']))
        ) {
            throw ValidationException::withMessages([
                'ends_at' => ['Thời gian kết thúc phải sau thời gian bắt đầu.'],
            ]);
        }

        return $data;
    }
}
