<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ArticleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Article::published()->latest()->get(),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        return response()->json([
            'data' => Article::published()->where('slug', $slug)->firstOrFail(),
        ]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $articles = Article::query()->latest()->paginate(min(max($request->integer('per_page', 10), 1), 100));

        return response()->json([
            'data' => $articles->items(),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:articles,slug'],
            'summary' => ['required', 'string', 'max:500'],
            'category' => ['required', 'string', 'max:100'],
            'body' => ['required', 'array', 'min:1'],
            'body.*' => ['required', 'string', 'max:10000'],
            'published' => ['required', 'boolean'],
        ]);

        return response()->json(['data' => Article::create($data)], 201);
    }

    public function update(Request $request, Article $article): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('articles', 'slug')->ignore($article->id)],
            'summary' => ['required', 'string', 'max:500'],
            'category' => ['required', 'string', 'max:100'],
            'body' => ['required', 'array', 'min:1'],
            'body.*' => ['required', 'string', 'max:10000'],
            'published' => ['required', 'boolean'],
        ]);

        $article->update($data);

        return response()->json(['data' => $article->refresh()]);
    }

    public function destroy(Article $article): JsonResponse
    {
        $article->delete();

        return response()->json(['message' => 'Bài viết đã được xóa.']);
    }
}
