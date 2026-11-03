<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockTransaction;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function recordChanges(
        array $items,
        string $type,
        string $source,
        string $reason,
        ?int $createdBy = null,
        ?int $sourceId = null,
        ?string $reference = null,
        ?string $notes = null,
    ): StockTransaction {
        $transaction = StockTransaction::create([
            'type' => $type,
            'source' => $source,
            'source_id' => $sourceId,
            'reference' => $reference,
            'reason' => $reason,
            'notes' => $notes,
            'created_by' => $createdBy,
        ]);
        $productIds = collect($items)->pluck('product_id')->map(fn ($id): int => (int) $id)->sort()->values();
        $products = Product::withTrashed()
            ->whereIn('id', $productIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->unique()->count()) {
            throw ValidationException::withMessages([
                'items' => ['Một hoặc nhiều sản phẩm không còn tồn tại.'],
            ]);
        }

        foreach ($items as $item) {
            $product = $products->get((int) $item['product_id']);
            $quantity = (int) $item['quantity'];
            $stockBefore = (int) $product->stock;

            if ($type === 'out' && $stockBefore < $quantity) {
                throw ValidationException::withMessages([
                    'items' => ["Sản phẩm {$product->name} chỉ còn {$stockBefore} sản phẩm trong kho."],
                ]);
            }

            $stockAfter = $type === 'in'
                ? $stockBefore + $quantity
                : $stockBefore - $quantity;

            $product->update(['stock' => $stockAfter]);
            $transaction->items()->create([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
            ]);
        }

        if ($source === 'manual') {
            $prefix = $type === 'in' ? 'PN' : 'PX';
            $transaction->update([
                'document_code' => sprintf('%s-%s-%05d', $prefix, now()->format('Ymd'), $transaction->id),
            ]);
        }

        return $transaction->load(['items', 'creator']);
    }

    public function adjustStock(
        Product $product,
        int $targetStock,
        ?int $createdBy = null,
        string $reason = 'Điều chỉnh tồn kho từ quản lý sản phẩm',
    ): ?StockTransaction {
        $difference = $targetStock - (int) $product->stock;
        if ($difference === 0) {
            return null;
        }

        return $this->recordChanges(
            [['product_id' => $product->id, 'quantity' => abs($difference)]],
            $difference > 0 ? 'in' : 'out',
            'adjustment',
            $reason,
            $createdBy,
        );
    }
}
