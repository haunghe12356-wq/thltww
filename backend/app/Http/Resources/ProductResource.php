<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'discount_percent' => $this->discount_percent === null ? null : (int) $this->discount_percent,
            'discounted_price' => $this->discount_percent ? $this->discountedPrice() : null,
            'stock' => $this->stock,
            'image' => $this->image,
            'rating' => (float) ($this->reviews_avg_rating ?? 0),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'brand' => [
                'id' => $this->brand?->id,
                'name' => $this->brand?->name,
            ],
            'category' => [
                'id' => $this->category?->id,
                'name' => $this->category?->name,
            ],
        ];
    }
}
