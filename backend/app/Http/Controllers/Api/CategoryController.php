<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Database\Eloquent\Builder;

class CategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $categories = Category::active()
            ->whereNull('parent_id')
            ->with(['children' => fn ($q) => $q->active()])
            ->orderBy('sort_order')
            ->get();

        return CategoryResource::collection($categories);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $query = Category::query()
            ->withCount('products')
            ->when($request->boolean('trashed'), fn (Builder $query) => $query->onlyTrashed())
            ->orderBy('sort_order')
            ->orderBy('name');

        $categories = $query->paginate(min(max($request->integer('per_page', 10), 1), 100));
        $categories->through(fn (Category $category) => [
            'id' => $category->id,
            'parent_id' => $category->parent_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'image' => $category->image,
            'sort_order' => $category->sort_order,
            'status' => $category->status,
            'products_count' => $category->products_count,
            'deleted_at' => $category->deleted_at,
        ]);

        return response()->json([
            'data' => $categories->items(),
            'meta' => [
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ],
        ]);
    }

    public function show(Category $category): CategoryResource
    {
        $category->load('children');

        return new CategoryResource($category);
    }

    public function store(Request $request): CategoryResource
    {
        $data = $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:categories,slug'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'integer', 'in:0,1'],
        ]);

        $category = Category::create(array_merge($data, [
            'status' => $data['status'] ?? 1,
            'sort_order' => $data['sort_order'] ?? 0,
        ]));

        return new CategoryResource($category);
    }

    public function update(Request $request, Category $category): CategoryResource
    {
        $data = $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:categories,slug,' . $category->id],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'integer', 'in:0,1'],
        ]);

        $category->update($data);

        return new CategoryResource($category->fresh());
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->delete();

        return response()->json([
            'message' => 'Danh mục đã được xóa',
            'deleted_id' => $category->id,
        ]);
    }

    public function restore(int $category): JsonResponse
    {
        $model = Category::onlyTrashed()->findOrFail($category);
        $model->restore();

        return response()->json(['message' => 'Danh mục đã được khôi phục.']);
    }

    public function forceDestroy(int $category): JsonResponse
    {
        $model = Category::onlyTrashed()->findOrFail($category);
        if (Category::withTrashed()->where('parent_id', $model->id)->exists()) {
            return response()->json([
                'message' => 'Hãy xóa vĩnh viễn các danh mục con trước.',
            ], 409);
        }

        $model->forceDelete();

        return response()->json(['message' => 'Danh mục đã được xóa vĩnh viễn.']);
    }
}