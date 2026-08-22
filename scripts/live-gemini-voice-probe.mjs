import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { GeminiVoiceProvider } from "../packages/ai-pipeline/src/voice/gemini.ts";
import { VoiceService } from "../packages/ai-pipeline/src/voice/service.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY is required for the live voice probe.");

const outDir = process.env.VOICE_PROBE_OUT?.trim() || ".voice-live-probe";
await mkdir(outDir, { recursive: true });

const provider = new GeminiVoiceProvider({ apiKey });
const service = new VoiceService(provider, { maxAttempts: 2 });

const text = "این یک آزمون کوتاه و کنترل‌شده برای سنجش تلفظ فارسی ایرانی و کیفیت صدای زبدینو است.";

for (const voiceId of ["sulafat", "iapetus"]) {
  const result = await service.narrate({
    text,
    voiceId,
    mode: "summary",
    chapterId: "live-probe",
    language: "fa-IR",
  });

  const extension = result.mimeType === "audio/wav" ? "wav" : "mp3";
  const audioPath = join(outDir, `${voiceId}.${extension}`);
  const evidencePath = join(outDir, `${voiceId}.json`);

  await writeFile(audioPath, result.audio, { mode: 0o600 });
  await writeFile(
    evidencePath,
    JSON.stringify({
      voiceId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      sha256: result.sha256,
      provenance: result.provenance,
      retryCount: result.retryCount,
      cost: result.cost ?? null,
    }, null, 2),
    { mode: 0o600 },
  );

  console.log(`LIVE VOICE PASS: ${voiceId} | ${result.durationMs}ms | ${result.sha256}`);
}
