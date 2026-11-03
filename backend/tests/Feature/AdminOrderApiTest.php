<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOrderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['admin.email' => 'admin@example.com']);
    }

    public function test_admin_can_search_and_filter_orders(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;
        $order = Order::create([
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'customer@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 250000,
            'status' => 'pending',
            'payment_method' => 'cod',
        ]);
        Order::create([
            'customer_name' => 'Tran Van B',
            'customer_email' => 'other@example.com',
            'customer_phone' => '0900000001',
            'address' => 'Da Nang',
            'total' => 100000,
            'status' => 'paid',
            'payment_method' => 'vnpay',
        ]);

        $this->withToken($token)->getJson('/api/admin/orders?status=pending&search=Nguyen')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.customer_email', 'customer@example.com');
    }

    public function test_admin_can_update_order_status_and_cancellation_restores_stock(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 3,
        ]);
        $cancelledOrder = Order::create([
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'customer@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 500000,
            'status' => 'pending',
            'payment_method' => 'cod',
        ]);
        $cancelledOrder->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 250000,
        ]);
        $bankTransferOrder = Order::create([
            'customer_name' => 'Tran Van B',
            'customer_email' => 'other@example.com',
            'customer_phone' => '0900000001',
            'address' => 'Da Nang',
            'total' => 250000,
            'status' => 'pending',
            'payment_method' => 'bank_transfer',
        ]);

        $this->withToken($token)
            ->patchJson("/api/admin/orders/{$cancelledOrder->id}/status", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
        $this->assertSame(5, $product->fresh()->stock);
        $this->assertDatabaseHas('stock_transactions', [
            'source' => 'order_cancel',
            'source_id' => $cancelledOrder->id,
            'type' => 'in',
        ]);

        $this->withToken($token)
            ->patchJson("/api/admin/orders/{$bankTransferOrder->id}/status", ['status' => 'paid'])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');
        $this->assertNotNull($bankTransferOrder->fresh()->paid_at);

        $this->withToken($token)
            ->patchJson("/api/admin/orders/{$bankTransferOrder->id}/status", ['status' => 'shipped'])
            ->assertOk()
            ->assertJsonPath('data.status', 'shipped');

        $this->withToken($token)
            ->patchJson("/api/admin/orders/{$bankTransferOrder->id}/status", ['status' => 'cancelled'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_admin_cannot_manually_cancel_pending_vnpay_order(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;
        $order = Order::create([
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'customer@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 250000,
            'status' => 'pending',
            'payment_method' => 'vnpay',
        ]);

        $this->withToken($token)
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending']);
    }

    public function test_non_admin_cannot_manage_orders(): void
    {
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $token = $user->createToken('api-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/orders')->assertForbidden();
    }
}
