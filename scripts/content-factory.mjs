import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  buildSourcePack,
  loadFactoryCatalog,
} from "./content-source-pack.mjs";

const GEMINI_RESEARCH_MODEL =
  process.env.GEMINI_RESEARCH_MODEL?.trim() || "gemini-2.5-flash-lite";
const GEMINI_SCRIPT_MODEL =
  process.env.GEMINI_SCRIPT_MODEL?.trim() || "gemini-2.5-flash";
const CLOUDFLARE_MODEL =
  process.env.CLOUDFLARE_AI_MODEL?.trim() ||
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchJsonWithRetry(url, options, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      if (!response.ok) {
        const retryable =
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;
        if (retryable && attempt < attempts) {
          await sleep(Math.min(2 ** attempt * 1000, 8000));
          continue;
        }
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ${text.slice(0, 1200)}`,
        );
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(Math.min(2 ** attempt * 1000, 8000));
    }
  }
  throw lastError;
}

function geminiText(response) {
  return (response.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function geminiGroundingSources(response) {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = [];
  const seen = new Set();
  for (const chunk of chunks) {
    const web = chunk?.web;
    if (!web?.uri || seen.has(web.uri)) continue;
    seen.add(web.uri);
    sources.push({
      kind: "gemini-google-search",
      title: web.title ?? web.uri,
      url: web.uri,
    });
  }
  return sources;
}

async function geminiGenerate({
  model,
  prompt,
  grounded = false,
  responseSchema = null,
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const generationConfig = {
    temperature: grounded ? 0.2 : 0.35,
    maxOutputTokens: 8192,
  };
  if (responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = responseSchema;
  }

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig,
  };
  if (grounded) body.tools = [{ google_search: {} }];

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    `${encodeURIComponent(model)}:generateContent`;

  return fetchJsonWithRetry(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function cloudflareGenerate(prompt, { jsonOnly = false } = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!token || !accountId) {
    throw new Error(
      "Cloudflare fallback requires CLOUDFLARE_API_TOKEN and " +
        "CLOUDFLARE_ACCOUNT_ID.",
    );
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/` +
    CLOUDFLARE_MODEL;

  const response = await fetchJsonWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are KetabCast's research and podcast writing engine. " +
            "Be factual, copyright-safe and fluent in Persian.",
        },
        {
          role: "user",
          content:
            jsonOnly
              ? `${prompt}\n\nReturn JSON only. No Markdown fences.`
              : prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    }),
  });

  if (!response.success) {
    throw new Error(`Workers AI error: ${JSON.stringify(response.errors)}`);
  }
  return String(response.result?.response ?? "").trim();
}

function sourcePackForPrompt(pack) {
  return JSON.stringify({
    book: pack.book,
    policy: pack.policy,
    metadata: pack.metadata,
    officialPages: pack.officialPages.map((page) => ({
      url: page.url,
      title: page.title,
      text: page.text,
      truncated: page.truncated,
    })),
    errors: pack.errors,
  }, null, 2);
}

function researchPrompt(book, pack) {
  return `
You are building a legally safe research dossier for KetabCast, a Persian
audio-summary product.

BOOK
Title: ${book.title}
Persian title: ${book.titleFa}
Author: ${book.author}
Persian author: ${book.authorFa}

RIGHTS POLICY
- This book is copyrighted and rightsMode is "${book.rightsMode}".
- DO NOT search for, rely on, quote from, or link to pirate PDFs, unauthorized
  full-text mirrors, leaked ebooks, chapter dumps, or wholesale reproductions.
- Prefer official author/publisher pages, Google Books legal metadata/previews,
  Open Library metadata, author interviews/talks, and reputable reviews.
- Extract ideas, arguments, frameworks, examples, criticisms and practical
  implications. Do not reproduce the book.
- Direct quotations must be avoided unless extremely short and necessary.
- Every factual claim should be supportable by the listed sources.

SEED SOURCE PACK
${sourcePackForPrompt(pack)}

SEARCH QUERIES TO CONSIDER
${(book.searchQueries ?? []).map((query) => `- ${query}`).join("\n")}

OUTPUT
Write a detailed English research dossier, suitable as source material for an
independently written Persian 12–15 minute podcast. Include:
1. verified identity/publication context
2. 6–10 core concepts
3. important frameworks/rules
4. useful examples or applications stated in your own words
5. limitations/nuance/criticisms where supportable
6. a claim checklist for fact QA
7. a source list

Do not write the final Persian podcast yet.
`.trim();
}

const episodeSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    transcript: { type: "STRING" },
    keyIdeas: { type: "ARRAY", items: { type: "STRING" } },
    actionToday: { type: "STRING" },
  },
  required: [
    "title",
    "description",
    "transcript",
    "keyIdeas",
    "actionToday",
  ],
};

function scriptPrompt(book, research) {
  return `
You are the senior Persian writer for KetabCast.

Create an ORIGINAL Persian podcast script based only on the research dossier
below. This is a summary/analysis, not a translation.

BOOK
${book.titleFa} (${book.title}) — ${book.authorFa} (${book.author})

HARD RULES
- Persian must sound native, conversational and editorially polished.
- Do not translate the book chapter-by-chapter.
- Do not reproduce or closely paraphrase copyrighted prose.
- Do not invent claims that are absent from the dossier.
- Do not include URLs, citations, source names or production notes in transcript.
- Explain 4–6 central ideas with concrete, understandable examples.
- Include a compelling opening, transitions, conclusion, and one practical
  "اقدام امروز".
- Target 1,800–2,200 Persian words for roughly 12–15 minutes.
- keyIdeas must contain 4–6 concise Persian items.
- description must be 1–2 concise Persian sentences.
- title must be concise and suitable for the episode UI.

RESEARCH DOSSIER
${research}
`.trim();
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first < 0 || last <= first) throw new Error("No JSON object found.");
    return JSON.parse(trimmed.slice(first, last + 1));
  }
}

function countWords(text) {
  return text
    .replace(/[\u200c\u200f]/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

function deterministicQa(episode, sourceCount) {
  const words = countWords(episode.transcript ?? "");
  const ideas = Array.isArray(episode.keyIdeas) ? episode.keyIdeas.length : 0;
  const hasUrl = /https?:\/\/|www\./iu.test(episode.transcript ?? "");
  const checks = [
    {
      name: "word-count",
      pass: words >= 1500 && words <= 2500,
      detail: `Expected 1500–2500 safety range; got ${words}.`,
    },
    {
      name: "key-ideas",
      pass: ideas >= 4 && ideas <= 6,
      detail: `Expected 4–6; got ${ideas}.`,
    },
    {
      name: "source-count",
      pass: sourceCount >= 2,
      detail: `Expected at least 2 source records; got ${sourceCount}.`,
    },
    {
      name: "no-urls-in-transcript",
      pass: !hasUrl,
      detail: hasUrl ? "Transcript contains a URL." : "No URL found.",
    },
  ];
  return {
    pass: checks.every((check) => check.pass),
    wordCount: words,
    keyIdeaCount: ideas,
    sourceCount,
    checks,
  };
}

async function researchBook(book, pack) {
  const prompt = researchPrompt(book, pack);
  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      const response = await geminiGenerate({
        model: GEMINI_RESEARCH_MODEL,
        prompt,
        grounded: true,
      });
      const text = geminiText(response);
      if (!text) throw new Error("Gemini returned empty research text.");
      return {
        provider: "gemini-google-search",
        model: GEMINI_RESEARCH_MODEL,
        text,
        searchSources: geminiGroundingSources(response),
      };
    } catch (error) {
      console.warn(
        `Gemini grounded research failed; trying Workers AI fallback: ${error}`,
      );
    }
  }

  const text = await cloudflareGenerate(
    `${prompt}\n\nIMPORTANT: You do not have live web search in this fallback. ` +
      "Use only the supplied source pack and explicitly state uncertainty.",
  );
  return {
    provider: "cloudflare-workers-ai",
    model: CLOUDFLARE_MODEL,
    text,
    searchSources: [],
  };
}

async function writeEpisode(book, research) {
  const prompt = scriptPrompt(book, research);
  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      const response = await geminiGenerate({
        model: GEMINI_SCRIPT_MODEL,
        prompt,
        responseSchema: episodeSchema,
      });
      return {
        provider: "gemini",
        model: GEMINI_SCRIPT_MODEL,
        value: extractJson(geminiText(response)),
      };
    } catch (error) {
      console.warn(
        `Gemini script generation failed; trying Workers AI fallback: ${error}`,
      );
    }
  }

  const text = await cloudflareGenerate(prompt, { jsonOnly: true });
  return {
    provider: "cloudflare-workers-ai",
    model: CLOUDFLARE_MODEL,
    value: extractJson(text),
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${value.trim()}\n`, "utf8");
}

async function processBook(book, stage, outRoot) {
  const outputDir = resolve(outRoot, book.slug);
  await mkdir(outputDir, { recursive: true });

  console.log(`Building source pack: ${book.slug}`);
  const sourcePack = await buildSourcePack(book);
  await writeJson(join(outputDir, "source-pack.json"), sourcePack);

  if (stage === "validate") return;

  if (
    !process.env.GEMINI_API_KEY?.trim() &&
    !(process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim())
  ) {
    throw new Error(
      "Generation requires GEMINI_API_KEY or Cloudflare Workers AI fallback credentials.",
    );
  }

  console.log(`Researching: ${book.slug}`);
  const research = await researchBook(book, sourcePack);
  const sourceRecords = [
    ...sourcePack.officialPages.map((page) => ({
      kind: "official-seed",
      title: page.title,
      url: page.url,
    })),
    ...research.searchSources,
  ];
  const uniqueSources = [
    ...new Map(
      sourceRecords
        .filter((source) => source.url)
        .map((source) => [source.url, source]),
    ).values(),
  ];

  await writeText(join(outputDir, "research.md"), research.text);
  await writeJson(join(outputDir, "sources.json"), {
    schemaVersion: 1,
    provider: research.provider,
    model: research.model,
    sources: uniqueSources,
  });

  if (stage === "research") return;

  console.log(`Writing Persian episode: ${book.slug}`);
  const generated = await writeEpisode(book, research.text);
  const episode = generated.value;
  if (
    typeof episode.title !== "string" ||
    typeof episode.description !== "string" ||
    typeof episode.transcript !== "string" ||
    !Array.isArray(episode.keyIdeas)
  ) {
    throw new Error(`Invalid episode JSON for ${book.slug}.`);
  }

  const qa = deterministicQa(episode, uniqueSources.length);
  await writeJson(join(outputDir, "qa.json"), {
    ...qa,
    provider: generated.provider,
    model: generated.model,
    rightsMode: book.rightsMode,
  });
  if (!qa.pass) {
    throw new Error(
      `Content QA failed for ${book.slug}: ` +
        JSON.stringify(qa.checks.filter((check) => !check.pass)),
    );
  }

  const normalizedEpisode = {
    schemaVersion: 1,
    episodeId: book.episodeId,
    bookSlug: book.slug,
    title: episode.title.trim(),
    description: episode.description.trim(),
    transcript: episode.transcript.trim(),
    keyIdeas: episode.keyIdeas.map((idea) => String(idea).trim()),
    actionToday: String(episode.actionToday ?? "").trim(),
    format: "standard",
    audio: {
      objectKey: book.objectKey,
      mimeType: "audio/mpeg",
      downloadable: false,
    },
  };
  await writeJson(join(outputDir, "episode.json"), normalizedEpisode);
  await writeText(join(outputDir, "script.fa.txt"), episode.transcript);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = String(args.stage ?? "validate");
  const outRoot = String(args.out ?? ".factory-output");
  const requestedSlug = String(args.slug ?? "all");

  if (!["validate", "research", "script"].includes(stage)) {
    throw new Error(`Unsupported stage: ${stage}`);
  }

  const catalog = await loadFactoryCatalog();
  const books =
    requestedSlug === "all"
      ? catalog.books
      : catalog.books.filter((book) => book.slug === requestedSlug);
  if (books.length === 0) {
    throw new Error(`Unknown book slug: ${requestedSlug}`);
  }

  const episodeIds = new Set();
  for (const book of catalog.books) {
    if (episodeIds.has(book.episodeId)) {
      throw new Error(`Duplicate episodeId: ${book.episodeId}`);
    }
    episodeIds.add(book.episodeId);
    if (book.rightsMode !== "web-research-only") {
      throw new Error(
        `Unsupported rightsMode for online factory: ${book.rightsMode}`,
      );
    }
    if (!Array.isArray(book.officialSources) || book.officialSources.length < 1) {
      throw new Error(`Book needs at least one official seed: ${book.slug}`);
    }
  }

  if (stage === "validate") {
    console.log(
      `Content factory validate PASS for ` +
        books.map((book) => book.slug).join(", "),
    );
    return;
  }

  for (const book of books) {
    await processBook(book, stage, outRoot);
  }

  console.log(
    `Content factory ${stage} PASS for ` +
      books.map((book) => book.slug).join(", "),
  );
}

main().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exit(1);
});
