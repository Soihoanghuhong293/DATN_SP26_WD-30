import fs from "node:fs";
import path from "node:path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";

type MdBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "table"; rows: string[][] };

function parseMarkdown(md: string): MdBlock[] {
  const lines = md.split(/\r?\n/);
  const blocks: MdBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: "heading", level: h[1].length, text: h[2].trim() });
      i++;
      continue;
    }

    // Markdown table: header row + separator row + data rows
    if (trimmed.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().match(/^\|\s*-+/)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const r = lines[i].trim();
        const cells = r
          .slice(1, -1) // drop leading/trailing |
          .split("|")
          .map((c) => c.trim().replace(/\\\|/g, "|"));
        rows.push(cells);
        i++;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }

    // paragraph (collect until blank line)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

function headingLevel(level: number) {
  if (level <= 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  if (level === 3) return HeadingLevel.HEADING_3;
  if (level === 4) return HeadingLevel.HEADING_4;
  if (level === 5) return HeadingLevel.HEADING_5;
  return HeadingLevel.HEADING_6;
}

function makeDoc(blocks: MdBlock[]) {
  const children: (Paragraph | Table)[] = [];

  for (const b of blocks) {
    if (b.kind === "heading") {
      children.push(
        new Paragraph({
          text: b.text,
          heading: headingLevel(b.level),
        })
      );
      continue;
    }

    if (b.kind === "paragraph") {
      children.push(new Paragraph({ children: [new TextRun(b.text)] }));
      continue;
    }

    if (b.kind === "table") {
      const rows = b.rows.map(
        (r) =>
          new TableRow({
            children: r.map(
              (c) =>
                new TableCell({
                  width: { size: 100 / Math.max(1, r.length), type: WidthType.PERCENTAGE },
                  children: [new Paragraph(c)],
                })
            ),
          })
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        })
      );
      // spacing after table
      children.push(new Paragraph(""));
    }
  }

  return new Document({
    sections: [{ children }],
  });
}

async function main() {
  const serverRoot = path.resolve(__dirname, ".."); // Server/
  const inPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(serverRoot, "docs", "db-tables.md");
  const outPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : path.join(serverRoot, "docs", "db-tables.docx");

  const md = fs.readFileSync(inPath, "utf8");
  const blocks = parseMarkdown(md);
  const doc = makeDoc(blocks);
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);
  process.stdout.write(`OK: wrote ${outPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

