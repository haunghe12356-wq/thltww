<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Promotion;
use App\Services\InventoryService;
use App\Services\OrderConfirmationMailer;
use App\Services\PromotionPricing;
use App\Services\VnpayPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string', 'in:pending,paid,shipped,cancelled'],
            'search' => ['nullable', 'string', 'max:255'],
        ]);
        $query = Order::query()->with(['items.product'])->latest();

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($orders) use ($search): void {
                if (ctype_digit($search)) {
                    $orders->orWhere('id', (int) $search);
                }

                $orders->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $orders = $query->paginate(min(max($request->integer('per_page', 10), 1), 100));

        return response()->json([
            'data' => $orders->getCollection()->map(fn (Order $order): array => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'address' => $order->address,
                'promo_code' => $order->promo_code,
                'discount_amount' => (float) $order->discount_amount,
                'total' => $order->total,
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'paid_at' => $order->paid_at,
                'created_at' => $order->created_at,
                'items' => $order->items->map(fn ($item): array => [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'product' => $item->product ? [
                        'id' => $item->product->id,
                        'name' => $item->product->name,
                    ] : null,
                ]),
            ]),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function updateAdminStatus(Request $request, int $order, InventoryService $inventory): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:paid,shipped,cancelled'],
        ]);

        $order = DB::transaction(function () use ($order, $data, $request, $inventory): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($order);
            $nextStatus = $data['status'];
            $canTransition = match ($order->status) {
                'pending' => match ($nextStatus) {
                    'paid' => in_array($order->payment_method, ['cod', 'bank_transfer'], true),
                    'shipped' => $order->payment_method === 'cod',
                    'cancelled' => in_array($order->payment_method, ['cod', 'bank_transfer'], true),
                    default => false,
                },
                'paid' => $nextStatus === 'shipped',
                default => false,
            };

            if (! $canTransition) {
                throw ValidationException::withMessages([
                    'status' => ['Không thể chuyển đơn hàng từ trạng thái hiện tại sang trạng thái đã chọn.'],
                ]);
            }

            if ($nextStatus === 'cancelled') {
                $items = $order->items()->orderBy('product_id')->get();
                $inventory->recordChanges(
                    $items->map(fn ($item): array => [
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                    ])->all(),
                    'in',
                    'order_cancel',
                    "Hủy đơn hàng #{$order->id}",
                    $request->user()->id,
                    $order->id,
                    (string) $order->id,
                );
            }

            $order->update([
                'status' => $nextStatus,
                ...($nextStatus === 'paid' ? ['paid_at' => now()] : []),
            ]);

            return $order->refresh();
        }, attempts: 3);

        return response()->json([
            'data' => [
                'id' => $order->id,
                'status' => $order->status,
                'paid_at' => $order->paid_at,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['items.product'])
            ->latest()
            ->paginate(min(max($request->integer('per_page', 10), 1), 50));

        $orders->getCollection()->transform(fn (Order $order): array => [
            'id' => $order->id,
            'promo_code' => $order->promo_code,
            'discount_amount' => (float) $order->discount_amount,
            'total' => $order->total,
            'status' => $order->status,
            'payment_method' => $order->payment_method,
            'paid_at' => $order->paid_at,
            'created_at' => $order->created_at,
            'items' => $order->items->map(fn ($item): array => [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'product' => $item->product ? [
                    'id' => $item->product->id,
                    'name' => $item->product->name,
                ] : null,
            ]),
        ]);

        return response()->json($orders);
    }

    public function show(Request $request, int $order): JsonResponse
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['items.product'])
            ->findOrFail($order);

        return response()->json([
            'data' => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'address' => $order->address,
                'promo_code' => $order->promo_code,
                'discount_amount' => (float) $order->discount_amount,
                'total' => $order->total,
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'paid_at' => $order->paid_at,
                'created_at' => $order->created_at,
                'items' => $order->items->map(fn ($item): array => [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'product' => $item->product ? [
                        'id' => $item->product->id,
                        'name' => $item->product->name,
                    ] : null,
                ]),
            ],
        ]);
    }

    public function cancel(Request $request, int $order, InventoryService $inventory): JsonResponse
    {
        $order = DB::transaction(function () use ($request, $order, $inventory): Order {
            $order = Order::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($order);

            if ($order->status !== 'pending' || $order->payment_method !== 'cod') {
                throw ValidationException::withMessages([
                    'order' => ['Chỉ có thể hủy đơn COD đang chờ xử lý. Đơn đã thanh toán hoặc đang giao không thể hủy tại đây.'],
                ]);
            }

            $items = $order->items()->orderBy('product_id')->get();
            $inventory->recordChanges(
                $items->map(fn ($item): array => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                ])->all(),
                'in',
                'order_cancel',
                "Khách hủy đơn hàng #{$order->id}",
                $request->user()->id,
                $order->id,
                (string) $order->id,
            );

            $order->update(['status' => 'cancelled']);

            return $order;
        }, attempts: 3);

        return response()->json([
            'data' => [
                'id' => $order->id,
                'status' => $order->status,
            ],
        ]);
    }

    public function store(
        Request $request,
        VnpayPaymentService $vnpay,
        OrderConfirmationMailer $confirmationMailer,
        PromotionPricing $promotionPricing,
        InventoryService $inventory,
    ): JsonResponse {
        $demoCheckout = app()->environment('local')
            && config('services.vnpay.demo_checkout_enabled');
        $paymentMethod = $request->input('payment_method', 'vnpay');
        $allowedMethods = $demoCheckout ? ['cod', 'bank_transfer', 'vnpay', 'momo'] : ['cod', 'vnpay'];

        if (in_array($paymentMethod, ['bank_transfer', 'momo'], true) && ! $demoCheckout) {
            return response()->json([
                'message' => 'Phương thức thanh toán này hiện chỉ khả dụng trong chế độ demo.',
            ], 422);
        }

        if ($paymentMethod === 'vnpay' && ! $demoCheckout && ! $vnpay->isConfigured()) {
            return response()->json([
                'message' => 'Thanh toán VNPay chưa được cấu hình. Vui lòng liên hệ cửa hàng.',
            ], 503);
        }

        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:1000'],
            'promo_code' => ['nullable', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'payment_method' => ['sometimes', 'required', 'string', 'in:'.implode(',', $allowedMethods)],
        ]);
        $data['items'] = collect($data['items'])
            ->sortBy('product_id')
            ->values()
            ->all();
        $promoCode = strtoupper(trim($data['promo_code'] ?? ''));
        $promoCode = $promoCode !== '' ? $promoCode : null;
        $paymentMethod = $data['payment_method'] ?? 'vnpay';
        $isSimulatedOnlinePayment = $demoCheckout && $paymentMethod !== 'cod';
        $user = Auth::guard('sanctum')->user();

        $order = DB::transaction(function () use ($user, $data, $demoCheckout, $paymentMethod, $isSimulatedOnlinePayment, $promoCode, $promotionPricing, $inventory): Order {
            $promotion = $promoCode
                ? Promotion::query()
                    ->where('code', $promoCode)
                    ->lockForUpdate()
                    ->first()
                : null;
            if ($promoCode && ! $promotion) {
                throw ValidationException::withMessages([
                    'promo_code' => ['Mã khuyến mãi không hợp lệ hoặc đã ngừng áp dụng.'],
                ]);
            }

            $eligibleProductIds = $promotion
                ? $promotion->products()->pluck('products.id')->map(fn ($id): int => (int) $id)->all()
                : [];
            $pricedItems = [];
            $total = 0.0;
            $eligibleSubtotal = 0.0;
            foreach ($data['items'] as $item) {
                $product = Product::query()
                    ->whereKey($item['product_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($product->stock < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ["Sản phẩm {$product->name} không đủ số lượng trong kho."],
                    ]);
                }

                $unitPrice = $product->discountedPrice();
                $lineTotal = $unitPrice * $item['quantity'];
                $total += $lineTotal;
                if ($promotion && ($eligibleProductIds === [] || in_array($product->id, $eligibleProductIds, true))) {
                    $eligibleSubtotal += $lineTotal;
                }
                $pricedItems[] = [
                    'product' => $product,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                ];
            }

            if ($promotion) {
                $promotionPricing->assertAvailable($promotion, $total, 'promo_code');
                $discountAmount = $promotionPricing->discountAmount($promotion, $eligibleSubtotal, 'promo_code');
            } else {
                $discountAmount = 0;
            }

            $order = Order::create([
                'user_id' => $user?->id,
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'],
                'customer_phone' => $data['customer_phone'],
                'address' => $data['address'],
                'promo_code' => $promoCode,
                'promotion_id' => $promotion?->id,
                'discount_amount' => $discountAmount,
                'total' => round($total - $discountAmount, 2),
                'status' => $isSimulatedOnlinePayment ? 'paid' : 'pending',
                'payment_method' => $paymentMethod,
                'payment_expires_at' => $paymentMethod === 'vnpay' && ! $demoCheckout ? now()->addMinutes(15) : null,
                'paid_at' => $isSimulatedOnlinePayment ? now() : null,
            ]);

            if ($paymentMethod === 'vnpay' && ! $demoCheckout) {
                $order->update([
                    'payment_reference' => now()->format('YmdHis').$order->id,
                ]);
            }

            foreach ($pricedItems as $item) {
                $order->items()->create([
                    'product_id' => $item['product']->id,
                    'quantity' => $item['quantity'],
                    'price' => $item['unit_price'],
                ]);
            }

            $inventory->recordChanges(
                array_map(fn (array $item): array => [
                    'product_id' => $item['product']->id,
                    'quantity' => $item['quantity'],
                ], $pricedItems),
                'out',
                'order',
                "Xuất kho cho đơn hàng #{$order->id}",
                sourceId: $order->id,
                reference: (string) $order->id,
            );

            return $order->load('items');
        });

        $order->load('items.product');
        $emailStatus = $demoCheckout || $paymentMethod === 'cod'
            ? $confirmationMailer->send($order)
            : null;
        $emailSent = $emailStatus === null ? null : $emailStatus === 'sent';
        $paymentMode = $demoCheckout ? 'demo' : ($paymentMethod === 'cod' ? 'cod' : 'vnpay');

        return response()->json([
            'data' => [
                'id' => $order->id,
                'promo_code' => $order->promo_code,
                'discount_amount' => (float) $order->discount_amount,
                'total' => $order->total,
                'status' => $order->status,
                'payment_method' => $paymentMethod,
                'payment_mode' => $paymentMode,
                'payment_url' => $paymentMode === 'vnpay' ? $vnpay->createPaymentUrl($order, $request) : null,
                'email_sent' => $emailSent,
                'email_status' => $emailStatus,
                'confirmation_email' => $order->customer_email,
            ],
        ], 201);
    }
}
