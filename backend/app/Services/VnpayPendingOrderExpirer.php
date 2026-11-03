<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\DB;

class VnpayPendingOrderExpirer
{
    public function __construct(private InventoryService $inventory) {}

    public function expire(): int
    {
        $orderIds = Order::query()
            ->where('status', 'pending')
            ->whereNotNull('payment_expires_at')
            ->where('payment_expires_at', '<=', now())
            ->pluck('id');

        $expiredCount = 0;
        foreach ($orderIds as $orderId) {
            $expired = DB::transaction(function () use ($orderId): bool {
                $order = Order::query()
                    ->whereKey($orderId)
                    ->where('status', 'pending')
                    ->whereNotNull('payment_expires_at')
                    ->where('payment_expires_at', '<=', now())
                    ->lockForUpdate()
                    ->first();

                if (! $order) {
                    return false;
                }

                $order->load('items');
                $this->inventory->recordChanges(
                    $order->items->map(fn ($item): array => [
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                    ])->all(),
                    'in',
                    'payment_cancel',
                    "Nhập lại kho do hết hạn thanh toán đơn #{$order->id}",
                    sourceId: $order->id,
                    reference: (string) $order->id,
                );
                $order->update(['status' => 'cancelled']);

                return true;
            });

            $expiredCount += (int) $expired;
        }

        return $expiredCount;
    }
}
