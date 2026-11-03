<?php

use App\Http\Controllers\Api\AdminMemberController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ContactMessageController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductReviewController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\VnpayPaymentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
Route::put('/user', [ProfileController::class, 'update'])->middleware('auth:sanctum');

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

Route::get('/brands', [BrandController::class, 'publicIndex']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/products/{product}/reviews', [ProductReviewController::class, 'index']);
Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{slug}', [ArticleController::class, 'show']);
Route::post('/contact-messages', [ContactMessageController::class, 'store']);
Route::post('/orders', [OrderController::class, 'store']);
Route::post('/promotions/validate', [PromotionController::class, 'validateCode']);
Route::post('/payments/vnpay/ipn', [VnpayPaymentController::class, 'ipn']);
Route::get('/payments/vnpay/return', [VnpayPaymentController::class, 'return']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'admin'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::post('/inventory/receipts', [InventoryController::class, 'receive']);
        Route::post('/inventory/issues', [InventoryController::class, 'issue']);

        Route::get('/reviews', [ProductReviewController::class, 'adminIndex']);
        Route::patch('/reviews/{review}/approval', [ProductReviewController::class, 'updateApproval']);
        Route::delete('/reviews/{review}', [ProductReviewController::class, 'destroy']);

        Route::get('/promotions', [PromotionController::class, 'adminIndex']);
        Route::post('/promotions', [PromotionController::class, 'store']);
        Route::put('/promotions/{promotion}', [PromotionController::class, 'update']);
        Route::delete('/promotions/{promotion}', [PromotionController::class, 'destroy']);
        Route::get('/members', [AdminMemberController::class, 'index']);
        Route::get('/members/{member}', [AdminMemberController::class, 'show']);
        Route::patch('/members/{member}/status', [AdminMemberController::class, 'updateStatus']);
        Route::delete('/members/{member}', [AdminMemberController::class, 'destroy']);
        Route::get('/orders', [OrderController::class, 'adminIndex']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateAdminStatus']);

        Route::get('/articles', [ArticleController::class, 'adminIndex']);
        Route::post('/articles', [ArticleController::class, 'store']);
        Route::put('/articles/{article}', [ArticleController::class, 'update']);
        Route::delete('/articles/{article}', [ArticleController::class, 'destroy']);

        Route::get('/contact-messages', [ContactMessageController::class, 'adminIndex']);
        Route::get('/contact-messages/{contactMessage}', [ContactMessageController::class, 'adminShow']);
        Route::patch('/contact-messages/{contactMessage}', [ContactMessageController::class, 'updateReadStatus']);
        Route::post('/contact-messages/{contactMessage}/reply', [ContactMessageController::class, 'reply']);
        Route::delete('/contact-messages/{contactMessage}', [ContactMessageController::class, 'destroy']);

        Route::post('/categories/{category}/restore', [CategoryController::class, 'restore']);
        Route::delete('/categories/{category}/force', [CategoryController::class, 'forceDestroy']);
        Route::get('/categories', [CategoryController::class, 'adminIndex']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::post('/brands/{brand}/restore', [BrandController::class, 'restore']);
        Route::delete('/brands/{brand}/force', [BrandController::class, 'forceDestroy']);
        Route::get('/brands', [BrandController::class, 'index']);
        Route::post('/brands', [BrandController::class, 'store']);
        Route::put('/brands/{brand}', [BrandController::class, 'update']);
        Route::delete('/brands/{brand}', [BrandController::class, 'destroy']);

        Route::post('/products/{product}/restore', [ProductController::class, 'restore']);
        Route::delete('/products/{product}/force', [ProductController::class, 'forceDestroy']);
        Route::get('/products', [ProductController::class, 'adminIndex']);
        Route::post('/products', [ProductController::class, 'adminStore']);
        Route::put('/products/{product}', [ProductController::class, 'adminUpdate']);
        Route::delete('/products/{product}', [ProductController::class, 'adminDestroy']);
    });

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::post('/products/{product}/reviews', [ProductReviewController::class, 'store']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
