import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BATCHES = Object.freeze({
  "batch-a": ["atomic-habits", "deep-work"],
  "batch-a-atomic": ["atomic-habits"],
  "batch-a-deep-work": ["deep-work"],
  "batch-b": ["think-again", "zero-to-one"],
  "batch-c": ["leading-teams"],
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countWords(text) {
  return text
    .replace(/[\u200c\u200f\u200e]/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .length;
}

function buildChunks(text) {
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((value) => value.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) {
    throw new Error("Resume seed requires at least two source paragraphs.");
  }

  const counts = paragraphs.map(countWords);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const target = total / 2;
  let running = 0;
  let splitIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    running += counts[index];
    const distance = Math.abs(running - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      splitIndex = index + 1;
    }
  }

  const groups = [
    paragraphs.slice(0, splitIndex),
    paragraphs.slice(splitIndex),
  ];

  return groups.map((group, index) => {
    const chunkText = group.join("\n\n").trim();
    const words = countWords(chunkText);

    if (words < 500 || words > 1400) {
      throw new Error(
        `Resume chunk ${index + 1} has ${words} words; expected 500–1400.`,
      );
    }

    return {
      index,
      text: chunkText,
      words,
    };
  });
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }

  return result.stdout.trim();
}

function durationSeconds(file) {
  const raw = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid checkpoint WAV duration: ${file} -> ${raw}`);
  }

  return value;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  if (argv.includes("--self-test")) return { selfTest: true };

  const options = {
    selfTest: false,
    seed: "",
    out: "",
    batch: "",
    sourceRun: "",
    sourceSha: "",
    artifactDigest: "",
    artifactId: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--seed") options.seed = argv[++i];
    else if (token === "--out") options.out = argv[++i];
    else if (token === "--batch") options.batch = argv[++i];
    else if (token === "--source-run") options.sourceRun = argv[++i];
    else if (token === "--source-sha") options.sourceSha = argv[++i];
    else if (token === "--artifact-digest") options.artifactDigest = argv[++i];
    else if (token === "--artifact-id") options.artifactId = argv[++i];
    else throw new Error(`Unknown resume-seed argument: ${token}`);
  }

  return options;
}

function selfTest() {
  const paragraph = (word, count) =>
    Array.from({ length: count }, (_, i) => `${word}${i}`).join(" ");
  const sample = [
    paragraph("الف", 550),
    paragraph("ب", 550),
    paragraph("ج", 550),
    paragraph("د", 550),
  ].join("\n\n");
  const chunks = buildChunks(sample);

  if (
    chunks.length !== 2 ||
    chunks[0].index !== 0 ||
    chunks[1].index !== 1 ||
    chunks[0].words !== 1100 ||
    chunks[1].words !== 1100
  ) {
    throw new Error("Resume seed deterministic chunk self-test failed.");
  }

  console.log("Dual-voice resume seed self-test PASS.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.selfTest) {
    selfTest();
    return;
  }

  if (!Object.hasOwn(BATCHES, options.batch)) {
    throw new Error(`Unsupported resume batch: ${options.batch}`);
  }

  if (!/^[0-9]+$/u.test(options.sourceRun)) {
    throw new Error("Resume source run must be numeric.");
  }

  if (!/^[0-9a-f]{40}$/u.test(options.sourceSha)) {
    throw new Error("Resume source SHA must be an exact 40-char commit SHA.");
  }

  if (!/^sha256:[0-9a-f]{64}$/u.test(options.artifactDigest)) {
    throw new Error("Resume artifact digest must be sha256:<64 hex>.");
  }

  if (!/^[0-9]+$/u.test(options.artifactId)) {
    throw new Error("Resume artifact ID must be numeric.");
  }

  const seedRoot = path.resolve(options.seed);
  const outRoot = path.resolve(options.out);
  const selection = JSON.parse(
    await readFile(
      path.resolve("data/audio/selected-voices.json"),
      "utf8",
    ),
  );
  const sourceSelection = JSON.parse(
    run("git", [
      "show",
      `${options.sourceSha}:data/audio/selected-voices.json`,
    ]),
  );

  const knownLegacySource =
    Number(options.sourceRun) === 31615165328 &&
    Number(options.artifactId) === 9149552080 &&
    options.sourceSha ===
      "55f4fae8802a91d4dbce312ee6a1d459164bc8e6" &&
    options.artifactDigest ===
      "sha256:a79747db4075ad1dd705d58165cb3b82ef8f8018b51bce7f6e1399051e914f36";

  const entries = [];

  for (const bookSlug of BATCHES[options.batch]) {
    const spokenScriptFile = path.join(
      seedRoot,
      bookSlug,
      "script.spoken.fa.txt",
    );

    if (!(await exists(spokenScriptFile))) continue;

    const spokenText = (await readFile(spokenScriptFile, "utf8")).trim();
    const chunks = buildChunks(spokenText);
    const spokenScriptSha256 = sha256(spokenText);

    for (const role of ["female", "male"]) {
      const providerVoice = String(
        selection?.voices?.[role]?.providerVoice ?? "",
      );
      const sourceProviderVoice = String(
        sourceSelection?.voices?.[role]?.providerVoice ?? "",
      );

      if (!providerVoice || !sourceProviderVoice) {
        throw new Error(`Selected provider voice missing for ${role}.`);
      }

      if (providerVoice !== sourceProviderVoice) {
        throw new Error(
          `Resume voice changed for ${role}: ${sourceProviderVoice} -> ${providerVoice}.`,
        );
      }

      for (const chunk of chunks) {
        const prefix = String(chunk.index + 1).padStart(2, "0");
        const relativePath =
          `${bookSlug}/${role}/chunks/${prefix}.wav`;
        const sourceWav = path.join(seedRoot, relativePath);

        if (!(await exists(sourceWav))) continue;

        const wavBytes = await readFile(sourceWav);

        if (wavBytes.length < 2048) {
          throw new Error(`Checkpoint WAV too small: ${relativePath}`);
        }

        const duration = durationSeconds(sourceWav);
        const sidecar = path.join(
          seedRoot,
          bookSlug,
          role,
          "chunks",
          `${prefix}.checkpoint.json`,
        );

        let legacyReindexed = true;

        if (await exists(sidecar)) {
          const previous = JSON.parse(await readFile(sidecar, "utf8"));
          const expectedWavSha = sha256(wavBytes);
          const expectedChunkSha = sha256(chunk.text);

          if (
            previous.bookSlug !== bookSlug ||
            previous.role !== role ||
            previous.providerVoice !== providerVoice ||
            previous.chunkIndex !== chunk.index ||
            previous.spokenScriptSha256 !== spokenScriptSha256 ||
            previous.spokenChunkSha256 !== expectedChunkSha ||
            previous.wavSha256 !== expectedWavSha ||
            previous.sourceCodeSha !== options.sourceSha ||
            Number(previous.sourceRunId) !== Number(options.sourceRun)
          ) {
            throw new Error(
              `Existing checkpoint sidecar mismatch: ${relativePath}`,
            );
          }

          legacyReindexed = false;
        } else if (!knownLegacySource) {
          throw new Error(
            `Legacy checkpoint without sidecar is not allowlisted: ${relativePath}`,
          );
        }

        const destination = path.join(outRoot, relativePath);
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(sourceWav, destination);

        entries.push({
          schemaVersion: 1,
          bookSlug,
          role,
          providerVoice,
          chunkIndex: chunk.index,
          relativePath,
          spokenScriptSha256,
          spokenChunkSha256: sha256(chunk.text),
          wavSha256: sha256(wavBytes),
          durationSeconds: Number(duration.toFixed(3)),
          sourceRunId: Number(options.sourceRun),
          sourceSha: options.sourceSha,
          artifactId: Number(options.artifactId),
          artifactDigest: options.artifactDigest,
          legacyReindexed,
        });
      }
    }
  }

  if (entries.length === 0) {
    throw new Error("No reusable checkpoint WAV was found.");
  }

  const index = {
    schemaVersion: 1,
    batch: options.batch,
    sourceRunId: Number(options.sourceRun),
    sourceSha: options.sourceSha,
    artifactId: Number(options.artifactId),
    artifactDigest: options.artifactDigest,
    chunks: entries,
  };

  await mkdir(outRoot, { recursive: true });
  await writeFile(
    path.join(outRoot, "resume-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Dual-voice resume seed PASS: ${entries.length} verified chunk(s) restored.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
