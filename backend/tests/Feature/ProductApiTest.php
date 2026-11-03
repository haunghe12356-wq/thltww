<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_products_can_be_created_via_api(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-token')->plainTextToken;

        $category = Category::create([
            'name' => 'Điện tử',
            'slug' => 'dien-tu',
            'status' => 1,
            'sort_order' => 1,
        ]);

        $response = $this->withToken($token)->postJson('/api/products', [
            'name' => 'Laptop gaming',
            'description' => 'Laptop cao cấp cho game thủ',
            'price' => 24990000,
            'stock' => 8,
            'image' => 'https://example.com/laptop.jpg',
            'category_id' => $category->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('products', [
            'name' => 'Laptop gaming',
            'price' => '24990000.00',
            'stock' => 8,
            'category_id' => $category->id,
        ]);

        $response->assertJsonPath('data.name', 'Laptop gaming');
    }

    public function test_categories_can_be_created_updated_and_deleted_via_api(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-token')->plainTextToken;

        $createResponse = $this->withToken($token)->postJson('/api/categories', [
            'name' => 'Điện thoại',
            'slug' => 'dien-thoai',
            'description' => 'Thiết bị di động',
            'sort_order' => 1,
            'status' => 1,
        ]);

        $createResponse->assertCreated();
        $createResponse->assertJsonPath('data.name', 'Điện thoại');

        $category = Category::first();

        $updateResponse = $this->withToken($token)->putJson('/api/categories/' . $category->id, [
            'name' => 'Điện thoại mới',
            'slug' => 'dien-thoai-moi',
            'description' => 'Thiết bị di động mới',
            'sort_order' => 2,
            'status' => 1,
        ]);

        $updateResponse->assertOk();
        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Điện thoại mới',
            'slug' => 'dien-thoai-moi',
        ]);

        $deleteResponse = $this->withToken($token)->deleteJson('/api/categories/' . $category->id);

        $deleteResponse->assertOk();
        $this->assertDatabaseMissing('categories', [
            'id' => $category->id,
        ]);
    }
}
