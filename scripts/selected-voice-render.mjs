import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const MODEL =
  process.env.GEMINI_TTS_MODEL?.trim() ||
  "gemini-3.1-flash-tts-preview";

const API_REVISION = "2026-05-20";
const TTS_RESPONSE_FORMAT = Object.freeze({ type: "audio" });
const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PLANNED_TTS_REQUESTS = 8;
const MAX_TTS_NETWORK_REQUESTS = 10;

let ttsNetworkRequests = 0;

const BOOKS = [
  {
    slug: "atomic-habits",
    ambience: {
      frequencies: [196.0, 246.94, 329.63],
      label: "warm-motivational-minimal",
    },
  },
  {
    slug: "deep-work",
    ambience: {
      frequencies: [174.61, 220.0, 293.66],
      label: "calm-focus-minimal",
    },
  },
];

function parseArgs(argv) {
  const options = {
    source: ".selected-source",
    out: ".selected-review",
    mode: "validate",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--source") {
      options.source = argv[++index];
    } else if (token === "--out") {
      options.out = argv[++index];
    } else if (token === "--mode") {
      options.mode = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!["validate", "generate"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }

  return options;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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
  const value = run("ffprobe", [
    "-v","error",
    "-show_entries","format=duration",
    "-of","default=noprint_wrappers=1:nokey=1",
    file,
  ]);

  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid duration: ${file} -> ${value}`);
  }

  return duration;
}

function countWords(text) {
  return text
    .replace(/[\u200c\u200f\u200e]/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .length;
}

function normalizeForTts(displayText, lexicon) {
  let spoken = displayText;

  for (const entry of lexicon.entries) {
    spoken = spoken.split(entry.display).join(entry.spoken);
  }

  return spoken;
}

function sentencePieces(text) {
  const pieces = text
    .split(/(?<=[.!؟؛])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return pieces.length > 0 ? pieces : [text.trim()];
}

function buildChunks(text) {
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((value) => value.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) {
    throw new Error(
      "Full-episode review requires at least two source paragraphs.",
    );
  }

  const paragraphWordCounts = paragraphs.map((paragraph) =>
    countWords(paragraph),
  );

  const totalWords = paragraphWordCounts.reduce(
    (sum, value) => sum + value,
    0,
  );

  const targetFirstHalfWords = totalWords / 2;
  let runningWords = 0;
  let splitIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    runningWords += paragraphWordCounts[index];

    const distance = Math.abs(
      runningWords - targetFirstHalfWords,
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      splitIndex = index + 1;
    }
  }

  const groups = [
    paragraphs.slice(0, splitIndex),
    paragraphs.slice(splitIndex),
  ];

  const chunks = groups.map((group, index) => {
    const chunkText = group.join("\n\n").trim();
    const words = countWords(chunkText);

    if (words < 500 || words > 1400) {
      throw new Error(
        `Chunk ${index + 1} has ${words} words; ` +
        "expected 500–1400 for the two-request review budget.",
      );
    }

    return {
      index,
      paragraphIndex: index === 0 ? 0 : splitIndex,
      paragraphEnds: true,
      pauseAfterMs: index === 0 ? 1200 : 900,
      text: chunkText,
      words,
    };
  });

  if (chunks.length !== 2) {
    throw new Error(
      `Expected exactly 2 TTS chunks; got ${chunks.length}.`,
    );
  }

  console.log(
    `Balanced TTS chunks: ${chunks[0].words} + ${chunks[1].words} words.`,
  );

  return chunks;
}

function directorPrompt(text, voiceRole, bookSlug, chunk) {
  return [
    "# AUDIO PROFILE",
    "Professional Persian nonfiction podcast narrator for KetabCast.",
    "",
    "# RECORDING CONTEXT",
    `Book slug: ${bookSlug}.`,
    `Product voice role: ${voiceRole}.`,
    `Chunk ${chunk.index + 1} of a longer episode.`,
    "",
    "# DIRECTOR'S NOTES",
    "Language: Persian.",
    "Accent: Standard contemporary Iranian Persian (fa-IR), Tehran-neutral.",
    "Do not use Dari or Afghan Persian pronunciation.",
    "Pace: calm, patient and unhurried.",
    "Speak around 15 to 20 percent slower than ordinary conversation.",
    "Never rush two Persian words together.",
    "Pronounce every Persian word fully, naturally and clearly.",
    "Punctuation is performance timing.",
    "Use a small natural pause after commas.",
    "Use a clearly audible short pause after full stops.",
    "Use a stronger reflective pause before a new paragraph or idea.",
    "Tone: warm, intelligent, intimate and trustworthy.",
    "Avoid announcer, advertisement, robotic or over-energetic delivery.",
    "Keep transcript wording exact.",
    "Do not add or omit words.",
    "",
    "# TRANSCRIPT",
    "[calmly and patiently]",
    text,
  ].join("\n");
}

function findAudio(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (typeof value.data === "string") {
    const type = String(value.type ?? "");
    const mimeType = String(value.mime_type ?? "");

    if (type === "audio" || mimeType.startsWith("audio/")) {
      return {
        data: value.data,
        mimeType: mimeType || "audio/pcm",
        sampleRate: Number(value.sample_rate ?? PCM_SAMPLE_RATE),
        channels: Number(value.channels ?? PCM_CHANNELS),
      };
    }
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findAudio(item);
        if (found) return found;
      }
    } else if (child && typeof child === "object") {
      const found = findAudio(child);
      if (found) return found;
    }
  }

  return null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseQuotaDetails(responseText) {
  try {
    const parsed = JSON.parse(responseText);
    const details = Array.isArray(parsed?.error?.details)
      ? parsed.error.details
      : [];

    const quotaIds = details
      .flatMap((detail) =>
        Array.isArray(detail?.violations)
          ? detail.violations.map((violation) =>
              String(violation?.quotaId ?? ""),
            )
          : [],
      )
      .filter(Boolean);

    const retryDetail = details.find(
      (detail) => typeof detail?.retryDelay === "string",
    );

    const retryDelayText =
      retryDetail?.retryDelay ??
      String(parsed?.error?.message ?? "").match(
        /Please retry in ([0-9.]+)s/i,
      )?.[1];

    const retryDelaySeconds =
      typeof retryDelayText === "string"
        ? Number.parseFloat(retryDelayText.replace(/s$/i, ""))
        : Number(retryDelayText);

    return {
      daily:
        quotaIds.some((value) =>
          value.includes(
            "GenerateRequestsPerDayPerProjectPerModel",
          ),
        ) ||
        (
          responseText.includes(
            "generate_content_free_tier_requests",
          ) &&
          responseText.includes("limit: 10")
        ),
      quotaIds,
      retryDelaySeconds:
        Number.isFinite(retryDelaySeconds)
          ? retryDelaySeconds
          : null,
    };
  } catch {
    return {
      daily:
        responseText.includes(
          "generate_content_free_tier_requests",
        ) &&
        responseText.includes("limit: 10"),
      quotaIds: [],
      retryDelaySeconds: null,
    };
  }
}

function reserveTtsNetworkRequest() {
  if (ttsNetworkRequests >= MAX_TTS_NETWORK_REQUESTS) {
    throw new Error(
      "TTS_REQUEST_BUDGET_EXHAUSTED: refusing to exceed " +
      `${MAX_TTS_NETWORK_REQUESTS} Gemini TTS network requests. ` +
      `Planned successful requests: ${PLANNED_TTS_REQUESTS}.`,
    );
  }

  ttsNetworkRequests += 1;
}

async function callTts(apiKey, voice, prompt) {
  const body = {
    model: MODEL,
    input: prompt,
    response_format: TTS_RESPONSE_FORMAT,
    generation_config: {
      speech_config: [{ voice }],
    },
  };

  const url =
    "https://generativelanguage.googleapis.com/v1beta/interactions";

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    reserveTtsNetworkRequest();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
          "Api-Revision": API_REVISION,
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();

      if (!response.ok) {
        const quota = parseQuotaDetails(responseText);

        if (response.status === 429 && quota.daily) {
          throw new Error(
            "DAILY_TTS_QUOTA_EXHAUSTED: Gemini 3.1 Flash TTS " +
            "Free Tier request quota is exhausted for this project. " +
            "Do not retry this workflow until the next daily reset. " +
            `networkRequestsUsed=${ttsNetworkRequests}. ` +
            responseText.slice(0, 1200),
          );
        }

        const error = new Error(
          `Gemini TTS HTTP ${response.status}: ${responseText.slice(0, 1200)}`,
        );

        if (
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) {
          lastError = error;

          if (attempt < 3) {
            const providerDelay =
              quota.retryDelaySeconds === null
                ? 0
                : Math.ceil(quota.retryDelaySeconds * 1000) + 1000;

            const backoff =
              Math.min(3000 * 2 ** (attempt - 1), 15000);

            await sleep(Math.max(providerDelay, backoff));
            continue;
          }
        }

        throw error;
      }

      const parsed = JSON.parse(responseText);
      const audio =
        findAudio(parsed.output_audio) ??
        findAudio(parsed);

      if (!audio?.data) {
        throw new Error(
          `No output_audio data returned for ${voice}.`,
        );
      }

      const buffer = Buffer.from(audio.data, "base64");

      if (buffer.length < 2048) {
        throw new Error(
          `Provider audio too small for ${voice}: ${buffer.length}.`,
        );
      }

      return {
        buffer,
        mimeType: audio.mimeType,
        sampleRate: audio.sampleRate,
        channels: audio.channels,
      };
    } catch (error) {
      lastError = error;

      if (
        String(error?.message ?? error).includes(
          "DAILY_TTS_QUOTA_EXHAUSTED",
        ) ||
        String(error?.message ?? error).includes(
          "TTS_REQUEST_BUDGET_EXHAUSTED",
        )
      ) {
        throw error;
      }

      if (attempt < 3) {
        await sleep(
          Math.min(2000 * 2 ** (attempt - 1), 12000),
        );
      }
    }
  }

  throw lastError;
}

async function providerToWav(generated, wavFile, tempFile) {
  const mime = String(generated.mimeType ?? "").toLowerCase();

  if (mime === "audio/wav" || mime === "audio/x-wav") {
    await writeFile(wavFile, generated.buffer);
    return;
  }

  await writeFile(tempFile, generated.buffer);

  try {
    const inputArgs =
      mime === "audio/mp3" || mime === "audio/mpeg"
        ? ["-i",tempFile]
        : [
            "-f","s16le",
            "-ar",String(generated.sampleRate || PCM_SAMPLE_RATE),
            "-ac",String(generated.channels || PCM_CHANNELS),
            "-i",tempFile,
          ];

    run("ffmpeg", [
      "-hide_banner","-loglevel","error","-y",
      ...inputArgs,
      "-ar","44100",
      "-ac","1",
      "-c:a","pcm_s16le",
      wavFile,
    ]);
  } finally {
    await unlink(tempFile).catch(() => {});
  }
}

async function makeSilence(file, milliseconds) {
  run("ffmpeg", [
    "-hide_banner","-loglevel","error","-y",
    "-f","lavfi",
    "-i","anullsrc=r=44100:cl=mono",
    "-t",(milliseconds / 1000).toFixed(3),
    "-c:a","pcm_s16le",
    file,
  ]);
}

function concatText(files) {
  return files
    .map((file) => `file '${file.replaceAll("'", "'\\''")}'`)
    .join("\n") + "\n";
}

function musicVolumeExpression(duration, boundaries) {
  const windows = [
    { start: 0, end: 8, level: 0.060 },
    ...boundaries.map((boundary) => ({
      start: Math.max(0, boundary - 1.5),
      end: Math.min(duration, boundary + 2.8),
      level: 0.024,
    })),
    {
      start: Math.max(0, duration - 8),
      end: duration,
      level: 0.040,
    },
  ];

  let expression = "0";

  for (const window of windows.reverse()) {
    expression =
      `if(between(t,${window.start.toFixed(2)},` +
      `${window.end.toFixed(2)}),${window.level},${expression})`;
  }

  return expression;
}

async function renderVariant({
  apiKey,
  book,
  role,
  voice,
  displayText,
  spokenText,
  outRoot,
}) {
  const root = path.join(outRoot, book.slug, role);
  const chunksRoot = path.join(root, "chunks");

  await mkdir(chunksRoot, { recursive: true });

  const chunks = buildChunks(spokenText);

  if (chunks.length !== 2) {
    throw new Error(
      `${book.slug}/${role}: expected exactly 2 chunks; got ${chunks.length}.`,
    );
  }

  const concatFiles = [];
  const paragraphBoundaries = [];
  const chunkEvidence = [];

  let elapsed = 0;

  for (const chunk of chunks) {
    const prefix = String(chunk.index + 1).padStart(2, "0");
    const wav = path.join(chunksRoot, `${prefix}.wav`);
    const pause = path.join(chunksRoot, `${prefix}-pause.wav`);
    const temp = path.join(chunksRoot, `${prefix}.provider`);

    const prompt = directorPrompt(
      chunk.text,
      role,
      book.slug,
      chunk,
    );

    console.log(
      `${book.slug}/${role}: TTS ${chunk.index + 1}/${chunks.length}`,
    );

    const generated = await callTts(
      apiKey,
      voice,
      prompt,
    );

    await providerToWav(
      generated,
      wav,
      temp,
    );

    const chunkDuration = durationSeconds(wav);

    await makeSilence(
      pause,
      chunk.pauseAfterMs,
    );

    const pauseDuration = durationSeconds(pause);

    concatFiles.push(wav, pause);

    elapsed += chunkDuration + pauseDuration;

    if (chunk.paragraphEnds) {
      paragraphBoundaries.push(elapsed);
    }

    chunkEvidence.push({
      index: chunk.index,
      paragraphIndex: chunk.paragraphIndex,
      paragraphEnds: chunk.paragraphEnds,
      pauseAfterMs: chunk.pauseAfterMs,
      durationSeconds: Number(chunkDuration.toFixed(3)),
      sourceMimeType: generated.mimeType,
      sourceSampleRate: generated.sampleRate,
      sourceChannels: generated.channels,
      spokenChunkSha256: sha256(chunk.text),
      directorPromptSha256: sha256(prompt),
    });

    await sleep(900);
  }

  const concatFile = path.join(root, "concat.txt");
  await writeFile(
    concatFile,
    concatText(concatFiles),
    "utf8",
  );

  const dryFile = path.join(
    root,
    `${role}-${voice.toLowerCase()}-dry.mp3`,
  );

  run("ffmpeg", [
    "-hide_banner","-loglevel","error","-y",
    "-f","concat",
    "-safe","0",
    "-i",concatFile,
    "-af","loudnorm=I=-16:LRA=9:TP=-1.5",
    "-ar","44100",
    "-ac","1",
    "-b:a","128k",
    dryFile,
  ]);

  const dryDuration = durationSeconds(dryFile);
  const words = countWords(displayText);
  const wpm = words / (dryDuration / 60);

  if (dryDuration < 600 || dryDuration > 1320) {
    throw new Error(
      `${book.slug}/${role}: ${dryDuration.toFixed(1)}s is outside 10–22 minute gate.`,
    );
  }

  if (wpm < 90 || wpm > 175) {
    throw new Error(
      `${book.slug}/${role}: ${wpm.toFixed(1)} WPM is outside 90–175 gate.`,
    );
  }

  const podcastFile = path.join(
    root,
    `${role}-${voice.toLowerCase()}-podcast.mp3`,
  );

  const finalDurationTarget = dryDuration + 10;

  const boundaries = paragraphBoundaries
    .filter((value) => value > 20 && value < dryDuration - 15)
    .slice(0, 8)
    .map((value) => value + 4);

  const bedVolume = musicVolumeExpression(
    finalDurationTarget,
    boundaries,
  );

  const f = book.ambience.frequencies;

  const filter = [
    "[1:a]volume=0.11,lowpass=f=950[a1]",
    "[2:a]volume=0.075,lowpass=f=1200[a2]",
    "[3:a]volume=0.045,lowpass=f=1500[a3]",
    "[a1][a2][a3]amix=inputs=3:normalize=0[bed0]",
    `[bed0]volume='${bedVolume}':eval=frame,afade=t=in:st=0:d=1.7[bed]`,
    "[0:a]adelay=4000|4000,aresample=44100,volume=1.0[voice]",
    "[voice][bed]amix=inputs=2:duration=longest:normalize=0," +
      "loudnorm=I=-16:LRA=7:TP=-1.5[out]",
  ].join(";");

  run("ffmpeg", [
    "-hide_banner","-loglevel","error","-y",
    "-i",dryFile,
    "-f","lavfi","-i",
    `sine=frequency=${f[0]}:sample_rate=44100:duration=${finalDurationTarget}`,
    "-f","lavfi","-i",
    `sine=frequency=${f[1]}:sample_rate=44100:duration=${finalDurationTarget}`,
    "-f","lavfi","-i",
    `sine=frequency=${f[2]}:sample_rate=44100:duration=${finalDurationTarget}`,
    "-filter_complex",filter,
    "-map","[out]",
    "-ar","44100",
    "-ac","2",
    "-b:a","128k",
    podcastFile,
  ]);

  const podcastDuration = durationSeconds(podcastFile);
  const dryBytes = await readFile(dryFile);
  const podcastBytes = await readFile(podcastFile);

  return {
    bookSlug: book.slug,
    role,
    providerVoice: voice,
    model: MODEL,
    ambience: book.ambience.label,
    displayScriptSha256: sha256(displayText),
    spokenScriptSha256: sha256(spokenText),
    words,
    chunkCount: chunks.length,
    paragraphPauseCount:
      chunkEvidence.filter((item) => item.paragraphEnds).length,
    dry: {
      path: path.relative(outRoot, dryFile).replaceAll("\\", "/"),
      durationSeconds: Number(dryDuration.toFixed(3)),
      wordsPerMinute: Number(wpm.toFixed(2)),
      bytes: dryBytes.length,
      sha256: sha256(dryBytes),
    },
    podcast: {
      path: path.relative(outRoot, podcastFile).replaceAll("\\", "/"),
      durationSeconds: Number(podcastDuration.toFixed(3)),
      bytes: podcastBytes.length,
      sha256: sha256(podcastBytes),
      introLeadSeconds: 4,
      transitionCount: boundaries.length,
    },
    chunkEvidence,
  };
}

async function validateContracts(selection, lexicon) {
  if (
    selection.voices?.female?.providerVoice !== "Sulafat" ||
    selection.voices?.male?.providerVoice !== "Schedar"
  ) {
    throw new Error(
      "Selected voice contract must be female=Sulafat and male=Schedar.",
    );
  }

  if (
    selection.selectedFrom?.runId !== 31462344234 ||
    selection.sourceScriptArtifact?.artifactId !== 9088681208
  ) {
    throw new Error("Selection/source provenance is not pinned.");
  }

  if (
    selection.sourceScriptArtifact?.digest !==
    "sha256:792593b23430654d1083c0b7afb5c19ea9bc2d9394baba735020685904228a35"
  ) {
    throw new Error("Pinned source artifact digest mismatch.");
  }

  if (
    lexicon.schemaVersion !== 1 ||
    lexicon.locale !== "fa-IR" ||
    !Array.isArray(lexicon.entries) ||
    lexicon.entries.length < 5
  ) {
    throw new Error("fa-IR pronunciation lexicon contract failed.");
  }

  const keys = Object.keys(TTS_RESPONSE_FORMAT);

  if (
    keys.length !== 1 ||
    keys[0] !== "type" ||
    TTS_RESPONSE_FORMAT.type !== "audio"
  ) {
    throw new Error(
      "Gemini TTS response_format must be exactly { type: 'audio' }.",
    );
  }

  console.log(
    "Selected voice renderer validate PASS: female=Sulafat male=Schedar sourceArtifact=9088681208",
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const selection = JSON.parse(
    await readFile(
      path.resolve("data/audio/selected-voices.json"),
      "utf8",
    ),
  );

  const lexicon = JSON.parse(
    await readFile(
      path.resolve("data/pronunciation/fa-ir.json"),
      "utf8",
    ),
  );

  await validateContracts(selection, lexicon);

  const plannedVariants =
    BOOKS.length * Object.keys(selection.voices).length;

  const plannedRequests = plannedVariants * 2;

  if (plannedRequests !== PLANNED_TTS_REQUESTS) {
    throw new Error(
      `Planned TTS request budget mismatch: ${plannedRequests}.`,
    );
  }

  console.log(
    `TTS request budget: planned=${plannedRequests}, ` +
    `hardNetworkCap=${MAX_TTS_NETWORK_REQUESTS}.`,
  );

  if (options.mode === "validate") {
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required.");
  }

  const sourceRoot = path.resolve(options.source);
  const outRoot = path.resolve(options.out);

  await mkdir(outRoot, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    locale: "fa-IR",
    selection,
    reviewOnly: true,
    productionPublished: false,
    ttsRequestBudget: {
      plannedSuccessfulRequests: PLANNED_TTS_REQUESTS,
      hardNetworkRequestCap: MAX_TTS_NETWORK_REQUESTS,
    },
    assets: [],
  };

  for (const book of BOOKS) {
    const scriptPath = path.join(
      sourceRoot,
      book.slug,
      "script.fa.txt",
    );

    const displayText = (
      await readFile(scriptPath, "utf8")
    ).trim();

    if (countWords(displayText) < 1500) {
      throw new Error(
        `${book.slug}: pinned source script is unexpectedly short.`,
      );
    }

    const spokenText = normalizeForTts(
      displayText,
      lexicon,
    );

    const bookRoot = path.join(
      outRoot,
      book.slug,
    );

    await mkdir(bookRoot, { recursive: true });

    await writeFile(
      path.join(bookRoot, "script.display.fa.txt"),
      `${displayText}\n`,
      "utf8",
    );

    await writeFile(
      path.join(bookRoot, "script.spoken.fa.txt"),
      `${spokenText}\n`,
      "utf8",
    );

    for (const [role, voiceConfig] of Object.entries(selection.voices)) {
      const asset = await renderVariant({
        apiKey,
        book,
        role,
        voice: voiceConfig.providerVoice,
        displayText,
        spokenText,
        outRoot,
      });

      manifest.assets.push(asset);
    }
  }

  if (manifest.assets.length !== 4) {
    throw new Error(
      `Expected 4 rendered variants; got ${manifest.assets.length}.`,
    );
  }

  if (ttsNetworkRequests > MAX_TTS_NETWORK_REQUESTS) {
    throw new Error(
      `TTS network request cap exceeded: ${ttsNetworkRequests}.`,
    );
  }

  manifest.ttsRequestBudget.networkRequestsUsed =
    ttsNetworkRequests;

  await writeFile(
    path.join(outRoot, "selected-voice-review-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  await writeFile(
    path.join(outRoot, "REVIEW.md"),
    [
      "# KetabCast alpha.12 — Human Review",
      "",
      "Female: Sulafat / Warm",
      "Male: Schedar / Even",
      "",
      "Listen to the four *-podcast.mp3 files.",
      "",
      "Check:",
      "- Iranian Persian accent",
      "- pronunciation",
      "- pacing",
      "- punctuation pauses",
      "- no rushed phrases",
      "- intro music level",
      "- transition music level",
      "- speech clarity over music",
      "- overall podcast quality",
      "",
      "Do not manually publish these files.",
      "A separate exact-byte promotion follows only after human approval.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(
    "Selected full-episode render PASS: 2 books x 2 voices = 4 variants.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
