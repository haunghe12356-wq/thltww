<?php

namespace Tests\Feature;

use App\Mail\ContactMessageReplyMail;
use App\Models\Article;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminContentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_update_publish_and_delete_articles(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;
        $publishedCount = Article::published()->count();

        $createResponse = $this->withToken($token)->postJson('/api/admin/articles', [
            'title' => 'Bài viết thử nghiệm',
            'slug' => 'bai-viet-thu-nghiem',
            'summary' => 'Tóm tắt bài viết.',
            'category' => 'Hướng dẫn',
            'body' => ['Đoạn nội dung thứ nhất.', 'Đoạn nội dung thứ hai.'],
            'published' => false,
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.published', false);
        $articleId = $createResponse->json('data.id');

        $this->getJson('/api/admin/articles')
            ->assertOk()
            ->assertJsonPath('data.0.id', $articleId)
            ->assertJsonPath('meta.total', $publishedCount + 1);
        $this->getJson('/api/articles')->assertOk()->assertJsonCount($publishedCount, 'data');

        $this->putJson("/api/admin/articles/{$articleId}", [
            'title' => 'Bài viết đã xuất bản',
            'slug' => 'bai-viet-da-xuat-ban',
            'summary' => 'Tóm tắt đã cập nhật.',
            'category' => 'Tư vấn',
            'body' => ['Nội dung mới.'],
            'published' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.published', true)
            ->assertJsonPath('data.body.0', 'Nội dung mới.');

        $this->getJson('/api/articles')
            ->assertOk()
            ->assertJsonCount($publishedCount + 1, 'data');
        $this->getJson('/api/articles/bai-viet-da-xuat-ban')
            ->assertOk()
            ->assertJsonPath('data.title', 'Bài viết đã xuất bản');

        $this->deleteJson("/api/admin/articles/{$articleId}")->assertOk();
        $this->assertDatabaseMissing('articles', ['id' => $articleId]);
    }

    public function test_admin_can_review_update_and_delete_contact_messages(): void
    {
        config(['admin.email' => 'admin@example.com']);
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.example.com',
            'mail.mailers.smtp.username' => 'merchant@example.com',
            'mail.mailers.smtp.password' => 'test-password',
            'mail.from.address' => 'merchant@example.com',
        ]);
        Mail::fake();
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $token = $admin->createToken('api-token')->plainTextToken;

        $this->postJson('/api/contact-messages', [
            'name' => 'Nguyen Van A',
            'email' => 'a@example.com',
            'phone' => '0900000000',
            'subject' => 'Can tu van',
            'message' => 'Xin tu van san pham.',
        ])->assertCreated();

        $contact = ContactMessage::firstOrFail();
        $this->withToken($token)
            ->getJson('/api/admin/contact-messages')
            ->assertOk()
            ->assertJsonPath('data.0.id', $contact->id)
            ->assertJsonPath('data.0.is_read', false);

        $this->getJson("/api/admin/contact-messages/{$contact->id}")
            ->assertOk()
            ->assertJsonPath('data.subject', 'Can tu van')
            ->assertJsonPath('data.message', 'Xin tu van san pham.');

        $this->patchJson("/api/admin/contact-messages/{$contact->id}", ['is_read' => true])
            ->assertOk()
            ->assertJsonPath('data.is_read', true);

        $this->postJson("/api/admin/contact-messages/{$contact->id}/reply", [
            'reply' => 'Chúng tôi sẵn sàng tư vấn cho bạn.',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Đã gửi phản hồi qua email.')
            ->assertJsonPath('data.admin_reply', 'Chúng tôi sẵn sàng tư vấn cho bạn.')
            ->assertJsonPath('data.is_read', true);
        $this->assertDatabaseHas('contact_messages', [
            'id' => $contact->id,
            'admin_reply' => 'Chúng tôi sẵn sàng tư vấn cho bạn.',
        ]);
        Mail::assertSent(ContactMessageReplyMail::class, fn (ContactMessageReplyMail $mail): bool => $mail->contactMessage->id === $contact->id
            && $mail->reply === 'Chúng tôi sẵn sàng tư vấn cho bạn.'
        );

        $this->deleteJson("/api/admin/contact-messages/{$contact->id}")->assertOk();
        $this->assertDatabaseMissing('contact_messages', ['id' => $contact->id]);
    }

    public function test_contact_reply_requires_configured_smtp_and_valid_content(): void
    {
        config(['admin.email' => 'admin@example.com', 'mail.default' => 'log']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $contact = ContactMessage::create([
            'name' => 'Nguyen Van A',
            'email' => 'a@example.com',
            'subject' => 'Can tu van',
            'message' => 'Xin tu van san pham.',
        ]);
        $token = $admin->createToken('api-token')->plainTextToken;
        $this->withToken($token)
            ->postJson("/api/admin/contact-messages/{$contact->id}/reply", ['reply' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reply');

        $this->withToken($token)
            ->postJson("/api/admin/contact-messages/{$contact->id}/reply", ['reply' => 'Phản hồi'])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Chưa cấu hình SMTP. Phản hồi chưa được gửi.');

        $this->assertDatabaseHas('contact_messages', [
            'id' => $contact->id,
            'admin_reply' => null,
            'replied_at' => null,
        ]);
    }

    public function test_non_admin_cannot_manage_articles_or_contact_messages(): void
    {
        config(['admin.email' => 'admin@example.com']);
        $user = User::factory()->create(['email' => 'customer@example.com']);
        $token = $user->createToken('api-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/articles')
            ->assertForbidden();
        $this->withToken($token)
            ->getJson('/api/admin/contact-messages')
            ->assertForbidden();
        $contact = ContactMessage::create([
            'name' => 'Nguyen Van A',
            'email' => 'a@example.com',
            'subject' => 'Can tu van',
            'message' => 'Xin tu van san pham.',
        ]);
        $this->getJson("/api/admin/contact-messages/{$contact->id}")
            ->assertForbidden();
        $this->postJson("/api/admin/contact-messages/{$contact->id}/reply", ['reply' => 'Phản hồi'])
            ->assertForbidden();

        Article::create([
            'title' => 'Bài viết',
            'slug' => 'bai-viet',
            'summary' => 'Tóm tắt',
            'category' => 'Tin tức',
            'body' => ['Nội dung'],
            'published' => true,
        ]);
        $this->getJson('/api/articles')
            ->assertOk()
            ->assertJsonCount(Article::published()->count(), 'data');
    }
}
