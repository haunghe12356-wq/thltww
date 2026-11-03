<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Promotion;
use Illuminate\Validation\ValidationException;

class PromotionPricing
{
    public function assertAvailable(Promotion $promotion, float $subtotal, string $field): void
    {
        $message = match (true) {
            ! $promotion->is_active => 'Mã khuyến mãi không hợp lệ hoặc đã ngừng áp dụng.',
            $promotion->starts_at && $promotion->starts_at->isFuture() => 'Mã khuyến mãi chưa đến thời gian áp dụng.',
            $promotion->ends_at && $promotion->ends_at->isPast() => 'Mã khuyến mãi đã hết hạn.',
            $promotion->minimum_order_amount !== null
                && $subtotal < (float) $promotion->minimum_order_amount => 'Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã.',
            $promotion->usage_limit !== null
                && Order::query()
                    ->where('promotion_id', $promotion->id)
                    ->where('status', '!=', 'cancelled')
                    ->count() >= $promotion->usage_limit => 'Mã khuyến mãi đã hết lượt sử dụng.',
            default => null,
        };

        if ($message !== null) {
            throw ValidationException::withMessages([$field => [$message]]);
        }
    }

    public function discountAmount(Promotion $promotion, float $eligibleSubtotal, string $field): float
    {
        if ($eligibleSubtotal <= 0) {
            throw ValidationException::withMessages([
                $field => ['Mã khuyến mãi không áp dụng cho sản phẩm trong giỏ hàng.'],
            ]);
        }

        $discount = round($eligibleSubtotal * $promotion->discount_percent / 100, 2);
        if ($promotion->maximum_discount_amount !== null) {
            $discount = min($discount, (float) $promotion->maximum_discount_amount);
        }

        return $discount;
    }
}
