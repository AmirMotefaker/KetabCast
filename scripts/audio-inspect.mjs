import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { parseFile } from "music-metadata";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function argsFrom(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) fail(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for --${key}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

async function sha256File(path) {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function validateObjectKey(value) {
  if (typeof value !== "string" || !value.trim()) {
    fail("Every asset needs a non-empty objectKey.");
  }
  if (
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => part === "..") ||
    !value.toLowerCase().endsWith(".mp3")
  ) {
    fail(`Unsafe objectKey: ${value}`);
  }
}

const args = argsFrom(process.argv.slice(2));
if (!args.manifest) {
  fail("Usage: npm run audio:inspect -- --manifest <json> [--out <json>] [--expected-count <n>]");
}

const manifestPath = resolve(args.manifest);
const manifestDir = dirname(manifestPath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (!Array.isArray(manifest.assets)) {
  fail("Manifest must contain an assets array.");
}

if (args["expected-count"]) {
  const expected = Number(args["expected-count"]);
  if (!Number.isInteger(expected) || expected < 1) {
    fail("--expected-count must be a positive integer.");
  }
  if (manifest.assets.length !== expected) {
    fail(`Expected ${expected} assets, found ${manifest.assets.length}.`);
  }
}

const seenEpisodeIds = new Set();
const seenKeys = new Set();
const results = [];

for (const asset of manifest.assets) {
  if (!asset || typeof asset !== "object") fail("Invalid asset entry.");
  if (typeof asset.episodeId !== "string" || !asset.episodeId.trim()) {
    fail("Every asset needs episodeId.");
  }
  if (seenEpisodeIds.has(asset.episodeId)) {
    fail(`Duplicate episodeId: ${asset.episodeId}`);
  }
  seenEpisodeIds.add(asset.episodeId);

  validateObjectKey(asset.objectKey);
  if (seenKeys.has(asset.objectKey)) {
    fail(`Duplicate objectKey: ${asset.objectKey}`);
  }
  seenKeys.add(asset.objectKey);

  if (typeof asset.file !== "string" || !asset.file.trim()) {
    fail(`Missing file for ${asset.episodeId}`);
  }

  const localPath = resolve(manifestDir, asset.file);
  if (extname(localPath).toLowerCase() !== ".mp3") {
    fail(`Only MP3 is accepted in this milestone: ${asset.file}`);
  }

  const stat = statSync(localPath);
  if (!stat.isFile() || stat.size <= 0) {
    fail(`Invalid audio file: ${asset.file}`);
  }

  const metadata = await parseFile(localPath, {
    duration: true,
    skipCovers: true,
  });

  const duration = metadata.format.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    fail(`Could not determine duration: ${asset.file}`);
  }

  const sha256 = await sha256File(localPath);

  results.push({
    episodeId: asset.episodeId,
    file: asset.file.replaceAll("\\", "/"),
    objectKey: asset.objectKey,
    mimeType: "audio/mpeg",
    durationSeconds: Math.round(duration),
    exactDurationSeconds: Number(duration.toFixed(3)),
    bytes: stat.size,
    sha256,
    codec: metadata.format.codec ?? null,
    bitrate: metadata.format.bitrate
      ? Math.round(metadata.format.bitrate)
      : null,
    sampleRate: metadata.format.sampleRate ?? null,
    channels: metadata.format.numberOfChannels ?? null,
  });
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  assetCount: results.length,
  assets: results,
};

const output = `${JSON.stringify(report, null, 2)}\n`;

if (args.out) {
  writeFileSync(resolve(args.out), output, "utf8");
  console.log(`Audio inspection PASS: ${results.length} assets -> ${resolve(args.out)}`);
} else {
  process.stdout.write(output);
}
