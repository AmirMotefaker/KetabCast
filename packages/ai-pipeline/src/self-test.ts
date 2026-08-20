import assert from "node:assert/strict";
import type { UploadDescriptor } from "./contracts.ts";
import { evaluateUpload, FORMAT_REGISTRY } from "./formats.ts";

const base: UploadDescriptor = {
  fileName: "book.epub",
  declaredMimeType: "application/epub+zip",
  sizeBytes: 1024,
  encrypted: false,
  rightsBasis: "user-owned",
  processingMode: "both",
  voiceId: "sulafat",
};

assert.equal(FORMAT_REGISTRY.length, 10);
assert.deepEqual(evaluateUpload(base), {
  accepted: true,
  formatId: "epub",
  stage: "p0",
  extraction: "text",
  userMessageFa: "فایل برای پردازش پذیرفته شد.",
});
assert.equal(evaluateUpload({ ...base, fileName: "scan.pdf", declaredMimeType: "application/pdf" }).extraction, "text-or-ocr");
assert.equal(evaluateUpload({ ...base, fileName: "comic.cbz", declaredMimeType: "application/zip" }).extraction, "ocr");
assert.equal(evaluateUpload({ ...base, fileName: "book.kfx", declaredMimeType: "application/vnd.amazon.mobi8-ebook" }).stage, "p2");
assert.equal(evaluateUpload({ ...base, encrypted: true }).reasonCode, "encrypted-or-drm");
assert.equal(evaluateUpload({ ...base, rightsBasis: "unknown" }).reasonCode, "rights-unconfirmed");
assert.equal(evaluateUpload({ ...base, declaredMimeType: "application/pdf" }).reasonCode, "mime-extension-mismatch");
assert.equal(evaluateUpload({ ...base, fileName: "archive.exe", declaredMimeType: undefined }).reasonCode, "unsupported-format");
assert.equal(evaluateUpload({ ...base, sizeBytes: 0 }).reasonCode, "invalid-size");

console.log("Zobdino ingestion contract: 10 formats and policy gates validated.");
