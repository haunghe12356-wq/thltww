<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductReviewController extends Controller
{
    public function index(Product $product): JsonResponse
    {
        return response()->json([
            'data' => $product->reviews()
                ->where('is_approved', true)
                ->with('user:id,name')
                ->latest()
                ->get()
                ->map(fn (ProductReview $review) => [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'created_at' => $review->created_at,
                    'user' => ['name' => $review->user->name],
                ]),
        ]);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = $product->reviews()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [...$data, 'is_approved' => false],
        );
        $review->load('user:id,name');

        return response()->json([
            'data' => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'is_approved' => $review->is_approved,
                'created_at' => $review->created_at,
                'user' => ['name' => $review->user->name],
            ],
        ], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string', 'in:pending,approved,all'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'pending';
        $reviews = ProductReview::query()
            ->with(['product:id,name', 'user:id,name,email'])
            ->when(
                $filters['product_id'] ?? null,
                fn (Builder $query, int $productId) => $query->where('product_id', $productId),
            )
            ->when($status !== 'all', fn (Builder $query) => $query->where(
                'is_approved',
                $status === 'approved',
            ))
            ->latest()
            ->paginate($filters['per_page'] ?? 10);

        return response()->json([
            'data' => $reviews->getCollection()->map(fn (ProductReview $review): array => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'is_approved' => $review->is_approved,
                'created_at' => $review->created_at,
                'user' => [
                    'id' => $review->user->id,
                    'name' => $review->user->name,
                    'email' => $review->user->email,
                ],
                'product' => [
                    'id' => $review->product->id,
                    'name' => $review->product->name,
                ],
            ]),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    public function updateApproval(Request $request, ProductReview $review): JsonResponse
    {
        $data = $request->validate([
            'is_approved' => ['required', 'boolean'],
        ]);
        $review->update($data);

        return response()->json([
            'message' => $review->is_approved ? 'Đã duyệt đánh giá.' : 'Đã ẩn đánh giá.',
            'data' => ['id' => $review->id, 'is_approved' => $review->is_approved],
        ]);
    }

    public function destroy(ProductReview $review): JsonResponse
    {
        $review->delete();

        return response()->json(['message' => 'Đã xóa đánh giá.']);
    }
}
