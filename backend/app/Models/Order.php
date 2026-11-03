<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'total',
        'status',
        'address',
        'payment_method',
        'payment_reference',
        'payment_expires_at',
        'paid_at',
        'payment_email_sent_at',
        'promo_code',
        'promotion_id',
        'discount_amount',
    ];

    protected function casts(): array
    {
        return [
            'payment_expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'payment_email_sent_at' => 'datetime',
            'discount_amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }
}
