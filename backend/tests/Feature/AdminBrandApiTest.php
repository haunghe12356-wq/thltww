<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBrandApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_brands_and_trash(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/admin/brands', [
            'name' => 'VietNghe',
            'slug' => 'vietnghe',
            'description' => 'Thương hiệu cửa hàng',
            'status' => 1,
        ])->assertCreated()->assertJsonPath('data.name', 'VietNghe');

        $brand = Brand::query()->where('slug', 'vietnghe')->firstOrFail();
        $this->getJson('/api/admin/brands?per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $brand->id)
            ->assertJsonPath('meta.per_page', 1);
        $this->putJson("/api/admin/brands/{$brand->id}", ['name' => 'VietNghe Pro'])
            ->assertOk()
            ->assertJsonPath('data.name', 'VietNghe Pro');

        $this->deleteJson("/api/admin/brands/{$brand->id}")->assertOk();
        $this->getJson('/api/admin/brands?trashed=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $brand->id);
        $this->postJson("/api/admin/brands/{$brand->id}/restore")->assertOk();
        $this->deleteJson("/api/admin/brands/{$brand->id}")->assertOk();
        $this->deleteJson("/api/admin/brands/{$brand->id}/force")->assertOk();
        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
    }
}
