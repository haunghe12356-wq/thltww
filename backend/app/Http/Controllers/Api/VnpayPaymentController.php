<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InventoryService;
use App\Services\OrderConfirmationMailer;
use App\Services\VnpayPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VnpayPaymentController extends Controller
{
    public function ipn(
        Request $request,
        VnpayPaymentService $vnpay,
        OrderConfirmationMailer $confirmationMailer,
        InventoryService $inventory,
    ): JsonResponse {
        $parameters = $request->all();
        if (! $vnpay->isConfigured()
            || ! $vnpay->hasValidSignature($parameters)
            || ($parameters['vnp_TmnCode'] ?? null) !== config('services.vnpay.tmn_code')) {
            return $this->ipnResponse('97', 'Invalid signature');
        }

        $reference = $parameters['vnp_TxnRef'] ?? null;
        $amount = $parameters['vnp_Amount'] ?? null;
        if (! is_string($reference) || ! is_scalar($amount) || ! ctype_digit((string) $amount)) {
            return $this->ipnResponse('01', 'Order not found');
        }

        $result = DB::transaction(function () use ($parameters, $reference, $amount, $inventory): array {
            $order = Order::query()
                ->where('payment_reference', $reference)
                ->lockForUpdate()
                ->first();

            if (! $order) {
                return ['code' => '01', 'order' => null];
            }

            if ((int) $amount !== (int) round((float) $order->total * 100)) {
                return ['code' => '04', 'order' => null];
            }

            $paymentSucceeded = ($parameters['vnp_ResponseCode'] ?? null) === '00'
                && ($parameters['vnp_TransactionStatus'] ?? null) === '00';

            if ($order->status !== 'pending') {
                if ($order->status === 'cancelled' && $paymentSucceeded) {
                    $order->load('items.product');
                    $inventoryAvailable = $order->items->every(
                        fn ($item) => $item->product && $item->product->stock >= $item->quantity,
                    );

                    if ($inventoryAvailable) {
                        $inventory->recordChanges(
                            $order->items->map(fn ($item): array => [
                                'product_id' => $item->product_id,
                                'quantity' => $item->quantity,
                            ])->all(),
                            'out',
                            'payment_reconfirm',
                            "Xuất kho xác nhận thanh toán muộn đơn #{$order->id}",
                            sourceId: $order->id,
                            reference: (string) $order->id,
                        );
                    } else {
                        Log::warning('A late VNPay payment was confirmed after its stock reservation expired.', [
                            'order_id' => $order->id,
                        ]);
                    }

                    $order->update([
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);

                    return ['code' => '00', 'order' => $order->load('items.product')];
                }

                return [
                    'code' => '02',
                    'order' => $order->status === 'paid' ? $order->load('items.product') : null,
                ];
            }

            if ($paymentSucceeded) {
                $order->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                ]);

                return ['code' => '00', 'order' => $order->load('items.product')];
            }

            $order->load('items');
            $inventory->recordChanges(
                $order->items->map(fn ($item): array => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                ])->all(),
                'in',
                'payment_cancel',
                "Nhập lại kho do thanh toán thất bại đơn #{$order->id}",
                sourceId: $order->id,
                reference: (string) $order->id,
            );
            $order->update(['status' => 'cancelled']);

            return ['code' => '00', 'order' => null];
        });

        $order = $result['order'];
        if ($order && ! $order->payment_email_sent_at) {
            $confirmationMailer->send($order);
        }

        $message = match ($result['code']) {
            '00' => 'Confirm Success',
            '01' => 'Order not found',
            '02' => 'Order already confirmed',
            '04' => 'Invalid amount',
            default => 'Unknown error',
        };

        return $this->ipnResponse($result['code'], $message);
    }

    public function return(Request $request, VnpayPaymentService $vnpay): RedirectResponse
    {
        $parameters = $request->query();
        $validSignature = $vnpay->isConfigured()
            && $vnpay->hasValidSignature($parameters)
            && ($parameters['vnp_TmnCode'] ?? null) === config('services.vnpay.tmn_code');

        $paymentStatus = 'unverified';
        if ($validSignature) {
            $paymentStatus = ($parameters['vnp_ResponseCode'] ?? null) === '00'
                && ($parameters['vnp_TransactionStatus'] ?? null) === '00'
                    ? 'processing'
                    : 'failed';
        }

        $query = ['payment' => $paymentStatus];
        if (isset($parameters['vnp_TxnRef']) && is_string($parameters['vnp_TxnRef'])) {
            $orderId = Order::query()
                ->where('payment_reference', $parameters['vnp_TxnRef'])
                ->value('id');
            if ($orderId) {
                $query['order_id'] = $orderId;
            }
        }

        return redirect()->away(
            rtrim(config('services.vnpay.frontend_url'), '/').'/cart?'.http_build_query($query),
        );
    }

    private function ipnResponse(string $code, string $message): JsonResponse
    {
        return response()->json(['RspCode' => $code, 'Message' => $message]);
    }
}
