import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { GeminiVoiceProvider } from "../packages/ai-pipeline/src/voice/gemini.ts";
import { VoiceService } from "../packages/ai-pipeline/src/voice/service.ts";
import { createGoldenLiveProbePlan } from "../packages/ai-pipeline/src/golden/live-tts-probe.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("golden-live-probe-auth: GEMINI_API_KEY is required");

const outDir = process.env.GOLDEN_LIVE_PROBE_OUT?.trim() || ".golden-live-tts-probe";
await mkdir(outDir, { recursive: true });

const plan = createGoldenLiveProbePlan();
const provider = new GeminiVoiceProvider({ apiKey });
const service = new VoiceService(provider, { maxAttempts: 2 });
const results = [];

function classify(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|rate.?limit/i.test(message)) return "quota";
  if (/401|403|api.?key|auth|permission/i.test(message)) return "auth";
  if (/timeout|network|fetch|socket|ECONN/i.test(message)) return "runtime";
  return "contract-or-provider";
}

for (const voiceId of plan.voices) {
  try {
    const result = await service.narrate({
      text: plan.summaryText,
      voiceId,
      mode: "summary",
      chapterId: `${plan.slug}-golden-live-probe`,
      language: plan.locale,
    });

    if (!result.audio?.length) throw new Error("audio-nonempty check failed");
    if (!(result.durationMs > 0)) throw new Error("duration-positive check failed");
    if (!result.sha256) throw new Error("sha256-present check failed");
    if (!result.mimeType?.startsWith("audio/")) throw new Error("mime-type-audio check failed");

    const extension = result.mimeType === "audio/wav" ? "wav" : "mp3";
    const audioPath = join(outDir, `${voiceId}.${extension}`);
    await writeFile(audioPath, result.audio, { mode: 0o600 });

    const evidence = {
      status: "pass",
      voiceId,
      slug: plan.slug,
      locale: plan.locale,
      sourceUrl: plan.sourceUrl,
      summaryGrounded: true,
      nonPublic: plan.nonPublic,
      productionAllowed: plan.productionAllowed,
      publishAllowed: plan.publishAllowed,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      bytes: result.audio.length,
      sha256: result.sha256,
      provenance: result.provenance,
      retryCount: result.retryCount,
      cost: result.cost ?? null,
      qa: plan.requiredQa,
    };
    results.push(evidence);
    await writeFile(join(outDir, `${voiceId}.json`), JSON.stringify(evidence, null, 2), { mode: 0o600 });
    console.log(`GOLDEN LIVE TTS PASS: ${voiceId} | ${result.durationMs}ms | ${result.sha256}`);
  } catch (error) {
    const failure = { status: "fail", voiceId, category: classify(error), message: error instanceof Error ? error.message : String(error) };
    results.push(failure);
    await writeFile(join(outDir, `${voiceId}.json`), JSON.stringify(failure, null, 2), { mode: 0o600 });
    console.error(`GOLDEN LIVE TTS FAIL: ${voiceId} | ${failure.category} | ${failure.message}`);
  }
}

await writeFile(join(outDir, "report.json"), JSON.stringify({ plan, results }, null, 2), { mode: 0o600 });
if (results.some((item) => item.status !== "pass")) process.exitCode = 1;
