<!DOCTYPE html>
<html>
<head>
    <title>Sản phẩm</title>
</head>
<body>
    <h1>Danh sách sản phẩm</h1>
    <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        @forelse ($products as $product)
            <div style="border: 1px solid #ccc; padding: 12px; width: 200px;">
                <h3>{{ $product->name }}</h3>
                <p>{{ number_format($product->price, 0, ',', '.') }} đ</p>
                <p>Danh mục: {{ $product->category->name ?? 'Chưa phân loại' }}</p>
                <a href="{{ route('products.show', $product) }}">Xem chi tiết</a>
            </div>
        @empty
            <p>Chưa có sản phẩm nào.</p>
        @endforelse
    </div>
</body>
</html>