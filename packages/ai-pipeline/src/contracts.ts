export type ProcessingMode = "full" | "summary" | "both";

export type VoiceId = "sulafat" | "iapetus";

export type RightsBasis =
  | "user-owned"
  | "licensed"
  | "public-domain"
  | "unknown";

export type IngestionStage =
  | "received"
  | "validating"
  | "rejected"
  | "extracting"
  | "ocr"
  | "normalizing"
  | "segmenting"
  | "summarizing"
  | "narrating"
  | "quality-check"
  | "ready"
  | "failed";

export interface UploadDescriptor {
  fileName: string;
  declaredMimeType?: string;
  sizeBytes: number;
  encrypted: boolean;
  rightsBasis: RightsBasis;
  processingMode: ProcessingMode;
  voiceId: VoiceId;
}

export interface IngestionDecision {
  accepted: boolean;
  formatId?: string;
  stage: "p0" | "p1" | "p2";
  extraction: "text" | "ocr" | "text-or-ocr";
  reasonCode?:
    | "unsupported-format"
    | "mime-extension-mismatch"
    | "encrypted-or-drm"
    | "rights-unconfirmed"
    | "invalid-size";
  userMessageFa: string;
}

export interface IngestionJob {
  id: string;
  sourceSha256: string;
  descriptor: UploadDescriptor;
  formatId: string;
  stage: IngestionStage;
  createdAt: string;
  updatedAt: string;
}
