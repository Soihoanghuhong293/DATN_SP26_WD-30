const fs = require("fs");
const zlib = require("zlib");

function encodeDiagramModelXml(modelXml) {
  // diagrams.net uses: encodeURIComponent -> raw deflate -> base64
  // See: https://github.com/jgraph/drawio-tools and various decode examples
  const uriEncoded = encodeURIComponent(modelXml);
  const deflated = zlib.deflateRawSync(Buffer.from(uriEncoded, "utf8"), {
    level: 9,
  });
  return deflated.toString("base64");
}

function main() {
  const src = "docs/drawio/flowcharts.drawio";
  const out = "docs/drawio/flowcharts.compressed.v2.drawio";

  let xml = fs.readFileSync(src, "utf8");

  if (!xml.startsWith("<?xml")) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  }

  xml = xml.replace(
    /<mxfile([^>]*?)compressed="false"([^>]*?)>/,
    '<mxfile$1compressed="true"$2>',
  );

  // Convert each <diagram>...</diagram> that contains an <mxGraphModel> into compressed payload.
  // Use a broader regex so comments/whitespace don't prevent encoding.
  xml = xml.replace(
    /<diagram([^>]*)>([\s\S]*?)<\/diagram>/g,
    (_m, diagramAttrs, diagramBody) => {
      const match = diagramBody.match(
        /<mxGraphModel[\s\S]*?<\/mxGraphModel>/,
      );
      if (!match) {
        // Leave as-is (could already be compressed or empty)
        return `<diagram${diagramAttrs}>${diagramBody}</diagram>`;
      }
      const modelXml = match[0];
      const b64 = encodeDiagramModelXml(modelXml);
      return `<diagram${diagramAttrs}>${b64}</diagram>`;
    },
  );

  fs.writeFileSync(out, xml, "utf8");
  process.stdout.write(`WROTE ${out} (${fs.statSync(out).size} bytes)\n`);
}

main();

