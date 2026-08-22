import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { AVAYAR_VOICE_MAP, type VoiceProvider, type VoiceRequest, type VoiceResult } from "./contracts.ts";
import { VoiceService } from "./service.ts";

const golden = "سلام. این یک متن معیار فارسی برای سنجش قرارداد روایت زبدینو و آوایار است.";

class FakeProvider implements VoiceProvider {
  readonly id = "fake";
  calls = 0;

  async synthesize(request: VoiceRequest): Promise<VoiceResult> {
    this.calls += 1;
    if (this.calls === 1) throw new Error("transient");
    const audio = new TextEncoder().encode(`${request.voiceId}:${request.mode}:${request.text}`);
    return {
      audio,
      mimeType: "audio/mpeg",
      durationMs: 1200,
      sha256: createHash("sha256").update(audio).digest("hex"),
      provenance: {
        provider: "fake",
        model: "contract-test",
        providerVoice: AVAYAR_VOICE_MAP[request.voiceId],
        adapterVersion: "1",
      },
      retryCount: 99,
      cost: { currency: "USD", amountMicrousd: 0 },
    };
  }
}

for (const voiceId of ["sulafat", "iapetus"] as const) {
  const provider = new FakeProvider();
  const service = new VoiceService(provider, { maxAttempts: 2 });
  const result = await service.narrate({
    text: golden,
    voiceId,
    mode: "summary",
    chapterId: "golden-1",
    language: "fa-IR",
  });

  assert.equal(result.provenance.providerVoice, AVAYAR_VOICE_MAP[voiceId]);
  assert.equal(result.retryCount, 1);
  assert.equal(provider.calls, 2);
  assert.ok(result.audio.byteLength > 0);
}

await assert.rejects(
  () => new VoiceService(new FakeProvider()).narrate({
    text: "   ",
    voiceId: "sulafat",
    mode: "full",
    chapterId: "golden-empty",
    language: "fa-IR",
  }),
  /voice-text-empty/,
);

console.log("Shared Persian voice contract: PASS");
