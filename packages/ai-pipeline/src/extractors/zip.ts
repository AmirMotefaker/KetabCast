import { inflateRawSync } from "node:zlib";
import { posix } from "node:path";
import { ExtractionError } from "./types.ts";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

export interface ZipLimits {
  maxArchiveBytes: number;
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
  maxCompressionRatio: number;
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxArchiveBytes: 50 * 1024 * 1024,
  maxEntries: 2_000,
  maxEntryBytes: 10 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  maxCompressionRatio: 100,
};

export function readZipEntries(
  bytes: Uint8Array,
  limits: ZipLimits = DEFAULT_ZIP_LIMITS,
): Map<string, Uint8Array> {
  if (bytes.byteLength > limits.maxArchiveBytes) limitError();
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEocd(data);
  const entryCount = data.readUInt16LE(eocdOffset + 10);
  const centralSize = data.readUInt32LE(eocdOffset + 12);
  const centralOffset = data.readUInt32LE(eocdOffset + 16);

  if (entryCount > limits.maxEntries || centralOffset + centralSize > data.length) limitError();

  const entries = new Map<string, Uint8Array>();
  let offset = centralOffset;
  let totalBytes = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > data.length || data.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new ExtractionError("invalid-container", "ساختار مرکزی EPUB معتبر نیست.");
    }

    const flags = data.readUInt16LE(offset + 8);
    const method = data.readUInt16LE(offset + 10);
    const compressedSize = data.readUInt32LE(offset + 20);
    const originalSize = data.readUInt32LE(offset + 24);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localOffset = data.readUInt32LE(offset + 42);
    const nameEnd = offset + 46 + nameLength;

    if (flags & 0x1) {
      throw new ExtractionError("encrypted-or-drm", "EPUB رمزگذاری‌شده قابل پردازش نیست.");
    }
    if (nameEnd > data.length) throw new ExtractionError("invalid-container", "نام ورودی ZIP ناقص است.");

    const rawName = data.subarray(offset + 46, nameEnd).toString("utf8");
    const name = validateArchivePath(rawName);
    if (originalSize > limits.maxEntryBytes) limitError();
    if (compressedSize === 0 ? originalSize > 0 : originalSize / compressedSize > limits.maxCompressionRatio) limitError();
    totalBytes += originalSize;
    if (totalBytes > limits.maxTotalBytes) limitError();

    if (!name.endsWith("/")) {
      if (entries.has(name)) throw new ExtractionError("invalid-container", "ورودی تکراری در EPUB شناسایی شد.");
      entries.set(name, readLocalEntry(data, localOffset, compressedSize, originalSize, method, limits));
    }

    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function readLocalEntry(
  data: Buffer,
  offset: number,
  compressedSize: number,
  originalSize: number,
  method: number,
  limits: ZipLimits,
): Uint8Array {
  if (offset + 30 > data.length || data.readUInt32LE(offset) !== LOCAL_SIGNATURE) {
    throw new ExtractionError("invalid-container", "ورودی محلی ZIP معتبر نیست.");
  }
  const nameLength = data.readUInt16LE(offset + 26);
  const extraLength = data.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const end = start + compressedSize;
  if (end > data.length) throw new ExtractionError("invalid-container", "داده ZIP ناقص است.");
  const compressed = data.subarray(start, end);

  if (method === 0) return new Uint8Array(compressed);
  if (method !== 8) {
    throw new ExtractionError("unsupported-compression", "روش فشرده‌سازی EPUB پشتیبانی نمی‌شود.");
  }

  try {
    const inflated = inflateRawSync(compressed, { maxOutputLength: limits.maxEntryBytes });
    if (inflated.length !== originalSize) {
      throw new ExtractionError("invalid-container", "اندازه محتوای EPUB با فهرست آن هم‌خوان نیست.");
    }
    return new Uint8Array(inflated);
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError("invalid-container", "بازکردن محتوای EPUB ناموفق بود.");
  }
}

function findEocd(data: Buffer): number {
  const minimum = Math.max(0, data.length - 65_557);
  for (let offset = data.length - 22; offset >= minimum; offset -= 1) {
    if (data.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  throw new ExtractionError("invalid-signature", "امضای ZIP/EPUB پیدا نشد.");
}

function validateArchivePath(value: string): string {
  const normalized = posix.normalize(value.replaceAll("\\", "/"));
  if (!value || posix.isAbsolute(normalized) || /^[a-z]:/i.test(value) || normalized === ".." || normalized.startsWith("../")) {
    throw new ExtractionError("archive-path-traversal", "مسیر ناامن در EPUB شناسایی شد.");
  }
  return normalized;
}

function limitError(): never {
  throw new ExtractionError("archive-limit-exceeded", "حد ایمنی آرشیو EPUB عبور کرده است.");
}
