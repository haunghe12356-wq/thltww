<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockTransaction;
use App\Services\InventoryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'stock_search' => ['nullable', 'string', 'max:255'],
            'movement_type' => ['nullable', 'string', 'in:in,out'],
            'stock_page' => ['nullable', 'integer', 'min:1'],
            'movement_page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $perPage = $filters['per_page'] ?? 10;

        $products = Product::query()
            ->when($filters['stock_search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $products) => $products
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('id', ctype_digit($search) ? (int) $search : 0),
            ))
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'stock_page', $filters['stock_page'] ?? 1);

        $transactions = StockTransaction::query()
            ->with(['items', 'creator'])
            ->when(
                $filters['movement_type'] ?? null,
                fn (Builder $query, string $type) => $query->where('type', $type),
            )
            ->latest()
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'movement_page', $filters['movement_page'] ?? 1);

        return response()->json([
            'data' => [
                'products' => $products->getCollection()->map(fn (Product $product): array => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'stock' => $product->stock,
                    'price' => $product->price,
                    'image' => $product->image,
                ]),
                'transactions' => $transactions->getCollection()->map(fn (StockTransaction $transaction): array => [
                    'id' => $transaction->id,
                    'document_code' => $transaction->document_code,
                    'type' => $transaction->type,
                    'source' => $transaction->source,
                    'source_id' => $transaction->source_id,
                    'reference' => $transaction->reference,
                    'reason' => $transaction->reason,
                    'notes' => $transaction->notes,
                    'created_by' => $transaction->creator?->name,
                    'created_at' => $transaction->created_at,
                    'items' => $transaction->items->map(fn ($item): array => [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'quantity' => $item->quantity,
                        'stock_before' => $item->stock_before,
                        'stock_after' => $item->stock_after,
                    ]),
                ]),
            ],
            'meta' => [
                'products' => [
                    'current_page' => $products->currentPage(),
                    'last_page' => $products->lastPage(),
                    'per_page' => $products->perPage(),
                    'total' => $products->total(),
                ],
                'transactions' => [
                    'current_page' => $transactions->currentPage(),
                    'last_page' => $transactions->lastPage(),
                    'per_page' => $transactions->perPage(),
                    'total' => $transactions->total(),
                ],
            ],
        ]);
    }

    public function receive(Request $request, InventoryService $inventory): JsonResponse
    {
        return $this->createTransaction($request, $inventory, 'in');
    }

    public function issue(Request $request, InventoryService $inventory): JsonResponse
    {
        return $this->createTransaction($request, $inventory, 'out');
    }

    private function createTransaction(Request $request, InventoryService $inventory, string $type): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
                'exists:products,id',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (Product::withTrashed()->whereKey($value)->whereNotNull('deleted_at')->exists()) {
                        $fail('Không thể thay đổi tồn kho của sản phẩm đã xóa.');
                    }
                },
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ]);

        $transaction = DB::transaction(fn (): StockTransaction => $inventory->recordChanges(
            $data['items'],
            $type,
            'manual',
            $data['reason'],
            $request->user()->id,
            reference: $data['reference'] ?? null,
            notes: $data['notes'] ?? null,
        ), attempts: 3);

        return response()->json([
            'message' => $type === 'in' ? 'Đã tạo phiếu nhập hàng.' : 'Đã tạo phiếu xuất hàng.',
            'data' => $transaction,
        ], 201);
    }
}
