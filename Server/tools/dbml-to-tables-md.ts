import fs from "node:fs";
import path from "node:path";

type Column = {
  name: string;
  type: string;
  notNull: boolean;
  pk: boolean;
  note?: string;
};

type Table = {
  name: string;
  columns: Column[];
};

type Ref = {
  fromTable: string;
  fromCol: string;
  toTable: string;
  toCol: string;
};

function parseAttrs(raw: string) {
  // raw like: 'pk, not null, unique, note: "nested/array"'
  const attrs = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Record<string, string | boolean> = {};
  for (const a of attrs) {
    if (a.includes(":")) {
      const [k, ...rest] = a.split(":");
      out[k.trim()] = rest.join(":").trim().replace(/^"|"$/g, "");
    } else {
      out[a] = true;
    }
  }
  return out;
}

function parseDbml(dbml: string): { tables: Table[]; refs: Ref[] } {
  const lines = dbml.split(/\r?\n/);
  const tables: Table[] = [];
  const refs: Ref[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith("Table ")) {
      const name = line.replace(/^Table\s+/, "").replace(/\s*\{$/, "").trim().replaceAll('"', "");
      i++;
      const cols: Column[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("}")) {
        const l = lines[i].trim();
        if (!l) {
          i++;
          continue;
        }
        // column line: <name> <type> [attrs]
        const m = l.match(/^("?[\w$-]+"?)\s+([A-Za-z0-9_()]+)(?:\s+\[(.+)\])?$/);
        if (m) {
          const colName = m[1].replaceAll('"', "");
          const colType = m[2];
          const attrsRaw = m[3];
          const attrs = attrsRaw ? parseAttrs(attrsRaw) : {};
          cols.push({
            name: colName,
            type: colType,
            notNull: Boolean(attrs["not null"]),
            pk: Boolean(attrs["pk"]),
            note: typeof attrs["note"] === "string" ? String(attrs["note"]) : undefined,
          });
        }
        i++;
      }
      // skip closing }
      while (i < lines.length && !lines[i].trim().startsWith("}")) i++;
      i++;
      tables.push({ name, columns: cols });
      continue;
    }

    if (line.startsWith("Ref:")) {
      // Ref: a.b > c._id
      const m = line.match(/^Ref:\s+([^.\s]+)\.([^\s]+)\s+>\s+([^.\s]+)\.([^\s]+)\s*$/);
      if (m) {
        refs.push({
          fromTable: m[1].replaceAll('"', ""),
          fromCol: m[2].replaceAll('"', ""),
          toTable: m[3].replaceAll('"', ""),
          toCol: m[4].replaceAll('"', ""),
        });
      }
    }
    i++;
  }

  tables.sort((a, b) => a.name.localeCompare(b.name));
  return { tables, refs };
}

function mdEscape(s: string) {
  return s.replace(/\|/g, "\\|");
}

function toReportMd(tables: Table[], refs: Ref[]) {
  const fkMap = new Map<string, Ref[]>();
  for (const r of refs) {
    const key = `${r.fromTable}.${r.fromCol}`;
    const arr = fkMap.get(key) ?? [];
    arr.push(r);
    fkMap.set(key, arr);
  }

  const out: string[] = [];
  out.push("## Danh sách 21 bảng (theo DBML)");
  out.push("");

  for (const t of tables) {
    out.push(`### Bảng \`${t.name}\``);
    out.push("");
    out.push("| STT | Tên trường | Kiểu | Độ dài | Rỗng | Khóa | Ghi chú |");
    out.push("|---:|---|---|---:|---|---|---|");

    t.columns.forEach((c, idx) => {
      const required = c.notNull ? "Not" : "";
      const keyParts: string[] = [];
      if (c.pk) keyParts.push("PK");
      const fks = fkMap.get(`${t.name}.${c.name}`) ?? [];
      if (fks.length) keyParts.push("FK");

      const noteParts: string[] = [];
      if (fks.length) {
        for (const fk of fks) noteParts.push(`-> \`${fk.toTable}.${fk.toCol}\``);
      }
      if (c.note) noteParts.push(c.note);

      out.push(
        `| ${idx + 1} | \`${mdEscape(c.name)}\` | ${mdEscape(c.type)} |  | ${required} | ${keyParts.join(", ")} | ${mdEscape(
          noteParts.join("; ")
        )} |`
      );
    });

    out.push("");
  }

  return out.join("\n");
}

async function main() {
  const serverRoot = path.resolve(__dirname, ".."); // Server/
  const inPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(serverRoot, "docs", "dbdiagram.dbml");
  const outPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : path.join(serverRoot, "docs", "db-tables.md");

  const dbml = fs.readFileSync(inPath, "utf8");
  const { tables, refs } = parseDbml(dbml);
  const md = toReportMd(tables, refs);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, "utf8");
  process.stdout.write(`OK: wrote ${outPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

