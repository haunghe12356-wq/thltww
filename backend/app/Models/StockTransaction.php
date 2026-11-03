<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransaction extends Model
{
    protected $fillable = [
        'document_code',
        'type',
        'source',
        'source_id',
        'reference',
        'reason',
        'notes',
        'created_by',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(StockTransactionItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
