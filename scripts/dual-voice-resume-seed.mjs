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

const MAX_PENDING_INTERACTION_POLL_WINDOWS = 2;
const MAX_TTS_SEGMENT_WORDS = 220;
const MIN_TTS_SEGMENT_WORDS = 80;
const MIN_AUDIO_SECONDS_PER_WORD = 0.25;

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

function audioCoverageMinimumSeconds(words) {
  const normalizedWords = Number(words);

  if (!Number.isFinite(normalizedWords) || normalizedWords <= 0) {
    throw new Error(
      "Resume audio coverage word count is invalid.",
    );
  }

  return Math.max(
    4,
    normalizedWords * MIN_AUDIO_SECONDS_PER_WORD,
  );
}

function audioCoverageSufficient(duration, words) {
  const seconds = Number(duration);

  return (
    Number.isFinite(seconds) &&
    seconds > 0 &&
    seconds + 0.05 >=
      audioCoverageMinimumSeconds(words)
  );
}

function splitOversizedParagraphForTts(paragraph) {
  const words = countWords(paragraph);

  if (words <= MAX_TTS_SEGMENT_WORDS) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[.!?؟؛])\s+/u)
    .map((value) => value.trim())
    .filter(Boolean);

  if (
    sentences.length < 2 ||
    sentences.some(
      (sentence) =>
        countWords(sentence) > MAX_TTS_SEGMENT_WORDS,
    )
  ) {
    throw new Error(
      "Resume TTS segment paragraph exceeds safe bound.",
    );
  }

  const groups = [];
  let current = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);

    if (
      current.length > 0 &&
      currentWords + sentenceWords >
        MAX_TTS_SEGMENT_WORDS
    ) {
      groups.push(current.join(" ").trim());
      current = [];
      currentWords = 0;
    }

    current.push(sentence);
    currentWords += sentenceWords;
  }

  if (current.length > 0) {
    groups.push(current.join(" ").trim());
  }

  return groups;
}

function buildTtsSegments(text) {
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
  const units = paragraphs.flatMap((paragraph) =>
    splitOversizedParagraphForTts(paragraph),
  );
  const groups = [];
  let current = [];
  let currentWords = 0;

  const flush = () => {
    if (current.length === 0) return;
    groups.push({
      parts: current,
      words: currentWords,
    });
    current = [];
    currentWords = 0;
  };

  for (const unit of units) {
    const words = countWords(unit);

    if (
      current.length > 0 &&
      currentWords + words >
        MAX_TTS_SEGMENT_WORDS
    ) {
      flush();
    }

    current.push(unit);
    currentWords += words;
  }

  flush();

  if (
    groups.length > 1 &&
    groups.at(-1).words < MIN_TTS_SEGMENT_WORDS
  ) {
    const previous = groups.at(-2);
    const tail = groups.at(-1);

    while (
      tail.words < MIN_TTS_SEGMENT_WORDS &&
      previous.parts.length > 1
    ) {
      const moved = previous.parts.at(-1);
      const movedWords = countWords(moved);

      if (
        tail.words + movedWords >
          MAX_TTS_SEGMENT_WORDS ||
        previous.words - movedWords <
          MIN_TTS_SEGMENT_WORDS
      ) {
        break;
      }

      previous.parts.pop();
      previous.words -= movedWords;
      tail.parts.unshift(moved);
      tail.words += movedWords;
    }
  }

  return groups.map((group, index) => ({
    index,
    text: group.parts.join("\n\n").trim(),
    words: group.words,
  }));
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

function validInteractionId(value) {
  return /^\S{16,512}$/u.test(String(value ?? ""));
}

function pendingInteractionPollWindowsUsed(previous) {
  const raw = previous?.pollWindowsUsed;

  if (raw !== undefined && raw !== null) {
    const explicit = Number(raw);

    if (
      !Number.isInteger(explicit) ||
      explicit < 1 ||
      explicit >
        MAX_PENDING_INTERACTION_POLL_WINDOWS
    ) {
      throw new Error(
        "Pending Interaction poll-window budget is invalid.",
      );
    }

    return explicit;
  }

  return previous?.reusedFrom
    ? MAX_PENDING_INTERACTION_POLL_WINDOWS
    : 1;
}

function contentBlockedFailureCounters(previous) {
  const recoveryPostsUsed = Number(
    previous?.recoveryPostsUsed,
  );
  const classifierBlocks = Number(
    previous?.classifierBlocks,
  );

  if (
    !Number.isInteger(recoveryPostsUsed) ||
    recoveryPostsUsed < 0 ||
    !Number.isInteger(classifierBlocks) ||
    classifierBlocks < 0
  ) {
    throw new Error(
      "Content-blocked failure counters are invalid.",
    );
  }

  return {
    recoveryPostsUsed,
    classifierBlocks,
  };
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

  const segmentSample = [
    paragraph("س", 99),
    paragraph("ش", 140),
    paragraph("ص", 110),
    paragraph("ض", 101),
    paragraph("ط", 138),
    paragraph("ظ", 85),
  ].join("\n\n");
  const ttsSegments = buildTtsSegments(segmentSample);

  if (
    chunks.length !== 2 ||
    chunks[0].index !== 0 ||
    chunks[1].index !== 1 ||
    chunks[0].words !== 1100 ||
    chunks[1].words !== 1100 ||
    ttsSegments.some(
      (segment) =>
        segment.words > MAX_TTS_SEGMENT_WORDS,
    ) ||
    !audioCoverageSufficient(427.24, 1090) ||
    audioCoverageSufficient(12.84, 1090) ||
    audioCoverageSufficient(75.72, 1101)
  ) {
    throw new Error("Resume seed deterministic chunk self-test failed.");
  }

  if (
    !validInteractionId("v1_pending-resume-self-test") ||
    validInteractionId("") ||
    validInteractionId("contains whitespace")
  ) {
    throw new Error(
      "Resume seed pending Interaction ID self-test failed.",
    );
  }

  const legacyInitial =
    pendingInteractionPollWindowsUsed({});
  const legacyResumed =
    pendingInteractionPollWindowsUsed({
      reusedFrom: { sourceRunId: 123 },
    });
  const explicitOne =
    pendingInteractionPollWindowsUsed({
      pollWindowsUsed: 1,
    });
  let invalidBudgetRejected = false;

  try {
    pendingInteractionPollWindowsUsed({
      pollWindowsUsed: 3,
    });
  } catch {
    invalidBudgetRejected = true;
  }

  const blockedCounters =
    contentBlockedFailureCounters({
      recoveryPostsUsed: 2,
      classifierBlocks: 2,
    });
  let invalidBlockedCountersRejected = false;

  try {
    contentBlockedFailureCounters({
      recoveryPostsUsed: -1,
      classifierBlocks: 2,
    });
  } catch {
    invalidBlockedCountersRejected = true;
  }

  if (
    legacyInitial !== 1 ||
    legacyResumed !==
      MAX_PENDING_INTERACTION_POLL_WINDOWS ||
    explicitOne !== 1 ||
    !invalidBudgetRejected ||
    blockedCounters.recoveryPostsUsed !== 2 ||
    blockedCounters.classifierBlocks !== 2 ||
    !invalidBlockedCountersRejected
  ) {
    throw new Error(
      "Resume seed pending Interaction budget self-test failed.",
    );
  }

  console.log(
    "Dual-voice resume seed self-test PASS: " +
    "deterministic chunks + pending Interaction ID contract + " +
    "legacy/existing poll-window budget migration + " +
    "terminal content_blocked counter contract + " +
    "long-form segment/duration coverage contract.",
  );
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
  const pendingInteractions = [];
  const contentBlockedFailures = [];
  let restoredSegmentCheckpoints = 0;
  let restoredSegmentPendingInteractions = 0;

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
        const hasWav = await exists(sourceWav);
        const expectedChunkSha = sha256(chunk.text);
        let canonicalRestored = false;

        if (hasWav) {
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

          if (
            audioCoverageSufficient(
              duration,
              chunk.words,
            )
          ) {
            const destination = path.join(
              outRoot,
              relativePath,
            );
            await mkdir(
              path.dirname(destination),
              { recursive: true },
            );
            await copyFile(
              sourceWav,
              destination,
            );

            entries.push({
              schemaVersion: 1,
              bookSlug,
              role,
              providerVoice,
              chunkIndex: chunk.index,
              relativePath,
              spokenScriptSha256,
              spokenChunkSha256:
                expectedChunkSha,
              wavSha256: sha256(wavBytes),
              durationSeconds:
                Number(duration.toFixed(3)),
              sourceRunId:
                Number(options.sourceRun),
              sourceSha: options.sourceSha,
              artifactId:
                Number(options.artifactId),
              artifactDigest:
                options.artifactDigest,
              legacyReindexed,
            });

            canonicalRestored = true;
          } else {
            console.log(
              "Resume seed rejected truncated canonical checkpoint: " +
              `${relativePath}; duration=${duration.toFixed(3)}s; ` +
              `words=${chunk.words}; ` +
              `minimum=${audioCoverageMinimumSeconds(chunk.words).toFixed(3)}s.`,
            );
          }
        }

        if (canonicalRestored) {
          continue;
        }

        const segments = buildTtsSegments(
          chunk.text,
        );
        const canonicalPrefix =
          String(chunk.index + 1)
            .padStart(2, "0");

        for (const segment of segments) {
          const segmentPrefix =
            String(segment.index + 1)
              .padStart(3, "0");
          const segmentRelative =
            `${bookSlug}/${role}/chunks/` +
            `${canonicalPrefix}-segments/` +
            `${segmentPrefix}.wav`;
          const segmentWav = path.join(
            seedRoot,
            segmentRelative,
          );
          const segmentCheckpoint = path.join(
            seedRoot,
            bookSlug,
            role,
            "chunks",
            `${canonicalPrefix}-segments`,
            `${segmentPrefix}.checkpoint.json`,
          );
          const segmentPending = path.join(
            seedRoot,
            bookSlug,
            role,
            "chunks",
            `${canonicalPrefix}-segments`,
            `${segmentPrefix}.interaction.json`,
          );

          if (
            await exists(segmentWav) ||
            await exists(segmentCheckpoint)
          ) {
            if (
              !(await exists(segmentWav)) ||
              !(await exists(segmentCheckpoint))
            ) {
              throw new Error(
                `Segment checkpoint pair incomplete: ${segmentRelative}`,
              );
            }

            const checkpoint = JSON.parse(
              await readFile(
                segmentCheckpoint,
                "utf8",
              ),
            );
            const wavBytes =
              await readFile(segmentWav);
            const duration =
              durationSeconds(segmentWav);

            if (
              checkpoint.schemaVersion !== 1 ||
              checkpoint.kind !==
                "tts-segment-checkpoint" ||
              checkpoint.bookSlug !== bookSlug ||
              checkpoint.role !== role ||
              checkpoint.providerVoice !==
                providerVoice ||
              Number(
                checkpoint.canonicalChunkIndex,
              ) !== chunk.index ||
              Number(checkpoint.segmentIndex) !==
                segment.index ||
              Number(checkpoint.segmentCount) !==
                segments.length ||
              Number(checkpoint.words) !==
                segment.words ||
              checkpoint.relativePath !==
                segmentRelative ||
              checkpoint.spokenScriptSha256 !==
                spokenScriptSha256 ||
              checkpoint.spokenChunkSha256 !==
                expectedChunkSha ||
              checkpoint.spokenSegmentSha256 !==
                sha256(segment.text) ||
              checkpoint.wavSha256 !==
                sha256(wavBytes) ||
              checkpoint.sourceCodeSha !==
                options.sourceSha ||
              Number(checkpoint.sourceRunId) !==
                Number(options.sourceRun)
            ) {
              throw new Error(
                `Segment checkpoint mismatch: ${segmentRelative}`,
              );
            }

            if (
              Math.abs(
                duration -
                Number(
                  checkpoint.durationSeconds,
                ),
              ) > 0.05
            ) {
              throw new Error(
                `Segment checkpoint duration mismatch: ${segmentRelative}`,
              );
            }

            if (
              !audioCoverageSufficient(
                duration,
                segment.words,
              )
            ) {
              console.log(
                "Resume seed rejected truncated segment checkpoint: " +
                `${segmentRelative}; duration=${duration.toFixed(3)}s; ` +
                `words=${segment.words}.`,
              );
              continue;
            }

            const destination = path.join(
              outRoot,
              segmentRelative,
            );
            const checkpointDestination =
              path.join(
                outRoot,
                bookSlug,
                role,
                "chunks",
                `${canonicalPrefix}-segments`,
                `${segmentPrefix}.checkpoint.json`,
              );

            await mkdir(
              path.dirname(destination),
              { recursive: true },
            );
            await copyFile(
              segmentWav,
              destination,
            );
            await copyFile(
              segmentCheckpoint,
              checkpointDestination,
            );

            restoredSegmentCheckpoints += 1;
            continue;
          }

          if (await exists(segmentPending)) {
            const pending = JSON.parse(
              await readFile(
                segmentPending,
                "utf8",
              ),
            );
            const pollWindowsUsed =
              pendingInteractionPollWindowsUsed(
                pending,
              );

            if (
              pending.schemaVersion !== 1 ||
              pending.kind !==
                "pending-interaction-segment" ||
              pending.bookSlug !== bookSlug ||
              pending.role !== role ||
              pending.providerVoice !==
                providerVoice ||
              Number(
                pending.canonicalChunkIndex,
              ) !== chunk.index ||
              Number(pending.segmentIndex) !==
                segment.index ||
              Number(pending.segmentCount) !==
                segments.length ||
              Number(pending.words) !==
                segment.words ||
              pending.relativePath !==
                segmentRelative ||
              pending.spokenScriptSha256 !==
                spokenScriptSha256 ||
              pending.spokenChunkSha256 !==
                expectedChunkSha ||
              pending.spokenSegmentSha256 !==
                sha256(segment.text) ||
              !validInteractionId(
                pending.interactionId,
              ) ||
              pending.sourceCodeSha !==
                options.sourceSha ||
              Number(pending.sourceRunId) !==
                Number(options.sourceRun)
            ) {
              throw new Error(
                `Segment pending Interaction mismatch: ${segmentRelative}`,
              );
            }

            const pendingDestination =
              path.join(
                outRoot,
                bookSlug,
                role,
                "chunks",
                `${canonicalPrefix}-segments`,
                `${segmentPrefix}.interaction.json`,
              );
            await mkdir(
              path.dirname(
                pendingDestination,
              ),
              { recursive: true },
            );
            await copyFile(
              segmentPending,
              pendingDestination,
            );

            restoredSegmentPendingInteractions +=
              1;

            if (
              pollWindowsUsed >
              MAX_PENDING_INTERACTION_POLL_WINDOWS
            ) {
              throw new Error(
                `Segment pending Interaction budget invalid: ${segmentRelative}`,
              );
            }
          }
        }

        const pendingSidecar = path.join(
          seedRoot,
          bookSlug,
          role,
          "chunks",
          `${prefix}.interaction.json`,
        );

        if (await exists(pendingSidecar)) {
          const previous = JSON.parse(
            await readFile(pendingSidecar, "utf8"),
          );
          const pollWindowsUsed =
            pendingInteractionPollWindowsUsed(previous);

          if (
            previous.schemaVersion !== 1 ||
            previous.kind !== "pending-interaction" ||
            previous.bookSlug !== bookSlug ||
            previous.role !== role ||
            previous.providerVoice !== providerVoice ||
            previous.chunkIndex !== chunk.index ||
            previous.relativePath !== relativePath ||
            previous.spokenScriptSha256 !== spokenScriptSha256 ||
            previous.spokenChunkSha256 !== expectedChunkSha ||
            !validInteractionId(previous.interactionId) ||
            previous.sourceCodeSha !== options.sourceSha ||
            Number(previous.sourceRunId) !== Number(options.sourceRun)
          ) {
            throw new Error(
              `Pending Interaction sidecar mismatch: ${relativePath}`,
            );
          }

          pendingInteractions.push({
            schemaVersion: 1,
            bookSlug,
            role,
            providerVoice,
            chunkIndex: chunk.index,
            relativePath,
            spokenScriptSha256,
            spokenChunkSha256: expectedChunkSha,
            interactionId: String(previous.interactionId),
            pollWindowsUsed,
            sourceRunId: Number(options.sourceRun),
            sourceSha: options.sourceSha,
            artifactId: Number(options.artifactId),
            artifactDigest: options.artifactDigest,
          });

          continue;
        }

        const blockedSidecar = path.join(
          seedRoot,
          bookSlug,
          role,
          "chunks",
          `${prefix}.content-blocked.json`,
        );

        if (!(await exists(blockedSidecar))) {
          continue;
        }

        const blocked = JSON.parse(
          await readFile(blockedSidecar, "utf8"),
        );
        const counters =
          contentBlockedFailureCounters(blocked);

        if (
          blocked.schemaVersion !== 1 ||
          blocked.kind !== "content-blocked-exhausted" ||
          blocked.bookSlug !== bookSlug ||
          blocked.role !== role ||
          blocked.providerVoice !== providerVoice ||
          blocked.chunkIndex !== chunk.index ||
          blocked.relativePath !== relativePath ||
          blocked.spokenScriptSha256 !== spokenScriptSha256 ||
          blocked.spokenChunkSha256 !== expectedChunkSha ||
          !/^TTS_(?:CONTENT_BLOCKED_|STREAM_CONTENT_BLOCKED)/u.test(
            String(blocked.failureCode ?? ""),
          ) ||
          blocked.sourceCodeSha !== options.sourceSha ||
          Number(blocked.sourceRunId) !== Number(options.sourceRun)
        ) {
          throw new Error(
            `Content-blocked sidecar mismatch: ${relativePath}`,
          );
        }

        const blockedDestination = path.join(
          outRoot,
          relativePath.replace(
            /\.wav$/u,
            ".content-blocked.json",
          ),
        );
        await mkdir(
          path.dirname(blockedDestination),
          { recursive: true },
        );
        await copyFile(
          blockedSidecar,
          blockedDestination,
        );

        contentBlockedFailures.push({
          schemaVersion: 1,
          kind: "content-blocked-exhausted",
          bookSlug,
          role,
          providerVoice,
          chunkIndex: chunk.index,
          relativePath,
          spokenScriptSha256,
          spokenChunkSha256: expectedChunkSha,
          recoveryPostsUsed:
            counters.recoveryPostsUsed,
          classifierBlocks:
            counters.classifierBlocks,
          failureCode: String(blocked.failureCode),
          sourceRunId: Number(options.sourceRun),
          sourceSha: options.sourceSha,
          artifactId: Number(options.artifactId),
          artifactDigest: options.artifactDigest,
        });
      }
    }
  }

  if (
    entries.length === 0 &&
    pendingInteractions.length === 0 &&
    contentBlockedFailures.length === 0 &&
    restoredSegmentCheckpoints === 0 &&
    restoredSegmentPendingInteractions === 0
  ) {
    throw new Error(
      "No reusable checkpoint WAV or pending Interaction was found.",
    );
  }

  const index = {
    schemaVersion: 1,
    batch: options.batch,
    sourceRunId: Number(options.sourceRun),
    sourceSha: options.sourceSha,
    artifactId: Number(options.artifactId),
    artifactDigest: options.artifactDigest,
    chunks: entries,
    pendingInteractions,
    contentBlockedFailures,
  };

  await mkdir(outRoot, { recursive: true });
  await writeFile(
    path.join(outRoot, "resume-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Dual-voice resume seed PASS: ${entries.length} verified chunk(s) + ` +
    `${pendingInteractions.length} pending Interaction(s) + ` +
    `${contentBlockedFailures.length} terminal content_blocked failure(s) + ` +
    `${restoredSegmentCheckpoints} segment checkpoint(s) + ` +
    `${restoredSegmentPendingInteractions} segment pending Interaction(s) restored.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
