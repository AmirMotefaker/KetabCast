import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  buildSourcePack,
  loadFactoryCatalog,
} from "./content-source-pack.mjs";

const GEMINI_RESEARCH_MODEL =
  process.env.GEMINI_RESEARCH_MODEL?.trim() || "gemini-3.1-flash-lite";
const GEMINI_SCRIPT_MODEL =
  process.env.GEMINI_SCRIPT_MODEL?.trim() || "gemini-3.1-flash-lite";
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

async function geminiGenerate({
  model,
  prompt,
  grounded = false,
  responseSchema = null,
  temperature = null,
  maxOutputTokens = 8192,
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const generationConfig = {
    temperature: temperature ?? (grounded ? 0.2 : 0.35),
    maxOutputTokens,
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

let cloudflareDailyQuotaExhausted = false;
const generationProvidersUsed = new Set();
const generationModelsUsed = new Set();

function recordGenerationProvider(provider, model) {
  generationProvidersUsed.add(provider);
  generationModelsUsed.add(model);
}

function currentGenerationProviderLabel() {
  return generationProvidersUsed.size > 0
    ? [...generationProvidersUsed].join("+")
    : "unknown";
}

function currentGenerationModelLabel() {
  return generationModelsUsed.size > 0
    ? [...generationModelsUsed].join(" -> ")
    : "unknown";
}

function isCloudflareDailyQuotaError(error) {
  const message = String(error?.message ?? error).toLowerCase();
  return (
    message.includes("http 429") &&
    (
      message.includes("daily free allocation") ||
      message.includes("10,000 neurons") ||
      message.includes('"code":4006')
    )
  );
}

async function geminiTextGenerate(
  prompt,
  { responseFormat = null, temperature = null } = {},
) {
  let effectivePrompt = prompt;
  let responseSchema = null;

  if (responseFormat?.type === "json_schema") {
    responseSchema = responseFormat.json_schema ?? null;
  } else if (responseFormat?.type === "json_object") {
    effectivePrompt +=
      "\n\nReturn exactly one valid JSON object and no Markdown.";
  }

  const response = await geminiGenerate({
    model: GEMINI_SCRIPT_MODEL,
    prompt: effectivePrompt,
    grounded: false,
    responseSchema,
    temperature,
    maxOutputTokens: 8192,
  });

  const text = geminiText(response);
  if (!text) {
    throw new Error("Gemini returned an empty generation response.");
  }

  recordGenerationProvider("gemini", GEMINI_SCRIPT_MODEL);
  return text;
}

async function cloudflareGenerate(
  prompt,
  { responseFormat = null, temperature = null } = {},
) {
  if (cloudflareDailyQuotaExhausted) {
    throw new Error(
      "Cloudflare Workers AI daily free allocation is exhausted.",
    );
  }

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

  const requestBody = {
    messages: [
      {
        role: "system",
        content:
          "You are KetabCast's research and podcast writing engine. " +
          "Be factual, copyright-safe and fluent in Persian.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature:
      temperature ?? (responseFormat ? 0.1 : 0.3),
    max_tokens: 8192,
  };

  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  try {
    const response = await fetchJsonWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.success) {
      throw new Error(
        `Workers AI error: ${JSON.stringify(response.errors)}`,
      );
    }

    const value = response.result?.response;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error(
          "Workers AI returned an empty string response.",
        );
      }
      recordGenerationProvider("cloudflare-workers-ai", CLOUDFLARE_MODEL);
      return trimmed;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      recordGenerationProvider("cloudflare-workers-ai", CLOUDFLARE_MODEL);
      return value;
    }

    throw new Error(
      `Workers AI returned an unsupported response type: ${typeof value}`,
    );
  } catch (error) {
    if (isCloudflareDailyQuotaError(error)) {
      cloudflareDailyQuotaExhausted = true;
    }
    throw error;
  }
}

async function preferredGenerate(
  prompt,
  { responseFormat = null, temperature = null } = {},
) {
  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      return await geminiTextGenerate(prompt, {
        responseFormat,
        temperature,
      });
    } catch (error) {
      console.warn(
        `Gemini ${GEMINI_SCRIPT_MODEL} generation failed; ` +
          `trying Workers AI fallback: ${error}`,
      );
    }
  }

  return cloudflareGenerate(prompt, {
    responseFormat,
    temperature,
  });
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

const cloudflareEpisodePlanSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    keyIdeas: {
      type: "array",
      items: { type: "string" },
    },
    actionToday: { type: "string" },
  },
  required: [
    "title",
    "description",
    "keyIdeas",
    "actionToday",
  ],
};

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

function coerceJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return extractJson(value);
  }

  throw new Error(
    `Structured episode output has unsupported type: ${typeof value}`,
  );
}

function assertEpisodePlan(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.title !== "string" ||
    typeof value.description !== "string" ||
    !Array.isArray(value.keyIdeas) ||
    value.keyIdeas.length !== 5 ||
    value.keyIdeas.some(
      (idea) => typeof idea !== "string" || !idea.trim(),
    ) ||
    typeof value.actionToday !== "string"
  ) {
    throw new Error(
      "Episode plan must contain title, description, actionToday and " +
        "exactly five non-empty keyIdeas.",
    );
  }

  return value;
}

function normalizeSpokenSection(text) {
  return text
    .replace(/^```(?:text|markdown|persian)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
}

function longformPlanPrompt(book, research) {
  return `
You are planning an ORIGINAL Persian KetabCast podcast episode.

BOOK
${book.titleFa} (${book.title}) — ${book.authorFa} (${book.author})

Create only the compact editorial plan, not the long transcript.

REQUIREMENTS
- title: concise Persian episode title
- description: 1–2 concise Persian sentences
- keyIdeas: EXACTLY five concise Persian core ideas
- actionToday: one practical Persian action for the listener
- use only claims supported by the research dossier
- do not translate chapter-by-chapter
- do not reproduce or closely paraphrase copyrighted prose
- do not include URLs or citations in these fields

RESEARCH DOSSIER
${research}
`.trim();
}

async function generateLongformSection({
  book,
  research,
  plan,
  label,
  focus,
  targetRange,
  minWords,
  maxWords,
}) {
  let previousDraft = "";
  const candidates = [];
  const strictRange = `${minWords}–${maxWords}`;
  const softMinWords = Math.max(1, minWords - 20);
  const softMaxWords = maxWords + 20;
  const softRange = `${softMinWords}–${softMaxWords}`;
  const targetMidpoint = (minWords + maxWords) / 2;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const repairInstruction =
      attempt === 1
        ? ""
        : `
The previous draft was ${countWords(previousDraft)} Persian words.
Rewrite it completely so it lands inside the required acceptance range of
${minWords}–${maxWords} Persian words. Keep the same factual scope, improve
flow, and do not pad with repetition.

PREVIOUS DRAFT
${previousDraft}
`;

    const prompt = `
You are writing ONE spoken section of an original Persian KetabCast episode.

BOOK
${book.titleFa} (${book.title}) — ${book.authorFa} (${book.author})

EPISODE PLAN
Title: ${plan.title}
Five key ideas:
${plan.keyIdeas.map((idea, index) => `${index + 1}. ${idea}`).join("\n")}
Action today: ${plan.actionToday}

SECTION
${label}

SECTION FOCUS
${focus}

HARD WRITING RULES
- Output spoken Persian prose only: no heading, bullets, JSON, Markdown fence,
  citations, URLs, source names or production notes.
- Write native, conversational and polished Persian suitable for narration.
- Target ${targetRange} Persian words.
- The automated strict acceptance range is ${minWords}–${maxWords} Persian words.
- Stay grounded in the dossier below.
- Do not invent claims.
- Do not quote the book or reproduce/closely paraphrase copyrighted prose.
- Do not retell chapters in order.
- Avoid repeating material that belongs to the other key ideas.
- Use concrete explanation/example/application in your own words.
${repairInstruction}

RESEARCH DOSSIER
${research}
`.trim();

    const generated = await preferredGenerate(prompt, {
      temperature: 0.3,
    });

    if (typeof generated !== "string") {
      throw new Error(
        `Long-form section ${label} returned non-text output.`,
      );
    }

    const draft = normalizeSpokenSection(generated);
    const words = countWords(draft);
    const candidate = { text: draft, wordCount: words, attempt };
    candidates.push(candidate);

    console.log(
      `Long-form section ${label}: ${words} Persian words ` +
        `(attempt ${attempt}/3)`,
    );

    if (words >= minWords && words <= maxWords) {
      return {
        text: draft,
        wordCount: words,
        attempts: attempt,
        selectedAttempt: attempt,
        acceptance: "strict",
        strictRange,
        softRange,
      };
    }

    previousDraft = draft;
    if (attempt < 3) await sleep(1000 * attempt);
  }

  const best = [...candidates].sort((left, right) => {
    const leftDistance = Math.abs(left.wordCount - targetMidpoint);
    const rightDistance = Math.abs(right.wordCount - targetMidpoint);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return right.wordCount - left.wordCount;
  })[0];

  if (best && best.wordCount >= softMinWords && best.wordCount <= softMaxWords) {
    console.warn(
      `Long-form section ${label}: accepting ${best.wordCount} Persian words ` +
        `from attempt ${best.attempt} via soft boundary ${softRange} after ` +
        `all strict attempts missed ${strictRange}. Global transcript QA ` +
        `remains mandatory.`,
    );
    return {
      text: best.text,
      wordCount: best.wordCount,
      attempts: 3,
      selectedAttempt: best.attempt,
      acceptance: "soft-boundary",
      strictRange,
      softRange,
    };
  }

  throw new Error(
    `Long-form section ${label} could not satisfy strict range ${strictRange}, ` +
      `and the best candidate was outside post-retry soft boundary ${softRange}.`,
  );
}

async function writeBoundedLongformEpisode(book, research) {
  const planPrompt = longformPlanPrompt(book, research);
  const planAttempts = [
    {
      name: "plan-json-schema-primary",
      responseFormat: {
        type: "json_schema",
        json_schema: cloudflareEpisodePlanSchema,
      },
    },
    {
      name: "plan-json-schema-retry",
      responseFormat: {
        type: "json_schema",
        json_schema: cloudflareEpisodePlanSchema,
      },
    },
    {
      name: "plan-json-object-fallback",
      responseFormat: {
        type: "json_object",
      },
    },
  ];

  let plan = null;
  let planMode = null;
  const planErrors = [];

  for (let index = 0; index < planAttempts.length; index += 1) {
    const attempt = planAttempts[index];
    const attemptPrompt =
      attempt.name === "plan-json-object-fallback"
        ? `${planPrompt}\n\nReturn one JSON object only. ` +
          "keyIdeas must contain exactly five strings. Schema:\n" +
          JSON.stringify(cloudflareEpisodePlanSchema)
        : planPrompt;

    try {
      const response = await preferredGenerate(attemptPrompt, {
        responseFormat: attempt.responseFormat,
        temperature: 0.1,
      });

      plan = assertEpisodePlan(coerceJsonObject(response));
      planMode = attempt.name;
      break;
    } catch (error) {
      const message = String(error?.message ?? error);
      planErrors.push(`${attempt.name}: ${message}`);
      console.warn(
        `Bounded episode-plan attempt ${index + 1}/` +
          `${planAttempts.length} failed (${attempt.name}): ${message}`,
      );

      if (index < planAttempts.length - 1) {
        await sleep(1000 * (index + 1));
      }
    }
  }

  if (!plan) {
    throw new Error(
      "Bounded episode plan failed after all attempts: " +
        planErrors.join(" | "),
    );
  }

  const sections = [];

  sections.push({
    label: "opening",
    keyIdea: null,
    ...(await generateLongformSection({
      book,
      research,
      plan,
      label: "Opening / hook",
      focus:
        "Open with the listener's real-world problem, introduce the book and " +
        "author naturally, establish why the topic matters, and preview the " +
        "journey without explaining the five ideas yet.",
      targetRange: "190–220",
      minWords: 160,
      maxWords: 260,
    })),
  });

  for (let index = 0; index < plan.keyIdeas.length; index += 1) {
    const keyIdea = plan.keyIdeas[index];

    sections.push({
      label: `idea-${index + 1}`,
      keyIdea,
      ...(await generateLongformSection({
        book,
        research,
        plan,
        label: `Core idea ${index + 1} of 5`,
        focus:
          `Explain this idea deeply: "${keyIdea}". ` +
          "Give a clear practical interpretation and one concrete example or " +
          "application. Focus on this idea instead of summarizing the others.",
        targetRange: "290–330",
        minWords: 260,
        maxWords: 360,
      })),
    });
  }

  sections.push({
    label: "closing",
    keyIdea: null,
    ...(await generateLongformSection({
      book,
      research,
      plan,
      label: "Conclusion / action today",
      focus:
        "Connect the five ideas without re-explaining them, give the listener " +
        `a memorable synthesis, and end with this practical action: ` +
        `"${plan.actionToday}". Close naturally for KetabCast.`,
      targetRange: "220–260",
      minWords: 180,
      maxWords: 300,
    })),
  });

  const transcript = sections
    .map((section) => section.text)
    .join("\n\n")
    .trim();

  const totalWords = countWords(transcript);

  if (totalWords < 1500 || totalWords > 2500) {
    throw new Error(
      `Assembled long-form transcript is ${totalWords} words; ` +
        "expected the 1500–2500 safety range.",
    );
  }

  console.log(
    `Assembled long-form transcript: ${totalWords} Persian words ` +
      `across ${sections.length} sections.`,
  );

  return {
    provider: currentGenerationProviderLabel(),
    model: currentGenerationModelLabel(),
    structuredMode: `longform-sections:${planMode}`,
    sections: sections.map((section) => ({
      label: section.label,
      keyIdea: section.keyIdea,
      wordCount: section.wordCount,
      attempts: section.attempts,
      selectedAttempt: section.selectedAttempt,
      acceptance: section.acceptance,
      strictRange: section.strictRange,
      softRange: section.softRange,
    })),
    value: {
      title: plan.title,
      description: plan.description,
      transcript,
      keyIdeas: plan.keyIdeas,
      actionToday: plan.actionToday,
    },
  };
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
        prompt:
          `${prompt}\n\nIMPORTANT: This Free Tier research pass must use ` +
          "only the supplied legal source pack. Do not use live Google Search " +
          "grounding and do not introduce claims that are absent from the pack.",
        grounded: false,
        temperature: 0.2,
        maxOutputTokens: 8192,
      });

      const text = geminiText(response);
      if (!text) {
        throw new Error("Gemini returned empty research text.");
      }

      return {
        provider: "gemini-source-pack",
        model: GEMINI_RESEARCH_MODEL,
        text,
        searchSources: [],
      };
    } catch (error) {
      console.warn(
        `Gemini source-pack research failed; trying Workers AI fallback: ${error}`,
      );
    }
  }

  const generatedResearch = await cloudflareGenerate(
    `${prompt}\n\nIMPORTANT: You do not have live web search in this fallback. ` +
      "Use only the supplied source pack and explicitly state uncertainty.",
  );

  if (typeof generatedResearch !== "string") {
    throw new Error(
      "Workers AI research response must be plain text, not structured JSON.",
    );
  }

  return {
    provider: "cloudflare-workers-ai",
    model: CLOUDFLARE_MODEL,
    text: generatedResearch,
    searchSources: [],
  };
}

async function writeEpisode(book, research) {
  return writeBoundedLongformEpisode(book, research);
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
  const metadataSources = [];

  const googleBooks = sourcePack.metadata.googleBooks;
  if (
    googleBooks?.queryUrl &&
    Array.isArray(googleBooks.items) &&
    googleBooks.items.length > 0
  ) {
    metadataSources.push({
      kind: "legal-metadata",
      title: "Google Books",
      url: googleBooks.queryUrl,
    });
  }

  const openLibrary = sourcePack.metadata.openLibrary;
  if (
    openLibrary?.queryUrl &&
    Array.isArray(openLibrary.docs) &&
    openLibrary.docs.length > 0
  ) {
    metadataSources.push({
      kind: "legal-metadata",
      title: "Open Library",
      url: openLibrary.queryUrl,
    });
  }

  const sourceRecords = [
    ...sourcePack.officialPages.map((page) => ({
      kind: "official-seed",
      title: page.title,
      url: page.url,
    })),
    ...metadataSources,
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

  if (Array.isArray(generated.sections)) {
    await writeJson(join(outputDir, "script-sections.json"), {
      schemaVersion: 1,
      provider: generated.provider,
      model: generated.model,
      structuredMode: generated.structuredMode ?? null,
      sections: generated.sections,
    });
  }

  const qa = deterministicQa(episode, uniqueSources.length);
  await writeJson(join(outputDir, "qa.json"), {
    ...qa,
    provider: generated.provider,
    model: generated.model,
    structuredMode: generated.structuredMode ?? null,
    generationSections: generated.sections ?? [],
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
