<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_create_and_update_categories(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;

        $createResponse = $this->withToken($token)->postJson('/api/admin/categories', [
            'name' => 'Phụ kiện',
            'slug' => 'phu-kien',
            'description' => 'Phụ kiện điện tử',
            'sort_order' => 1,
            'status' => 1,
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Phụ kiện');
        $categoryId = $createResponse->json('data.id');

        $this->getJson('/api/admin/categories')
            ->assertOk()
            ->assertJsonPath('data.0.products_count', 0);

        $this->putJson("/api/admin/categories/{$categoryId}", [
            'name' => 'Phụ kiện mới',
            'slug' => 'phu-kien-moi',
            'description' => 'Danh mục đã cập nhật',
            'sort_order' => 2,
            'status' => 0,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Phụ kiện mới');

        $this->assertDatabaseHas('categories', [
            'id' => $categoryId,
            'name' => 'Phụ kiện mới',
            'slug' => 'phu-kien-moi',
            'status' => 0,
        ]);

        $this->deleteJson("/api/admin/categories/{$categoryId}")->assertOk();
        $this->getJson('/api/admin/categories?trashed=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $categoryId);
        $this->postJson("/api/admin/categories/{$categoryId}/restore")->assertOk();
        $this->deleteJson("/api/admin/categories/{$categoryId}")->assertOk();
        $this->deleteJson("/api/admin/categories/{$categoryId}/force")->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => $categoryId]);
    }

    public function test_non_admin_cannot_create_or_edit_categories(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $token = $user->createToken('api-token')->plainTextToken;
        $category = Category::create([
            'name' => 'Điện tử',
            'slug' => 'dien-tu',
            'status' => 1,
        ]);

        $this->withToken($token)
            ->postJson('/api/admin/categories', [
                'name' => 'Phụ kiện',
                'slug' => 'phu-kien',
            ])
            ->assertForbidden();

        $this->withToken($token)
            ->putJson("/api/admin/categories/{$category->id}", [
                'name' => 'Đã sửa trái phép',
                'slug' => 'da-sua-trai-phep',
            ])
            ->assertForbidden();
    }
}
