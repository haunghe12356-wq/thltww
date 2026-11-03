<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_products_are_seeded_and_visible_in_the_catalog_api(): void
    {
        $this->seed(\Database\Seeders\ProductSeeder::class);

        $this->assertGreaterThan(0, Product::count());

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('data.0.category.name', 'Áo khoác');
    }

    public function test_demo_products_are_not_duplicated_when_the_seeder_runs_again(): void
    {
        $this->seed(\Database\Seeders\ProductSeeder::class);
        $count = Product::count();

        $this->seed(\Database\Seeders\ProductSeeder::class);

        $this->assertSame($count, Product::count());
    }
}
