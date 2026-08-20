import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { ExtractionError, type ExtractionResult } from "./types.ts";

const execFileAsync = promisify(execFile);

export interface PdfLimits {
  maxBytes: number;
  maxPages: number;
  maxCharacters: number;
  minCharactersPerPage: number;
  timeoutMs: number;
}

export const DEFAULT_PDF_LIMITS: PdfLimits = {
  maxBytes: 50 * 1024 * 1024,
  maxPages: 500,
  maxCharacters: 5_000_000,
  minCharactersPerPage: 8,
  timeoutMs: 30_000,
};

export async function extractDigitalPdf(
  bytes: Uint8Array,
  limits: PdfLimits = DEFAULT_PDF_LIMITS,
): Promise<ExtractionResult> {
  if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new ExtractionError("invalid-signature", "امضای PDF معتبر نیست.");
  }
  if (bytes.byteLength > limits.maxBytes) limitError();
  const ascii = Buffer.from(bytes.buffer, bytes.byteOffset, Math.min(bytes.byteLength, 2_000_000)).toString("latin1");
  if (/\/Encrypt\b/.test(ascii)) throw new ExtractionError("encrypted-or-drm", "PDF رمزگذاری‌شده قابل پردازش نیست.");

  const directory = await mkdtemp(join(tmpdir(), "zobdino-pdf-"));
  const path = join(directory, "source.pdf");
  try {
    await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
    const info = await run("pdfinfo", [path], limits);
    if (/^Encrypted:\s+yes/im.test(info)) throw new ExtractionError("encrypted-or-drm", "PDF رمزگذاری‌شده قابل پردازش نیست.");
    const pages = Number.parseInt(info.match(/^Pages:\s+(\d+)/im)?.[1] ?? "0", 10);
    if (!Number.isSafeInteger(pages) || pages < 1) throw new ExtractionError("extraction-failed", "تعداد صفحه PDF قابل تشخیص نیست.");
    if (pages > limits.maxPages) limitError();

    const output = await run("pdftotext", ["-enc", "UTF-8", "-f", "1", "-l", String(pages), path, "-"], limits);
    if (output.length > limits.maxCharacters) limitError();
    const pageTexts = output.split("\f").slice(0, pages).map(normalizeText);
    const characterCount = pageTexts.reduce((sum, text) => sum + text.length, 0);
    const status = characterCount < pages * limits.minCharactersPerPage ? "ocr-required" : "ready";
    return {
      formatId: "pdf",
      status,
      sections: pageTexts.map((text, index) => ({ index, sourceRef: `page:${index + 1}`, text })),
      characterCount,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function run(command: string, args: string[], limits: PdfLimits): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      encoding: "utf8",
      timeout: limits.timeoutMs,
      maxBuffer: Math.min(limits.maxCharacters * 4, 20 * 1024 * 1024),
      windowsHide: true,
    });
    return stdout;
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new ExtractionError("extractor-unavailable", "ابزار امن استخراج PDF روی worker نصب نیست.");
    const detail = `${(error as { stderr?: string }).stderr ?? ""} ${(error as Error).message ?? ""}`;
    if (/password|encrypted/i.test(detail)) throw new ExtractionError("encrypted-or-drm", "PDF رمزگذاری‌شده قابل پردازش نیست.");
    throw new ExtractionError("extraction-failed", "استخراج متن PDF ناموفق بود.");
  }
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function limitError(): never {
  throw new ExtractionError("document-limit-exceeded", "حد ایمنی سند PDF عبور کرده است.");
}
