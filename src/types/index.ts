export type EpisodeFormat = "quick" | "standard" | "deep";

export interface Episode {
  id: string; bookSlug: string; title: string; description: string;
  durationSeconds: number; audioUrl: string; transcript: string;
  keyIdeas: string[]; format: EpisodeFormat; publishedAt: string;
}

export interface Book {
  slug: string; titleFa: string; titleEn: string; authorFa: string;
  authorEn: string; year: number; category: string; description: string;
  coverUrl: string; keyIdeas: string[]; episode: Episode;
}