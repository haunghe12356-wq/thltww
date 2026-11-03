<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_registration_returns_a_user_and_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'new-user@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);

        $this->assertDatabaseHas('users', [
            'email' => 'new-user@example.com',
        ]);
    }

    public function test_api_registration_normalizes_email_and_reports_duplicate_email_in_vietnamese(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $this->postJson('/api/register', [
            'name' => '  New User  ',
            'email' => '  NEW@example.com ',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()
            ->assertJsonPath('user.name', 'New User')
            ->assertJsonPath('user.email', 'new@example.com');

        $this->postJson('/api/register', [
            'name' => 'Existing User',
            'email' => 'EXISTING@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'Địa chỉ email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.');
    }

    public function test_api_registration_requires_a_confirmed_eight_character_password(): void
    {
        $this->postJson('/api/register', [
            'name' => 'New User',
            'email' => 'new-user@example.com',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['password'])
            ->assertJsonPath('errors.password.0', 'Mật khẩu phải có ít nhất 8 ký tự.');
    }

    public function test_api_login_returns_a_token_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'existing-user@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);
    }

    public function test_api_login_rejects_invalid_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'missing-user@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertUnauthorized();
    }

    public function test_authenticated_user_can_update_customer_profile(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/user', [
            'name' => '  Nguyen Van A  ',
            'email' => '  NEW-EMAIL@example.com  ',
            'phone' => '0900000000',
            'address' => 'So 1, Ha Noi',
        ])->assertOk()
            ->assertJsonPath('name', 'Nguyen Van A')
            ->assertJsonPath('email', 'new-email@example.com')
            ->assertJsonPath('phone', '0900000000')
            ->assertJsonPath('address', 'So 1, Ha Noi');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'new-email@example.com',
            'phone' => '0900000000',
            'address' => 'So 1, Ha Noi',
        ]);
    }

    public function test_profile_email_must_be_unique(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create(['email' => 'taken@example.com']);
        $token = $user->createToken('api-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/user', [
            'name' => $user->name,
            'email' => $otherUser->email,
            'phone' => '',
            'address' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_api_allows_preflight_requests_from_the_frontend(): void
    {
        $response = $this->call('OPTIONS', '/api/register', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:3000',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type',
        ]);

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
}
