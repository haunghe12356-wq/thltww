<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    // GET /api/products
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0', 'gte:min_price'],
            'min_rating' => ['nullable', 'integer', 'between:1,5'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $products = Product::with(['category', 'brand'])
            ->withAvg(['reviews as reviews_avg_rating' => fn (Builder $query) => $query->where('is_approved', true)], 'rating')
            ->withCount(['reviews as reviews_count' => fn (Builder $query) => $query->where('is_approved', true)])
            ->when($filters['brand_id'] ?? null, fn (Builder $query, $brandId) => $query->where('brand_id', $brandId))
            ->when($filters['category_id'] ?? null, fn (Builder $query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($filters['min_price'] ?? null, fn (Builder $query, $price) => $query->where('price', '>=', $price))
            ->when($filters['max_price'] ?? null, fn (Builder $query, $price) => $query->where('price', '<=', $price))
            ->when($filters['search'] ?? null, fn (Builder $query, $search) => $query->where(
                fn (Builder $searchQuery) => $searchQuery
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%'),
            ))
            ->when($filters['min_rating'] ?? null, fn (Builder $query, $rating) => $query->whereRaw(
                'products.id IN (SELECT product_id FROM product_reviews WHERE is_approved = ? GROUP BY product_id HAVING AVG(rating) >= ?)',
                [true, (int) $rating],
            ))
            ->latest()
            ->paginate($filters['per_page'] ?? 100);

        return ProductResource::collection($products);
    }

    public function store(StoreProductRequest $request, InventoryService $inventory): ProductResource
    {
        $data = $request->validated();
        $initialStock = (int) ($data['stock'] ?? 0);
        $data['stock'] = 0;
        $product = DB::transaction(function () use ($data, $initialStock, $request, $inventory): Product {
            $product = Product::create($data);
            if ($initialStock > 0) {
                $inventory->recordChanges(
                    [['product_id' => $product->id, 'quantity' => $initialStock]],
                    'in',
                    'adjustment',
                    'Tồn kho ban đầu khi tạo sản phẩm',
                    $request->user()?->id,
                );
            }

            return $product;
        });
        $product->load(['category', 'brand']);

        return new ProductResource($product);
    }

    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        $query = Product::with(['category', 'brand'])
            ->when($request->boolean('trashed'), fn (Builder $query) => $query->onlyTrashed())
            ->latest();

        return ProductResource::collection(
            $query->paginate(min(max($request->integer('per_page', 10), 1), 100)),
        );
    }

    public function adminStore(StoreProductRequest $request, InventoryService $inventory): ProductResource
    {
        $data = $request->validated();
        $initialStock = (int) ($data['stock'] ?? 0);
        $data['stock'] = 0;
        $product = DB::transaction(function () use ($data, $initialStock, $request, $inventory): Product {
            $product = Product::create($data);
            if ($initialStock > 0) {
                $inventory->recordChanges(
                    [['product_id' => $product->id, 'quantity' => $initialStock]],
                    'in',
                    'adjustment',
                    'Tồn kho ban đầu khi tạo sản phẩm',
                    $request->user()->id,
                );
            }

            return $product;
        });
        $product->load(['category', 'brand']);

        return new ProductResource($product);
    }

    public function adminUpdate(Request $request, Product $product, InventoryService $inventory): ProductResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'discount_percent' => ['nullable', 'integer', 'between:1,99'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'image' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
        ]);

        DB::transaction(function () use ($product, $data, $request, $inventory): void {
            $lockedProduct = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $targetStock = isset($data['stock']) ? (int) $data['stock'] : (int) $lockedProduct->stock;
            unset($data['stock']);
            $lockedProduct->update($data);
            $inventory->adjustStock($lockedProduct, $targetStock, $request->user()->id);
        });
        $product->refresh();
        $product->load(['category', 'brand']);

        return new ProductResource($product);
    }

    public function adminDestroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'message' => 'Sản phẩm đã được xóa.',
        ]);
    }

    public function restore(int $product): JsonResponse
    {
        $model = Product::onlyTrashed()->findOrFail($product);
        $model->restore();

        return response()->json(['message' => 'Sản phẩm đã được khôi phục.']);
    }

    public function forceDestroy(int $product): JsonResponse
    {
        $model = Product::onlyTrashed()->findOrFail($product);
        if ($model->orderItems()->exists()) {
            return response()->json([
                'message' => 'Không thể xóa vĩnh viễn sản phẩm đã xuất hiện trong đơn hàng.',
            ], 409);
        }

        $model->forceDelete();

        return response()->json(['message' => 'Sản phẩm đã được xóa vĩnh viễn.']);
    }

    // GET /api/products/{product}
    public function show(Product $product): ProductResource
    {
        $product->load(['category', 'brand'])
            ->loadAvg(['reviews as reviews_avg_rating' => fn (Builder $query) => $query->where('is_approved', true)], 'rating')
            ->loadCount(['reviews as reviews_count' => fn (Builder $query) => $query->where('is_approved', true)]);

        return new ProductResource($product);
    }
}
