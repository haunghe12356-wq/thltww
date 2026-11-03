<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function publicIndex(): JsonResponse
    {
        return response()->json([
            'data' => Brand::query()
                ->where('status', 1)
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'logo', 'status']),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $brands = Brand::query()
            ->withCount('products')
            ->when($request->boolean('trashed'), fn (Builder $query) => $query->onlyTrashed())
            ->orderBy('name')
            ->paginate(min(max($request->integer('per_page', 10), 1), 100));

        return response()->json([
            'data' => $brands->items(),
            'meta' => [
                'current_page' => $brands->currentPage(),
                'last_page' => $brands->lastPage(),
                'per_page' => $brands->perPage(),
                'total' => $brands->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:brands,slug'],
            'description' => ['nullable', 'string'],
            'logo' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'integer', 'in:0,1'],
        ]);
        $brand = Brand::create(array_merge($data, ['status' => $data['status'] ?? 1]));

        return response()->json(['data' => $brand], 201);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('brands', 'slug')->ignore($brand->id)],
            'description' => ['nullable', 'string'],
            'logo' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'integer', 'in:0,1'],
        ]);
        $brand->update($data);

        return response()->json(['data' => $brand->fresh()]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brand->delete();

        return response()->json(['message' => 'Thương hiệu đã được chuyển vào thùng rác.']);
    }

    public function restore(int $brand): JsonResponse
    {
        Brand::onlyTrashed()->findOrFail($brand)->restore();

        return response()->json(['message' => 'Thương hiệu đã được khôi phục.']);
    }

    public function forceDestroy(int $brand): JsonResponse
    {
        Brand::onlyTrashed()->findOrFail($brand)->forceDelete();

        return response()->json(['message' => 'Thương hiệu đã được xóa vĩnh viễn.']);
    }
}
