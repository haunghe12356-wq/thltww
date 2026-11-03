<!DOCTYPE html>
<html>
<head>
    <title>{{ $product->name }}</title>
</head>
<body>
    <a href="{{ route('products.index') }}">← Quay lại danh sách</a>
    <h1>{{ $product->name }}</h1>
    <p>{{ $product->description }}</p>
    <p><strong>Giá:</strong> {{ number_format($product->price, 0, ',', '.') }} đ</p>
    <p><strong>Tồn kho:</strong> {{ $product->stock }}</p>
    <p><strong>Danh mục:</strong> {{ $product->category->name ?? 'Chưa phân loại' }}</p>
</body>
</html>