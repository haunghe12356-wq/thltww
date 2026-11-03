<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMemberApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['admin.email' => 'admin@example.com']);
    }

    public function test_admin_can_list_search_and_filter_members_without_listing_admin(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $member = User::factory()->create([
            'name' => 'Nguyen Van A',
            'email' => 'member@example.com',
            'phone' => '0900000000',
        ]);
        User::factory()->create([
            'name' => 'Tran Van B',
            'email' => 'locked@example.com',
            'is_active' => false,
        ]);
        $token = $admin->createToken('api-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/members?search=Nguyen&status=active')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $member->id)
            ->assertJsonPath('data.0.is_active', true)
            ->assertJsonMissing(['email' => 'admin@example.com']);

        $this->withToken($token)->getJson('/api/admin/members?status=locked')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.email', 'locked@example.com');
    }

    public function test_admin_can_view_member_details_and_order_summary(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $member = User::factory()->create([
            'email' => 'member@example.com',
            'phone' => '0900000000',
            'address' => 'Ha Noi',
        ]);
        Order::create([
            'user_id' => $member->id,
            'customer_name' => $member->name,
            'customer_email' => $member->email,
            'customer_phone' => $member->phone,
            'address' => $member->address,
            'total' => 125000,
            'status' => 'paid',
            'payment_method' => 'cod',
        ]);
        $token = $admin->createToken('api-token')->plainTextToken;

        $this->withToken($token)->getJson("/api/admin/members/{$member->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $member->id)
            ->assertJsonPath('data.phone', '0900000000')
            ->assertJsonPath('data.address', 'Ha Noi')
            ->assertJsonPath('data.orders_count', 1)
            ->assertJsonPath('data.orders_total', 125000)
            ->assertJsonPath('data.orders.0.status', 'paid')
            ->assertJsonMissingPath('data.password');
    }

    public function test_admin_can_lock_and_unlock_member_and_lock_revokes_tokens_and_login(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $member = User::factory()->create([
            'email' => 'member@example.com',
            'password' => 'password123',
        ]);
        $adminToken = $admin->createToken('api-token')->plainTextToken;
        $memberToken = $member->createToken('api-token')->plainTextToken;

        $this->withToken($adminToken)
            ->patchJson("/api/admin/members/{$member->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->assertDatabaseCount('personal_access_tokens', 1);
        app('auth')->forgetGuards();
        $this->withToken($memberToken)->getJson('/api/user')->assertUnauthorized();
        $this->postJson('/api/login', [
            'email' => $member->email,
            'password' => 'password123',
        ])->assertForbidden()
            ->assertJsonPath('message', 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');

        $this->withToken($adminToken)
            ->patchJson("/api/admin/members/{$member->id}/status", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);
        $this->postJson('/api/login', [
            'email' => $member->email,
            'password' => 'password123',
        ])->assertOk();
    }

    public function test_admin_can_delete_member_without_deleting_order_history(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $member = User::factory()->create(['email' => 'member@example.com']);
        $order = Order::create([
            'user_id' => $member->id,
            'customer_name' => $member->name,
            'customer_email' => $member->email,
            'customer_phone' => '0900000000',
            'address' => 'Ha Noi',
            'total' => 125000,
            'status' => 'paid',
            'payment_method' => 'cod',
        ]);
        $token = $admin->createToken('api-token')->plainTextToken;

        $this->withToken($token)->deleteJson("/api/admin/members/{$member->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Đã xóa tài khoản thành viên.');

        $this->assertDatabaseMissing('users', ['id' => $member->id]);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'user_id' => null,
            'customer_email' => 'member@example.com',
            'total' => '125000.00',
        ]);
    }

    public function test_non_admin_cannot_manage_members_and_admin_is_not_a_member_target(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $member = User::factory()->create(['email' => 'member@example.com']);
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $adminToken = $admin->createToken('api-token')->plainTextToken;
        $userToken = $user->createToken('api-token')->plainTextToken;

        $this->withToken($userToken)->getJson('/api/admin/members')->assertForbidden();
        app('auth')->forgetGuards();
        $this->withToken($adminToken)->getJson("/api/admin/members/{$admin->id}")->assertNotFound();
        app('auth')->forgetGuards();
        $this->withToken($adminToken)->deleteJson("/api/admin/members/{$admin->id}")->assertNotFound();
        $this->assertDatabaseHas('users', ['id' => $member->id]);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }
}
