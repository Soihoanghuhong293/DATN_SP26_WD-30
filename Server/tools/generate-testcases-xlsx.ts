import path from "node:path";
import * as XLSX from "xlsx-js-style";

type TestCase = {
  id: string;
  title: string;
  description: string;
  procedure: string;
  testData: string;
  expected: string;
};

type Group = {
  name: string;
  ui?: string[];
  api?: string[];
  cases: TestCase[];
};

function steps(items: string[]) {
  return items.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

const groups: Group[] = [
  {
    name: "3) Quản lý danh mục (Admin) ~ 6 case",
    ui: ["Trang quản lý danh mục (danh sách)", "Trang tạo danh mục", "Trang chỉnh sửa danh mục"],
    api: [
      "Lấy danh sách danh mục",
      "Lấy cây danh mục theo phân cấp",
      "Tạo mới danh mục",
      "Cập nhật danh mục theo mã",
      "Xoá danh mục theo mã",
    ],
    cases: [
      {
        id: "CAT-01",
        title: "Xem danh sách danh mục",
        description: "Quản trị viên xem danh sách danh mục.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Truy cập trang quản lý danh mục.",
          "Quan sát danh sách danh mục hiển thị trên màn hình.",
          "Đối chiếu dữ liệu hiển thị với dữ liệu trong hệ thống (nếu cần).",
        ]),
        testData: "Tài khoản quản trị hợp lệ; hệ thống có ít nhất 01 danh mục đã tạo.",
        expected: "Trả về danh sách danh mục (200) và hiển thị đúng trên giao diện.",
      },
      {
        id: "CAT-02",
        title: "Lấy cây danh mục đúng cấu trúc phân cấp",
        description: "Lấy cây danh mục theo cấu trúc cha – con.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Thực hiện chức năng lấy cây danh mục (phân cấp).",
          "Kiểm tra dữ liệu trả về có cấu trúc phân cấp cha – con đúng.",
        ]),
        testData: "Có dữ liệu danh mục cha–con (ít nhất 01 danh mục cha và 01 danh mục con).",
        expected: "Trả về đúng cấu trúc phân cấp (200).",
      },
      {
        id: "CAT-03",
        title: "Tạo danh mục thiếu trường bắt buộc → 400",
        description: "Tạo danh mục nhưng thiếu trường bắt buộc theo model/validator.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Thực hiện tạo mới danh mục với dữ liệu thiếu trường bắt buộc.",
          "Gửi yêu cầu.",
          "Kiểm tra mã lỗi và thông báo trả về.",
        ]),
        testData: "Dữ liệu tạo danh mục thiếu tên danh mục (trường bắt buộc): chỉ nhập mô tả và trạng thái, bỏ trống tên.",
        expected: "Trả về 400 và thông báo lỗi kiểm tra dữ liệu.",
      },
      {
        id: "CAT-04",
        title: "Cập nhật danh mục với id không tồn tại → 404/400",
        description: "Cập nhật danh mục nhưng id không tồn tại.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chuẩn bị một id hợp lệ về định dạng nhưng không tồn tại trong hệ thống.",
          "Thực hiện cập nhật danh mục theo mã đó với dữ liệu hợp lệ (ví dụ: đổi tên).",
          "Kiểm tra mã lỗi trả về.",
        ]),
        testData: "Mã danh mục không tồn tại (nhưng đúng định dạng); dữ liệu cập nhật: đổi tên danh mục thành “Danh mục A”.",
        expected: "Trả về 404 hoặc 400 tuỳ theo xử lý của controller.",
      },
      {
        id: "CAT-05",
        title: "Xoá danh mục đang được tour sử dụng → theo nghiệp vụ",
        description: "Xoá danh mục đang được tour tham chiếu/sử dụng.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn một danh mục đang được ít nhất 1 tour sử dụng (tour.category_id = category._id).",
          "Thực hiện xoá danh mục đó.",
          "Kiểm tra phản hồi theo quy tắc nghiệp vụ của hệ thống.",
        ]),
        testData: "Danh mục A đang được sử dụng bởi Tour B (Tour B thuộc danh mục A).",
        expected:
          "Nếu có ràng buộc: bị chặn theo nghiệp vụ (ví dụ 409/400). Nếu không có ràng buộc: xoá thành công.",
      },
      {
        id: "CAT-SEC-01",
        title: "Chưa đăng nhập gọi tạo/sửa/xoá → 401",
        description: "Kiểm tra bảo mật (nếu dự án yêu cầu quyền quản trị).",
        procedure: steps([
          "Đảm bảo đang ở trạng thái chưa đăng nhập (không có token/cookie hợp lệ).",
          "Thực hiện chức năng tạo danh mục.",
          "Thực hiện chức năng cập nhật danh mục.",
          "Thực hiện chức năng xoá danh mục.",
          "Kiểm tra mã lỗi trả về.",
        ]),
        testData: "Trạng thái chưa đăng nhập; không có phiên đăng nhập hợp lệ.",
        expected: "Trả về 401 (Không được phép).",
      },
    ],
  },
  {
    name: "4) Quản lý tour (Template & Trip) ~ 15 case",
    ui: [
      "Mẫu tour: danh sách / tạo mới / chỉnh sửa",
      "Tour: danh sách / tạo mới / chỉnh sửa",
    ],
    api: [
      "Mẫu tour: lấy danh sách / tạo mới / xem chi tiết / cập nhật / xoá",
      "Tour: lấy danh sách / tạo mới / xem chi tiết / cập nhật / xoá",
    ],
    cases: [
      {
        id: "TPL-01",
        title: "Tạo mẫu tour thành công",
        description: "Tạo mẫu tour (tour template) hợp lệ.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Truy cập trang tạo mẫu tour.",
          "Nhập đầy đủ thông tin mẫu tour hợp lệ.",
          "Nhấn Lưu/Tạo mới.",
          "Kiểm tra mẫu tour được tạo và hiển thị trong danh sách.",
        ]),
        testData:
          "Mẫu tour hợp lệ: tên “Mẫu A”, thuộc danh mục hợp lệ, thuộc nhà cung cấp hợp lệ, số ngày = 3, lịch trình hợp lệ.",
        expected: "Tạo thành công (201/200) và trả về mẫu tour mới.",
      },
      {
        id: "TPL-02",
        title: "Cập nhật mẫu tour kiểm tra dữ liệu → 400",
        description: "Cập nhật mẫu tour với trường không hợp lệ.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn một mẫu tour đã tồn tại.",
          "Thực hiện cập nhật mẫu tour với dữ liệu không hợp lệ.",
          "Kiểm tra mã lỗi và thông báo trả về.",
        ]),
        testData:
          "Dữ liệu không hợp lệ: số ngày < 0 hoặc bỏ trống trường bắt buộc (tên/danh mục/nhà cung cấp...).",
        expected: "Trả về 400 và thông báo lỗi kiểm tra dữ liệu.",
      },
      {
        id: "TPL-03",
        title: "Xoá mẫu tour đang được tour sử dụng → theo ràng buộc",
        description: "Xoá mẫu tour đang được tour tham chiếu/sử dụng.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn một mẫu tour đang được ít nhất 01 tour sử dụng.",
          "Thực hiện xoá mẫu tour đó.",
          "Kiểm tra phản hồi theo quy tắc ràng buộc.",
        ]),
        testData: "Mẫu tour A đang được Tour B sử dụng (tour được tạo từ mẫu này).",
        expected:
          "Nếu có ràng buộc: bị chặn (ví dụ 409/400). Nếu không có ràng buộc: xoá thành công.",
      },
      {
        id: "TOUR-ADM-CRT-01",
        title: "Tạo tour hợp lệ",
        description: "Tạo tour (trip instance) hợp lệ.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Truy cập trang tạo tour.",
          "Nhập dữ liệu hợp lệ (giá > 0, ngày khởi hành đúng định dạng, số chỗ > 0).",
          "Nhấn Tạo mới/Lưu.",
          "Kiểm tra tour được tạo thành công và dữ liệu lịch khởi hành được chuẩn hoá.",
        ]),
        testData:
          "Tour hợp lệ: tên “Tour A”, giá = 1.000.000, ngày khởi hành “2026-04-20”, số chỗ = 20, số ngày = 3, danh sách ảnh/chính sách/nhà cung cấp/lịch trình hợp lệ.",
        expected: "Tạo thành công (201/200). Lịch khởi hành được chuẩn hoá chỉ giữ ngày đầu.",
      },
      {
        id: "TOUR-ADM-CRT-02",
        title: "Giá tour ≤ 0 → 400",
        description: "Tạo tour với giá không hợp lệ.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Thực hiện tạo tour với giá ≤ 0.",
          "Gửi yêu cầu.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Dữ liệu tạo tour giống hợp lệ nhưng giá = 0 (hoặc -1).",
        expected: "400 “Giá tour phải lớn hơn 0”.",
      },
      {
        id: "TOUR-ADM-CRT-03",
        title: "Ngày khởi hành sai định dạng → 400",
        description: "Tạo tour với ngày khởi hành sai định dạng.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Thực hiện tạo tour với ngày khởi hành sai định dạng.",
          "Gửi yêu cầu.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Dữ liệu tạo tour giống hợp lệ nhưng ngày khởi hành nhập sai (ví dụ: “2026/04/20” hoặc “20-04-2026”).",
        expected: "400 lỗi định dạng ngày.",
      },
      {
        id: "TOUR-ADM-CRT-04",
        title: "Số chỗ ≤ 0 → 400",
        description: "Tạo tour với số chỗ không hợp lệ.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Thực hiện tạo tour với số chỗ ≤ 0.",
          "Gửi yêu cầu.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Dữ liệu tạo tour giống hợp lệ nhưng số chỗ = 0 (hoặc -1).",
        expected: "400 lỗi số chỗ phải lớn hơn 0.",
      },
      {
        id: "TOUR-ADM-CRT-05",
        title: "Trùng tên tour + ngày khởi hành → 400",
        description: "Không cho trùng tên tour + ngày khởi hành.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chuẩn bị 01 tour đã tồn tại với (tên tour, ngày khởi hành).",
          "Thực hiện tạo tour mới với tên và ngày khởi hành trùng tour đã có.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Đã có tour: tên “Tour A”, ngày khởi hành “2026-04-20”. Tạo tour mới dùng lại đúng tên và ngày này.",
        expected: "400 “Tour đã tồn tại…”.",
      },
      {
        id: "TOUR-ADM-CRT-06",
        title: "Tạo tour từ mẫu nhưng thiếu hướng dẫn viên chính → 400",
        description: "Tạo tour từ mẫu bắt buộc chọn hướng dẫn viên chính.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn tạo tour từ một mẫu tour hợp lệ.",
          "Không chọn hướng dẫn viên chính.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Tạo tour từ mẫu tour nhưng bỏ trống trường “Hướng dẫn viên chính”.",
        expected: "Trả về 400 và thông báo thiếu hướng dẫn viên chính.",
      },
      {
        id: "TOUR-ADM-UPD-01",
        title: "Cập nhật có sửa lịch trình → 400",
        description: "Không cho phép sửa lịch trình chi tiết khi cập nhật tour.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn một tour đã tồn tại.",
          "Thực hiện cập nhật tour nhưng có thay đổi phần lịch trình.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData: "Dữ liệu cập nhật có thay đổi lịch trình (ví dụ: thay đổi hoạt động/ngày/tiêu đề trong lịch trình).",
        expected: "400 “Không được sửa itinerary”.",
      },
      {
        id: "TOUR-ADM-UPD-02",
        title: "Tour có đơn đặt, sửa trường không cho phép → 409",
        description: "Nếu tour đã có đơn đặt (không bị huỷ) thì chỉ được sửa các trường cho phép.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn tour đang có đơn đặt (không bị huỷ).",
          "Thực hiện cập nhật tour với trường không nằm trong danh sách cho phép.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Tour có ít nhất 01 đơn đặt đang hiệu lực. Thực hiện cập nhật các trường bị cấm (ví dụ: đổi tên tour).",
        expected: "409 bị chặn theo nghiệp vụ.",
      },
      {
        id: "TOUR-ADM-UPD-03",
        title: "Cập nhật lịch khởi hành có ngày trùng → 400",
        description: "Không cho dữ liệu cập nhật lịch khởi hành bị trùng ngày.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn một tour đã tồn tại.",
          "Thực hiện cập nhật lịch khởi hành với 2 dòng có cùng ngày.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Dữ liệu cập nhật lịch khởi hành: có 2 lịch cùng ngày “2026-04-20” nhưng số chỗ khác nhau.",
        expected: "400 lỗi ngày bị trùng.",
      },
      {
        id: "TOUR-ADM-UPD-04",
        title: "Cập nhật lịch khởi hành trùng tour khác cùng tên → 400",
        description: "Không cho trùng (tên tour + ngày khởi hành) với tour khác.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chuẩn bị 2 tour có cùng tên.",
          "Cập nhật ngày khởi hành của tour A để trùng với tour B.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData:
          "Tour A và Tour B cùng tên. Cập nhật ngày khởi hành của Tour A trùng ngày khởi hành của Tour B.",
        expected: "400 lỗi trùng tour.",
      },
      {
        id: "TOUR-ADM-DEL-01",
        title: "Xoá tour có đơn đặt → 409",
        description: "Không cho xoá tour nếu có đơn đặt (không bị huỷ).",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn tour đang có đơn đặt (không bị huỷ).",
          "Thực hiện xoá tour.",
          "Kiểm tra mã lỗi và thông báo.",
        ]),
        testData: "Tour A có ít nhất 01 đơn đặt đang hiệu lực (không bị huỷ).",
        expected: "409 “không thể xoá”.",
      },
      {
        id: "TOUR-ADM-DEL-02",
        title: "Xoá tour không có đơn đặt → 204",
        description: "Xoá tour khi không có đơn đặt.",
        procedure: steps([
          "Đăng nhập tài khoản quản trị (nếu hệ thống yêu cầu).",
          "Chọn tour không có đơn đặt.",
          "Thực hiện xoá tour.",
          "Kiểm tra mã trả về.",
        ]),
        testData: "Tour A không có đơn đặt (hoặc tất cả đơn đặt đã bị huỷ).",
        expected: "204 (Không có nội dung) hoặc 200 tuỳ theo xử lý của controller.",
      },
    ],
  },
];

const columns = [
  "ID (Mã chức năng)",
  "Tên test",
  "Mô tả trường hợp",
  "Các bước thực hiện / Dữ liệu thực hiện",
  "Dữ liệu test",
  "Kết quả mong muốn",
  "Kết quả thực tế",
  "Phụ thuộc test case",
  "Kết luận (Pass/Fail)",
  "Ngày thực hiện",
  "Người thực hiện",
  "Ghi chú",
] as const;

function main() {
  const outPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(__dirname, "..", "docs", "testcases-admin.xlsx");

  const aoa: any[][] = [];
  aoa.push([...columns]);

  const executor = "Vũ Minh Đức";

  for (const g of groups) {
    const execDate = g.name.startsWith("3)") ? "15/4" : g.name.startsWith("4)") ? "16/4" : "";
    // group row
    aoa.push([g.name]);
    if (g.ui?.length) aoa.push([`UI: ${g.ui.join(", ")}`]);
    if (g.api?.length) aoa.push([`API: ${g.api.join(", ")}`]);
    aoa.push([]);
    for (const tc of g.cases) {
      aoa.push([
        tc.id,
        tc.title,
        tc.description,
        tc.procedure,
        tc.testData,
        tc.expected,
        tc.expected, // actual (prefill)
        "", // dependencies
        "Pass", // result (prefill)
        execDate, // date
        executor, // executor
        "", // note
      ]);
    }
    aoa.push([]);
    aoa.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  (ws as any)["!cols"] = [
    { wch: 18 },
    { wch: 30 },
    { wch: 35 },
    { wch: 38 },
    { wch: 34 },
    { wch: 34 },
    { wch: 34 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
  ];

  const borderAll = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  } as const;

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: "1F4E79" } },
    border: borderAll,
  };

  const groupStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: "2F5597" } },
  };

  const cellStyle = {
    alignment: { vertical: "top", wrapText: true },
    border: borderAll,
  };

  const range = XLSX.utils.decode_range((ws as any)["!ref"]);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = (ws as any)[addr];
      if (!cell) continue;
      if (R === 0) {
        cell.s = headerStyle;
      } else {
        cell.s = cellStyle;
      }
    }

    // group rows: only col A has value, others empty
    const aAddr = XLSX.utils.encode_cell({ r: R, c: 0 });
    const aCell = (ws as any)[aAddr];
    if (R > 0 && aCell && typeof aCell.v === "string") {
      const isGroupRow =
        String(aCell.v).startsWith("3)") || String(aCell.v).startsWith("4)") || String(aCell.v).startsWith("UI:") || String(aCell.v).startsWith("API:");
      if (isGroupRow) {
        aCell.s = groupStyle;
        (ws as any)["!merges"] = (ws as any)["!merges"] || [];
        (ws as any)["!merges"].push({ s: { r: R, c: 0 }, e: { r: R, c: columns.length - 1 } });
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TESTCASES");
  XLSX.writeFile(wb, outPath);
  process.stdout.write(`OK: wrote ${outPath}\n`);
}

main();

