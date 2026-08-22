import type { ProcessingMode, VoiceId } from "../contracts.ts";

export type NarrationMode = Exclude<ProcessingMode, "both">;

export interface VoiceRequest {
  text: string;
  voiceId: VoiceId;
  mode: NarrationMode;
  chapterId: string;
  language: "fa-IR";
}

export interface VoiceProvenance {
  provider: string;
  model: string;
  providerVoice: string;
  adapterVersion: string;
}

export interface VoiceCost {
  currency: "USD";
  amountMicrousd: number;
}

export interface VoiceResult {
  audio: Uint8Array;
  mimeType: "audio/mpeg" | "audio/wav";
  durationMs: number;
  sha256: string;
  provenance: VoiceProvenance;
  retryCount: number;
  cost?: VoiceCost;
}

export interface VoiceProvider {
  readonly id: string;
  synthesize(request: VoiceRequest): Promise<VoiceResult>;
}

export class VoiceProviderError extends Error {
  readonly retryable: boolean;
  readonly status?: number;

  constructor(code: string, options: { retryable: boolean; status?: number; cause?: unknown }) {
    super(code, { cause: options.cause });
    this.name = "VoiceProviderError";
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

export const AVAYAR_VOICE_MAP: Readonly<Record<VoiceId, string>> = {
  sulafat: "Sulafat",
  iapetus: "Iapetus",
};

export function validateVoiceRequest(request: VoiceRequest): void {
  if (request.language !== "fa-IR") throw new Error("voice-language-unsupported");
  if (!request.text.trim()) throw new Error("voice-text-empty");
  if (!request.chapterId.trim()) throw new Error("voice-chapter-id-empty");
  if (!(request.voiceId in AVAYAR_VOICE_MAP)) throw new Error("voice-id-unsupported");
}
