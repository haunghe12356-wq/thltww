<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Request;

class VnpayPaymentService
{
    public function isConfigured(): bool
    {
        return filled(config('services.vnpay.tmn_code'))
            && filled(config('services.vnpay.hash_secret'))
            && filled(config('services.vnpay.return_url'))
            && filled(config('services.vnpay.ipn_url'));
    }

    public function createPaymentUrl(Order $order, Request $request): string
    {
        $parameters = [
            'vnp_Version' => '2.1.0',
            'vnp_Command' => 'pay',
            'vnp_TmnCode' => config('services.vnpay.tmn_code'),
            'vnp_Amount' => (string) ((int) round((float) $order->total * 100)),
            'vnp_CurrCode' => 'VND',
            'vnp_TxnRef' => $order->payment_reference,
            'vnp_OrderInfo' => "Thanh toan don hang #{$order->id}",
            'vnp_OrderType' => 'other',
            'vnp_Locale' => 'vn',
            'vnp_ReturnUrl' => config('services.vnpay.return_url'),
            'vnp_IpAddr' => $request->ip() ?? '127.0.0.1',
            'vnp_CreateDate' => now()->format('YmdHis'),
            'vnp_ExpireDate' => $order->payment_expires_at->format('YmdHis'),
        ];

        $query = $this->buildSignedQuery($parameters);
        $signature = hash_hmac('sha512', $query, config('services.vnpay.hash_secret'));

        return config('services.vnpay.payment_url').'?'.$query.'&vnp_SecureHash='.$signature;
    }

    public function hasValidSignature(array $parameters): bool
    {
        $providedSignature = $parameters['vnp_SecureHash'] ?? null;
        if (! is_string($providedSignature) || $providedSignature === '') {
            return false;
        }

        unset($parameters['vnp_SecureHash'], $parameters['vnp_SecureHashType']);
        $query = $this->buildSignedQuery($parameters);
        $expectedSignature = hash_hmac('sha512', $query, config('services.vnpay.hash_secret'));

        return hash_equals($expectedSignature, $providedSignature);
    }

    public function signParameters(array $parameters): string
    {
        unset($parameters['vnp_SecureHash'], $parameters['vnp_SecureHashType']);

        return hash_hmac(
            'sha512',
            $this->buildSignedQuery($parameters),
            config('services.vnpay.hash_secret'),
        );
    }

    private function buildSignedQuery(array $parameters): string
    {
        $parameters = array_filter(
            $parameters,
            fn ($value, $key) => str_starts_with((string) $key, 'vnp_')
                && is_scalar($value)
                && (string) $value !== '',
            ARRAY_FILTER_USE_BOTH,
        );
        ksort($parameters);

        return implode('&', array_map(
            fn ($key, $value) => urlencode((string) $key).'='.urlencode((string) $value),
            array_keys($parameters),
            array_values($parameters),
        ));
    }
}
