<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <title>Xác nhận đơn hàng</title>
</head>
<body>
    <h1>Cảm ơn {{ $order->customer_name }} đã mua hàng tại VietNghe Shop</h1>
    <p>Đơn hàng #{{ $order->id }} của bạn đã được ghi nhận.</p>
    @if ($order->payment_method === 'cod')
        <p>Bạn sẽ thanh toán khi nhận hàng.</p>
    @elseif ($order->payment_method === 'bank_transfer')
        <p>Phương thức thanh toán: Chuyển khoản ngân hàng (demo).</p>
    @elseif ($order->payment_method === 'momo')
        <p>Phương thức thanh toán: MoMo (demo).</p>
    @elseif ($order->payment_method === 'vnpay')
        <p>Phương thức thanh toán: VNPay{{ $order->payment_reference ? '' : ' (demo)' }}.</p>
    @endif
    <p>Địa chỉ nhận hàng: {{ $order->address }}</p>
    <h2>Chi tiết đơn hàng</h2>
    <ul>
        @foreach ($order->items as $item)
            <li>
                {{ $item->product?->name ?? 'Sản phẩm' }} × {{ $item->quantity }}
                — {{ number_format((float) $item->price * $item->quantity, 0, ',', '.') }} ₫
            </li>
        @endforeach
    </ul>
    @if ($order->promo_code)
        <p>Mã khuyến mãi {{ $order->promo_code }}: giảm {{ number_format((float) $order->discount_amount, 0, ',', '.') }} ₫</p>
    @endif
    <p><strong>Tổng đơn hàng: {{ number_format((float) $order->total, 0, ',', '.') }} ₫</strong></p>
</body>
</html>
