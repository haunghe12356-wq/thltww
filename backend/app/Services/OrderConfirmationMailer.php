<?php

namespace App\Services;

use App\Mail\OrderPaidMail;
use App\Models\Order;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class OrderConfirmationMailer
{
    public function send(Order $order): string
    {
        if (! $this->isConfigured()) {
            Log::warning('The order was paid, but SMTP is not configured; the confirmation email was not sent.', [
                'order_id' => $order->id,
            ]);

            return 'not_configured';
        }

        try {
            Mail::to($order->customer_email)->send(new OrderPaidMail($order));
            $order->update(['payment_email_sent_at' => now()]);

            return 'sent';
        } catch (Throwable) {
            Log::error('The order was paid, but its confirmation email could not be sent.', [
                'order_id' => $order->id,
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
