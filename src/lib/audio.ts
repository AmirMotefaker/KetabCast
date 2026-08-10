import type { EpisodeAudioAsset } from "@/lib/episodes";

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function encodeObjectKey(objectKey: string): string {
  return objectKey
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function resolveEpisodeAudioUrl(
  audio: EpisodeAudioAsset,
): string | null {
  if (audio.status === "ready") {
    if (audio.publicUrl) return audio.publicUrl;

    const baseUrl = normalizeBaseUrl(
      process.env.NEXT_PUBLIC_AUDIO_BASE_URL,
    );

    if (!baseUrl) return null;
    return `${baseUrl}/${encodeObjectKey(audio.objectKey)}`;
  }

  return audio.previewUrl ?? null;
}

export function isProductionAudio(
  audio: EpisodeAudioAsset,
): boolean {
  return audio.status === "ready";
}
