# Đặc tả ràng buộc kiểm tra (validate): từ tạo đơn đến kết thúc tour

Tài liệu mô tả các quy tắc nghiệp vụ và kiểm tra dữ liệu **đang được áp dụng** trong mã nguồn dự án (Client + Server), phục vụ báo cáo đồ án / kiểm thử.

**Phạm vi:** luồng đặt tour → thanh toán → quản trị đơn → vận hành HDV → kết thúc tour.

**Tham chiếu mã:**

| Thành phần | Đường dẫn chính |
|------------|-----------------|
| Form đặt tour (khách) | `Client/src/components/Client/BookingForm.tsx` |
| Tạo / cập nhật booking | `Server/src/controllers/bookingController.ts` (`createBooking`, `updateBooking`, …) |
| Schema + chuyển trạng thái đơn | `Server/src/models/Booking.ts` |
| VietQR / Webhook thanh toán | `Server/src/controllers/payment.controller.ts` |
| Phân bổ xe / phòng | `Server/src/services/allocation.service.ts`, `VehicleAllocation`, `RoomAllocation` |

---

## 1. Giai đoạn đặt tour (tạo đơn)

### 1.1. Validate phía giao diện — `BookingForm.tsx`

| Ràng buộc | Mô tả | Hậu quả khi vi phạm |
|-----------|--------|----------------------|
| Chọn ngày khởi hành | Bắt buộc có ngày đã chọn trên lịch trước khi submit | `message.error`: không gửi request |
| Ngày trong lịch tour | Chỉ chọn ngày có trong `tour.departure_schedule` và `slots > 0` (UI) | Không chọn được / không gửi |
| Ngày không quá khứ | `disabledDate`: không chọn ngày &lt; hôm nay | Không chọn được |
| Đặt cọc — khoảng cách ngày | Nếu `paymentMethod === 'deposit'`: không cho khởi hành **hôm nay** hoặc **ngày mai** | `message.error`, không gửi |
| Họ tên (`customerName`) | Bắt buộc, không chỉ khoảng trắng | Ant Design Form báo lỗi |
| Số điện thoại | Bắt buộc; pattern `^(\+84\|0)[3\|5\|7\|8\|9][0-9]{8}$` | Form báo lỗi |
| Email | Bắt buộc; `type: 'email'` | Form báo lỗi |
| Số lượng khách (`groupSize`) | Bắt buộc, số ≥ 1 | Form báo lỗi |
| Phương thức thanh toán | Bắt buộc: `full` / `deposit` / `later` | Form báo lỗi |
| Giá / ngày lễ | Gọi API tính giá; lỗi mạng có thể fallback giá gốc tour | Hiển thị / tổng tiền có thể lệch nếu API lỗi |

Payload gửi xuống server gồm `totalPrice: calculatedPrice * groupSize` (đã tính giá lễ phía client + server có thể chỉnh lại khi có vé add-on).

### 1.2. Validate phía server — `createBooking`

| Ràng buộc | Điều kiện | Phản hồi |
|-----------|-----------|----------|
| Trường bắt buộc | Có `tour_id`, `startDate`; có tên + SĐT khách (sau chuẩn hóa field); có `groupSize` | `400` — thiếu thông tin |
| Tour tồn tại | `Tour.findById` | `404` |
| Tour đang bán | `tour.status === 'active'` | `400` — tour không mở bán |
| Ngày thuộc lịch khởi hành | Ngày (YYYY-MM-DD) khớp một phần tử `departure_schedule` | `400` — ngày không hợp lệ |
| Còn chỗ | Tổng `groupSize` booking cùng tour + ngày (trừ `cancelled`) + yêu cầu ≤ `slots` | `400` — hết chỗ / vượt chỗ |
| Vé mua thêm | Mỗi id ∈ `optional_ticket_ids` phải nằm trong lịch tour, `optional_addon`, `active`; đủ document trong DB | `400` — vé không hợp lệ |
| Tổng tiền | `finalTotalPrice = tourOnlyTotal + optionalTicketsAddon` | Lưu vào `total_price` |
| Trạng thái khởi tạo | `status` / `payment_status` map từ body hoặc mặc định | Theo code |
| `tour_stage` | Mặc định `scheduled` nếu không gửi | Lưu booking |
| `endDate` | `startDate` + `duration_days` (UTC) | Tự tính |
| User đăng nhập role `user` | Gắn `user_id` | Tự gán |

**Schema Mongoose** (`Booking.ts`): bắt buộc thêm `tour_id`, `customer_name`, `customer_phone`, `total_price`, `startDate`, `groupSize` — thiếu sẽ lỗi khi `Booking.create`.

---

## 2. Giai đoạn thanh toán (sau khi có đơn)

### 2.1. Tạo QR chuyển khoản — `GET /sepay/qr/:id` (`generateSepayQR`)

| Ràng buộc | Mô tả |
|-----------|--------|
| Booking tồn tại | `findById` — không có → `404` |
| Số tiền | Theo `pay_type`: full / deposit / remaining từ `total_price`, `deposit_amount` | Trả JSON `qrUrl`, `transferContent` dạng `SP{bookingId}` |

### 2.2. Webhook SePay — `POST /sepay/webhook` (`handleSepayWebhook`)

| Bước kiểm tra | Kết quả |
|----------------|---------|
| Parse `amountIn` | Nếu ≤ 0 → bỏ qua, `success: true` (không cập nhật booking) |
| Parse `transactionContent` | Phải có mẫu `SP` + **24 ký tự hex** (ObjectId) → `bookingId` |
| Booking tồn tại | Không có → bỏ qua |
| Cập nhật | `amountIn >= total_price` và `total > 0` → `paid`; ngược lại → `deposit`; push `logs` | `200` JSON |

*Lưu ý bảo mật:* code hiện tại dựa trên nội dung CK + số tiền; cần bổ sung xác thực webhook theo tài liệu SePay nếu triển khai production.

### 2.3. Cập nhật đơn (admin / nội bộ) — `updateBooking`

| Ràng buộc | Mô tả |
|-----------|--------|
| Danh sách khách | `passengers`/`guests`: `length ≤ booking.groupSize` | `400` |
| Chuyển `status` đơn | Chỉ các giá trị hợp lệ; **bị chặn bởi middleware** trên `findOneAndUpdate` (xem §3) | Lỗi nếu chuyển sai |
| `payment_status` | Đổi có ghi `logs` khi khác trạng thái hiện tại | Theo code |
| `guide_id` | Đổi/gỡ: logic email; user phải `guide`/`hdv`, `active` nếu gửi mail | Mail lỗi **không** rollback booking |
| Sau khi đổi danh sách khách | Gọi `autoAllocateCarsForBooking`, `autoAllocateRoomsForBooking` (lỗi **không** chặn lưu) | Log / phân bổ |

---

## 3. Chuyển trạng thái đơn booking (schema)

Định nghĩa trong `Booking.ts` (`validTransitions`), áp dụng khi cập nhật có đổi `status` qua `findOneAndUpdate` / tương đương:

| Từ | Được phép sang |
|----|----------------|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `cancelled` |
| `cancelled` | *(không được chuyển đi đâu)* |

Vi phạm → throw Error: không đổi trạng thái được.

*(Lưu ý: `tour_stage` và `status` đơn là hai khái niệm khác nhau.)*

---

## 4. Giai đoạn vận hành tour (HDV)

Mọi thao tác: **đã đăng nhập**; booking **tồn tại**; `booking.guide_id` **trùng** `_id` user hiện tại → nếu không: `403`.

### 4.1. `updateTourStage`

| Ràng buộc | Mô tả |
|-----------|--------|
| `tour_stage` | ∈ `{ scheduled, in_progress, completed }` |
| Thứ tự | Chỉ **tiến một bước**: scheduled → in_progress → completed |
| Không lùi | `to < from` → `400` |
| Không nhảy cóc | `to !== from + 1` (khi khác nhau) → `400` |
| Ghi log | Push vào `logs` khi đổi thành công |

### 4.2. `checkInPassenger`

| Ràng buộc | Mô tả |
|-----------|--------|
| `tour_stage` | Phải **`in_progress`** mới điểm danh |
| Nếu `completed` | `400` — tour đã kết thúc |
| Nếu `scheduled` | `400` — tour chưa bắt đầu |
| Check-in theo checkpoint | Bỏ chọn (checked = false) → **bắt buộc `reason`** không rỗng |
| `passengerIndex` | Trong `[0, totalPassengers-1]` |
| `type` | `leader` hoặc `passenger` (+ `passengerIndex` khi cần) |

*(Còn nhánh legacy check-in một lần — xem cùng controller.)*

### 4.3. `addDiaryEntryForGuide`

| Ràng buộc | Mô tả |
|-----------|--------|
| `date` | Bắt buộc, parse được |
| `day_no` | Nếu không hợp lệ → mặc định 1 |
| `images` | Tối đa 8; mỗi phần tử có `url` string khác rỗng |
| Một ngày một bản ghi | Cùng `day_no` → ghi đè (merge với bản cũ) |

### 4.4. `deleteDiaryEntryForGuide`

| Ràng buộc | Mô tả |
|-----------|--------|
| `dayNo` | Số ≥ 1 |
| Tồn tại | Không có nhật ký ngày đó → `404` |

---

## 5. Kết thúc tour

| Hạng mục | Mô tả |
|----------|--------|
| Kết thúc vận hành | HDV đặt `tour_stage = completed` sau `in_progress` (đúng một bước) |
| Hậu kiểm check-in | Ở `completed`, API check-in trả lỗi “Tour đã kết thúc…” |
| Thanh toán / hủy đơn | Do `payment_status` và `status` đơn; không tự động đổi khi `completed` trong đoạn code đã liệt kê |

---

## 6. Phân bổ tài nguyên (xe, phòng)

| Ràng buộc | Mô tả |
|-----------|--------|
| `VehicleAllocation` | Index unique (theo `vehicle_id`, `service_date`, status reserved/confirmed) — tránh trùng xe cùng ngày |
| `RoomAllocation` | Index unique tương tự cho phòng |

Khi phân bổ thất bại có thể báo lỗi DB hoặc bắt ở service — tùy `allocation.service.ts`.

---

## 7. Gợi ý kiểm thử (test case ngắn)

1. Tạo đơn vượt `slots` → mong đợi `400`.
2. Tạo đơn tour `draft`/`hidden` → `400`.
3. Gửi `optional_ticket_ids` không thuộc lịch tour → `400`.
4. Webhook: số tiền 0 → bỏ qua, không đổi booking.
5. Webhook: nội dung không có `SP{24hex}` → bỏ qua.
6. `updateTourStage`: scheduled → completed (nhảy cóc) → `400`.
7. Check-in khi `scheduled` → `400`; khi `completed` → `400`.
8. Đổi `status` cancelled → confirmed (nếu có API cập nhật) → lỗi middleware schema.

---

*Tài liệu được sinh tự động từ phân tích mã nguồn; khi sửa code hãy cập nhật tương ứng.*
