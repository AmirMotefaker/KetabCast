import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MODEL =
  process.env.GEMINI_TTS_MODEL?.trim() ||
  "gemini-3.1-flash-tts-preview";

const API_REVISION = "2026-05-20";
const TTS_RESPONSE_FORMAT = Object.freeze({ type: "audio" });
const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const MAX_TTS_NETWORK_REQUESTS = 10;
const MIN_TTS_REQUEST_INTERVAL_MS = 12000;
const DEFAULT_TRANSIENT_429_DELAY_MS = 30000;
const MAX_TRANSIENT_RETRY_DELAY_MS = 120000;

const BOOK_AUDIO_PROFILE = Object.freeze({
  "atomic-habits": {
    frequencies: [196.0, 246.94, 329.63],
    label: "warm-motivational-minimal",
  },
  "deep-work": {
    frequencies: [174.61, 220.0, 293.66],
    label: "calm-focus-minimal",
  },
  "think-again": {
    frequencies: [196.0, 261.63, 329.63],
    label: "curious-reflective-minimal",
  },
  "zero-to-one": {
    frequencies: [164.81, 220.0, 277.18],
    label: "bold-future-minimal",
  },
  "leading-teams": {
    frequencies: [185.0, 233.08, 293.66],
    label: "steady-leadership-minimal",
  },
});

const BATCHES = Object.freeze({
  "batch-a": ["atomic-habits", "deep-work"],
  "batch-b": ["think-again", "zero-to-one"],
  "batch-c": ["leading-teams"],
});

let ttsNetworkRequests = 0;
let lastTtsRequestStartedAt = 0;

function parseArgs(argv) {
  const options = {
    batch: "batch-a",
    mode: "validate",
    out: ".dual-voice-review",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--batch") {
      options.batch = argv[++index];
    } else if (token === "--mode") {
      options.mode = argv[++index];
    } else if (token === "--out") {
      options.out = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!Object.hasOwn(BATCHES, options.batch)) {
    throw new Error(`Unsupported batch: ${options.batch}`);
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
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
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

function brandSafeTranscript(text) {
  return text
    .replace(/کتاب[\u200c\u200f\u200e \-]?کست/gu, "زبدینو")
    .replace(/KetabCast/gu, "Zobdino");
}

function normalizeForTts(displayText, lexicon) {
  let spoken = displayText;

  for (const entry of lexicon.entries) {
    spoken = spoken.split(entry.display).join(entry.spoken);
  }

  return spoken;
}

function buildChunks(text) {
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((value) => value.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) {
    throw new Error(
      "Full-episode narration requires at least two source paragraphs.",
    );
  }

  const paragraphWordCounts = paragraphs.map(countWords);
  const totalWords = paragraphWordCounts.reduce(
    (sum, value) => sum + value,
    0,
  );
  const target = totalWords / 2;

  let running = 0;
  let splitIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    running += paragraphWordCounts[index];
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

  const chunks = groups.map((group, index) => {
    const chunkText = group.join("\n\n").trim();
    const words = countWords(chunkText);

    if (words < 500 || words > 1400) {
      throw new Error(
        `Chunk ${index + 1} has ${words} words; expected 500–1400.`,
      );
    }

    return {
      index,
      text: chunkText,
      words,
      pauseAfterMs: index === 0 ? 1200 : 900,
    };
  });

  if (chunks.length !== 2) {
    throw new Error(`Expected exactly two chunks; got ${chunks.length}.`);
  }

  return chunks;
}

function directorPrompt(text, role, voice, bookSlug, chunk) {
  return [
    "# AUDIO PROFILE",
    "Professional Persian nonfiction podcast narrator for Zobdino / زبدینو.",
    "",
    "# RECORDING CONTEXT",
    `Book slug: ${bookSlug}.`,
    `Voice role: ${role}.`,
    `Provider voice: ${voice}.`,
    `Chunk ${chunk.index + 1} of 2.`,
    "",
    "# DIRECTOR'S NOTES",
    "Language: Persian.",
    "Accent: Standard contemporary Iranian Persian (fa-IR), Tehran-neutral.",
    "Do not use Dari or Afghan Persian pronunciation.",
    "Pace: calm, patient and unhurried.",
    "Speak around 15 to 20 percent slower than ordinary conversation.",
    "Never rush Persian words together.",
    "Pronounce every Persian word fully, naturally and clearly.",
    "Use punctuation as performance timing.",
    "Use a small natural pause after commas.",
    "Use a clearly audible short pause after full stops.",
    "Use a stronger reflective pause between paragraphs and ideas.",
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

function secondsToMilliseconds(value) {
  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.ceil(seconds * 1000);
}

function parseRetryDelayValue(value) {
  if (typeof value === "string") {
    const match = value.trim().match(
      /^([0-9]+(?:\.[0-9]+)?)s$/u,
    );

    return match
      ? secondsToMilliseconds(match[1])
      : null;
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const seconds = Number(value.seconds ?? 0);
    const nanos = Number(value.nanos ?? 0);

    if (
      Number.isFinite(seconds) &&
      Number.isFinite(nanos) &&
      (seconds > 0 || nanos > 0)
    ) {
      return Math.ceil(
        seconds * 1000 + nanos / 1_000_000,
      );
    }
  }

  return null;
}

function parseRetryDelayMs(responseText) {
  const candidates = [];

  try {
    const parsed = JSON.parse(responseText);
    const details = Array.isArray(parsed?.error?.details)
      ? parsed.error.details
      : [];

    for (const detail of details) {
      const type = String(detail?.["@type"] ?? "");

      if (type.includes("RetryInfo")) {
        const value = parseRetryDelayValue(
          detail?.retryDelay,
        );

        if (value) candidates.push(value);
      }
    }

    const message = String(
      parsed?.error?.message ?? "",
    );

    const match = message.match(
      /Please retry in\s+([0-9]+(?:\.[0-9]+)?)s/iu,
    );

    if (match) {
      const value = secondsToMilliseconds(match[1]);

      if (value) candidates.push(value);
    }
  } catch {
    const match = responseText.match(
      /Please retry in\s+([0-9]+(?:\.[0-9]+)?)s/iu,
    );

    if (match) {
      const value = secondsToMilliseconds(match[1]);

      if (value) candidates.push(value);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return Math.max(...candidates);
}

function parseQuotaDetails(responseText) {
  let quotaIds = [];
  let errorMessage = responseText;

  try {
    const parsed = JSON.parse(responseText);
    const details = Array.isArray(parsed?.error?.details)
      ? parsed.error.details
      : [];

    quotaIds = details
      .flatMap((detail) =>
        Array.isArray(detail?.violations)
          ? detail.violations.map((violation) =>
              String(violation?.quotaId ?? ""),
            )
          : [],
      )
      .filter(Boolean);

    errorMessage = String(
      parsed?.error?.message ?? responseText,
    );
  } catch {
    // Raw provider text is still useful for retry hints.
  }

  const daily =
    quotaIds.some((value) =>
      /PerDay/iu.test(value),
    ) ||
    /\b(?:daily|per day)\b/iu.test(errorMessage);

  return {
    daily,
    retryDelayMs: parseRetryDelayMs(responseText),
    quotaIds,
  };
}

function validateRateLimitClassifier() {
  const transient = JSON.stringify({
    error: {
      message:
        "Quota exceeded for metric: " +
        "generate_content_free_tier_requests, limit: 10. " +
        "Please retry in 23.145143415s.",
      details: [
        {
          "@type":
            "type.googleapis.com/google.rpc.RetryInfo",
          retryDelay: "23.145143415s",
        },
      ],
    },
  });

  const transientResult =
    parseQuotaDetails(transient);

  if (
    transientResult.daily ||
    !transientResult.retryDelayMs ||
    transientResult.retryDelayMs < 23145
  ) {
    throw new Error(
      "Transient 429 classifier self-test failed.",
    );
  }

  const daily = JSON.stringify({
    error: {
      message: "Daily quota exceeded.",
      details: [
        {
          violations: [
            {
              quotaId:
                "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
            },
          ],
        },
      ],
    },
  });

  const dailyResult = parseQuotaDetails(daily);

  if (!dailyResult.daily) {
    throw new Error(
      "Daily quota classifier self-test failed.",
    );
  }

  console.log(
    "Dual-voice rate-limit classifier PASS: " +
    "transient retry hint vs explicit daily quota.",
  );
}

async function paceTtsRequest() {
  const now = Date.now();
  const elapsed = now - lastTtsRequestStartedAt;
  const waitMs = Math.max(
    0,
    MIN_TTS_REQUEST_INTERVAL_MS - elapsed,
  );

  if (waitMs > 0) {
    console.log(
      `TTS pacing: waiting ${(waitMs / 1000).toFixed(1)}s.`,
    );
    await sleep(waitMs);
  }

  lastTtsRequestStartedAt = Date.now();
}

function reserveTtsNetworkRequest(plannedRequests) {
  if (ttsNetworkRequests >= MAX_TTS_NETWORK_REQUESTS) {
    throw new Error(
      "TTS_REQUEST_BUDGET_EXHAUSTED: refusing to exceed " +
      `${MAX_TTS_NETWORK_REQUESTS} Gemini TTS network requests. ` +
      `Planned successful requests: ${plannedRequests}.`,
    );
  }

  ttsNetworkRequests += 1;
}

const MAX_TTS_ATTEMPTS_PER_CHUNK = 3;
const RETRYABLE_TTS_STATUS = new Set([
  408,
  429,
  500,
  502,
  503,
  504,
]);
const BASE_TRANSIENT_BACKOFF_MS = 6000;
const MAX_TRANSIENT_BACKOFF_MS = 30000;

function transientBackoffMs(attempt) {
  const exponent = Math.max(0, attempt - 1);
  const base = Math.min(
    BASE_TRANSIENT_BACKOFF_MS * (2 ** exponent),
    MAX_TRANSIENT_BACKOFF_MS,
  );
  const jitter = Math.floor(Math.random() * 1001);

  return Math.min(
    base + jitter,
    MAX_TRANSIENT_BACKOFF_MS,
  );
}

function retryDelayForStatus(status, quota, attempt) {
  if (status === 429) {
    const hinted =
      quota?.retryDelayMs ??
      DEFAULT_TRANSIENT_429_DELAY_MS;

    return Math.min(
      Math.max(
        hinted + 1500 + Math.floor(Math.random() * 1001),
        MIN_TTS_REQUEST_INTERVAL_MS,
      ),
      MAX_TRANSIENT_RETRY_DELAY_MS,
    );
  }

  return transientBackoffMs(attempt);
}

function validateRetryPolicy() {
  if (MAX_TTS_ATTEMPTS_PER_CHUNK !== 3) {
    throw new Error(
      "Retry policy attempt-count self-test failed.",
    );
  }

  for (const status of [408, 429, 500, 502, 503, 504]) {
    if (!RETRYABLE_TTS_STATUS.has(status)) {
      throw new Error(
        `Retry policy missing HTTP ${status}.`,
      );
    }
  }

  for (const status of [400, 401, 403, 404, 422]) {
    if (RETRYABLE_TTS_STATUS.has(status)) {
      throw new Error(
        `Retry policy incorrectly retries HTTP ${status}.`,
      );
    }
  }

  if (MIN_TTS_REQUEST_INTERVAL_MS < 12000) {
    throw new Error(
      "TTS pacing self-test failed; expected >=12 seconds.",
    );
  }

  if (MAX_TTS_NETWORK_REQUESTS !== 10) {
    throw new Error(
      "TTS network hard-cap self-test failed.",
    );
  }

  console.log(
    "Dual-voice retry-policy PASS: " +
    "3 attempts/chunk, 408/429/5xx retryable, " +
    "12s pacing, hard cap 10.",
  );
}

async function callTts(apiKey, voice, prompt, plannedRequests) {
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

  for (
    let attempt = 1;
    attempt <= MAX_TTS_ATTEMPTS_PER_CHUNK;
    attempt += 1
  ) {
    await paceTtsRequest();
    reserveTtsNetworkRequest(plannedRequests);

    let response;
    let responseText;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
          "Api-Revision": API_REVISION,
        },
        body: JSON.stringify(body),
      });

      responseText = await response.text();
    } catch (error) {
      lastError = error;

      if (attempt >= MAX_TTS_ATTEMPTS_PER_CHUNK) {
        throw error;
      }

      const waitMs = transientBackoffMs(attempt);

      console.log(
        "Gemini TTS transport/read failure " +
        `attempt ${attempt}/${MAX_TTS_ATTEMPTS_PER_CHUNK}; ` +
        `retrying after ${(waitMs / 1000).toFixed(1)}s. ` +
        `networkRequestsUsed=${ttsNetworkRequests}. ` +
        String(error?.message ?? error).slice(0, 300),
      );

      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const quota = parseQuotaDetails(responseText);

      if (
        response.status === 429 &&
        quota.daily
      ) {
        throw new Error(
          "DAILY_TTS_QUOTA_EXHAUSTED: explicit per-day Gemini TTS " +
          "quota is exhausted. Wait for the daily reset. " +
          `networkRequestsUsed=${ttsNetworkRequests}. ` +
          responseText.slice(0, 900),
        );
      }

      const error = new Error(
        `Gemini TTS HTTP ${response.status}: ` +
        responseText.slice(0, 900),
      );

      lastError = error;

      if (
        RETRYABLE_TTS_STATUS.has(response.status) &&
        attempt < MAX_TTS_ATTEMPTS_PER_CHUNK
      ) {
        const waitMs = retryDelayForStatus(
          response.status,
          quota,
          attempt,
        );

        console.log(
          `Gemini TTS retryable HTTP ${response.status}; ` +
          `attempt ${attempt}/${MAX_TTS_ATTEMPTS_PER_CHUNK}; ` +
          `retrying after ${(waitMs / 1000).toFixed(1)}s. ` +
          `networkRequestsUsed=${ttsNetworkRequests}.`,
        );

        await sleep(waitMs);
        continue;
      }

      throw error;
    }

    try {
      const parsed = JSON.parse(responseText);
      const audio =
        findAudio(parsed.output_audio) ??
        findAudio(parsed);

      if (!audio?.data) {
        throw new Error(
          `No output_audio returned for ${voice}.`,
        );
      }

      const buffer = Buffer.from(
        audio.data,
        "base64",
      );

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

      if (attempt >= MAX_TTS_ATTEMPTS_PER_CHUNK) {
        throw error;
      }

      const waitMs = transientBackoffMs(attempt);

      console.log(
        "Gemini TTS provider-response failure " +
        `attempt ${attempt}/${MAX_TTS_ATTEMPTS_PER_CHUNK}; ` +
        `retrying after ${(waitMs / 1000).toFixed(1)}s. ` +
        `networkRequestsUsed=${ttsNetworkRequests}. ` +
        String(error?.message ?? error).slice(0, 300),
      );

      await sleep(waitMs);
    }
  }

  throw (
    lastError ??
    new Error("Gemini TTS retry loop exhausted without a result.")
  );
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
        ? ["-i", tempFile]
        : [
            "-f", "s16le",
            "-ar", String(generated.sampleRate || PCM_SAMPLE_RATE),
            "-ac", String(generated.channels || PCM_CHANNELS),
            "-i", tempFile,
          ];

    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      ...inputArgs,
      "-ar", "44100",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      wavFile,
    ]);
  } finally {
    await unlink(tempFile).catch(() => {});
  }
}

async function makeSilence(file, milliseconds) {
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi",
    "-i", "anullsrc=r=44100:cl=mono",
    "-t", (milliseconds / 1000).toFixed(3),
    "-c:a", "pcm_s16le",
    file,
  ]);
}

function concatText(files) {
  return (
    files
      .map((file) => `file '${file.replaceAll("'", "'\\''")}'`)
      .join("\n") + "\n"
  );
}

async function renderVariant({
  apiKey,
  bookSlug,
  profile,
  role,
  voice,
  styleDescriptor,
  displayText,
  spokenText,
  outRoot,
  plannedRequests,
}) {
  const root = path.join(outRoot, bookSlug, role);
  const chunksRoot = path.join(root, "chunks");

  await mkdir(chunksRoot, { recursive: true });

  const chunks = buildChunks(spokenText);
  const concatFiles = [];
  const chunkEvidence = [];

  for (const chunk of chunks) {
    const prefix = String(chunk.index + 1).padStart(2, "0");
    const wav = path.join(chunksRoot, `${prefix}.wav`);
    const pause = path.join(chunksRoot, `${prefix}-pause.wav`);
    const temp = path.join(chunksRoot, `${prefix}.provider`);

    const prompt = directorPrompt(
      chunk.text,
      role,
      voice,
      bookSlug,
      chunk,
    );

    console.log(
      `${bookSlug}/${role}/${voice}: TTS ${chunk.index + 1}/2`,
    );

    const generated = await callTts(
      apiKey,
      voice,
      prompt,
      plannedRequests,
    );

    await providerToWav(generated, wav, temp);
    await makeSilence(pause, chunk.pauseAfterMs);

    const chunkDuration = durationSeconds(wav);

    concatFiles.push(wav, pause);

    chunkEvidence.push({
      index: chunk.index,
      words: chunk.words,
      pauseAfterMs: chunk.pauseAfterMs,
      durationSeconds: Number(chunkDuration.toFixed(3)),
      spokenChunkSha256: sha256(chunk.text),
      directorPromptSha256: sha256(prompt),
      sourceMimeType: generated.mimeType,
      sourceSampleRate: generated.sampleRate,
      sourceChannels: generated.channels,
    });

    await sleep(900);
  }

  const concatFile = path.join(root, "concat.txt");
  await writeFile(concatFile, concatText(concatFiles), "utf8");

  const voiceSlug = voice.toLowerCase();
  const dryFile = path.join(
    root,
    `${role}-${voiceSlug}-dry.mp3`,
  );

  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatFile,
    "-af", "loudnorm=I=-16:LRA=9:TP=-1.5",
    "-ar", "44100",
    "-ac", "1",
    "-b:a", "128k",
    dryFile,
  ]);

  const dryDuration = durationSeconds(dryFile);
  const words = countWords(displayText);
  const wpm = words / (dryDuration / 60);

  if (dryDuration < 600 || dryDuration > 1320) {
    throw new Error(
      `${bookSlug}/${role}: ${dryDuration.toFixed(1)}s outside 10–22 minute gate.`,
    );
  }

  if (wpm < 90 || wpm > 175) {
    throw new Error(
      `${bookSlug}/${role}: ${wpm.toFixed(1)} WPM outside 90–175 gate.`,
    );
  }

  const podcastFile = path.join(
    root,
    `${role}-${voiceSlug}-podcast.mp3`,
  );

  const f = profile.frequencies;
  const finalDurationTarget = dryDuration + 10;

  const filter = [
    "[1:a]volume=0.020,lowpass=f=950[a1]",
    "[2:a]volume=0.014,lowpass=f=1200[a2]",
    "[3:a]volume=0.009,lowpass=f=1500[a3]",
    "[a1][a2][a3]amix=inputs=3:normalize=0[bed0]",
    "[bed0]afade=t=in:st=0:d=1.7,afade=t=out:st=" +
      `${Math.max(0, finalDurationTarget - 4).toFixed(2)}:d=3[bed]`,
    "[0:a]adelay=3500|3500,aresample=44100,volume=1.0[voice]",
    "[voice][bed]amix=inputs=2:duration=longest:normalize=0," +
      "loudnorm=I=-16:LRA=7:TP=-1.5[out]",
  ].join(";");

  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", dryFile,
    "-f", "lavfi", "-i",
    `sine=frequency=${f[0]}:sample_rate=44100:duration=${finalDurationTarget}`,
    "-f", "lavfi", "-i",
    `sine=frequency=${f[1]}:sample_rate=44100:duration=${finalDurationTarget}`,
    "-f", "lavfi", "-i",
    `sine=frequency=${f[2]}:sample_rate=44100:duration=${finalDurationTarget}`,
    "-filter_complex", filter,
    "-map", "[out]",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "128k",
    podcastFile,
  ]);

  const podcastDuration = durationSeconds(podcastFile);
  const dryBytes = await readFile(dryFile);
  const podcastBytes = await readFile(podcastFile);

  return {
    bookSlug,
    role,
    provider: "gemini",
    providerVoice: voice,
    styleDescriptor,
    model: MODEL,
    ambience: profile.label,
    displayScriptSha256: sha256(displayText),
    spokenScriptSha256: sha256(spokenText),
    words,
    chunkCount: 2,
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
    },
    chunkEvidence,
  };
}

function validateSelection(selection, lexicon) {
  if (selection.schemaVersion !== 1 || selection.locale !== "fa-IR") {
    throw new Error("Selected voice metadata contract failed.");
  }

  if (
    selection.voices?.female?.providerVoice !== "Sulafat" ||
    selection.voices?.male?.providerVoice !== "Schedar"
  ) {
    throw new Error(
      "Selected voices must remain female=Sulafat and male=Schedar.",
    );
  }

  if (
    selection.selectedFrom?.runId !== 31462344234 ||
    selection.selectedFrom?.exactSha !==
      "fa4567130df38eb01b5e74de0250b4e0915c830a"
  ) {
    throw new Error("Selected voice human-listening provenance changed.");
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
    throw new Error("Gemini TTS response_format contract changed.");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const slugs = BATCHES[options.batch];

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

  const episodes = JSON.parse(
    await readFile(
      path.resolve("src/content/episodes.json"),
      "utf8",
    ),
  );

  validateSelection(selection, lexicon);
  validateRateLimitClassifier();
  validateRetryPolicy();

  const selectedEpisodes = slugs.map((slug) => {
    const episode = episodes.find((item) => item.bookSlug === slug);

    if (!episode) {
      throw new Error(`Production episode not found for ${slug}.`);
    }

    if (episode.audio?.status !== "ready") {
      throw new Error(`Production episode is not ready: ${slug}.`);
    }

    return episode;
  });

  const voices = Object.entries(selection.voices);
  const plannedRequests = selectedEpisodes.length * voices.length * 2;

  if (plannedRequests > 8) {
    throw new Error(
      `Batch planned requests=${plannedRequests}; free-tier-safe cap is 8.`,
    );
  }

  console.log(
    `Dual-voice batch ${options.batch}: ` +
    `${slugs.join(", ")} | planned=${plannedRequests} | ` +
    `hardNetworkCap=${MAX_TTS_NETWORK_REQUESTS}`,
  );

  if (options.mode === "validate") {
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required.");
  }

  const outRoot = path.resolve(options.out);
  await mkdir(outRoot, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceCodeSha:
      process.env.GITHUB_SHA?.trim() ||
      run("git", ["rev-parse", "HEAD"]),
    sourceEpisodeFile: "src/content/episodes.json",
    batch: options.batch,
    bookSlugs: slugs,
    model: MODEL,
    locale: "fa-IR",
    product: "Zobdino",
    voiceSelection: {
      provenance: selection.selectedFrom,
      voices: selection.voices,
    },
    ttsRequestBudget: {
      plannedSuccessfulRequests: plannedRequests,
      hardNetworkRequestCap: MAX_TTS_NETWORK_REQUESTS,
    },
    assets: [],
  };

  for (const episode of selectedEpisodes) {
    const profile = BOOK_AUDIO_PROFILE[episode.bookSlug];

    if (!profile) {
      throw new Error(`Audio profile missing: ${episode.bookSlug}`);
    }

    const displayText = brandSafeTranscript(
      String(episode.transcript ?? "").trim(),
    );

    if (countWords(displayText) < 1500) {
      throw new Error(
        `${episode.bookSlug}: production transcript is unexpectedly short.`,
      );
    }

    if (
      /کتاب[\u200c\u200f\u200e \-]?کست/gu.test(displayText) ||
      /KetabCast/gu.test(displayText)
    ) {
      throw new Error(
        `${episode.bookSlug}: legacy KetabCast brand remains in narration text.`,
      );
    }

    const spokenText = normalizeForTts(displayText, lexicon);
    const bookRoot = path.join(outRoot, episode.bookSlug);

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

    for (const [role, config] of voices) {
      const asset = await renderVariant({
        apiKey,
        bookSlug: episode.bookSlug,
        profile,
        role,
        voice: config.providerVoice,
        styleDescriptor: config.styleDescriptor,
        displayText,
        spokenText,
        outRoot,
        plannedRequests,
      });

      manifest.assets.push(asset);
    }
  }

  const expectedAssets = selectedEpisodes.length * voices.length;

  if (manifest.assets.length !== expectedAssets) {
    throw new Error(
      `Expected ${expectedAssets} variants; got ${manifest.assets.length}.`,
    );
  }

  manifest.ttsRequestBudget.networkRequestsUsed = ttsNetworkRequests;

  await writeFile(
    path.join(outRoot, "dual-voice-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Dual-voice generation PASS: ${manifest.assets.length} variants, ` +
    `${ttsNetworkRequests} network requests.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
