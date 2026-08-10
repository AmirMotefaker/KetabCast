import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

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
const outRoot = resolve(args.out ?? ".factory-output");
const inspection = JSON.parse(
  await readFile(
    resolve(args.inspection ?? ".factory-output/audio-inspection.local.json"),
    "utf8",
  ),
);
const episodesPath = "src/content/episodes.json";
const episodes = JSON.parse(await readFile(episodesPath, "utf8"));
const catalog = JSON.parse(
  await readFile("content/factory/books.json", "utf8"),
);

const slugs =
  args.slug === "all"
    ? catalog.books.map((book) => book.slug)
    : [args.slug];

for (const slug of slugs) {
  const book = catalog.books.find((entry) => entry.slug === slug);
  if (!book) throw new Error(`Unknown slug: ${slug}`);

  const generated = JSON.parse(
    await readFile(join(outRoot, slug, "episode.json"), "utf8"),
  );
  const inspected = inspection.assets.find(
    (asset) => asset.episodeId === book.episodeId,
  );
  if (!inspected) throw new Error(`No inspected asset for ${book.episodeId}`);

  const index = episodes.findIndex((episode) => episode.id === book.episodeId);
  if (index < 0) throw new Error(`Episode not found: ${book.episodeId}`);

  episodes[index] = {
    ...episodes[index],
    title: generated.title,
    description: generated.description,
    transcript: generated.transcript,
    keyIdeas: generated.keyIdeas,
    format: "standard",
    audio: {
      status: "ready",
      objectKey: inspected.objectKey,
      mimeType: "audio/mpeg",
      durationSeconds: inspected.durationSeconds,
      downloadable: false,
      sha256: inspected.sha256,
      bytes: inspected.bytes,
    },
  };

  const evidenceDir = resolve("content/evidence", slug);
  await mkdir(evidenceDir, { recursive: true });
  for (const file of [
    "research.md",
    "sources.json",
    "qa.json",
    "episode.json",
    "audio-qa.json",
  ]) {
    await cp(join(outRoot, slug, file), join(evidenceDir, file));
  }
}

await writeFile(
  episodesPath,
  `${JSON.stringify(episodes, null, 2)}\n`,
  "utf8",
);

console.log(`Promoted ${slugs.length} production episode(s).`);
