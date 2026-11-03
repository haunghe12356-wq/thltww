<?php

namespace App\Services;

use App\Mail\ContactMessageReplyMail;
use App\Models\ContactMessage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ContactMessageReplyMailer
{
    public function send(ContactMessage $contactMessage, string $reply): string
    {
        if (! $this->isConfigured()) {
            Log::warning('A contact reply was not sent because SMTP is not configured.', [
                'contact_message_id' => $contactMessage->id,
            ]);

            return 'not_configured';
        }

        try {
            Mail::to($contactMessage->email)->send(new ContactMessageReplyMail($contactMessage, $reply));

            return 'sent';
        } catch (Throwable) {
            Log::error('A contact reply email could not be sent.', [
                'contact_message_id' => $contactMessage->id,
            ]);

            return 'failed';
        }
    }

    private function isConfigured(): bool
    {
        $mailer = config('mail.mailers.smtp');
        $username = $mailer['username'] ?? null;
        $password = $mailer['password'] ?? null;

        return config('mail.default') === 'smtp'
            && filled($mailer['host'] ?? null)
            && filled(config('mail.from.address'))
            && (($username === null && $password === null) || (filled($username) && filled($password)));
    }
}
