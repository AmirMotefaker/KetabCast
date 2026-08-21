export type ExtractionStatus = "ready" | "ocr-required";

export interface ExtractedSection {
  index: number;
  sourceRef: string;
  title?: string;
  text: string;
}

export interface ExtractionResult {
  formatId: "epub" | "pdf";
  status: ExtractionStatus;
  title?: string;
  sections: ExtractedSection[];
  characterCount: number;
}

export type ExtractionErrorCode =
  | "invalid-signature"
  | "invalid-container"
  | "encrypted-or-drm"
  | "archive-path-traversal"
  | "archive-limit-exceeded"
  | "unsupported-compression"
  | "document-limit-exceeded"
  | "extractor-unavailable"
  | "extraction-failed";

export class ExtractionError extends Error {
  public readonly code: ExtractionErrorCode;

  constructor(
    code: ExtractionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
  }
}
