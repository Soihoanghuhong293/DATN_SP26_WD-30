const fs = require("fs");

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#xa;/g, "\n");
}

function encodeXmlEntities(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "&#xa;");
}

function applyReplacements(input) {
  const simpleReplacements = [
    // Titles / generic labels
    ["Flowchart:", "Sơ đồ:"],
    ["FLOWCHART", "SƠ ĐỒ"],
    ["Start", "Bắt đầu"],
    ["End", "Kết thúc"],

    // Common actions
    ["List", "Danh sách"],
    ["Detail", "Chi tiết"],
    ["Create", "Tạo mới"],
    ["Update", "Cập nhật"],
    ["Delete", "Xoá"],

    // Auth
    ["Hash password", "Băm mật khẩu"],
    ["Compare password", "So sánh mật khẩu"],
    ["Sign JWT", "Tạo JWT"],

    // Booking / general
    ["Find booking", "Tìm booking"],
    ["FindById", "Tìm theo ID"],
    ["Find", "Tìm"],
    ["Validate", "Kiểm tra"],
    ["Skip", "Bỏ qua"],

    // Providers/services
    ["Vehicle", "Xe"],
    ["Hotel", "Khách sạn"],
    ["Room", "Phòng"],
    ["Restaurant", "Nhà hàng"],
    ["ProviderTicket", "Vé nhà cung cấp"],

    // Chatbot
    ["Keyword matching ưu tiên", "Ưu tiên khớp từ khoá"],
    ["Fallback AI (nếu có)", "Dự phòng AI (nếu có)"],
    ["source=keyword", "nguồn=từ khoá"],

    // Status words (keep short)
    ["success", "thành công"],
  ];

  const regexReplacements = [
    // Step labels
    [/\bStep\s+(\d+)\b/g, "Bước $1"],

    // booking/id words in displayed text (avoid API paths like /bookings/:id)
    [/(?<!\/)\bbooking\b(?!s\b)/gi, "đặt chỗ"],
    [/\btheo id\b/gi, "theo mã"],

    // payment terms
    [/\bpayment_status\b/gi, "trạng thái thanh toán"],
    [/\bpaymentMethod\b/g, "phương thức thanh toán"],
    [/\bpay_type\b/g, "loại thanh toán"],
    [/\bdepositAmount\b/g, "tiền đặt cọc"],
    [/\bpaymentAmount\b/g, "số tiền thanh toán"],
    [/\bamountToPay\b/g, "số tiền cần trả"],
    [/\bamountIn\b/g, "số tiền nhận"],
    [/\btotalRevenue\b/g, "tổng doanh thu"],
    [/\btotalBookings\b/g, "tổng số đặt chỗ"],

    // common ops words shown in boxes
    [/\bSet\b/g, "Đặt"],
    [/\bsave\b/gi, "lưu"],
    [/\bamounts\b/gi, "các số tiền"],
    [/push log/gi, "ghi log"],
    [/pending\s*→\s*confirmed/gi, "chờ → xác nhận"],
    [/pending\s*-\>\s*confirmed/gi, "chờ → xác nhận"],
    [/\bconfirmed\b/gi, "xác nhận"],
    [/\bpending\b/gi, "chờ"],

    // momo/sepay labels
    [/\bpayUrl\b/g, "liên kết thanh toán"],
    [/\btransferContent\b/g, "nội dung chuyển khoản"],
    [/\bqrUrl\b/g, "liên kết QR"],

    // misc
    [/\btoken\b/gi, "mã truy cập"],
    [/\bintentId\b/g, "mã ý định"],

    // guide auth / stages / check-in terminology
    [/protect\s*\+\s*restrictToGuide/gi, "Xác thực + chỉ HDV"],
    [/protect\s*\+\s*restrictToAdmin/gi, "Xác thực + chỉ quản trị"],
    [/\btour_stage\b/gi, "giai đoạn tour"],
    [/\bin_progress\b/gi, "đang diễn ra"],
    [/Mode\s+checkpoint_checkins/gi, "Chế độ điểm danh checkpoint"],
    [/checkpoint_checkins/gi, "điểm danh checkpoint"],
    [/leader\/passenger/gi, "trưởng đoàn / hành khách"],
    [/Legacy toggle/gi, "Chế độ cũ (bật/tắt)"],
    [/leaderCheckedIn/gi, "trưởng đoàn đã điểm danh"],
    [/passengers\[\s*i\s*\]/gi, "hành khách[i]"],
    [/passengers/gi, "hành khách"],
    [/Unchecked/gi, "Bỏ chọn"],
    [/\breason\b/gi, "lý do"],

    // payment vocabulary
    [/\bpaid\b/gi, "đã thanh toán"],
    [/\bdeposit\b/gi, "đặt cọc"],
    [/\bremaining\b/gi, "còn lại"],
    [/\bfull\b/gi, "toàn bộ"],
  ];

  function applyToText(text) {
    let t = text;
    for (const [from, to] of simpleReplacements) t = t.split(from).join(to);
    for (const [re, to] of regexReplacements) t = t.replace(re, to);
    return t;
  }

  // Only mutate user-facing attributes: value="..." and diagram/page name="..."
  return input.replace(/\b(value|name)="([^"]*)"/g, (_m, attr, raw) => {
    const decoded = decodeXmlEntities(raw);
    const updated = applyToText(decoded);
    const encoded = encodeXmlEntities(updated);
    return `${attr}="${encoded}"`;
  });
}

function main() {
  const file = "docs/drawio/flowcharts.drawio";
  const before = fs.readFileSync(file, "utf8");
  const after = applyReplacements(before);
  if (after !== before) fs.writeFileSync(file, after, "utf8");
  process.stdout.write("OK\n");
}

main();

