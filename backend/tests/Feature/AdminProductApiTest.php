<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_create_update_and_delete_products(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;
        $category = Category::create([
            'name' => 'Điện tử',
            'slug' => 'dien-tu',
            'status' => 1,
        ]);

        $createResponse = $this->withToken($token)->postJson('/api/admin/products', [
            'name' => 'Tai nghe X100',
            'description' => 'Tai nghe không dây',
            'price' => 450000,
            'discount_percent' => 20,
            'stock' => 15,
            'category_id' => $category->id,
        ]);

        $createResponse->assertCreated();
        $createResponse->assertJsonPath('data.discount_percent', 20)
            ->assertJsonPath('data.discounted_price', 360000);
        $productId = $createResponse->json('data.id');
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Tai nghe X100',
            'discount_percent' => 20,
        ]);
        $this->assertDatabaseHas('stock_transactions', [
            'source' => 'adjustment',
            'reason' => 'Tồn kho ban đầu khi tạo sản phẩm',
        ]);
        $this->assertDatabaseHas('products', ['id' => $productId, 'stock' => 15]);

        $this->getJson('/api/admin/products')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Tai nghe X100')
            ->assertJsonPath('meta.current_page', 1);

        $this->putJson("/api/admin/products/{$productId}", [
            'name' => 'Tai nghe X100 Pro',
            'price' => 550000,
            'discount_percent' => 10,
            'stock' => 12,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Tai nghe X100 Pro')
            ->assertJsonPath('data.discount_percent', 10)
            ->assertJsonPath('data.discounted_price', 495000)
            ->assertJsonPath('data.stock', 12);
        $this->assertDatabaseHas('stock_transactions', [
            'source' => 'adjustment',
            'type' => 'out',
            'reason' => 'Điều chỉnh tồn kho từ quản lý sản phẩm',
        ]);

        $this->deleteJson("/api/admin/products/{$productId}")
            ->assertOk();

        $this->assertDatabaseHas('products', ['id' => $productId]);
        $this->getJson('/api/admin/products?trashed=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $productId);

        $this->postJson("/api/admin/products/{$productId}/restore")
            ->assertOk();
        $this->assertDatabaseHas('products', ['id' => $productId, 'deleted_at' => null]);

        $this->deleteJson("/api/admin/products/{$productId}")
            ->assertOk();
        $this->deleteJson("/api/admin/products/{$productId}/force")
            ->assertOk();
        $this->assertDatabaseMissing('products', ['id' => $productId]);
    }

    public function test_non_admin_user_cannot_manage_products(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $token = $user->createToken('api-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/admin/products', [
                'name' => 'Unauthorized product',
                'price' => 100,
            ])
            ->assertForbidden();
    }
}
