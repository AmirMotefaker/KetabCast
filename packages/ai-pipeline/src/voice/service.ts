import { createHash } from "node:crypto";
import {
  validateVoiceRequest,
  type VoiceProvider,
  type VoiceRequest,
  type VoiceResult,
} from "./contracts.ts";

export interface VoiceServiceOptions {
  maxAttempts?: number;
}

export class VoiceService {
  constructor(
    private readonly provider: VoiceProvider,
    private readonly options: VoiceServiceOptions = {},
  ) {}

  async narrate(request: VoiceRequest): Promise<VoiceResult> {
    validateVoiceRequest(request);
    const maxAttempts = this.options.maxAttempts ?? 3;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
      throw new Error("voice-max-attempts-invalid");
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const result = await this.provider.synthesize(request);
        validateVoiceResult(result);
        const checksum = createHash("sha256").update(result.audio).digest("hex");
        if (checksum !== result.sha256.toLowerCase()) throw new Error("voice-checksum-mismatch");
        return { ...result, retryCount: attempt };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("voice-provider-failed");
  }
}

function validateVoiceResult(result: VoiceResult): void {
  if (result.audio.byteLength === 0) throw new Error("voice-audio-empty");
  if (!Number.isFinite(result.durationMs) || result.durationMs <= 0) throw new Error("voice-duration-invalid");
  if (!/^[a-f0-9]{64}$/i.test(result.sha256)) throw new Error("voice-checksum-invalid");
  if (!result.provenance.provider.trim() || !result.provenance.model.trim()) {
    throw new Error("voice-provenance-incomplete");
  }
  if (!result.provenance.providerVoice.trim() || !result.provenance.adapterVersion.trim()) {
    throw new Error("voice-provenance-incomplete");
  }
  if (result.cost && (!Number.isInteger(result.cost.amountMicrousd) || result.cost.amountMicrousd < 0)) {
    throw new Error("voice-cost-invalid");
  }
}
