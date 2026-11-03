<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminInventoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['admin.email' => 'admin@example.com']);
    }

    public function test_admin_can_receive_and_issue_stock_and_view_inventory_history(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 200000,
            'stock' => 5,
        ]);
        $this->withToken($admin->createToken('api-token')->plainTextToken);

        $receipt = $this->postJson('/api/admin/inventory/receipts', [
            'reason' => 'Nhập hàng từ nhà cung cấp',
            'reference' => 'HD-001',
            'notes' => 'Lô hàng tháng 11',
            'items' => [['product_id' => $product->id, 'quantity' => 4]],
        ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'in')
            ->assertJsonPath('data.source', 'manual')
            ->assertJsonPath('data.items.0.stock_before', 5)
            ->assertJsonPath('data.items.0.stock_after', 9);
        $receiptCode = $receipt->json('data.document_code');

        $this->postJson('/api/admin/inventory/issues', [
            'reason' => 'Xuất hàng hư hỏng',
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
        ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'out')
            ->assertJsonPath('data.items.0.stock_before', 9)
            ->assertJsonPath('data.items.0.stock_after', 6);

        $this->getJson('/api/admin/inventory?per_page=10')
            ->assertOk()
            ->assertJsonPath('data.products.0.id', $product->id)
            ->assertJsonPath('data.products.0.stock', 6)
            ->assertJsonPath('data.transactions.0.type', 'out')
            ->assertJsonPath('data.transactions.1.document_code', $receiptCode)
            ->assertJsonPath('data.transactions.1.items.0.product_name', 'Tai nghe');

        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 6]);
    }

    public function test_stock_issue_cannot_exceed_inventory_and_batch_is_atomic(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $first = Product::create(['name' => 'Tai nghe', 'price' => 100000, 'stock' => 5]);
        $second = Product::create(['name' => 'Loa', 'price' => 200000, 'stock' => 2]);
        $this->withToken($admin->createToken('api-token')->plainTextToken);

        $this->postJson('/api/admin/inventory/issues', [
            'reason' => 'Xuất nhiều sản phẩm',
            'items' => [
                ['product_id' => $first->id, 'quantity' => 3],
                ['product_id' => $second->id, 'quantity' => 4],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->assertDatabaseHas('products', ['id' => $first->id, 'stock' => 5]);
        $this->assertDatabaseHas('products', ['id' => $second->id, 'stock' => 2]);
        $this->assertDatabaseCount('stock_transactions', 0);
    }

    public function test_non_admin_cannot_read_or_change_inventory(): void
    {
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $this->withToken($user->createToken('api-token')->plainTextToken);

        $this->getJson('/api/admin/inventory')->assertForbidden();
        $this->postJson('/api/admin/inventory/receipts', [
            'reason' => 'Nhập hàng',
            'items' => [],
        ])->assertForbidden();
    }
}
