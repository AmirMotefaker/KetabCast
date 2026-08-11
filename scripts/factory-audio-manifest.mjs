import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { resolveFactorySlugs } from "./factory-selection.mjs";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected arg: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    result[key.slice(2)] = value;
    index += 1;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(
  await readFile("content/factory/books.json", "utf8"),
);

const slugs = resolveFactorySlugs(catalog, args.slug);

const assets = slugs.map((slug) => {
  const book = catalog.books.find((entry) => entry.slug === slug);
  if (!book) throw new Error(`Unknown slug: ${slug}`);
  return {
    episodeId: book.episodeId,
    file: `${slug}/episode.mp3`,
    objectKey: book.objectKey,
  };
});

const output = resolve(args.out ?? ".factory-output/audio-ingest.local.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify({ assets }, null, 2)}\n`,
  "utf8",
);

console.log(`Factory audio manifest: ${assets.length} assets -> ${output}`);
