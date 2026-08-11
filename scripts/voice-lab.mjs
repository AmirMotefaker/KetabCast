import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
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
const VOICES = [
  { order: 1, name: "Sulafat", style: "Warm" },
  { order: 2, name: "Gacrux", style: "Mature" },
  { order: 3, name: "Achird", style: "Friendly" },
  { order: 4, name: "Iapetus", style: "Clear" },
  { order: 5, name: "Aoede", style: "Breezy" },
  { order: 6, name: "Schedar", style: "Even" },
  { order: 7, name: "Kore", style: "Firm" },
  { order: 8, name: "Puck", style: "Upbeat" },
];

const SAMPLE_PATH = path.resolve("content/voice-lab/fa-ir-audition.txt");
const LEXICON_PATH = path.resolve("data/pronunciation/fa-ir.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function parseArgs(argv) {
  const options = { mode: "validate", out: ".voice-lab" };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--mode") {
      options.mode = argv[++index];
    } else if (argv[index] === "--out") {
      options.out = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }

  if (!["validate", "generate"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }

  return options;
}

function normalizeText(text, lexicon) {
  let spoken = text;
  for (const entry of lexicon.entries) {
    spoken = spoken.split(entry.display).join(entry.spoken);
  }
  return spoken;
}

function directorPrompt(spokenText) {
  return [
    "# AUDIO PROFILE",
    "Professional nonfiction podcast narrator for KetabCast.",
    "",
    "# SCENE",
    "Quiet intimate Tehran podcast studio; the listener is wearing headphones.",
    "",
    "# DIRECTOR'S NOTES",
    "Language: Persian.",
    "Accent: Standard contemporary Iranian Persian (fa-IR), Tehran-neutral.",
    "Do not use Dari or Afghan Persian pronunciation.",
    "Pace: Calm and unhurried, 15 to 20 percent slower than ordinary conversation.",
    "Articulation: Pronounce every Persian word clearly and naturally.",
    "Punctuation: Respect punctuation as performance timing.",
    "After commas, use a brief natural pause.",
    "After full stops, use a clearly audible short pause.",
    "Between paragraphs, use a longer reflective pause.",
    "Do not rush phrases together.",
    "Tone: Warm, intelligent, trustworthy, conversational and non-robotic.",
    "Keep wording exact; do not paraphrase, add, translate or omit content.",
    "",
    "# TRANSCRIPT",
    "[calmly]",
    spokenText,
  ].join("\n");
}

function findAudio(value) {
  if (!value || typeof value !== "object") return null;

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

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
}

async function transcodeGeminiAudioToMp3({
  buffer,
  mimeType,
  sampleRate,
  channels,
  tempBase,
  outputFile,
}) {
  const normalizedMime = String(mimeType ?? "").toLowerCase();

  if (normalizedMime === "audio/mp3" || normalizedMime === "audio/mpeg") {
    await writeFile(outputFile, buffer);
    return;
  }

  if (normalizedMime === "audio/wav" || normalizedMime === "audio/x-wav") {
    const wavFile = `${tempBase}.wav`;
    await writeFile(wavFile, buffer);

    try {
      runFfmpeg([
        "-hide_banner","-loglevel","error","-y",
        "-i",wavFile,
        "-ar","44100",
        "-ac","1",
        "-b:a","128k",
        outputFile,
      ]);
    } finally {
      await unlink(wavFile).catch(() => {});
    }

    return;
  }

  const pcmFile = `${tempBase}.pcm`;
  await writeFile(pcmFile, buffer);

  try {
    runFfmpeg([
      "-hide_banner","-loglevel","error","-y",
      "-f","s16le",
      "-ar",String(sampleRate || PCM_SAMPLE_RATE),
      "-ac",String(channels || PCM_CHANNELS),
      "-i",pcmFile,
      "-ar","44100",
      "-ac","1",
      "-b:a","128k",
      outputFile,
    ]);
  } finally {
    await unlink(pcmFile).catch(() => {});
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callTts(apiKey, voice, prompt) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/interactions";

  const body = {
    model: MODEL,
    input: prompt,
    response_format: TTS_RESPONSE_FORMAT,
    generation_config: {
      speech_config: [{ voice: voice.name }],
    },
  };

  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
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
        throw new Error(
          `Gemini TTS HTTP ${response.status}: ${responseText.slice(0, 1200)}`,
        );
      }

      const parsed = JSON.parse(responseText);
      const audio = findAudio(parsed.output_audio) ?? findAudio(parsed);

      if (!audio?.data) {
        throw new Error(`No output_audio data returned for ${voice.name}.`);
      }

      const buffer = Buffer.from(audio.data, "base64");
      if (buffer.length < 4096) {
        throw new Error(
          `Audio too small for ${voice.name}: ${buffer.length} bytes.`,
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
      if (attempt < 5) {
        await sleep(Math.min(1500 * 2 ** (attempt - 1), 12000));
      }
    }
  }

  throw lastError;
}

async function validate() {
  const displayText = (await readFile(SAMPLE_PATH, "utf8")).trim();
  const lexicon = JSON.parse(await readFile(LEXICON_PATH, "utf8"));

  if (lexicon.schemaVersion !== 1 || lexicon.locale !== "fa-IR") {
    throw new Error("fa-IR lexicon contract failed.");
  }

  for (const phrase of [
    "کتاب‌کست",
    "نتایج چشمگیر",
    "جیمز کلیر",
    "کال نیوپورت",
    "تمرکز عمیق",
  ]) {
    if (!displayText.includes(phrase)) {
      throw new Error(`Audition script missing phrase: ${phrase}`);
    }
  }

  if (VOICES.length !== 8) {
    throw new Error(`Expected 8 voice candidates, got ${VOICES.length}.`);
  }

  const spokenText = normalizeText(displayText, lexicon);
  if (spokenText === displayText) {
    throw new Error("Pronunciation normalization did not change text.");
  }

  const prompt = directorPrompt(spokenText);

  for (const marker of [
    "Standard contemporary Iranian Persian",
    "Do not use Dari or Afghan Persian pronunciation",
    "After full stops",
    "Between paragraphs",
  ]) {
    if (!prompt.includes(marker)) {
      throw new Error(`Director prompt missing marker: ${marker}`);
    }
  }

  const responseFormatKeys = Object.keys(TTS_RESPONSE_FORMAT);

  if (
    responseFormatKeys.length !== 1 ||
    responseFormatKeys[0] !== "type" ||
    TTS_RESPONSE_FORMAT.type !== "audio"
  ) {
    throw new Error(
      "Gemini TTS response_format contract must be exactly { type: 'audio' }.",
    );
  }

  for (const forbidden of ["mime_type", "bit_rate", "delivery"]) {
    if (Object.hasOwn(TTS_RESPONSE_FORMAT, forbidden)) {
      throw new Error(
        `Gemini TTS response_format contains forbidden field: ${forbidden}`,
      );
    }
  }

  return { displayText, spokenText, lexicon, prompt };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = await validate();

  if (options.mode === "validate") {
    console.log(
      `Voice Lab validate PASS: 8 voices, ` +
      `${config.lexicon.entries.length} pronunciation rules, model=${MODEL}`,
    );
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required.");
  }

  const outDir = path.resolve(options.out);
  const rawDir = path.join(outDir, "raw");
  await mkdir(rawDir, { recursive: true });

  await writeFile(
    path.join(outDir, "display-transcript.fa.txt"),
    `${config.displayText}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "spoken-normalized.fa.txt"),
    `${config.spokenText}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "director-prompt.txt"),
    `${config.prompt}\n`,
    "utf8",
  );

  const manifest = {
    schemaVersion: 1,
    model: MODEL,
    apiRevision: API_REVISION,
    localeTarget: "fa-IR",
    genderLabelsAssigned: false,
    displayTranscriptSha256: sha256(config.displayText),
    spokenTranscriptSha256: sha256(config.spokenText),
    directorPromptSha256: sha256(config.prompt),
    pronunciationRules: config.lexicon.entries.length,
    voices: [],
  };

  for (const voice of VOICES) {
    const prefix = String(voice.order).padStart(2, "0");
    const filename =
      `${prefix}-${slug(voice.name)}-${slug(voice.style)}.mp3`;

    console.log(
      `Generating ${voice.order}/8: ${voice.name} (${voice.style})`,
    );

    const generated = await callTts(apiKey, voice, config.prompt);
    const file = path.join(rawDir, filename);
    const tempBase = path.join(
      rawDir,
      `${prefix}-${slug(voice.name)}-${slug(voice.style)}-source`,
    );

    await transcodeGeminiAudioToMp3({
      ...generated,
      tempBase,
      outputFile: file,
    });

    const finalMp3 = await readFile(file);

    if (finalMp3.length < 4096) {
      throw new Error(
        `Transcoded MP3 too small for ${voice.name}: ${finalMp3.length} bytes.`,
      );
    }

    manifest.voices.push({
      order: voice.order,
      voice: voice.name,
      publishedStyleDescriptor: voice.style,
      genderLabel: null,
      rawFile: `raw/${filename}`,
      mimeType: "audio/mpeg",
      sourceMimeType: generated.mimeType,
      sourceSampleRate: generated.sampleRate,
      sourceChannels: generated.channels,
      bytes: finalMp3.length,
      sha256: sha256(finalMp3),
    });

    await sleep(1200);
  }

  await writeFile(
    path.join(outDir, "voice-lab-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const review = [
    "# KetabCast Persian Voice Lab",
    "",
    "Listen to RAW first, then the matching PODCAST-DEMO.",
    "",
    "Do not infer gender from a voice name. Human listening assigns one",
    "preferred female voice and one preferred male voice.",
    "",
    "Score 1–5:",
    "- Iranian Persian accent",
    "- pronunciation accuracy",
    "- calm pacing",
    "- punctuation/paragraph pauses",
    "- warmth and trust",
    "- podcast suitability",
    "",
    "Pay special attention to:",
    "- کتاب‌کست",
    "- نتایج چشمگیر",
    "- جیمز کلیر",
    "- کال نیوپورت",
    "- تمرکز عمیق",
    "",
    "Publication remains blocked until human selection and full-episode review.",
    "",
  ].join("\n");

  await writeFile(path.join(outDir, "REVIEW.md"), review, "utf8");
  console.log("Voice Lab generation PASS: 8 raw samples.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
