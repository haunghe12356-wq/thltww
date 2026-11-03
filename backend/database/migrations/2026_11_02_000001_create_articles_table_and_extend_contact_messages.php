<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('summary', 500);
            $table->string('category', 100);
            $table->json('body');
            $table->boolean('published')->default(false);
            $table->timestamps();
        });

        Schema::table('contact_messages', function (Blueprint $table) {
            $table->boolean('is_read')->default(false)->after('message');
        });

        $now = now();
        DB::table('articles')->insert([
            [
                'slug' => 'chon-phu-kien-cong-nghe-phu-hop',
                'title' => 'Cách chọn phụ kiện công nghệ phù hợp nhu cầu',
                'summary' => 'Một vài tiêu chí đơn giản giúp bạn chọn phụ kiện bền, tương thích và đáng tiền.',
                'category' => 'Tư vấn',
                'body' => json_encode([
                    'Trước khi mua, hãy xác định thiết bị bạn đang sử dụng và những tính năng thực sự cần thiết. Kiểm tra chuẩn kết nối, công suất và khả năng tương thích để tránh mua nhầm phụ kiện.',
                    'Ưu tiên sản phẩm có thông tin xuất xứ rõ ràng, chính sách bảo hành minh bạch và thông số an toàn. Giá bán chỉ là một phần; độ bền và dịch vụ sau bán hàng cũng rất quan trọng.',
                    'Nếu còn phân vân, hãy liên hệ VietNghe để được tư vấn theo thiết bị và ngân sách của bạn.',
                ], JSON_UNESCAPED_UNICODE),
                'published' => true,
                'created_at' => '2026-10-20 00:00:00',
                'updated_at' => $now,
            ],
            [
                'slug' => 'bao-quan-thiet-bi-dien-tu',
                'title' => 'Mẹo bảo quản thiết bị điện tử hằng ngày',
                'summary' => 'Giữ thiết bị sạch sẽ, khô ráo và sử dụng bộ sạc phù hợp để tăng tuổi thọ.',
                'category' => 'Hướng dẫn',
                'body' => json_encode([
                    'Tránh để thiết bị ở nơi quá nóng, ẩm hoặc có ánh nắng chiếu trực tiếp. Khi vệ sinh, hãy tắt nguồn và dùng khăn mềm khô thay vì xịt dung dịch trực tiếp lên thiết bị.',
                    'Sử dụng bộ sạc và cáp đạt chuẩn, kiểm tra dây dẫn định kỳ và rút sạc khi không cần thiết. Với thiết bị di động, hạn chế để pin cạn kiệt trong thời gian dài.',
                    'Đọc hướng dẫn sử dụng của nhà sản xuất để biết cách bảo quản phù hợp với từng sản phẩm.',
                ], JSON_UNESCAPED_UNICODE),
                'published' => true,
                'created_at' => '2026-10-15 00:00:00',
                'updated_at' => $now,
            ],
            [
                'slug' => 'mua-sam-an-toan-truc-tuyen',
                'title' => 'Những điều nên kiểm tra khi mua sắm trực tuyến',
                'summary' => 'Kiểm tra mô tả sản phẩm, giá, tồn kho và chính sách trước khi đặt hàng.',
                'category' => 'Tin cửa hàng',
                'body' => json_encode([
                    'Hãy đọc kỹ thông tin sản phẩm, đối chiếu thông số cần thiết và liên hệ cửa hàng nếu có chi tiết chưa rõ. Xác nhận thông tin người nhận trước khi hoàn tất đơn hàng.',
                    'Giữ lại thông tin xác nhận đơn và kiểm tra sản phẩm khi nhận. Nếu cần hỗ trợ, hãy gửi tin nhắn qua trang Liên hệ để cửa hàng tiếp nhận yêu cầu.',
                ], JSON_UNESCAPED_UNICODE),
                'published' => true,
                'created_at' => '2026-10-08 00:00:00',
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropColumn('is_read');
        });

        Schema::dropIfExists('articles');
    }
};
