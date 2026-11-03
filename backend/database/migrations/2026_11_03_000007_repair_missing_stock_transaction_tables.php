<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $createdTransactions = false;

        if (! Schema::hasTable('stock_transactions')) {
            Schema::create('stock_transactions', function (Blueprint $table) {
                $table->id();
                $table->string('document_code')->nullable()->unique();
                $table->string('type', 10);
                $table->string('source', 30);
                $table->unsignedBigInteger('source_id')->nullable();
                $table->string('reference')->nullable();
                $table->string('reason', 255);
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['source', 'source_id']);
                $table->index(['type', 'created_at']);
            });
            $createdTransactions = true;
        }

        if (! Schema::hasTable('stock_transaction_items')) {
            Schema::create('stock_transaction_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('stock_transaction_id')
                    ->constrained('stock_transactions')
                    ->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
                $table->string('product_name');
                $table->unsignedInteger('quantity');
                $table->unsignedInteger('stock_before');
                $table->unsignedInteger('stock_after');
                $table->timestamps();

                $table->index('product_id');
            });
        }

        if ($createdTransactions) {
            $products = DB::table('products')->where('stock', '>', 0)->get(['id', 'name', 'stock']);
            if ($products->isNotEmpty()) {
                $now = now();
                $transactionId = DB::table('stock_transactions')->insertGetId([
                    'document_code' => null,
                    'type' => 'in',
                    'source' => 'opening',
                    'reason' => 'Tồn kho ban đầu khi khôi phục bảng quản lý kho',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                foreach ($products as $product) {
                    DB::table('stock_transaction_items')->insert([
                        'stock_transaction_id' => $transactionId,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity' => $product->stock,
                        'stock_before' => 0,
                        'stock_after' => $product->stock,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }
    }

    public function down(): void {}
};
