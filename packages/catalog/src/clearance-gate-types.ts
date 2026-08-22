export type ClearanceStatus =
  | "evidence-backed"
  | "review-required"
  | "cleared"
  | "blocked";

export interface ClearanceDecision {
  clearanceStatus: ClearanceStatus;
  jurisdiction: string;
  editionRisk: "low" | "medium" | "high";
  translatorRisk: "low" | "medium" | "high";
  persianTranslationRisk: "unverified" | "reviewed" | "authorized";
  productionAllowed: boolean;
  firstReleaseCandidate: boolean;
  humanReviewRequired: boolean;
}
