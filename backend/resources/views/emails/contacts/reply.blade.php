<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <title>Phản hồi liên hệ</title>
</head>
<body>
    <p>Xin chào {{ $contactMessage->name }},</p>
    <p>Cửa hàng VietNghe đã phản hồi liên hệ của bạn về chủ đề: <strong>{{ $contactMessage->subject }}</strong>.</p>
    <blockquote style="white-space: pre-wrap">{{ $reply }}</blockquote>
    <p>Cảm ơn bạn đã liên hệ với VietNghe Shop.</p>
</body>
</html>
