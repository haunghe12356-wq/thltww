<?php

namespace Tests\Feature;

use App\Mail\OrderPaidMail;
use App\Models\Brand;
use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Promotion;
use App\Models\User;
use App\Services\VnpayPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StorefrontApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.vnpay.tmn_code' => 'TESTMERCHANT',
            'services.vnpay.hash_secret' => 'test-hash-secret',
            'services.vnpay.payment_url' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            'services.vnpay.return_url' => 'http://localhost/api/payments/vnpay/return',
            'services.vnpay.ipn_url' => 'http://localhost/api/payments/vnpay/ipn',
            'services.vnpay.frontend_url' => 'http://localhost:3000',
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.example.com',
            'mail.mailers.smtp.username' => 'merchant@example.com',
            'mail.mailers.smtp.password' => 'test-password',
            'mail.from.address' => 'merchant@example.com',
        ]);
    }

    public function test_contact_messages_can_be_submitted(): void
    {
        $response = $this->postJson('/api/contact-messages', [
            'name' => 'Nguyen Van A',
            'email' => 'a@example.com',
            'phone' => '0900000000',
            'subject' => 'Tu van san pham',
            'message' => 'Toi can duoc tu van.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('contact_messages', [
            'email' => 'a@example.com',
            'subject' => 'Tu van san pham',
        ]);
        $this->assertSame(1, ContactMessage::count());
    }

    public function test_catalog_returns_four_products_per_page_and_can_filter_by_brand(): void
    {
        $brand = Brand::create([
            'name' => 'VietNghe',
            'slug' => 'vietnghe',
            'status' => 1,
        ]);

        foreach (range(1, 5) as $number) {
            Product::create([
                'name' => "San pham {$number}",
                'price' => $number * 100000,
                'stock' => 5,
                'brand_id' => $number === 1 ? $brand->id : null,
            ]);
        }

        $this->getJson('/api/products?per_page=4')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.last_page', 2);

        $this->getJson("/api/products?brand_id={$brand->id}&per_page=4")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.brand.name', 'VietNghe');

        $this->getJson('/api/products?min_price=200000&max_price=200000&per_page=4')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'San pham 2');
    }

    public function test_guest_can_place_an_order_and_stock_is_decremented(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.total', 500000);
        $this->assertStringStartsWith(
            'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?',
            $response->json('data.payment_url'),
        );
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 3]);
        $this->assertDatabaseHas('orders', [
            'customer_email' => 'a@example.com',
            'total' => '500000.00',
            'user_id' => null,
        ]);
        $this->assertDatabaseHas('stock_transactions', [
            'source' => 'order',
            'type' => 'out',
            'source_id' => Order::query()->value('id'),
        ]);
    }

    public function test_guest_can_apply_giam10_and_order_total_is_discounted(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'promo_code' => 'giam10',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.promo_code', 'GIAM10')
            ->assertJsonPath('data.discount_amount', 50000)
            ->assertJsonPath('data.total', 450000);
        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'promo_code' => 'GIAM10',
            'discount_amount' => '50000.00',
            'total' => '450000.00',
        ]);
    }

    public function test_guest_can_validate_and_use_an_admin_managed_promotion(): void
    {
        Promotion::create([
            'code' => 'SALE25',
            'discount_percent' => 25,
            'is_active' => true,
        ]);
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 200000,
            'stock' => 5,
        ]);

        $this->postJson('/api/promotions/validate', [
            'code' => ' sale25 ',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])
            ->assertOk()
            ->assertJsonPath('data.code', 'SALE25')
            ->assertJsonPath('data.discount_percent', 25)
            ->assertJsonPath('data.discount_amount', 100000)
            ->assertJsonPath('data.total', 300000);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'promo_code' => 'sale25',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.promo_code', 'SALE25')
            ->assertJsonPath('data.discount_amount', 100000)
            ->assertJsonPath('data.total', 300000);
        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'promotion_id' => Promotion::query()->where('code', 'SALE25')->value('id'),
        ]);
    }

    public function test_inactive_promotion_cannot_be_validated_or_used_at_checkout(): void
    {
        Promotion::create([
            'code' => 'OFF20',
            'discount_percent' => 20,
            'is_active' => false,
        ]);
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 200000,
            'stock' => 5,
        ]);

        $this->postJson('/api/promotions/validate', [
            'code' => 'OFF20',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'promo_code' => 'OFF20',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('promo_code');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 5]);
    }

    public function test_promotion_conditions_are_priced_from_server_products_and_limited_at_checkout(): void
    {
        $eligibleProduct = Product::create([
            'name' => 'Tai nghe',
            'price' => 200000,
            'stock' => 5,
        ]);
        $excludedProduct = Product::create([
            'name' => 'Loa',
            'price' => 100000,
            'stock' => 5,
        ]);
        $promotion = Promotion::create([
            'code' => 'CONDITION20',
            'discount_percent' => 20,
            'is_active' => true,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addDay(),
            'minimum_order_amount' => 300000,
            'maximum_discount_amount' => 30000,
            'usage_limit' => 1,
        ]);
        $promotion->products()->attach($eligibleProduct->id);
        $items = [
            ['product_id' => $eligibleProduct->id, 'quantity' => 2],
            ['product_id' => $excludedProduct->id, 'quantity' => 1],
        ];

        $this->postJson('/api/promotions/validate', [
            'code' => 'CONDITION20',
            'items' => $items,
        ])
            ->assertOk()
            ->assertJsonPath('data.subtotal', 500000)
            ->assertJsonPath('data.eligible_subtotal', 400000)
            ->assertJsonPath('data.discount_amount', 30000)
            ->assertJsonPath('data.total', 470000);

        $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'promo_code' => 'CONDITION20',
            'items' => $items,
        ])
            ->assertCreated()
            ->assertJsonPath('data.discount_amount', 30000)
            ->assertJsonPath('data.total', 470000);

        $this->postJson('/api/promotions/validate', [
            'code' => 'CONDITION20',
            'items' => $items,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->assertDatabaseHas('orders', [
            'promotion_id' => $promotion->id,
            'promo_code' => 'CONDITION20',
            'total' => '470000.00',
        ]);
    }

    public function test_promotion_rejects_expired_codes_and_orders_below_minimum(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 200000,
            'stock' => 5,
        ]);
        Promotion::create([
            'code' => 'EXPIRED',
            'discount_percent' => 10,
            'is_active' => true,
            'ends_at' => now()->subMinute(),
        ]);
        Promotion::create([
            'code' => 'NOTSTARTED',
            'discount_percent' => 10,
            'is_active' => true,
            'starts_at' => now()->addDay(),
        ]);
        Promotion::create([
            'code' => 'MINIMUM',
            'discount_percent' => 10,
            'is_active' => true,
            'minimum_order_amount' => 300000,
        ]);
        $items = [['product_id' => $product->id, 'quantity' => 1]];

        foreach (['EXPIRED', 'NOTSTARTED', 'MINIMUM'] as $code) {
            $this->postJson('/api/promotions/validate', [
                'code' => $code,
                'items' => $items,
            ])->assertUnprocessable()
                ->assertJsonValidationErrors('code');

            $this->postJson('/api/orders', [
                'customer_name' => 'Nguyen Van A',
                'customer_email' => 'a@example.com',
                'customer_phone' => '0900000000',
                'address' => 'Ha Noi',
                'promo_code' => $code,
                'items' => $items,
            ])->assertUnprocessable()
                ->assertJsonValidationErrors('promo_code');
        }

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 5]);
    }

    public function test_product_scoped_promotion_rejects_a_cart_without_eligible_products(): void
    {
        $eligibleProduct = Product::create([
            'name' => 'Tai nghe',
            'price' => 200000,
            'stock' => 5,
        ]);
        $otherProduct = Product::create([
            'name' => 'Loa',
            'price' => 100000,
            'stock' => 5,
        ]);
        $promotion = Promotion::create([
            'code' => 'HEADPHONES',
            'discount_percent' => 10,
            'is_active' => true,
        ]);
        $promotion->products()->attach($eligibleProduct->id);

        $this->postJson('/api/promotions/validate', [
            'code' => 'HEADPHONES',
            'items' => [['product_id' => $otherProduct->id, 'quantity' => 1]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_guest_cannot_checkout_with_an_invalid_promo_code(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'promo_code' => 'NOTVALID',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('promo_code');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 5]);
    }

    public function test_authenticated_users_can_view_only_their_own_order_history(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);
        $order = Order::create([
            'user_id' => $user->id,
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 500000,
            'status' => 'paid',
            'payment_method' => 'demo',
            'paid_at' => now(),
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 250000,
        ]);
        Order::create([
            'user_id' => $otherUser->id,
            'customer_name' => $otherUser->name,
            'customer_email' => $otherUser->email,
            'customer_phone' => '0900000001',
            'address' => 'Ha Noi',
            'total' => 250000,
            'status' => 'paid',
            'payment_method' => 'demo',
        ]);

        $this->getJson('/api/orders')->assertUnauthorized();

        $token = $user->createToken('api-token')->plainTextToken;
        $this->withToken($token)->getJson('/api/orders')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.status', 'paid')
            ->assertJsonPath('data.0.payment_method', 'demo')
            ->assertJsonPath('data.0.items.0.product.name', 'Tai nghe')
            ->assertJsonMissing(['customer_email' => $otherUser->email]);
    }

    public function test_authenticated_users_can_view_details_of_only_their_own_orders(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);
        $order = Order::create([
            'user_id' => $user->id,
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 500000,
            'status' => 'paid',
            'payment_method' => 'cod',
            'paid_at' => now(),
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 250000,
        ]);
        $otherOrder = Order::create([
            'user_id' => $otherUser->id,
            'customer_name' => $otherUser->name,
            'customer_email' => $otherUser->email,
            'customer_phone' => '0900000001',
            'address' => 'Da Nang',
            'total' => 250000,
            'status' => 'pending',
            'payment_method' => 'cod',
        ]);

        $this->getJson("/api/orders/{$order->id}")->assertUnauthorized();

        $token = $user->createToken('api-token')->plainTextToken;
        $this->withToken($token)->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.customer_email', $user->email)
            ->assertJsonPath('data.customer_phone', '0900000000')
            ->assertJsonPath('data.address', 'Ha Noi')
            ->assertJsonPath('data.items.0.product.name', 'Tai nghe')
            ->assertJsonPath('data.items.0.quantity', 2);

        $this->withToken($token)->getJson("/api/orders/{$otherOrder->id}")->assertNotFound();
    }

    public function test_customer_can_cancel_their_pending_cod_order_and_restore_stock_once(): void
    {
        $user = User::factory()->create();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 3,
        ]);
        $order = Order::create([
            'user_id' => $user->id,
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 500000,
            'status' => 'pending',
            'payment_method' => 'cod',
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 250000,
        ]);

        $this->postJson("/api/orders/{$order->id}/cancel")->assertUnauthorized();

        $token = $user->createToken('api-token')->plainTextToken;
        $this->withToken($token)->postJson("/api/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);

        $this->withToken($token)->postJson("/api/orders/{$order->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('order');
        $this->assertSame(5, $product->fresh()->stock);
    }

    public function test_customer_cannot_cancel_another_users_order_or_a_paid_order(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 3,
        ]);
        $otherOrder = Order::create([
            'user_id' => $otherUser->id,
            'customer_name' => $otherUser->name,
            'customer_email' => $otherUser->email,
            'customer_phone' => '0900000001',
            'address' => 'Da Nang',
            'total' => 250000,
            'status' => 'pending',
            'payment_method' => 'cod',
        ]);
        $paidOrder = Order::create([
            'user_id' => $user->id,
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 250000,
            'status' => 'paid',
            'payment_method' => 'vnpay',
        ]);
        $paidOrder->items()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => 250000,
        ]);

        $token = $user->createToken('api-token')->plainTextToken;
        $this->withToken($token)->postJson("/api/orders/{$otherOrder->id}/cancel")
            ->assertNotFound();
        $this->withToken($token)->postJson("/api/orders/{$paidOrder->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('order');

        $this->assertSame(3, $product->fresh()->stock);
        $this->assertDatabaseHas('orders', ['id' => $paidOrder->id, 'status' => 'paid']);
    }

    public function test_authenticated_checkout_orders_are_linked_to_order_history(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-token')->plainTextToken;
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $orderResponse = $this->withToken($token)->postJson('/api/orders', [
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();

        $this->assertDatabaseHas('orders', [
            'id' => $orderResponse->json('data.id'),
            'user_id' => $user->id,
        ]);

        $this->withToken($token)->getJson('/api/orders')
            ->assertOk()
            ->assertJsonPath('data.0.id', $orderResponse->json('data.id'))
            ->assertJsonPath('data.0.items.0.product.name', 'Tai nghe');
    }

    public function test_vnpay_ipn_marks_an_order_paid_and_sends_one_confirmation_email(): void
    {
        Mail::fake();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $orderResponse = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertCreated();
        $order = Order::findOrFail($orderResponse->json('data.id'));

        $parameters = $this->signedVnpayParameters([
            'vnp_TmnCode' => 'TESTMERCHANT',
            'vnp_TxnRef' => $order->payment_reference,
            'vnp_Amount' => '50000000',
            'vnp_ResponseCode' => '00',
            'vnp_TransactionStatus' => '00',
        ]);

        $this->postJson('/api/payments/vnpay/ipn', $parameters)
            ->assertOk()
            ->assertJsonPath('RspCode', '00');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'paid',
        ]);
        $this->assertNotNull($order->fresh()->paid_at);
        $this->assertNotNull($order->fresh()->payment_email_sent_at);
        Mail::assertSent(OrderPaidMail::class, 1);

        $this->postJson('/api/payments/vnpay/ipn', $parameters)
            ->assertOk()
            ->assertJsonPath('RspCode', '02');
        Mail::assertSent(OrderPaidMail::class, 1);
    }

    public function test_failed_vnpay_payment_cancels_the_order_and_releases_stock(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $orderResponse = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertCreated();
        $order = Order::findOrFail($orderResponse->json('data.id'));

        $this->postJson('/api/payments/vnpay/ipn', $this->signedVnpayParameters([
            'vnp_TmnCode' => 'TESTMERCHANT',
            'vnp_TxnRef' => $order->payment_reference,
            'vnp_Amount' => '50000000',
            'vnp_ResponseCode' => '24',
            'vnp_TransactionStatus' => '02',
        ]))
            ->assertOk()
            ->assertJsonPath('RspCode', '00');

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);
    }

    public function test_expired_vnpay_checkout_cancels_the_order_and_releases_stock(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $orderResponse = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertCreated();
        $order = Order::findOrFail($orderResponse->json('data.id'));
        $order->update(['payment_expires_at' => now()->subMinute()]);

        $this->artisan('vnpay:expire-pending-orders')
            ->expectsOutput('Expired 1 pending VNPay order(s).')
            ->assertExitCode(0);

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);
    }

    public function test_vnpay_ipn_rejects_an_invalid_signature_without_changing_stock(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $orderResponse = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertCreated();
        $order = Order::findOrFail($orderResponse->json('data.id'));

        $this->postJson('/api/payments/vnpay/ipn', [
            'vnp_TmnCode' => 'TESTMERCHANT',
            'vnp_TxnRef' => $order->payment_reference,
            'vnp_Amount' => '50000000',
            'vnp_ResponseCode' => '00',
            'vnp_TransactionStatus' => '00',
            'vnp_SecureHash' => 'invalid',
        ])
            ->assertOk()
            ->assertJsonPath('RspCode', '97');

        $this->assertSame(3, $product->fresh()->stock);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending']);
    }

    public function test_vnpay_return_redirects_without_marking_the_order_paid(): void
    {
        Mail::fake();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $orderResponse = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();
        $order = Order::findOrFail($orderResponse->json('data.id'));

        $parameters = $this->signedVnpayParameters([
            'vnp_TmnCode' => 'TESTMERCHANT',
            'vnp_TxnRef' => $order->payment_reference,
            'vnp_Amount' => '25000000',
            'vnp_ResponseCode' => '00',
            'vnp_TransactionStatus' => '00',
        ]);

        $this->get('/api/payments/vnpay/return?'.http_build_query($parameters))
            ->assertRedirect("http://localhost:3000/cart?payment=processing&order_id={$order->id}");

        $this->assertSame('pending', $order->fresh()->status);
        Mail::assertNothingSent();
    }

    public function test_vnpay_payment_is_not_marked_as_emailed_when_mailer_only_logs(): void
    {
        config(['mail.default' => 'log']);
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $orderResponse = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();
        $order = Order::findOrFail($orderResponse->json('data.id'));

        $this->postJson('/api/payments/vnpay/ipn', $this->signedVnpayParameters([
            'vnp_TmnCode' => 'TESTMERCHANT',
            'vnp_TxnRef' => $order->payment_reference,
            'vnp_Amount' => '25000000',
            'vnp_ResponseCode' => '00',
            'vnp_TransactionStatus' => '00',
        ]))
            ->assertOk()
            ->assertJsonPath('RspCode', '00')
            ->assertJsonPath('Message', 'Confirm Success');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertNull($order->fresh()->payment_email_sent_at);
    }

    public function test_checkout_is_rejected_if_vnpay_is_not_configured(): void
    {
        config(['services.vnpay.tmn_code' => '', 'services.vnpay.hash_secret' => '']);

        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);

        $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertServiceUnavailable();

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_local_demo_checkout_marks_the_order_paid_and_emails_the_customer(): void
    {
        $this->app['env'] = 'local';
        config([
            'app.env' => 'local',
            'services.vnpay.demo_checkout_enabled' => true,
        ]);
        Mail::fake();
        $product = Product::create([
            'name' => 'Tai nghe demo',
            'price' => 250000,
            'stock' => 3,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'haunghe12356@gmail.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'payment_method' => 'momo',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment_mode', 'demo')
            ->assertJsonPath('data.payment_method', 'momo')
            ->assertJsonPath('data.payment_url', null)
            ->assertJsonPath('data.email_sent', true)
            ->assertJsonPath('data.confirmation_email', 'haunghe12356@gmail.com');

        $order = Order::findOrFail($response->json('data.id'));
        $this->assertNotNull($order->paid_at);
        $this->assertNotNull($order->payment_email_sent_at);
        $this->assertSame('momo', $order->payment_method);
        $this->assertSame(2, $product->fresh()->stock);
        Mail::assertSent(OrderPaidMail::class, function (OrderPaidMail $mail) {
            return $mail->hasTo('haunghe12356@gmail.com');
        });
    }

    public function test_demo_cash_on_delivery_stays_pending_and_sends_order_confirmation(): void
    {
        $this->app['env'] = 'local';
        config([
            'app.env' => 'local',
            'services.vnpay.demo_checkout_enabled' => true,
        ]);
        Mail::fake();
        $product = Product::create([
            'name' => 'Tai nghe COD',
            'price' => 250000,
            'stock' => 3,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_method', 'cod')
            ->assertJsonPath('data.payment_mode', 'demo')
            ->assertJsonPath('data.email_sent', true);

        $order = Order::findOrFail($response->json('data.id'));
        $this->assertNull($order->paid_at);
        Mail::assertSent(OrderPaidMail::class, fn (OrderPaidMail $mail) => $mail->hasTo('a@example.com'));
    }

    public function test_local_demo_checkout_does_not_claim_to_email_when_using_log_mailer(): void
    {
        $this->app['env'] = 'local';
        config([
            'app.env' => 'local',
            'services.vnpay.demo_checkout_enabled' => true,
            'mail.default' => 'log',
        ]);
        $product = Product::create([
            'name' => 'Tai nghe demo',
            'price' => 250000,
            'stock' => 3,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'haunghe12356@gmail.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment_mode', 'demo')
            ->assertJsonPath('data.email_sent', false)
            ->assertJsonPath('data.email_status', 'not_configured');

        $order = Order::findOrFail($response->json('data.id'));
        $this->assertNull($order->payment_email_sent_at);
    }

    public function test_local_demo_checkout_reports_smtp_delivery_failures(): void
    {
        $this->app['env'] = 'local';
        config([
            'app.env' => 'local',
            'services.vnpay.demo_checkout_enabled' => true,
        ]);
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('SMTP authentication failed'));
        $product = Product::create([
            'name' => 'Tai nghe demo',
            'price' => 250000,
            'stock' => 3,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'haunghe12356@gmail.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated()
            ->assertJsonPath('data.email_sent', false)
            ->assertJsonPath('data.email_status', 'failed');

        $this->assertNull(Order::findOrFail($response->json('data.id'))->payment_email_sent_at);
    }

    public function test_checkout_applies_the_product_discount(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe khuyến mãi',
            'price' => 250000,
            'discount_percent' => 20,
            'stock' => 5,
        ]);

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('data.0.discount_percent', 20)
            ->assertJsonPath('data.0.discounted_price', 200000);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        $response->assertCreated()->assertJsonPath('data.total', 400000);
        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => '200000.00',
        ]);
    }

    public function test_regular_product_creation_cannot_set_a_discount(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-token')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/products', [
            'name' => 'Tai nghe không khuyến mãi',
            'price' => 250000,
            'discount_percent' => 50,
        ]);

        $response->assertCreated()->assertJsonPath('data.discount_percent', null);
        $this->assertDatabaseHas('products', [
            'name' => 'Tai nghe không khuyến mãi',
            'discount_percent' => null,
        ]);
    }

    public function test_checkout_rejects_stock_shortage_without_creating_an_order(): void
    {
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 1,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van A',
            'customer_email' => 'a@example.com',
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        $response->assertUnprocessable();
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_new_product_reviews_wait_for_admin_approval_before_being_public(): void
    {
        $user = User::factory()->create();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);
        $token = $user->createToken('api-token')->plainTextToken;

        $reviewResponse = $this->withToken($token)->postJson("/api/products/{$product->id}/reviews", [
            'rating' => 4,
            'comment' => 'Tot.',
        ])->assertCreated()
            ->assertJsonPath('data.is_approved', false);

        $ratingResponse = $this->getJson('/api/products?min_rating=4&per_page=4');
        $ratingResponse
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->getJson("/api/products/{$product->id}/reviews")
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.rating', 0)
            ->assertJsonPath('data.reviews_count', 0);

        $this->assertSame(1, ProductReview::count());
        $this->assertDatabaseHas('product_reviews', [
            'id' => $reviewResponse->json('data.id'),
            'is_approved' => false,
        ]);
    }

    public function test_admin_can_approve_hide_and_delete_product_reviews(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $adminToken = $admin->createToken('api-token')->plainTextToken;
        $reviewer = User::factory()->create();
        $product = Product::create([
            'name' => 'Tai nghe',
            'price' => 250000,
            'stock' => 5,
        ]);
        $review = ProductReview::create([
            'product_id' => $product->id,
            'user_id' => $reviewer->id,
            'rating' => 4,
            'comment' => 'Tot.',
            'is_approved' => false,
        ]);

        $this->withToken($adminToken)->getJson('/api/admin/reviews?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.id', $review->id)
            ->assertJsonPath('data.0.product.name', 'Tai nghe')
            ->assertJsonPath('data.0.user.name', $reviewer->name)
            ->assertJsonPath('data.0.user.email', $reviewer->email);
        $this->withToken($adminToken)->getJson("/api/admin/reviews?status=pending&product_id={$product->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $review->id);
        $this->withToken($adminToken)->getJson('/api/admin/reviews?status=pending&product_id=999999')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('product_id');

        $this->patchJson("/api/admin/reviews/{$review->id}/approval", ['is_approved' => true])
            ->assertOk()
            ->assertJsonPath('data.is_approved', true);
        $this->getJson("/api/products/{$product->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.rating', 4)
            ->assertJsonPath('data.reviews_count', 1);

        $this->patchJson("/api/admin/reviews/{$review->id}/approval", ['is_approved' => false])
            ->assertOk()
            ->assertJsonPath('data.is_approved', false);
        $this->getJson("/api/products/{$product->id}/reviews")
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->deleteJson("/api/admin/reviews/{$review->id}")
            ->assertOk();
        $this->assertDatabaseMissing('product_reviews', ['id' => $review->id]);
    }

    public function test_non_admin_cannot_manage_product_reviews(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $token = $user->createToken('api-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/reviews')
            ->assertForbidden();
    }

    private function signedVnpayParameters(array $parameters): array
    {
        $parameters['vnp_SecureHash'] = app(VnpayPaymentService::class)->signParameters($parameters);

        return $parameters;
    }
}
