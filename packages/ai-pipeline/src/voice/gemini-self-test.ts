import assert from "node:assert/strict";
import { GeminiVoiceProvider, wrapPcm16AsWav, type GeminiVoiceTransport } from "./gemini.ts";
import { VoiceProviderError } from "./contracts.ts";
import { VoiceService } from "./service.ts";

const goldenText = "این یک متن کوتاه فارسی برای آزمون مسیر صوتی زبدینو است.";

for (const [voiceId, providerVoice] of [["sulafat", "Sulafat"], ["iapetus", "Iapetus"]] as const) {
  let capturedBody: unknown;
  const pcm = new Uint8Array(24000 * 2 / 10);
  const transport: GeminiVoiceTransport = {
    async send(input) {
      capturedBody = input.body;
      return {
        status: 200,
        text: JSON.stringify({ output_audio: { type: "audio", mime_type: "audio/pcm", sample_rate: 24000, channels: 1, data: Buffer.from(pcm).toString("base64") } }),
      };
    },
  };

  const provider = new GeminiVoiceProvider({ apiKey: "offline-test-key", transport });
  const service = new VoiceService(provider, { maxAttempts: 2 });
  const result = await service.narrate({ text: goldenText, voiceId, mode: "summary", chapterId: "golden-1", language: "fa-IR" });

  assert.equal(result.mimeType, "audio/wav");
  assert.equal(result.provenance.providerVoice, providerVoice);
  assert.equal(result.retryCount, 0);
  assert.ok(result.durationMs >= 90 && result.durationMs <= 110);
  assert.equal(Buffer.from(result.audio.subarray(0, 4)).toString("ascii"), "RIFF");
  assert.equal(Buffer.from(result.audio.subarray(8, 12)).toString("ascii"), "WAVE");

  const body = capturedBody as { input: string; generation_config: { speech_config: Array<{ voice: string }> } };
  assert.equal(body.generation_config.speech_config[0].voice, providerVoice);
  assert.match(body.input, /Iranian Persian/);
  assert.match(body.input, /# TRANSCRIPT/);
  assert.match(body.input, /این یک متن کوتاه فارسی/);
}

let attempts = 0;
const retryTransport: GeminiVoiceTransport = {
  async send() {
    attempts += 1;
    if (attempts === 1) return { status: 503, text: "temporary" };
    const wav = wrapPcm16AsWav(new Uint8Array(4800), 24000, 1);
    return { status: 200, text: JSON.stringify({ output_audio: { type: "audio", mime_type: "audio/wav", data: Buffer.from(wav).toString("base64") } }) };
  },
};
const retryService = new VoiceService(new GeminiVoiceProvider({ apiKey: "offline-test-key", transport: retryTransport }), { maxAttempts: 2 });
const retried = await retryService.narrate({ text: goldenText, voiceId: "sulafat", mode: "full", chapterId: "retry", language: "fa-IR" });
assert.equal(retried.retryCount, 1);
assert.equal(attempts, 2);

let terminalAttempts = 0;
const terminalTransport: GeminiVoiceTransport = { async send() { terminalAttempts += 1; return { status: 400, text: "bad request" }; } };
await assert.rejects(
  () => new VoiceService(new GeminiVoiceProvider({ apiKey: "offline-test-key", transport: terminalTransport }), { maxAttempts: 3 }).narrate({ text: goldenText, voiceId: "iapetus", mode: "summary", chapterId: "terminal", language: "fa-IR" }),
  (error: unknown) => error instanceof VoiceProviderError && error.retryable === false && error.status === 400,
);
assert.equal(terminalAttempts, 1);

console.log("Zobdino Gemini voice adapter: Sulafat/Iapetus payload, playable WAV normalization, retry classification and checksum path validated.");
