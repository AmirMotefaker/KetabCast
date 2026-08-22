import { createHash } from "node:crypto";
import {
  AVAYAR_VOICE_MAP,
  VoiceProviderError,
  type VoiceProvider,
  type VoiceRequest,
  type VoiceResult,
} from "./contracts.ts";

export const GEMINI_VOICE_ADAPTER_VERSION = "2026-08-22.1";
export const DEFAULT_GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";
const API_REVISION = "2026-05-20";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export interface GeminiVoiceTransport {
  send(input: {
    url: string;
    apiKey: string;
    body: unknown;
    headers: Record<string, string>;
  }): Promise<{ status: number; text: string }>;
}

export interface GeminiVoiceProviderOptions {
  apiKey: string;
  model?: string;
  transport?: GeminiVoiceTransport;
}

export class GeminiVoiceProvider implements VoiceProvider {
  readonly id = "gemini-interactions";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly transport: GeminiVoiceTransport;

  constructor(options: GeminiVoiceProviderOptions) {
    if (!options.apiKey.trim()) throw new Error("gemini-api-key-empty");
    this.apiKey = options.apiKey;
    this.model = options.model?.trim() || DEFAULT_GEMINI_TTS_MODEL;
    this.transport = options.transport ?? new FetchGeminiVoiceTransport();
  }

  async synthesize(request: VoiceRequest): Promise<VoiceResult> {
    const providerVoice = AVAYAR_VOICE_MAP[request.voiceId];
    const prompt = buildIranianPersianDirectorPrompt(request);
    const body = {
      model: this.model,
      input: prompt,
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice: providerVoice }] },
    };

    let response: { status: number; text: string };
    try {
      response = await this.transport.send({
        url: ENDPOINT,
        apiKey: this.apiKey,
        body,
        headers: {
          "Content-Type": "application/json",
          "Api-Revision": API_REVISION,
          "x-goog-api-key": this.apiKey,
        },
      });
    } catch (cause) {
      throw new VoiceProviderError("gemini-network-error", { retryable: true, cause });
    }

    if (response.status < 200 || response.status >= 300) {
      throw new VoiceProviderError(`gemini-http-${response.status}`, {
        retryable: response.status === 429 || response.status >= 500,
        status: response.status,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text);
    } catch (cause) {
      throw new VoiceProviderError("gemini-invalid-json", { retryable: false, cause });
    }

    const audio = findAudio(parsed);
    if (!audio) throw new VoiceProviderError("gemini-audio-missing", { retryable: false });

    const bytes = Uint8Array.from(Buffer.from(audio.data, "base64"));
    if (bytes.byteLength < 44) throw new VoiceProviderError("gemini-audio-too-small", { retryable: false });

    const mimeType = normalizeMimeType(audio.mimeType);
    const durationMs = mimeType === "audio/wav" ? wavDurationMs(bytes) : estimatePcmDurationMs(bytes, audio.sampleRate, audio.channels);
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    return {
      audio: bytes,
      mimeType,
      durationMs,
      sha256,
      provenance: {
        provider: this.id,
        model: this.model,
        providerVoice,
        adapterVersion: GEMINI_VOICE_ADAPTER_VERSION,
      },
      retryCount: 0,
    };
  }
}

export function buildIranianPersianDirectorPrompt(request: VoiceRequest): string {
  const mode = request.mode === "full" ? "faithful full narration" : "structured summary podcast narration";
  return [
    "# AUDIO PROFILE",
    "Professional Persian nonfiction narrator for Zobdino / AvaYar shared voice core.",
    "",
    "# RECORDING CONTEXT",
    `Mode: ${mode}.`,
    `Chapter: ${request.chapterId}.`,
    `Voice: ${AVAYAR_VOICE_MAP[request.voiceId]}.`,
    "",
    "# DIRECTOR'S NOTES",
    "Language: Persian.",
    "Accent: Standard contemporary Iranian Persian (fa-IR), Tehran-neutral.",
    "Do not use Dari or Afghan Persian pronunciation.",
    "Pace: calm, patient and unhurried.",
    "Pronounce Persian words fully, naturally and clearly.",
    "Treat punctuation and paragraph boundaries as performance timing.",
    "Tone: warm, intelligent, intimate and trustworthy.",
    "Avoid announcer, advertising, robotic or over-energetic delivery.",
    "Keep transcript wording exact. Do not add or omit words.",
    "",
    "# TRANSCRIPT",
    request.text,
  ].join("\n");
}

class FetchGeminiVoiceTransport implements GeminiVoiceTransport {
  async send(input: { url: string; apiKey: string; body: unknown; headers: Record<string, string> }): Promise<{ status: number; text: string }> {
    const response = await fetch(input.url, {
      method: "POST",
      headers: input.headers,
      body: JSON.stringify(input.body),
    });
    return { status: response.status, text: await response.text() };
  }
}

type FoundAudio = { data: string; mimeType: string; sampleRate: number; channels: number };

function findAudio(value: unknown): FoundAudio | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.data === "string") {
    const type = String(record.type ?? "");
    const mimeType = String(record.mime_type ?? record.mimeType ?? "");
    if (type === "audio" || mimeType.startsWith("audio/")) {
      return {
        data: record.data,
        mimeType: mimeType || "audio/pcm",
        sampleRate: Number(record.sample_rate ?? record.sampleRate ?? 24000),
        channels: Number(record.channels ?? 1),
      };
    }
  }
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findAudio(item);
        if (found) return found;
      }
    } else {
      const found = findAudio(child);
      if (found) return found;
    }
  }
  return null;
}

function normalizeMimeType(value: string): "audio/mpeg" | "audio/wav" {
  const mime = value.toLowerCase();
  if (mime === "audio/wav" || mime === "audio/x-wav") return "audio/wav";
  if (mime === "audio/mpeg" || mime === "audio/mp3") return "audio/mpeg";
  if (mime === "audio/pcm" || mime === "audio/l16" || !mime) return "audio/wav";
  throw new VoiceProviderError("gemini-audio-type-unsupported", { retryable: false });
}

function wavDurationMs(bytes: Uint8Array): number {
  if (bytes.byteLength < 44) throw new VoiceProviderError("wav-header-invalid", { retryable: false });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riff = Buffer.from(bytes.subarray(0, 4)).toString("ascii");
  const wave = Buffer.from(bytes.subarray(8, 12)).toString("ascii");
  if (riff !== "RIFF" || wave !== "WAVE") throw new VoiceProviderError("wav-header-invalid", { retryable: false });
  const byteRate = view.getUint32(28, true);
  const dataBytes = view.getUint32(40, true);
  if (!byteRate || !dataBytes) throw new VoiceProviderError("wav-duration-invalid", { retryable: false });
  return Math.round((dataBytes / byteRate) * 1000);
}

function estimatePcmDurationMs(bytes: Uint8Array, sampleRate: number, channels: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isFinite(channels) || channels <= 0) {
    throw new VoiceProviderError("pcm-metadata-invalid", { retryable: false });
  }
  return Math.max(1, Math.round((bytes.byteLength / (sampleRate * channels * 2)) * 1000));
}
