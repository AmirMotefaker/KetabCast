import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const MODEL =
  process.env.GEMINI_TTS_MODEL?.trim() ||
  "gemini-3.1-flash-tts-preview";

const API_REVISION = "2026-05-20";
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

  if (
    typeof value.data === "string" &&
    (
      value.type === "audio" ||
      String(value.mime_type ?? "").startsWith("audio/")
    )
  ) {
    return {
      data: value.data,
      mimeType: value.mime_type ?? "audio/mp3",
    };
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

async function callTts(apiKey, voice, prompt) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/interactions";

  const body = {
    model: MODEL,
    input: prompt,
    response_format: {
      type: "audio",
      mime_type: "audio/mp3",
      bit_rate: 128000,
      delivery: "inline",
    },
    generation_config: {
      speech_config: [{ voice: voice.name }],
    },
    store: false,
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

      const audio = findAudio(JSON.parse(responseText));
      if (!audio?.data) {
        throw new Error(`No inline audio returned for ${voice.name}.`);
      }

      const buffer = Buffer.from(audio.data, "base64");
      if (buffer.length < 4096) {
        throw new Error(
          `Audio too small for ${voice.name}: ${buffer.length} bytes.`,
        );
      }

      return { buffer, mimeType: audio.mimeType };
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
    await writeFile(file, generated.buffer);

    manifest.voices.push({
      order: voice.order,
      voice: voice.name,
      publishedStyleDescriptor: voice.style,
      genderLabel: null,
      rawFile: `raw/${filename}`,
      mimeType: generated.mimeType,
      bytes: generated.buffer.length,
      sha256: sha256(generated.buffer),
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
