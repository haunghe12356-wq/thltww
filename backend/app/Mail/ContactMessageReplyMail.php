<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactMessageReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ContactMessage $contactMessage,
        public string $reply,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Phản hồi liên hệ: {$this->contactMessage->subject}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contacts.reply');
    }
}
