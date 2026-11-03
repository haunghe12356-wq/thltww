<?php

use App\Models\Promotion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->decimal('minimum_order_amount', 12, 2)->nullable();
            $table->decimal('maximum_discount_amount', 12, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
        });

        Schema::create('promotion_product', function (Blueprint $table) {
            $table->foreignId('promotion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['promotion_id', 'product_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('promotion_id')
                ->nullable()
                ->after('promo_code')
                ->constrained()
                ->nullOnDelete();
        });

        DB::table('orders')
            ->whereNotNull('promo_code')
            ->orderBy('id')
            ->chunkById(100, function ($orders): void {
                foreach ($orders as $order) {
                    $promotionId = Promotion::query()
                        ->where('code', strtoupper(trim($order->promo_code)))
                        ->value('id');
                    if ($promotionId) {
                        DB::table('orders')
                            ->where('id', $order->id)
                            ->update(['promotion_id' => $promotionId]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('promotion_id');
        });
        Schema::dropIfExists('promotion_product');
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn([
                'starts_at',
                'ends_at',
                'minimum_order_amount',
                'maximum_discount_amount',
                'usage_limit',
            ]);
        });
    }
};
