<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPromotionApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['admin.email' => 'admin@example.com']);
    }

    public function test_admin_can_create_update_search_and_delete_promotions(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;
        $this->withToken($token);
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 200000,
            'stock' => 5,
        ]);

        $this->postJson('/api/admin/promotions', [
            'code' => ' sale20 ',
            'discount_percent' => 20,
            'is_active' => true,
            'starts_at' => now()->addHour()->toISOString(),
            'ends_at' => now()->addDays(2)->toISOString(),
            'minimum_order_amount' => 300000,
            'maximum_discount_amount' => 50000,
            'usage_limit' => 10,
            'product_ids' => [$product->id],
        ])
            ->assertCreated()
            ->assertJsonPath('data.code', 'SALE20')
            ->assertJsonPath('data.discount_percent', 20)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.minimum_order_amount', '300000.00')
            ->assertJsonPath('data.maximum_discount_amount', '50000.00')
            ->assertJsonPath('data.usage_limit', 10)
            ->assertJsonPath('data.products.0.id', $product->id);

        $promotion = Promotion::query()->where('code', 'SALE20')->firstOrFail();
        $this->getJson('/api/admin/promotions?search=sale&status=active')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $promotion->id);

        $this->putJson("/api/admin/promotions/{$promotion->id}", [
            'code' => 'SALE25',
            'discount_percent' => 25,
            'is_active' => false,
            'starts_at' => null,
            'ends_at' => null,
            'minimum_order_amount' => null,
            'maximum_discount_amount' => null,
            'usage_limit' => null,
            'product_ids' => [],
        ])
            ->assertOk()
            ->assertJsonPath('data.code', 'SALE25')
            ->assertJsonPath('data.discount_percent', 25)
            ->assertJsonPath('data.is_active', false);

        $this->deleteJson("/api/admin/promotions/{$promotion->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Đã xóa mã khuyến mãi.');
        $this->assertDatabaseMissing('promotions', ['id' => $promotion->id]);
    }

    public function test_admin_cannot_create_duplicate_or_invalid_promotions(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/admin/promotions', [
            'code' => 'giam10',
            'discount_percent' => 10,
            'is_active' => true,
            'product_ids' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->withToken($token)->postJson('/api/admin/promotions', [
            'code' => 'BAD CODE',
            'discount_percent' => 101,
            'is_active' => true,
            'product_ids' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'discount_percent']);
    }

    public function test_admin_cannot_save_an_invalid_promotion_window(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/admin/promotions', [
            'code' => 'BADWINDOW',
            'discount_percent' => 10,
            'is_active' => true,
            'starts_at' => now()->addDays(2)->toISOString(),
            'ends_at' => now()->addDay()->toISOString(),
            'product_ids' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('ends_at');
    }

    public function test_non_admin_cannot_manage_promotions(): void
    {
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $token = $user->createToken('api-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/promotions')
            ->assertForbidden();
    }
}
