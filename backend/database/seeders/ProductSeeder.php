<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Seed a development catalog without duplicating products on repeated runs.
     */
    public function run(): void
    {
        $inventory = app(InventoryService::class);
        $category = Category::active()->orderBy('sort_order')->first()
            ?? Category::firstOrCreate(
                ['slug' => 'ao-khoac'],
                [
                    'name' => 'Áo khoác',
                    'status' => 1,
                    'sort_order' => 0,
                ],
            );

        $products = [
            [
                'name' => 'Áo khoác da cổ điển',
                'description' => 'Áo khoác phong cách cổ điển, dễ phối đồ hằng ngày.',
                'price' => 1290000,
                'stock' => 12,
                'image' => 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
            ],
            [
                'name' => 'Áo khoác denim xanh',
                'description' => 'Áo khoác denim trẻ trung, phù hợp nhiều phong cách.',
                'price' => 790000,
                'stock' => 18,
                'image' => 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=80',
            ],
            [
                'name' => 'Áo khoác gió năng động',
                'description' => 'Chất liệu nhẹ, tiện dụng khi đi học và đi chơi.',
                'price' => 590000,
                'stock' => 20,
                'image' => 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=900&q=80',
            ],
            [
                'name' => 'Áo khoác bomber thời trang',
                'description' => 'Thiết kế bomber hiện đại với phom dáng thoải mái.',
                'price' => 890000,
                'stock' => 10,
                'image' => 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80',
            ],
            [
                'name' => 'Áo khoác hoodie nỉ',
                'description' => 'Hoodie nỉ mềm, giữ ấm tốt và phù hợp mặc hằng ngày.',
                'price' => 650000,
                'discount_percent' => 10,
                'stock' => 16,
                'image' => 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
            [
                'name' => 'Áo khoác blazer thanh lịch',
                'description' => 'Blazer phom gọn, phù hợp đi làm và các dịp gặp mặt.',
                'price' => 1150000,
                'stock' => 8,
                'image' => 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
            [
                'name' => 'Áo khoác cardigan len',
                'description' => 'Cardigan len nhẹ, dễ phối cùng trang phục thường ngày.',
                'price' => 520000,
                'stock' => 14,
                'image' => 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
            [
                'name' => 'Áo khoác parka chống gió',
                'description' => 'Parka có mũ, tiện dụng khi di chuyển trong thời tiết lạnh.',
                'price' => 980000,
                'stock' => 9,
                'image' => 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
            [
                'name' => 'Áo khoác kaki form rộng',
                'description' => 'Chất liệu kaki bền đẹp với kiểu dáng rộng thoải mái.',
                'price' => 720000,
                'stock' => 12,
                'image' => 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
            [
                'name' => 'Tai nghe Bluetooth chụp tai',
                'description' => 'Tai nghe không dây đệm tai êm, phù hợp nghe nhạc mỗi ngày.',
                'price' => 890000,
                'stock' => 20,
                'image' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'tai-nghe',
            ],
            [
                'name' => 'Tai nghe không dây thể thao',
                'description' => 'Thiết kế gọn nhẹ, tiện lợi khi tập luyện và di chuyển.',
                'price' => 590000,
                'discount_percent' => 15,
                'stock' => 25,
                'image' => 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'tai-nghe',
            ],
            [
                'name' => 'Tai nghe có dây âm thanh rõ',
                'description' => 'Tai nghe có dây dễ sử dụng, cho âm thanh rõ ràng.',
                'price' => 250000,
                'stock' => 30,
                'image' => 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'tai-nghe',
            ],
            [
                'name' => 'Tai nghe Bluetooth mini',
                'description' => 'Tai nghe Bluetooth nhỏ gọn, tiện mang theo bên mình.',
                'price' => 490000,
                'discount_percent' => 20,
                'stock' => 18,
                'image' => 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'tai-nghe',
            ],
            [
                'name' => 'Áo khoác gile tiện dụng',
                'description' => 'Áo gile nhẹ, dễ phối lớp và thuận tiện khi hoạt động.',
                'price' => 480000,
                'stock' => 11,
                'image' => 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
            [
                'name' => 'Áo khoác len dệt kim',
                'description' => 'Áo khoác dệt kim mềm mại, tạo cảm giác ấm áp và thoải mái.',
                'price' => 690000,
                'stock' => 13,
                'image' => 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
            [
                'name' => 'Áo khoác thể thao nhẹ',
                'description' => 'Áo khoác mỏng nhẹ, phù hợp đi bộ và các hoạt động ngoài trời.',
                'price' => 560000,
                'stock' => 17,
                'image' => 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80',
                'category_slug' => 'ao-khoac',
            ],
        ];

        foreach ($products as $product) {
            $productCategory = Category::active()
                ->where('slug', $product['category_slug'] ?? $category->slug)
                ->first() ?? $category;
            unset($product['category_slug']);

            $model = Product::firstOrCreate(
                ['name' => $product['name']],
                [
                    ...$product,
                    'category_id' => $productCategory->id,
                ],
            );
            if ($model->wasRecentlyCreated && $model->stock > 0) {
                $initialStock = (int) $model->stock;
                $model->update(['stock' => 0]);
                $inventory->recordChanges(
                    [['product_id' => $model->id, 'quantity' => $initialStock]],
                    'in',
                    'adjustment',
                    'Tồn kho ban đầu từ dữ liệu mẫu',
                );
            }
        }
    }
}
