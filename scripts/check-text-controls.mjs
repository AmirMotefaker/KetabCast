import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";
import { TextDecoder } from "node:util";

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const specialTextNames = new Set([
  ".env.example",
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
]);

const forbidden = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const decoder = new TextDecoder("utf-8", { fatal: true });

function isTextCandidate(path) {
  return specialTextNames.has(path.split(/[\\/]/u).at(-1)) ||
    textExtensions.has(extname(path).toLowerCase());
}

function positionOf(text, index) {
  const before = text.slice(0, index);
  const lines = before.split("\n");
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  };
}

const raw = execFileSync("git", ["ls-files", "-z"]);
const files = raw
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .filter(isTextCandidate);

const failures = [];

for (const file of files) {
  if (statSync(file).size > 5 * 1024 * 1024) {
    continue;
  }

  const buffer = readFileSync(file);
  let text;

  try {
    text = decoder.decode(buffer);
  } catch {
    failures.push(`${file}: invalid UTF-8`);
    continue;
  }

  const match = forbidden.exec(text);
  if (!match) continue;

  const codePoint = match[0].codePointAt(0);
  const { line, column } = positionOf(text, match.index);
  failures.push(
    `${file}:${line}:${column} unexpected control character U+${codePoint
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}`,
  );
}

if (failures.length > 0) {
  console.error("Tracked text hygiene check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Text hygiene PASS: scanned ${files.length} tracked text files.`);
