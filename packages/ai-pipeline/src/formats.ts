import type { IngestionDecision, UploadDescriptor } from "./contracts.ts";

interface FormatDefinition {
  id: string;
  extensions: readonly string[];
  mimeTypes: readonly string[];
  stage: "p0" | "p1" | "p2";
  extraction: "text" | "ocr" | "text-or-ocr";
}

export const FORMAT_REGISTRY = [
  { id: "pdf", extensions: ["pdf"], mimeTypes: ["application/pdf"], stage: "p0", extraction: "text-or-ocr" },
  { id: "epub", extensions: ["epub"], mimeTypes: ["application/epub+zip"], stage: "p0", extraction: "text" },
  { id: "docx", extensions: ["docx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], stage: "p0", extraction: "text" },
  { id: "text", extensions: ["txt", "md"], mimeTypes: ["text/plain", "text/markdown"], stage: "p0", extraction: "text" },
  { id: "html", extensions: ["html", "htm"], mimeTypes: ["text/html"], stage: "p0", extraction: "text" },
  { id: "azw3", extensions: ["azw3"], mimeTypes: ["application/vnd.amazon.ebook"], stage: "p1", extraction: "text" },
  { id: "mobi", extensions: ["mobi"], mimeTypes: ["application/x-mobipocket-ebook"], stage: "p1", extraction: "text" },
  { id: "cbz", extensions: ["cbz"], mimeTypes: ["application/vnd.comicbook+zip", "application/zip"], stage: "p1", extraction: "ocr" },
  { id: "cbr", extensions: ["cbr"], mimeTypes: ["application/vnd.comicbook-rar", "application/vnd.rar", "application/x-rar-compressed"], stage: "p1", extraction: "ocr" },
  { id: "kfx", extensions: ["kfx"], mimeTypes: ["application/vnd.amazon.mobi8-ebook"], stage: "p2", extraction: "text" },
] as const satisfies readonly FormatDefinition[];

const extensionOf = (fileName: string) => {
  const match = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1];
};

export function evaluateUpload(upload: UploadDescriptor): IngestionDecision {
  if (!Number.isSafeInteger(upload.sizeBytes) || upload.sizeBytes <= 0) {
    return reject("invalid-size", "اندازه فایل معتبر نیست.");
  }

  if (upload.encrypted) {
    return reject("encrypted-or-drm", "فایل رمزگذاری‌شده یا دارای DRM قابل پردازش نیست.");
  }

  if (upload.rightsBasis === "unknown") {
    return reject("rights-unconfirmed", "برای پردازش فایل باید حق دسترسی یا مجوز آن را تأیید کنید.");
  }

  const extension = extensionOf(upload.fileName);
  const format = FORMAT_REGISTRY.find((candidate) => candidate.extensions.some((value) => value === extension));

  if (!format) {
    return reject("unsupported-format", "این فرمت هنوز پشتیبانی نمی‌شود.");
  }

  const declaredMimeType = upload.declaredMimeType?.trim().toLowerCase();
  if (declaredMimeType && !format.mimeTypes.some((value) => value === declaredMimeType)) {
    return {
      accepted: false,
      stage: format.stage,
      extraction: format.extraction,
      reasonCode: "mime-extension-mismatch",
      userMessageFa: "نوع واقعی فایل با پسوند آن هم‌خوان نیست.",
    };
  }

  return {
    accepted: true,
    formatId: format.id,
    stage: format.stage,
    extraction: format.extraction,
    userMessageFa: format.stage === "p2"
      ? "فرمت آزمایشی پذیرفته شد و ممکن است پردازش کامل نشود."
      : "فایل برای پردازش پذیرفته شد.",
  };
}

function reject(
  reasonCode: NonNullable<IngestionDecision["reasonCode"]>,
  userMessageFa: string,
): IngestionDecision {
  return { accepted: false, stage: "p0", extraction: "text", reasonCode, userMessageFa };
}
