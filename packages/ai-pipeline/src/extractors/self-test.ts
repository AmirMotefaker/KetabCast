import assert from "node:assert/strict";
import { extractEpub } from "./epub.ts";
import { extractDigitalPdf } from "./pdf.ts";
import { ExtractionError } from "./types.ts";

const epub = createStoredZip({
  mimetype: "application/epub+zip",
  "META-INF/container.xml": '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
  "OPS/book.opf": '<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>کتاب آزمایشی زبدینو</dc:title></metadata><manifest><item id="c1" href="chapter-1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="chapter-2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>',
  "OPS/chapter-1.xhtml": "<html><head><title>فصل یک</title></head><body><h1>فصل یک</h1><p>این متن کاملاً آزمایشی است.</p></body></html>",
  "OPS/chapter-2.xhtml": "<html><head><title>فصل دو</title></head><body><p>زبدینو متن را به ترتیب فصل استخراج می‌کند.</p></body></html>",
});

const epubResult = extractEpub(epub);
assert.equal(epubResult.status, "ready");
assert.equal(epubResult.title, "کتاب آزمایشی زبدینو");
assert.equal(epubResult.sections.length, 2);
assert.equal(epubResult.sections[0].sourceRef, "OPS/chapter-1.xhtml");
assert.match(epubResult.sections[1].text, /ترتیب فصل/);

assertExtractionCode(() => extractEpub(new TextEncoder().encode("not a zip")), "invalid-signature");
assertExtractionCode(() => extractEpub(createStoredZip({
  mimetype: "application/epub+zip",
  "../escape.txt": "unsafe",
})), "archive-path-traversal");
assertExtractionCode(() => extractEpub(epub, {
  maxArchiveBytes: 10,
  maxEntries: 10,
  maxEntryBytes: 10,
  maxTotalBytes: 10,
  maxCompressionRatio: 10,
}), "archive-limit-exceeded");

const textPdf = createPdf("Zobdino generated fixture text for digital extraction.");
const textPdfResult = await extractDigitalPdf(textPdf);
assert.equal(textPdfResult.status, "ready");
assert.equal(textPdfResult.sections[0].sourceRef, "page:1");
assert.match(textPdfResult.sections[0].text, /generated fixture text/);

const blankPdfResult = await extractDigitalPdf(createPdf());
assert.equal(blankPdfResult.status, "ocr-required");
assert.equal(blankPdfResult.sections.length, 1);

await assert.rejects(
  () => extractDigitalPdf(new TextEncoder().encode("not a pdf")),
  (error: unknown) => error instanceof ExtractionError && error.code === "invalid-signature",
);
await assert.rejects(
  () => extractDigitalPdf(new TextEncoder().encode("%PDF-1.4\n/Encrypt true")),
  (error: unknown) => error instanceof ExtractionError && error.code === "encrypted-or-drm",
);

console.log("Zobdino P0 extractors: EPUB security/order and PDF text/OCR routing validated.");

function assertExtractionCode(action: () => unknown, code: string): void {
  assert.throws(action, (error: unknown) => error instanceof ExtractionError && error.code === code);
}

function createStoredZip(files: Record<string, string>): Uint8Array {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const [name, value] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8");
    const content = Buffer.from(value, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    localParts.push(local, nameBytes, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, nameBytes);
    localOffset += local.length + nameBytes.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return new Uint8Array(Buffer.concat([...localParts, centralDirectory, eocd]));
}

function createPdf(text?: string): Uint8Array {
  const escaped = text?.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const stream = escaped ? `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET` : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}
