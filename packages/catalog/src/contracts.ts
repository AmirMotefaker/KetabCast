export const PRIMARY_COLLECTIONS = [
  "business-entrepreneurship",
  "management-leadership",
  "personal-growth-habits",
  "psychology-communication",
  "technology-ai",
  "economics-investing",
  "history-society",
  "science-future",
  "biography",
  "philosophy-thinking",
] as const;

export type PrimaryCollection = (typeof PRIMARY_COLLECTIONS)[number];
export type RightsStatus = "licensed" | "public-domain" | "authorized" | "unknown" | "restricted";
export type PublicationState = "candidate" | "private" | "public" | "legacy-unverified";
export type OutputFormat = "full" | "summary" | "both";
export type VoiceId = "sulafat" | "iapetus";
export type AudienceLevel = "introductory" | "intermediate" | "advanced";
export type EditorialStatus = "candidate" | "rights-verified" | "source-verified" | "editorial-ready" | "audio-ready" | "published";
export type SourceType = "publisher-license" | "author-authorization" | "public-domain-record" | "owned-source" | "unknown";

export interface SourceProvenance {
  type: SourceType;
  reference: string;
  verifiedAt: string;
  verifiedBy: string;
}

export interface CatalogEntry {
  slug: string;
  titleFa: string;
  titleEn?: string;
  authorFa: string;
  authorEn?: string;
  publicationYear?: number;
  primaryCollections: PrimaryCollection[];
  topics: string[];
  audienceLevel: AudienceLevel;
  listeningMinutes?: number;
  publicationEra: string;
  authorRegion?: string;
  format: OutputFormat;
  voices: VoiceId[];
  sourceLanguage: string;
  editorialStatus: EditorialStatus;
  rights: {
    status: RightsStatus;
    provenance: SourceProvenance;
  };
  publicationState: PublicationState;
  shelves: string[];
}

export function isRightsSafeForPublic(status: RightsStatus): boolean {
  return status === "licensed" || status === "public-domain" || status === "authorized";
}
