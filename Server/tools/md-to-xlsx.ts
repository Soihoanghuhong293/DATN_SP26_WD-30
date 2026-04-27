import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx-js-style";

type Row = {
  STT: number;
  "Bảng"?: string;
  "Tên trường": string;
  "Kiểu": string;
  "Độ dài": string;
  "Rỗng": string;
  "Khóa": string;
  "Ghi chú": string;
};

type TableBlock = {
  tableName: string;
  rows: Row[];
};

function parseMdTables(md: string): TableBlock[] {
  const lines = md.split(/\r?\n/);
  const blocks: TableBlock[] = [];

  let i = 0;
  let currentTable = "";
  while (i < lines.length) {
    const l = lines[i].trim();

    const h = l.match(/^###\s+Bảng\s+`(.+?)`/);
    if (h) {
      currentTable = h[1];
      i++;
      continue;
    }

    if (currentTable && l.startsWith("| STT |")) {
      // header row + separator + data rows
      i += 2;
      const rows: Row[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        // | STT | Tên trường | Kiểu | Độ dài | Rỗng | Khóa | Ghi chú |
        const stt = Number(cells[0]);
        rows.push({
          STT: Number.isFinite(stt) ? stt : rows.length + 1,
          "Tên trường": cells[1] ?? "",
          "Kiểu": cells[2] ?? "",
          "Độ dài": cells[3] ?? "",
          "Rỗng": cells[4] ?? "",
          "Khóa": cells[5] ?? "",
          "Ghi chú": (cells[6] ?? "").replace(/\\\|/g, "|"),
        });
        i++;
      }

      blocks.push({ tableName: currentTable, rows });
      currentTable = "";
      continue;
    }

    i++;
  }

  return blocks;
}

function stripBackticks(s: string) {
  return s.replace(/`/g, "");
}

function prettyTableName(s: string) {
  // rough singular-ish for Vietnamese notes
  // bookings -> booking, users -> user, etc.
  if (s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (s.endsWith("s")) return s.slice(0, -1);
  return s;
}

function inferVietnameseNote(table: string, field: string, key: string, currentNote: string) {
  const f = field;
  const t = table;
  const lower = f.toLowerCase();

  // Always Vietnamese for nested notes
  const normalized = currentNote.trim();
  if (normalized) {
    const vn = normalized
      .replace(/->\s*`([^`]+)`/g, "Khóa ngoại liên kết tới $1")
      .replace(/nested\/array/gi, "Dữ liệu dạng mảng (lồng)")
      .replace(/nested\/object/gi, "Dữ liệu dạng đối tượng (lồng)")
      .replace(/nested\//gi, "Dữ liệu lồng: ");
    // If note was only a FK arrow or nested note, vn is already Vietnamese.
    if (vn !== normalized) return vn;
  }

  // Primary key
  if (f === "_id" || f === "id") return `ID duy nhất của ${prettyTableName(t)}`;

  // Foreign key notes already present as -> table.col
  const fkMatch = normalized.match(/->\s*`([^`]+)`/);
  if (fkMatch) {
    const target = fkMatch[1];
    return `Khóa ngoại liên kết tới ${target}`;
  }

  // Common timestamps
  if (lower === "created_at" || lower === "createdat") return "Thời gian tạo";
  if (lower === "updated_at" || lower === "updatedat" || lower === "update_at") return "Thời gian cập nhật";

  // Common fields
  if (lower.startsWith("customer_")) {
    const suf = lower.replace("customer_", "");
    if (suf === "name") return "Tên khách hàng";
    if (suf === "phone") return "Số điện thoại khách hàng";
    if (suf === "email") return "Email khách hàng";
    if (suf === "address") return "Địa chỉ khách hàng";
    if (suf === "note") return "Ghi chú của khách hàng";
  }
  if (lower === "total_price") return "Tổng tiền";
  if (lower === "startdate") return "Ngày bắt đầu";
  if (lower === "enddate") return "Ngày kết thúc";
  if (lower === "groupsize") return "Số lượng người";
  if (lower === "payment_status") return "Trạng thái thanh toán";
  if (lower === "tour_stage") return "Giai đoạn tour";
  if (lower === "paymentmethod") return "Phương thức thanh toán";
  if (lower === "optional_ticket_ids") return "Danh sách ID vé tuỳ chọn";
  if (lower === "optional_tickets_total") return "Tổng tiền vé tuỳ chọn";
  if (lower === "guests") return "Danh sách khách trong đoàn";
  if (lower === "logs") return "Nhật ký thay đổi";
  if (lower === "diary_entries") return "Nhật ký hành trình";

  if (lower === "name") return `Tên ${prettyTableName(t)}`;
  if (lower === "title") return "Tiêu đề";
  if (lower === "content" || lower === "comment" || lower === "message") return "Nội dung";
  if (lower === "description") return "Mô tả";
  if (lower === "status") return "Trạng thái";
  if (lower === "email") return "Địa chỉ email";
  if (lower === "phone") return "Số điện thoại";
  if (lower === "address") return "Địa chỉ";
  if (lower === "password") return "Mật khẩu";
  if (lower === "role") return "Vai trò";
  if (lower === "rating") return "Điểm đánh giá";
  if (lower === "amount") return "Số tiền";
  if (lower === "currency") return "Loại tiền tệ";
  if (lower === "method") return "Phương thức";
  if (lower === "pay_type") return "Loại thanh toán";

  // MoMo-specific
  if (lower.startsWith("momo_")) {
    const suffix = lower.replace("momo_", "");
    if (suffix === "order_id") return "Mã đơn hàng MoMo";
    if (suffix === "request_id") return "Mã request MoMo";
    if (suffix === "message") return "Thông báo từ MoMo";
    if (suffix === "result_code") return "Mã kết quả MoMo";
    if (suffix === "trans_id") return "Mã giao dịch MoMo";
    return `Thông tin MoMo (${suffix})`;
  }

  // Generic *_id
  if (lower.endsWith("_id")) {
    const base = lower.slice(0, -3);
    return `ID của ${base}`;
  }

  // Fallback: never empty, 100% Vietnamese
  return `Thông tin ${f} của ${t}`;
}

function normalizeRow(table: string, r: Row) {
  const field = stripBackticks(r["Tên trường"]);
  const key = r["Khóa"];
  const note = inferVietnameseNote(table, field, key, r["Ghi chú"]);
  return {
    ...r,
    "Tên trường": field,
    "Ghi chú": note || r["Ghi chú"],
  };
}

async function main() {
  const serverRoot = path.resolve(__dirname, ".."); // Server/
  const inMd = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(serverRoot, "docs", "db-tables.md");
  const outXlsx = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : path.join(serverRoot, "docs", "db-tables.xlsx");
  const mode = (process.argv[4] ?? "multi").toLowerCase(); // multi | single | blocks

  const md = fs.readFileSync(inMd, "utf8");
  const blocks = parseMdTables(md);

  const wb = XLSX.utils.book_new();

  if (mode === "blocks") {
    const aoa: any[][] = [];
    for (const b of blocks) {
      // Title row
      aoa.push([`Bảng: ${b.tableName}`]);
      // Header row
      aoa.push(["STT", "Tên trường", "Kiểu", "Độ dài", "Rỗng", "Khóa", "Ghi chú"]);

      for (const r of b.rows) {
        const nr = normalizeRow(b.tableName, r);
        aoa.push([
          nr.STT,
          nr["Tên trường"],
          nr["Kiểu"],
          nr["Độ dài"],
          nr["Rỗng"],
          nr["Khóa"],
          nr["Ghi chú"],
        ]);
      }
      // blank rows between tables
      aoa.push([]);
      aoa.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    (ws as any)["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 14 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 55 },
    ];

    // Styling helpers
    const borderAll = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    } as const;

    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill: { patternType: "solid", fgColor: { rgb: "D9D9D9" } },
      border: borderAll,
    };

    const titleStyle = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: "left", vertical: "center" },
    };

    const cellStyle = {
      alignment: { vertical: "top", wrapText: true },
      border: borderAll,
    };

    // Apply styles row-by-row (AOA starts at row 1)
    const range = XLSX.utils.decode_range((ws as any)["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      const firstCellAddr = XLSX.utils.encode_cell({ r: R, c: 0 });
      const firstCell = (ws as any)[firstCellAddr];
      const rowA = aoa[R] ?? [];

      const isTitleRow = rowA.length === 1 && typeof rowA[0] === "string" && String(rowA[0]).startsWith("Bảng:");
      const isHeaderRow = rowA.length >= 7 && rowA[0] === "STT" && rowA[6] === "Ghi chú";

      if (isTitleRow && firstCell) {
        firstCell.s = titleStyle;
        // merge title across 7 columns (A..G)
        (ws as any)["!merges"] = (ws as any)["!merges"] || [];
        (ws as any)["!merges"].push({ s: { r: R, c: 0 }, e: { r: R, c: 6 } });
        continue;
      }

      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = (ws as any)[addr];
        if (!cell) continue;
        cell.s = isHeaderRow ? headerStyle : cellStyle;
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "ALL_TABLES_BLOCKS");
  } else if (mode === "single") {
    const all: Row[] = [];
    for (const b of blocks) {
      for (const r of b.rows) {
        const nr = normalizeRow(b.tableName, r);
        all.push({ ...nr, Bảng: b.tableName });
      }
    }
    const ws = XLSX.utils.json_to_sheet(all, {
      header: ["Bảng", "STT", "Tên trường", "Kiểu", "Độ dài", "Rỗng", "Khóa", "Ghi chú"],
    });
    (ws as any)["!cols"] = [
      { wch: 18 },
      { wch: 6 },
      { wch: 28 },
      { wch: 14 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 45 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "ALL_TABLES");
  } else {
    for (const b of blocks) {
      const data = b.rows.map((r) => normalizeRow(b.tableName, r));
      const ws = XLSX.utils.json_to_sheet(data, {
        header: ["STT", "Tên trường", "Kiểu", "Độ dài", "Rỗng", "Khóa", "Ghi chú"],
      });

      // Column widths (approx)
      (ws as any)["!cols"] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 14 },
        { wch: 10 },
        { wch: 8 },
        { wch: 10 },
        { wch: 45 },
      ];

      // Sheet name max 31 chars
      const sheetName = b.tableName.length > 31 ? b.tableName.slice(0, 31) : b.tableName;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }

  XLSX.writeFile(wb, outXlsx);
  process.stdout.write(`OK: wrote ${outXlsx}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

