import { posix } from "node:path";
import { ExtractionError, type ExtractionResult } from "./types.ts";
import { readZipEntries, type ZipLimits } from "./zip.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });

export function extractEpub(bytes: Uint8Array, limits?: ZipLimits): ExtractionResult {
  const entries = readZipEntries(bytes, limits);
  const mimetype = readText(entries, "mimetype").trim();
  if (mimetype !== "application/epub+zip") {
    throw new ExtractionError("invalid-signature", "فایل، EPUB معتبر نیست.");
  }

  const container = readText(entries, "META-INF/container.xml");
  const packagePath = attribute(container, "rootfile", "full-path");
  const packageXml = readText(entries, packagePath);
  const packageDir = posix.dirname(packagePath);
  const title = firstTagText(packageXml, "dc:title");

  const manifest = new Map<string, string>();
  for (const tag of packageXml.match(/<item\b[^>]*>/gi) ?? []) {
    const id = attribute(tag, "item", "id");
    const href = attribute(tag, "item", "href");
    manifest.set(id, safeResolve(packageDir, href));
  }

  const spineIds = [...packageXml.matchAll(/<itemref\b[^>]*\bidref=["']([^"']+)["'][^>]*>/gi)].map((match) => decodeXml(match[1]));
  if (spineIds.length === 0) throw new ExtractionError("invalid-container", "ترتیب فصل‌های EPUB پیدا نشد.");

  const sections = spineIds.map((id, index) => {
    const path = manifest.get(id);
    if (!path) throw new ExtractionError("invalid-container", "فصل EPUB در manifest پیدا نشد.");
    const html = readText(entries, path);
    const sectionTitle = firstTagText(html, "title") || firstTagText(html, "h1") || undefined;
    return { index, sourceRef: path, title: sectionTitle, text: normalizeMarkup(html) };
  }).filter((section) => section.text.length > 0);

  if (sections.length === 0) throw new ExtractionError("extraction-failed", "متن قابل استفاده‌ای در EPUB پیدا نشد.");
  return {
    formatId: "epub",
    status: "ready",
    title: title || undefined,
    sections,
    characterCount: sections.reduce((sum, section) => sum + section.text.length, 0),
  };
}

function readText(entries: Map<string, Uint8Array>, path: string): string {
  const value = entries.get(path);
  if (!value) throw new ExtractionError("invalid-container", `ورودی ضروری EPUB پیدا نشد: ${path}`);
  try { return decoder.decode(value); } catch { throw new ExtractionError("invalid-container", "متن EPUB کدگذاری UTF-8 معتبر ندارد."); }
}

function attribute(xml: string, element: string, name: string): string {
  const tag = xml.match(new RegExp(`<${element}\\b[^>]*>`, "i"))?.[0];
  const value = tag?.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1];
  if (!value) throw new ExtractionError("invalid-container", `ویژگی ${name} در EPUB پیدا نشد.`);
  return decodeXml(value);
}

function safeResolve(directory: string, href: string): string {
  const decoded = decodeURIComponent(href.split("#")[0]);
  const resolved = posix.normalize(posix.join(directory, decoded));
  if (resolved === ".." || resolved.startsWith("../") || posix.isAbsolute(resolved)) {
    throw new ExtractionError("archive-path-traversal", "مسیر ناامن در manifest EPUB شناسایی شد.");
  }
  return resolved;
}

function firstTagText(xml: string, tag: string): string {
  const escaped = tag.replace(":", "\\:");
  const value = xml.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"))?.[1] ?? "";
  return normalizeMarkup(value);
}

function normalizeMarkup(value: string): string {
  return decodeXml(value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[\t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXml(value: string): string {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) return safeCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return safeCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function safeCodePoint(value: number): string {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
    ? String.fromCodePoint(value)
    : "�";
}
