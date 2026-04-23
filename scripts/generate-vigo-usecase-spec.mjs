/**
 * Sinh file Word: đặc tả use case theo hệ thống ViGo (DATN_SP26_WD-30).
 * Chạy: node scripts/generate-vigo-usecase-spec.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "2.1.3-Dac-ta-use-case-ViGo.docx");

const cap = (num, title) =>
  new Paragraph({
    children: [
      new TextRun({ text: `Bảng 2.${num}. ${title}.`, italics: true, size: 22 }),
    ],
    spacing: { after: 200 },
  });

const h2 = (t) =>
  new Paragraph({
    text: t,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });

const h3 = (t) =>
  new Paragraph({
    text: t,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 120, after: 80 },
  });

const p = (t, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text: t, ...opts })],
    spacing: { after: 80 },
  });

const bullet = (t) =>
  new Paragraph({
    text: t,
    bullet: { level: 0 },
    spacing: { after: 60 },
  });

/** Bảng 3 cột: STT | Thực hiện | Hành động */
function flowTable(rows) {
  const header = new TableRow({
    children: ["STT", "Thực hiện", "Hành động"].map(
      (h) =>
        new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
            }),
          ],
        })
    ),
  });

  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: [r.stt, r.who, r.what].map(
          (cell) =>
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
              },
              children: [new Paragraph({ text: String(cell) })],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  });
}

/** Bảng 3 cột: Mã | Thực hiện | Hành động (luồng thay thế) */
function altFlowTable(rows) {
  const header = new TableRow({
    children: ["Mã", "Thực hiện", "Hành động"].map(
      (h) =>
        new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
            }),
          ],
        })
    ),
  });

  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: [r.code, r.who, r.what].map(
          (cell) =>
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
              },
              children: [new Paragraph({ text: String(cell) })],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  });
}

/** Bảng 2 cột: nhãn | nội dung (mô tả use case) */
function keyValueTable(pairs) {
  const rows = pairs.map(
    ([key, val]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            children: [
              new Paragraph({
                children: [new TextRun({ text: key, bold: true })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            children: [new Paragraph({ text: String(val) })],
          }),
        ],
      })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

const matrixRow = (cells) =>
  new TableRow({
    children: cells.map(
      (c) =>
        new TableCell({
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          },
          children: [new Paragraph({ text: String(c), alignment: AlignmentType.CENTER })],
        })
    ),
  });

function uc({
  code,
  name,
  desc,
  actors,
  pre,
  flows,
  post,
  tableNum,
  tableTitle,
}) {
  const blocks = [
    h2(`${code}. ${name}`),
    h3("Mô tả chung"),
    p(desc),
    h3("Tác nhân chính"),
    p(actors),
    h3("Tiền điều kiện"),
    p(pre),
    h3("Luồng sự kiện"),
    flowTable(flows),
    h3("Hậu điều kiện"),
    p(post),
    cap(tableNum, tableTitle),
  ];
  return blocks;
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "2.1.3. Đặc tả Use Case (hệ thống ViGo)",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        p(
          "Tài liệu này mô tả các use case được căn cứ theo phiên bản mã nguồn dự án DATN_SP26_WD-30: website đặt tour du lịch thương hiệu ViGo (client React + API Node/Express + MongoDB). Một số chức năng phổ biến trong tài liệu nghiệp vụ (ví dụ đăng nhập Google, quên/đổi mật khẩu) chưa có trong mã nguồn hiện tại và được ghi rõ trong từng use case.",
          { size: 22 }
        ),
        new Paragraph({ text: "" }),

        ...uc({
          code: "2.1.3.1 — DN01",
          name: "Đăng nhập",
          desc: "Cho phép người dùng đăng nhập bằng email và mật khẩu. Hệ thống cấp JWT và lưu trên trình duyệt; sau đó điều hướng theo vai trò: Quản trị viên vào khu vực /admin, Hướng dẫn viên vào khu vực /hdv, Khách hàng về trang chủ.",
          actors: "Thành viên (khách), Quản trị viên, Hướng dẫn viên.",
          pre: "Người dùng có tài khoản hợp lệ; chưa đăng nhập hoặc đã đăng xuất.",
          flows: [
            { stt: "1", who: "Người dùng", what: "Truy cập trang Đăng nhập (/login)." },
            { stt: "2", who: "Người dùng", what: "Nhập email và mật khẩu, gửi biểu mẫu." },
            { stt: "3", who: "Hệ thống", what: "Xác thực thông tin qua API POST /api/v1/auth/login." },
            { stt: "4", who: "Hệ thống", what: "Trả về token và role; client lưu token, role, email vào localStorage." },
            { stt: "5", who: "Hệ thống", what: "Điều hướng: admin → /admin/dashboard; hdv/guide → /hdv; user → /." },
          ],
          post: "Người dùng đăng nhập thành công và truy cập được các chức năng theo vai trò.",
          tableNum: 1,
          tableTitle: "Đặc tả use case đăng nhập",
        }),

        ...uc({
          code: "2.1.3.2 — DK01",
          name: "Đăng ký tài khoản khách",
          desc: "Cho phép khách hàng tạo tài khoản mới (vai trò mặc định user) với họ tên, email và mật khẩu.",
          actors: "Khách hàng (chưa có tài khoản).",
          pre: "Email chưa được sử dụng trong hệ thống.",
          flows: [
            { stt: "1", who: "Khách hàng", what: "Truy cập trang Đăng ký (/register)." },
            { stt: "2", who: "Khách hàng", what: "Nhập họ tên, email, mật khẩu." },
            { stt: "3", who: "Hệ thống", what: "Gọi API POST /api/v1/auth/register; mật khẩu được băm (bcrypt) trước khi lưu." },
            { stt: "4", who: "Hệ thống", what: "Thông báo thành công và chuyển về trang đăng nhập." },
          ],
          post: "Tài khoản khách được tạo và lưu trong cơ sở dữ liệu.",
          tableNum: 2,
          tableTitle: "Đặc tả use case đăng ký",
        }),

        h2("2.1.3.3 — MK01 / MK02 — Đổi mật khẩu & Quên mật khẩu"),
        p(
          "Trong mã nguồn hiện tại không có API hoặc giao diện đổi mật khẩu cho người dùng cuối và không có luồng quên mật khẩu (gửi email reset). Nếu cần đưa vào luận văn như yêu cầu nghiệp vụ tương lai, có thể mô tả như mẫu chuẩn (nhập mật khẩu cũ/mới; gửi link reset qua email) và ghi chú “dự kiến mở rộng”.",
          { italics: true }
        ),
        cap(3, "Ghi chú phạm vi — đổi mật khẩu / quên mật khẩu"),

        ...uc({
          code: "2.1.3.4 — LH01",
          name: "Gửi tin nhắn liên hệ offline",
          desc: "Khách gửi yêu cầu hỗ trợ qua biểu mẫu trong widget chat (họ tên, số điện thoại, nội dung). Tin được lưu để quản trị viên xử lý trong mục Tin nhắn offline.",
          actors: "Khách hàng (không bắt buộc đăng nhập).",
          pre: "Không.",
          flows: [
            { stt: "1", who: "Khách hàng", what: "Mở widget chat, chọn gửi tin nhắn offline." },
            { stt: "2", who: "Khách hàng", what: "Nhập họ tên, số điện thoại, nội dung và gửi." },
            { stt: "3", who: "Hệ thống", what: "POST /api/v1/contact-messages với { name, phone, content }; trạng thái unread." },
            { stt: "4", who: "Hệ thống", what: "Thông báo gửi thành công cho người dùng." },
          ],
          post: "Tin nhắn được lưu và hiển thị cho Quản trị viên tại /admin/contact-messages.",
          tableNum: 4,
          tableTitle: "Đặc tả use case gửi tin nhắn liên hệ offline",
        }),

        ...uc({
          code: "2.1.3.5 — CHAT01",
          name: "Trò chuyện với chatbot (FAQ)",
          desc: "Khách trao đổi với bot hỗ trợ theo ngữ cảnh FAQ (dữ liệu chatbot-faq / ngữ cảnh tour) để được hướng dẫn nhanh về tour, đặt chỗ, chính sách.",
          actors: "Khách hàng.",
          pre: "Không.",
          flows: [
            { stt: "1", who: "Khách hàng", what: "Mở widget chat trên giao diện chính." },
            { stt: "2", who: "Khách hàng", what: "Nhập câu hỏi hoặc chọn gợi ý." },
            { stt: "3", who: "Hệ thống", what: "Gọi API chat; bot trả lời dựa trên FAQ và ngữ cảnh." },
          ],
          post: "Khách nhận phản hồi tự động; có thể chuyển sang gửi tin offline nếu cần.",
          tableNum: 5,
          tableTitle: "Đặc tả use case chatbot",
        }),

        ...uc({
          code: "2.1.3.6 — TOUR01",
          name: "Xem danh sách & lọc tour",
          desc: "Người dùng xem danh sách tour công khai, có thể lọc theo danh mục (mega filter) và tìm kiếm.",
          actors: "Khách hàng, Thành viên đã đăng nhập.",
          pre: "Không.",
          flows: [
            { stt: "1", who: "Người dùng", what: "Truy cập trang /tours." },
            { stt: "2", who: "Hệ thống", what: "Tải danh sách tour từ API; hiển thị thẻ tour." },
            { stt: "3", who: "Người dùng", what: "Chọn bộ lọc danh mục hoặc điều kiện tìm kiếm (nếu có)." },
          ],
          post: "Người dùng xác định được tour cần xem chi tiết.",
          tableNum: 6,
          tableTitle: "Đặc tả use case xem danh sách tour",
        }),

        ...uc({
          code: "2.1.3.7 — TOUR02",
          name: "Xem chi tiết tour",
          desc: "Hiển thị mô tả, lịch trình, giá, phương tiện, media và các thông tin đặt chỗ liên quan.",
          actors: "Khách hàng, Thành viên.",
          pre: "Đã có ít nhất một tour (thường qua danh sách).",
          flows: [
            { stt: "1", who: "Người dùng", what: "Chọn một tour từ danh sách." },
            { stt: "2", who: "Hệ thống", what: "Tải chi tiết tour GET /api/v1/tours/:id (hoặc slug tương đương)." },
            { stt: "3", who: "Người dùng", what: "Đọc thông tin; chọn bước tiếp theo là đặt chỗ nếu muốn." },
          ],
          post: "Người dùng có đủ thông tin để quyết định đặt chỗ.",
          tableNum: 7,
          tableTitle: "Đặc tả use case xem chi tiết tour",
        }),

        ...uc({
          code: "2.1.3.8 — BOOK01",
          name: "Tạo đặt chỗ (booking)",
          desc: "Khách điền thông tin liên hệ, số lượng người lớn/trẻ em, chọn ngày khởi hành trong lịch, danh sách hành khách (nếu có), vé tùy chọn, phương thức thanh toán (cọc/toàn phần/sau) và xác nhận điều khoản. Hệ thống tạo bản ghi booking.",
          actors: "Thành viên (khuyến nghị đăng nhập để theo dõi đơn).",
          pre: "Đã chọn tour và đủ chỗ theo lịch khởi hành.",
          flows: [
            { stt: "1", who: "Khách hàng", what: "Từ trang chi tiết tour, vào luồng đặt chỗ (/order/booking/:id)." },
            { stt: "2", who: "Khách hàng", what: "Chọn ngày khởi hành, số người, điền hành khách, vé add-on nếu có." },
            { stt: "3", who: "Khách hàng", what: "Chọn hình thức thanh toán (cọc/trả đủ/đặt chỗ trước tùy cấu hình)." },
            { stt: "4", who: "Hệ thống", what: "Kiểm tra dữ liệu; tạo booking qua API; chuyển sang bước thanh toán." },
          ],
          post: "Đơn đặt chỗ được tạo; người dùng chuyển tới trang thanh toán.",
          tableNum: 8,
          tableTitle: "Đặc tả use case tạo đặt chỗ",
        }),

        ...uc({
          code: "2.1.3.9 — PAY01",
          name: "Thanh toán đơn đặt chỗ",
          desc: "Hiển thị hướng dẫn thanh toán: chuyển khoản qua mã QR (SePay/VietQR) hoặc kênh Momo (mock trong client). Hệ thống có thể poll trạng thái thanh toán; webhook SePay cập nhật payment_status khi có tiền vào.",
          actors: "Khách hàng.",
          pre: "Đã có booking hợp lệ và số tiền cần thanh toán.",
          flows: [
            { stt: "1", who: "Khách hàng", what: "Vào /booking/payment/:id (có thể chọn gateway qua query)." },
            { stt: "2", who: "Hệ thống", what: "Hiển thị QR chuyển khoản hoặc luồng Momo mock tùy cấu hình." },
            { stt: "3", who: "Khách hàng", what: "Thực hiện chuyển khoản / xác nhận thanh toán." },
            { stt: "4", who: "Hệ thống", what: "Cập nhật trạng thái thanh toán (poll hoặc webhook); chuyển tới trang thành công." },
          ],
          post: "Thanh toán được ghi nhận theo mức (unpaid/deposit/paid) tùy nghiệp vụ.",
          tableNum: 9,
          tableTitle: "Đặc tả use case thanh toán",
        }),

        ...uc({
          code: "2.1.3.10 — BOOK02",
          name: "Xem lịch sử & chi tiết đặt chỗ của tôi",
          desc: "Khách đã đăng nhập xem danh sách đơn và chi tiết từng booking.",
          actors: "Thành viên (role user).",
          pre: "Đã đăng nhập.",
          flows: [
            { stt: "1", who: "Khách hàng", what: "Truy cập /my-bookings." },
            { stt: "2", who: "Hệ thống", what: "Liệt kê booking của người dùng." },
            { stt: "3", who: "Khách hàng", what: "Mở chi tiết /my-bookings/:id để xem trạng thái, hành khách, thanh toán." },
          ],
          post: "Khách theo dõi được tình trạng đơn.",
          tableNum: 10,
          tableTitle: "Đặc tả use case đặt chỗ của tôi",
        }),

        ...uc({
          code: "2.1.3.11 — GV01",
          name: "Đánh giá hướng dẫn viên",
          desc: "Khách hàng đã hoàn thành điều kiện nghiệp vụ có thể gửi đánh giá sao/nhận xét cho HDV (API có kiểm tra role user).",
          actors: "Thành viên (khách).",
          pre: "Đăng nhập với tài khoản khách; đủ điều kiện nghiệp vụ theo backend (ví dụ đã tham gia tour).",
          flows: [
            { stt: "1", who: "Khách hàng", what: "Thực hiện gửi đánh giá qua API guide-reviews (theo luồng client)." },
            { stt: "2", who: "Hệ thống", what: "Lưu đánh giá; phục vụ hiển thị và quản trị." },
          ],
          post: "Đánh giá được lưu trong hệ thống.",
          tableNum: 11,
          tableTitle: "Đặc tả use case đánh giá HDV",
        }),

        h2("2.1.3.12 — Khu vực Hướng dẫn viên (HDV)"),
        p(
          "Các route /hdv/* yêu cầu đăng nhập với role hdv hoặc guide. Gồm: Tổng quan, Danh sách tour được phân công, Lịch làm việc, Chi tiết booking để cập nhật tiến độ/hành khách."
        ),
        flowTable([
          { stt: "1", who: "HDV", what: "Đăng nhập; được chuyển tới /hdv." },
          { stt: "2", who: "HDV", what: "Xem dashboard, tour được gán, lịch trình." },
          { stt: "3", who: "HDV", what: "Mở chi tiết booking để thao tác nghiệp vụ theo quy định (cập nhật giai đoạn, ghi chú...)." },
        ]),
        cap(12, "Đặc tả khu vực HDV (tổng hợp)"),

        h2("2.1.3.13 — DB01 — Tổng quan (Dashboard admin)"),
        p(
          "Quản trị viên xem biểu đồ và chỉ số doanh thu, booking, xu hướng theo ngày/tháng/năm (API /api/v1/dashboard)."
        ),
        flowTable([
          { stt: "1", who: "Quản trị viên", what: "Đăng nhập admin, vào /admin/dashboard." },
          { stt: "2", who: "Hệ thống", what: "Tải dữ liệu thống kê và hiển thị biểu đồ." },
          { stt: "3", who: "Quản trị viên", what: "Chọn khoảng thời gian hoặc chế độ xem (nếu có trên UI)." },
        ]),
        cap(13, "Đặc tả use case tổng quan"),

        h2("2.1.3.14 — DM01 — Quản lý danh mục tour"),
        keyValueTable([
          ["Mã use case", "DM01"],
          ["Tên use case", "Quản lý danh mục tour"],
          [
            "Mô tả chung",
            "Thực hiện các chức năng xem danh sách, thêm mới, chỉnh sửa danh mục tour (phân cấp cha–con), phục vụ phân loại tour trên hệ thống ViGo.",
          ],
          ["Tác nhân chính", "Quản trị viên."],
          [
            "Tiền điều kiện",
            "Đăng nhập thành công bằng tài khoản quản trị viên (role admin) vào hệ thống.",
          ],
        ]),
        new Paragraph({ text: "" }),

        h3("Xem"),
        p("Luồng sự kiện chính", { bold: true }),
        flowTable([
          {
            stt: "1",
            who: "Quản trị viên",
            what: "Chọn Quản lý Danh mục → Danh sách danh mục trong khu vực quản trị (/admin/categories).",
          },
          {
            stt: "2",
            who: "Hệ thống",
            what: "Tải và hiển thị danh sách danh mục dạng cây (mở rộng/thu gọn cấp con), kèm tên, mô tả, danh mục cha, trạng thái (Hoạt động / Không hoạt động), thời điểm cập nhật.",
          },
          {
            stt: "3",
            who: "Quản trị viên",
            what: "(Tuỳ chọn) Tìm theo tên hoặc mô tả; lọc theo trạng thái; bấm Tải lại để làm mới dữ liệu.",
          },
        ]),
        p("Luồng sự kiện thay thế", { bold: true }),
        altFlowTable([
          {
            code: "2a",
            who: "Hệ thống",
            what: "Hiển thị không có dữ liệu (bảng rỗng) nếu chưa có danh mục nào thỏa bộ lọc.",
          },
          {
            code: "2b",
            who: "Hệ thống",
            what: "Hiển thị thông báo lỗi nếu không tải được danh sách (ví dụ lỗi kết nối máy chủ).",
          },
        ]),

        h3("Thêm mới"),
        p("Luồng sự kiện chính", { bold: true }),
        flowTable([
          {
            stt: "1",
            who: "Quản trị viên",
            what: "Từ trang danh sách danh mục, chọn Thêm danh mục (chuyển tới /admin/categories/create).",
          },
          {
            stt: "2",
            who: "Hệ thống",
            what: "Hiển thị biểu mẫu: tên (bắt buộc), mô tả, danh mục cha (tuỳ chọn), trạng thái (mặc định Hoạt động).",
          },
          {
            stt: "3",
            who: "Quản trị viên",
            what: "Nhập/chọn thông tin và gửi (hoàn tất biểu mẫu).",
          },
          {
            stt: "4",
            who: "Hệ thống",
            what: "Kiểm tra dữ liệu (bắt buộc, quan hệ cha hợp lệ, không gây vòng phân cấp).",
          },
          {
            stt: "5",
            who: "Hệ thống",
            what: "Ghi nhận danh mục mới vào CSDL, thông báo thành công, điều hướng về danh sách danh mục.",
          },
        ]),
        p("Luồng sự kiện thay thế", { bold: true }),
        altFlowTable([
          {
            code: "4a",
            who: "Hệ thống",
            what: "Thông báo lỗi nếu dữ liệu không hợp lệ (thiếu tên, cha không tồn tại, chọn cha gây vòng lặp…).",
          },
          {
            code: "5a",
            who: "Hệ thống",
            what: "Thông báo lỗi nếu thêm mới không thành công (lỗi máy chủ hoặc từ chối nghiệp vụ).",
          },
        ]),

        h3("Sửa"),
        p("Luồng sự kiện chính", { bold: true }),
        flowTable([
          {
            stt: "1",
            who: "Quản trị viên",
            what: "Trên danh sách, chọn Sửa đối với danh mục cần chỉnh sửa (màn hình theo mã danh mục).",
          },
          {
            stt: "2",
            who: "Hệ thống",
            what: "Hiển thị biểu mẫu với dữ liệu hiện tại; danh sách danh mục cha loại trừ nhánh con của chính danh mục đang sửa.",
          },
          {
            stt: "3",
            who: "Quản trị viên",
            what: "Điều chỉnh thông tin và bấm cập nhật / lưu.",
          },
          { stt: "4", who: "Hệ thống", what: "Kiểm tra dữ liệu sau chỉnh sửa." },
          {
            stt: "5",
            who: "Hệ thống",
            what: "Cập nhật CSDL, thông báo thành công, điều hướng về danh sách danh mục.",
          },
        ]),
        p("Luồng sự kiện thay thế", { bold: true }),
        altFlowTable([
          {
            code: "2a",
            who: "Hệ thống",
            what: "Thông báo lỗi / không hiển thị biểu mẫu nếu không tìm thấy danh mục hoặc mã không hợp lệ.",
          },
          {
            code: "4a",
            who: "Hệ thống",
            what: "Thông báo lỗi nếu dữ liệu sửa không phù hợp (ràng buộc tương tự khi thêm).",
          },
          {
            code: "5a",
            who: "Hệ thống",
            what: "Thông báo lỗi nếu cập nhật không thành công.",
          },
        ]),

        h3("Hậu điều kiện"),
        p(
          "Dữ liệu danh mục trên hệ thống được cập nhật (thêm hoặc sửa) sau khi luồng thành công; danh sách phản ánh thay đổi khi quản trị viên quay lại màn hình xem hoặc làm mới."
        ),
        p(
          "Ghi chú triển khai: giao diện quản trị còn hỗ trợ xoá danh mục từ danh sách (có xác nhận); có thể mô tả thành use case phụ trong luận văn nếu cần.",
          { italics: true, size: 22 }
        ),
        cap(14, "Đặc tả use case quản lý danh mục tour"),

        h2("2.1.3.15 — Quản trị: Hướng dẫn viên & Nhà cung cấp"),
        p(
          "Quản lý tài khoản HDV (tạo user role guide kèm hồ sơ HDV). Quản lý nhà cung cấp gồm phương tiện, khách sạn, phòng, nhà hàng, vé dịch vụ gắn với provider."
        ),
        flowTable([
          { stt: "1", who: "Quản trị viên", what: "Vào /admin/guides hoặc /admin/providers." },
          { stt: "2", who: "Quản trị viên", what: "Thêm/sửa hồ sơ; với provider có thể nhập chi tiết tài nguyên phụ trợ." },
          { stt: "3", who: "Hệ thống", what: "Lưu và đồng bộ dữ liệu (ví dụ tạo Guide khi gán role guide/hdv)." },
        ]),
        cap(15, "Đặc tả use case quản lý HDV & nhà cung cấp"),

        h2("2.1.3.16 — Quản trị: Đặt chỗ, Ngày lễ, Đánh giá, Người dùng, Tin nhắn"),
        p(
          "Danh sách đặt chỗ, tạo/sửa đơn, xem lịch sử thay đổi; cấu hình giá ngày lễ; duyệt/xử lý đánh giá HDV; quản lý user và vai trò; đọc và đánh dấu đã đọc tin nhắn offline."
        ),
        flowTable([
          { stt: "1", who: "Quản trị viên", what: "Chọn mục Đặt chỗ / Ngày lễ / Đánh giá / Người dùng / Tin nhắn offline." },
          { stt: "2", who: "Hệ thống", what: "Hiển thị dữ liệu và form thao tác." },
          { stt: "3", who: "Quản trị viên", what: "Thực hiện cập nhật (trạng thái đơn, phân công HDV, đọc tin nhắn...)." },
        ]),
        cap(16, "Đặc tả use case quản trị vận hành"),

        h2("2.1.4. Ma trận phân quyền các chức năng (theo thực tế triển khai)"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            matrixRow([
              "STT",
              "Chức năng",
              "Khách (chưa đăng nhập)",
              "Thành viên (user)",
              "HDV (guide/hdv)",
              "Quản trị (admin)",
            ]),
            matrixRow(["1", "Đăng ký", "✔", "", "", ""]),
            matrixRow(["2", "Đăng nhập", "✔", "✔", "✔", "✔"]),
            matrixRow(["3", "Xem tour / chi tiết", "✔", "✔", "—", "✔"]),
            matrixRow(["4", "Đặt chỗ & thanh toán", "✔*", "✔", "—", "✔"]),
            matrixRow(["5", "Đơn của tôi", "", "✔", "—", "—"]),
            matrixRow(["6", "Chatbot / tin offline", "✔", "✔", "—", "—"]),
            matrixRow(["7", "Đánh giá HDV", "", "✔", "—", "—"]),
            matrixRow(["8", "Khu vực HDV (/hdv)", "", "", "✔", "—"]),
            matrixRow(["9", "Tổng quan & cấu hình admin", "", "", "", "✔"]),
            matrixRow(["10", "Quản lý đặt chỗ, user, dữ liệu nghiệp vụ", "", "", "", "✔"]),
          ],
        }),
        p(
          "* Khách có thể đặt chỗ tùy luồng client (một số bước khuyến nghị đăng nhập để quản lý đơn). Điều chỉnh dấu ✔ theo đúng chính sách bạn trình bày trong luận văn.",
          { italics: true, size: 20 }
        ),
      ],
    },
  ],
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const buffer = await Packer.toBuffer(doc);
let written = outPath;
try {
  fs.writeFileSync(outPath, buffer);
} catch (err) {
  if (err && (err.code === "EBUSY" || err.code === "EPERM")) {
    written = path.join(path.dirname(outPath), "2.1.3-Dac-ta-use-case-ViGo-ban-moi.docx");
    fs.writeFileSync(written, buffer);
    console.warn("File .docx gốc đang mở hoặc bị khóa; đã ghi bản mới tại:", written);
  } else {
    throw err;
  }
}
console.log("Đã tạo:", written);
console.log(
  "Gợi ý: Cursor/VS Code không xem được .docx — mở file Word bằng Explorer hoặc: start \"\" \"<đường dẫn .docx>\""
);
console.log(
  "Bản Markdown (mở được trong Cursor):",
  path.join(path.dirname(outPath), "2.1.3-Dac-ta-use-case-ViGo.md")
);
