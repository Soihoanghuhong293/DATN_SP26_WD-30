const fs = require("fs");

function main() {
  const file = "docs/drawio/flowcharts.drawio";
  let xml = fs.readFileSync(file, "utf8");

  // Repair structural attribute name accidentally vietnamized: mã= -> id=
  // Only targets attribute names (whitespace + mã="...").
  xml = xml.replace(/\s+mã="/g, ' id="');

  fs.writeFileSync(file, xml, "utf8");
  process.stdout.write("REPAIRED\n");
}

main();

