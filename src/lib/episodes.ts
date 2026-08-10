import rawEpisodes from "@/content/episodes.json";

export type EpisodeFormat = "standard";
export type AudioAssetStatus = "placeholder" | "ready";

export interface EpisodeAudioAsset {
  status: AudioAssetStatus;
  objectKey: string;
  previewUrl?: string;
  publicUrl?: string;
  mimeType: "audio/mpeg";
  durationSeconds: number;
  downloadable: boolean;
  sha256?: string;
  bytes?: number;
}

export interface TranscriptCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface Episode {
  id: string;
  bookSlug: string;
  title: string;
  description: string;
  audio: EpisodeAudioAsset;
  transcript: string;
  transcriptCues?: readonly TranscriptCue[];
  keyIdeas: readonly string[];
  format: EpisodeFormat;
}

export const episodes = rawEpisodes as readonly Episode[];
