const fs = require("fs");

// Spacing rules tuned for report readability:
// - Increase page size to provide whitespace
// - Spread nodes by scaling x/y and adding extra gap for right columns
const TARGET_DIAGRAM_IDS = new Set([
  "p1",  // tạo booking
  "p2",  // momo
  "p3",  // sepay
  "p7",  // hdv điểm danh
  "p8",  // hdv nhật ký theo ngày
  "p14", // tour template
  "p15", // giá ngày lễ
  "p18", // chatbot
  "p21", // nhà cung cấp + dịch vụ
  "p22", // phân xe
  "p23", // phân phòng
  "p9",  // đăng kí (và login chung tab)
]);

function spreadGeometryTag(tag) {
  // mxGeometry x=".." y=".." width=".." height=".."
  const xMatch = tag.match(/\bx="([0-9]+)"/);
  const yMatch = tag.match(/\by="([0-9]+)"/);
  if (!xMatch || !yMatch) return tag;

  let x = Number(xMatch[1]);
  let y = Number(yMatch[1]);

  // base scaling
  x = Math.round(x * 1.15);
  y = Math.round(y * 1.12);

  // extra horizontal gaps for multi-column layouts
  if (x > 600) x += 180;
  if (x > 1100) x += 220;

  return tag
    .replace(/\bx="[0-9]+"/, `x="${x}"`)
    .replace(/\by="[0-9]+"/, `y="${y}"`);
}

function spreadDiagramBlock(block) {
  // enlarge page
  block = block.replace(
    /pageWidth="1600"\s+pageHeight="900"/g,
    'pageWidth="2200" pageHeight="1200"',
  );
  block = block.replace(/dx="1600"\s+dy="900"/g, 'dx="2200" dy="1200"');

  // spread geometries
  block = block.replace(/<mxGeometry[^>]*\bas="geometry"\s*\/>/g, (m) =>
    spreadGeometryTag(m),
  );
  return block;
}

function main() {
  const file = "docs/drawio/flowcharts.drawio";
  let xml = fs.readFileSync(file, "utf8");

  xml = xml.replace(
    /<diagram id="([^"]+)"[\s\S]*?<\/diagram>/g,
    (m, id) => (TARGET_DIAGRAM_IDS.has(id) ? spreadDiagramBlock(m) : m),
  );

  fs.writeFileSync(file, xml, "utf8");
  process.stdout.write("SPREAD_OK\n");
}

main();

