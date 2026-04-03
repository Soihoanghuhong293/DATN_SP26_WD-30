## Gửi email khi phân công HDV (SMTP)

### 1) Cấu hình biến môi trường

Mở `Server/.env` và điền các biến sau (tham khảo `Server/.env.example`):

- `SMTP_HOST`
- `SMTP_PORT` (Gmail thường là `587`)
- `SMTP_USER` (email)
- `SMTP_PASS` (App Password)
- `MAIL_FROM_NAME`
- `MAIL_FROM_EMAIL`
- `CLIENT_URL` (dùng để tạo link trong email, ví dụ `http://localhost:5173`)

### 2) Gmail: tạo App Password

Gmail không cho gửi SMTP bằng mật khẩu đăng nhập thường. Bạn phải:

- Bật **2-Step Verification**
- Vào **App passwords** trong phần Security
- Tạo App Password cho Mail
- Dán App Password vào `SMTP_PASS`

Lưu ý: `SMTP_PASS` nên là **1 chuỗi liên tục** (xóa khoảng trắng), ví dụ:

```env
SMTP_PASS=abcdabcdabcdabcd
```

### 3) Chạy server

```bash
cd Server
npm run dev
```

### 4) Cách test nhanh trên UI

- Vào Admin → Chi tiết booking → **Thay đổi/Phân công** HDV → **Cập nhật**
- Hệ thống sẽ gửi email cho HDV nếu:
  - SMTP cấu hình đủ
  - User được phân công có role `guide`/`hdv`
  - User không bị khóa (`status != inactive`)
  - Có email hợp lệ

### 5) Debug khi không thấy email

Mở DevTools → Network, xem response của request `PUT /api/v1/bookings/:id`:

- `mail.attempted`: có cố gửi không
- `mail.sent`: đã gửi thành công chưa
- `mail.reason`: lý do không gửi / lỗi gửi

