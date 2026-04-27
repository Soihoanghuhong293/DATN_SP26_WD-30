import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";

type DbmlTable = {
  name: string;
  columns: { name: string; type: string; notes?: string; pk?: boolean }[];
};

type DbmlRef = { fromTable: string; fromCol: string; toTable: string; toCol: string };

function toDbmlIdent(s: string) {
  // dbdiagram/dbml identifiers are happy with snake_case / camelCase.
  // We only quote when there are spaces or hyphens.
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) return s;
  return `"${s.replace(/"/g, '\\"')}"`;
}

function mapMongooseType(schemaType: any): { type: string; isJson: boolean } {
  // Arrays & subdocs: represent as JSON for diagrams
  if (schemaType?.instance === "Array") return { type: "json", isJson: true };
  if (schemaType?.instance === "Embedded" || schemaType?.$isSingleNested) return { type: "json", isJson: true };
  if (schemaType?.instance === "Mixed") return { type: "json", isJson: true };

  const inst = schemaType?.instance;
  switch (inst) {
    case "ObjectId":
      return { type: "ObjectId", isJson: false };
    case "String":
      return { type: "string", isJson: false };
    case "Number":
      return { type: "number", isJson: false };
    case "Boolean":
      return { type: "boolean", isJson: false };
    case "Date":
      return { type: "datetime", isJson: false };
    case "Decimal128":
      return { type: "decimal", isJson: false };
    default:
      return { type: "json", isJson: true };
  }
}

function getCollectionName(model: mongoose.Model<any>) {
  // Without connecting, collection name is still derived by Mongoose pluralization.
  const anyModel: any = model as any;
  return (
    anyModel?.collection?.collectionName ||
    anyModel?.collection?.name ||
    mongoose.pluralize()(model.modelName).toLowerCase()
  );
}

function loadAllModels(modelsDirAbs: string) {
  const entries = fs.readdirSync(modelsDirAbs, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => n.endsWith(".ts") || n.endsWith(".js"))
    // Ignore obvious non-model files if any
    .filter((n) => !n.endsWith(".d.ts"));

  return Promise.all(
    files.map(async (f) => {
      const abs = path.join(modelsDirAbs, f);
      // Windows absolute paths must be imported as file:// URLs in ESM
      await import(pathToFileURL(abs).href);
      return f;
    })
  );
}

function buildDbml(): { tables: DbmlTable[]; refs: DbmlRef[] } {
  const tables: DbmlTable[] = [];
  const refs: DbmlRef[] = [];

  const models = mongoose.modelNames().map((n) => mongoose.model(n));
  const modelNameToTable = new Map<string, string>();
  for (const m of models) modelNameToTable.set(m.modelName, getCollectionName(m));

  for (const model of models) {
    const tableName = modelNameToTable.get(model.modelName) ?? model.modelName;
    const schema = model.schema;

    const columns: DbmlTable["columns"] = [];

    // Ensure _id exists and is pk
    columns.push({ name: "_id", type: "ObjectId", pk: true });

    for (const [p, schemaType] of Object.entries(schema.paths)) {
      if (p === "_id" || p === "__v") continue;
      // Nested paths like "schedule.0.title" are not useful for DBML
      if (p.includes(".")) continue;

      const { type, isJson } = mapMongooseType(schemaType);
      const col: DbmlTable["columns"][number] = { name: p, type };

      if (isJson) col.notes = "nested/array";
      columns.push(col);

      // References (ObjectId ref)
      const opts: any = (schemaType as any)?.options || {};
      if (opts?.ref && type === "ObjectId") {
        const toTable = modelNameToTable.get(String(opts.ref)) ?? String(opts.ref);
        refs.push({ fromTable: tableName, fromCol: p, toTable, toCol: "_id" });
      }

      // References (Array of ObjectId ref)
      const caster: any = (schemaType as any)?.caster;
      const casterOpts: any = caster?.options || {};
      if (casterOpts?.ref) {
        const toTable = modelNameToTable.get(String(casterOpts.ref)) ?? String(casterOpts.ref);
        refs.push({ fromTable: tableName, fromCol: p, toTable, toCol: "_id" });
      }
    }

    // Add timestamps if schema uses timestamps and they are named in options
    const ts: any = (schema as any)?.options?.timestamps;
    if (ts) {
      if (typeof ts === "object") {
        if (ts.createdAt && !columns.some((c) => c.name === ts.createdAt)) {
          columns.push({ name: ts.createdAt, type: "datetime" });
        }
        if (ts.updatedAt && !columns.some((c) => c.name === ts.updatedAt)) {
          columns.push({ name: ts.updatedAt, type: "datetime" });
        }
      } else {
        if (!columns.some((c) => c.name === "createdAt")) columns.push({ name: "createdAt", type: "datetime" });
        if (!columns.some((c) => c.name === "updatedAt")) columns.push({ name: "updatedAt", type: "datetime" });
      }
    }

    // De-dupe columns by name
    const seen = new Set<string>();
    const uniqCols = columns.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
    tables.push({ name: tableName, columns: uniqCols });
  }

  // De-dupe refs
  const refKey = (r: DbmlRef) => `${r.fromTable}.${r.fromCol}>${r.toTable}.${r.toCol}`;
  const refSeen = new Set<string>();
  const uniqRefs = refs.filter((r) => (refSeen.has(refKey(r)) ? false : (refSeen.add(refKey(r)), true)));

  // Stable output
  tables.sort((a, b) => a.name.localeCompare(b.name));
  uniqRefs.sort((a, b) => refKey(a).localeCompare(refKey(b)));

  return { tables, refs: uniqRefs };
}

function renderDbml(tables: DbmlTable[], refs: DbmlRef[]) {
  const lines: string[] = [];
  lines.push("// Auto-generated from Mongoose models");
  lines.push("");

  for (const t of tables) {
    lines.push(`Table ${toDbmlIdent(t.name)} {`);
    for (const c of t.columns) {
      const attrs: string[] = [];
      if (c.pk) attrs.push("pk");
      const note = c.notes ? `note: "${c.notes.replace(/"/g, '\\"')}"` : "";
      if (note) attrs.push(note);
      const attrPart = attrs.length ? ` [${attrs.join(", ")}]` : "";
      lines.push(`  ${toDbmlIdent(c.name)} ${c.type}${attrPart}`);
    }
    lines.push("}");
    lines.push("");
  }

  for (const r of refs) {
    lines.push(
      `Ref: ${toDbmlIdent(r.fromTable)}.${toDbmlIdent(r.fromCol)} > ${toDbmlIdent(r.toTable)}.${toDbmlIdent(
        r.toCol
      )}`
    );
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  const repoRoot = path.resolve(__dirname, ".."); // Server/
  const modelsDir = path.join(repoRoot, "src", "models");
  const outPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(repoRoot, "docs", "dbdiagram.dbml");

  if (!fs.existsSync(modelsDir)) {
    throw new Error(`Models dir not found: ${modelsDir}`);
  }

  await loadAllModels(modelsDir);

  const { tables, refs } = buildDbml();
  const dbml = renderDbml(tables, refs);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, dbml, "utf8");
  process.stdout.write(`OK: wrote ${outPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

