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
const releaseMap = JSON.parse(
  await readFile(
    resolve(args.assets ?? ".factory-output/github-release-assets.json"),
    "utf8",
  ),
);

if (releaseMap.provider !== "github-release-assets") {
  throw new Error(`Unsupported production audio provider: ${releaseMap.provider}`);
}

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
  if (!inspected) {
    throw new Error(`No inspected asset for ${book.episodeId}`);
  }

  const remote = releaseMap.assets.find(
    (asset) => asset.episodeId === book.episodeId,
  );
  if (!remote) {
    throw new Error(`No GitHub release asset for ${book.episodeId}`);
  }

  if (!remote.verified) {
    throw new Error(`Remote integrity is not verified: ${book.episodeId}`);
  }

  if (remote.objectKey !== inspected.objectKey) {
    throw new Error(`objectKey mismatch for ${book.episodeId}`);
  }

  if (
    remote.sha256 !== inspected.sha256 ||
    Number(remote.bytes) !== Number(inspected.bytes)
  ) {
    throw new Error(`Remote/local integrity mismatch for ${book.episodeId}`);
  }

  if (!/^https:\/\/github\.com\//u.test(remote.publicUrl)) {
    throw new Error(`Unexpected GitHub asset URL: ${remote.publicUrl}`);
  }

  const index = episodes.findIndex(
    (episode) => episode.id === book.episodeId,
  );
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
      publicUrl: remote.publicUrl,
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

  await writeFile(
    join(evidenceDir, "production-audio.json"),
    `${JSON.stringify(remote, null, 2)}\n`,
    "utf8",
  );
}

await writeFile(
  episodesPath,
  `${JSON.stringify(episodes, null, 2)}\n`,
  "utf8",
);

console.log(
  `Promoted ${slugs.length} GitHub Release-backed production episode(s).`,
);
