# Hướng dẫn cài đặt và sử dụng VietNghe Shop

Tài liệu dành cho người cài đặt dự án, khách hàng và quản trị viên. Các lệnh dưới đây dùng PowerShell trên Windows và giả định mã nguồn nằm ở:

```text
C:\xampp\htdocs\THLTW-VietNghe-24F-main
```

## 1. Yêu cầu

- Windows với XAMPP (Apache không bắt buộc; cần MySQL/MariaDB).
- PHP 8.2 trở lên, Composer.
- Node.js 20.9 trở lên và npm.
- MySQL đã khởi động trong XAMPP Control Panel.

Backend dùng Laravel và MySQL; giao diện dùng Next.js. Khi phát triển, chạy API và giao diện trong hai cửa sổ terminal riêng.

## 2. Cài đặt và chạy website lần đầu

### 2.1 Tạo cơ sở dữ liệu

1. Mở XAMPP Control Panel, khởi động **MySQL**.
2. Mở `http://localhost/phpmyadmin`.
3. Tạo một cơ sở dữ liệu mới, ví dụ `vietnghe_shop`, với collation `utf8mb4_unicode_ci`.
4. Ghi lại tên database, tài khoản MySQL và mật khẩu để cấu hình Laravel.

### 2.2 Cấu hình và chạy backend

Mở PowerShell:

```powershell
cd C:\xampp\htdocs\THLTW-VietNghe-24F-main\backend
composer install
Copy-Item .env.example .env
```

Chỉ chạy `Copy-Item` khi chưa có `backend\.env`; không ghi đè file `.env` đang dùng. Mở `backend\.env` và đặt các giá trị phù hợp với MySQL XAMPP:

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=vietnghe_shop
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://127.0.0.1:3000
DEMO_CHECKOUT_ENABLED=true
```

`DB_USERNAME` và `DB_PASSWORD` phải khớp với cấu hình MySQL trên máy. Không dùng các giá trị mẫu trên nếu tài khoản MySQL của bạn khác.

Tiếp tục chạy:

```powershell
php artisan key:generate
php artisan config:clear
php artisan migrate
```

Muốn có dữ liệu sản phẩm mẫu để thử, có thể chạy `php artisan db:seed` một lần trên database phát triển mới. Seeder tạo một tài khoản thử `test@example.com` và danh sách sản phẩm mẫu; tài khoản này **không** phải admin. Tránh seed lặp lại trên database đã có dữ liệu.

Khởi động API và để cửa sổ này chạy:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

API mặc định sẵn sàng tại `http://127.0.0.1:8000/api`. Có thể kiểm tra máy chủ tại `http://127.0.0.1:8000/up`.

### 2.3 Cấu hình và chạy frontend

Mở cửa sổ PowerShell thứ hai:

```powershell
cd C:\xampp\htdocs\THLTW-VietNghe-24F-main\frontend
npm install
npm run dev
```

Mở `http://localhost:3000`. Frontend mặc định gọi API tại `http://127.0.0.1:8000/api`. Nếu backend chạy ở địa chỉ khác, tạo `frontend\.env.local` với:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Sau khi đổi URL, khởi động lại frontend. Nếu frontend chạy ở origin khác `http://localhost:3000` hoặc `http://127.0.0.1:3000`, cập nhật `FRONTEND_URL` trong `backend\.env`, rồi chạy `php artisan config:clear`.

## 3. Hướng dẫn khách hàng

1. Mở trang chủ, chọn **Sản phẩm** để xem danh sách; có thể tìm/lọc sản phẩm và mở chi tiết để xem giá, tồn kho, mô tả và đánh giá đã duyệt.
2. Chọn số lượng rồi thêm sản phẩm vào giỏ hàng.
3. Trong **Giỏ hàng**, kiểm tra sản phẩm/số lượng. Nhập mã khuyến mãi nếu có và bấm **Áp dụng**. Mã khuyến mãi GIAM10
4. Điền họ tên, email, số điện thoại và địa chỉ nhận hàng.
5. Chọn phương thức thanh toán rồi bấm **Đặt hàng**. Khi `DEMO_CHECKOUT_ENABLED=true` trong môi trường local, thanh toán trực tuyến là mô phỏng, không trừ tiền; COD được thu khi giao. Đây không phải cấu hình thanh toán thật.
6. Đăng ký/đăng nhập để xem lịch sử, chi tiết đơn hàng và gửi đánh giá sản phẩm. Đánh giá chỉ xuất hiện công khai sau khi admin duyệt. Mỗi tài khoản có một đánh giá cho mỗi sản phẩm; gửi lại sẽ cập nhật đánh giá và đưa về trạng thái chờ duyệt.
7. Trang **Liên hệ** dùng để gửi câu hỏi cho cửa hàng.


MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=(gamil-nguoi-dung)
MAIL_PASSWORD=(mat khau-gmail-nguoi-dung)
MAIL_FROM_ADDRESS="gamil-gui-ve"
MAIL_FROM_NAME="VietNghe Shop"


## 4. Cấp quyền và đăng nhập admin

Quyền admin được xác định bằng email trong `backend\.env`, không dựa vào việc người dùng chỉ đăng nhập thành công:

1. Tạo tài khoản bình thường trên website bằng email sẽ dùng làm tài khoản quản trị, hoặc dùng tài khoản đã tồn tại.
2. Trong `backend\.env`, đặt `ADMIN_EMAIL` bằng đúng email tài khoản đó:

   ```dotenv
   ADMIN_EMAIL=admin@example.com
   ```

3. Chạy `php artisan config:clear` trong thư mục `backend`.
4. Đăng xuất/đăng nhập lại bằng tài khoản admin rồi mở `http://localhost:3000/admin`.

Chỉ email khớp với `ADMIN_EMAIL` mới sử dụng được API admin. Không đặt email này thành địa chỉ người dùng không tin cậy; không chia sẻ mật khẩu hoặc file `.env`.

## 5. Hướng dẫn quản trị viên

Đăng nhập bằng tài khoản admin, mở menu quản trị ở bên trái:

| Mục | Công việc |
| --- | --- |
| **Sản phẩm** | Thêm/sửa sản phẩm, giá, mô tả, ảnh, tồn ban đầu; chuyển sản phẩm vào thùng rác, khôi phục hoặc xóa vĩnh viễn. Nút **Đánh giá** ở từng sản phẩm mở đánh giá của sản phẩm đó. |
| **Danh mục** | Tạo, sửa, ẩn/hiện và quản lý danh mục. |
| **Thương hiệu** | Tạo, sửa, ẩn/hiện và quản lý thương hiệu. |
| **Đơn hàng** | Tìm/lọc đơn và cập nhật trạng thái theo quy trình được cho phép. |
| **Quản lý kho** | Tạo phiếu nhập hoặc xuất; nhập lý do, sản phẩm, số lượng và thông tin tham chiếu; xem tồn hiện tại và lịch sử nhập/xuất. Không thể xuất quá số lượng tồn. |
| **Đánh giá** | Xem người gửi (tên/email), sản phẩm, số sao, nội dung và trạng thái; lọc chờ duyệt/đã duyệt, duyệt, ẩn hoặc xóa. |
| **Bài viết** | Tạo/sửa bài viết, lưu bản nháp hoặc xuất bản. |
| **Liên hệ** | Đọc tin nhắn khách gửi và phản hồi qua email khi SMTP đã cấu hình. |
| **Thành viên** | Xem hồ sơ, cập nhật trạng thái hoạt động và quản lý tài khoản thành viên. |
| **Khuyến mãi** | Tạo/sửa mã giảm giá, thời hạn, điều kiện và phạm vi sản phẩm áp dụng. |


----Tài khoảng Admin

--Email: haunghe12356@gmai.com

--Mật khẩu: 12345678

### Duyệt đánh giá

- Mở **Đánh giá** trên menu để xem các bài **Chờ duyệt**; hoặc tại **Sản phẩm**, bấm **Đánh giá** cạnh sản phẩm cần kiểm tra.
- Xem tên/email khách hàng, nội dung và số sao trước khi bấm **Duyệt**.
- Bấm **Ẩn** để gỡ một đánh giá đã duyệt khỏi cửa hàng; bấm **Xóa** để xóa hẳn.
- Đánh giá chưa duyệt không hiển thị công khai và không được tính vào điểm trung bình sản phẩm.

### Nhập/xuất kho

- Tại **Quản lý kho**, chuyển giữa **Phiếu nhập** và **Phiếu xuất**.
- Điền lý do; thêm một hay nhiều sản phẩm và số lượng; mã tham chiếu/ghi chú là tùy chọn.
- Sau khi tạo phiếu thành công, tồn kho và lịch sử được cập nhật. Lịch sử có thể lọc theo loại phiếu; danh sách tồn có thể tìm theo tên hoặc mã.
- Đơn hàng, hủy đơn và điều chỉnh tồn từ quản lý sản phẩm cũng được ghi nhận trong lịch sử kho.

## 6. Thanh toán và email

- Cấu hình mặc định cho phát triển là thanh toán mô phỏng; không nhập thông tin thẻ thật vào website demo.
- Để cấu hình VNPay sandbox/production và SMTP, xem phần **Checkout, demo payment, and order email** trong [README dự án](../README.md). Cần cấu hình thông tin merchant và URL IPN HTTPS công khai; localhost không nhận được callback VNPay.
- Không commit `backend\.env`, khóa VNPay hoặc mật khẩu SMTP.

## 7. Xử lý sự cố thường gặp

- **Không kết nối được API:** kiểm tra terminal backend còn chạy tại cổng 8000, MySQL đang chạy và `NEXT_PUBLIC_API_URL` trỏ đúng địa chỉ.
- **Lỗi kết nối database:** kiểm tra database đã tạo, `DB_DATABASE`, username/password và `DB_CONNECTION=mysql`; sau khi sửa `.env`, chạy `php artisan config:clear`.
- **Báo thiếu bảng:** chạy `php artisan migrate` trong `backend`.
- **Admin bị 403 / không có quyền:** xác nhận tài khoản đã đăng nhập có email trùng `ADMIN_EMAIL`, sau đó chạy `php artisan config:clear` và đăng nhập lại.
- **Frontend không gọi được API do CORS:** đặt `FRONTEND_URL` đúng origin của trình duyệt (ví dụ `http://127.0.0.1:3000`), xóa config cache rồi khởi động lại backend.
- **Không thấy sản phẩm mẫu:** chạy `php artisan db:seed` trên database phát triển mới.
- **VNPay không hoạt động ở local:** dùng phương thức mô phỏng để thử; VNPay thật cần merchant credentials và IPN HTTPS công khai.

## 8. Kiểm tra dự án

Chạy backend tests:

```powershell
cd C:\xampp\htdocs\THLTW-VietNghe-24F-main\backend
php artisan test
```

Kiểm tra frontend:

```powershell
cd C:\xampp\htdocs\THLTW-VietNghe-24F-main\frontend
npm run lint
npm run build
```