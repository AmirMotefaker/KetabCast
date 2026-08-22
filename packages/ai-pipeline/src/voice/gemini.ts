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
    const body = {
      model: this.model,
      input: buildIranianPersianDirectorPrompt(request),
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

    const providerBytes = Uint8Array.from(Buffer.from(audio.data, "base64"));
    if (providerBytes.byteLength === 0) throw new VoiceProviderError("gemini-audio-empty", { retryable: false });

    const normalized = normalizeAudio(providerBytes, audio.mimeType, audio.sampleRate, audio.channels);
    const sha256 = createHash("sha256").update(normalized.bytes).digest("hex");

    return {
      audio: normalized.bytes,
      mimeType: normalized.mimeType,
      durationMs: normalized.durationMs,
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
    const response = await fetch(input.url, { method: "POST", headers: input.headers, body: JSON.stringify(input.body) });
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

function normalizeAudio(bytes: Uint8Array, mimeType: string, sampleRate: number, channels: number): { bytes: Uint8Array; mimeType: "audio/mpeg" | "audio/wav"; durationMs: number } {
  const mime = mimeType.toLowerCase();
  if (mime === "audio/wav" || mime === "audio/x-wav") return { bytes, mimeType: "audio/wav", durationMs: wavDurationMs(bytes) };
  if (mime === "audio/mpeg" || mime === "audio/mp3") {
    throw new VoiceProviderError("gemini-mp3-duration-requires-normalizer", { retryable: false });
  }
  if (mime === "audio/pcm" || mime === "audio/l16" || !mime) {
    const wav = wrapPcm16AsWav(bytes, sampleRate, channels);
    return { bytes: wav, mimeType: "audio/wav", durationMs: wavDurationMs(wav) };
  }
  throw new VoiceProviderError("gemini-audio-type-unsupported", { retryable: false });
}

export function wrapPcm16AsWav(pcm: Uint8Array, sampleRate: number, channels: number): Uint8Array {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0 || !Number.isInteger(channels) || channels < 1 || channels > 2) {
    throw new VoiceProviderError("pcm-metadata-invalid", { retryable: false });
  }
  const output = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(output.buffer);
  output.set(Buffer.from("RIFF"), 0);
  view.setUint32(4, 36 + pcm.byteLength, true);
  output.set(Buffer.from("WAVEfmt "), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  output.set(Buffer.from("data"), 36);
  view.setUint32(40, pcm.byteLength, true);
  output.set(pcm, 44);
  return output;
}

function wavDurationMs(bytes: Uint8Array): number {
  if (bytes.byteLength < 44) throw new VoiceProviderError("wav-header-invalid", { retryable: false });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (Buffer.from(bytes.subarray(0, 4)).toString("ascii") !== "RIFF" || Buffer.from(bytes.subarray(8, 12)).toString("ascii") !== "WAVE") {
    throw new VoiceProviderError("wav-header-invalid", { retryable: false });
  }
  const byteRate = view.getUint32(28, true);
  const dataBytes = view.getUint32(40, true);
  if (!byteRate || !dataBytes) throw new VoiceProviderError("wav-duration-invalid", { retryable: false });
  return Math.round((dataBytes / byteRate) * 1000);
}
