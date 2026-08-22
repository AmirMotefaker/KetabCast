export type ClearanceDecision = {
  slug: string;
  productionAllowed: boolean;
  firstReleaseCandidate: boolean;
  humanReviewRequired: boolean;
  jurisdiction: string;
  translationRisk: "high" | "medium" | "low";
};

export const releaseClearanceCandidates: ClearanceDecision[] = [
  {
    slug: "as-a-man-thinketh",
    productionAllowed: false,
    firstReleaseCandidate: true,
    humanReviewRequired: true,
    jurisdiction: "review-required",
    translationRisk: "medium",
  },
  {
    slug: "how-to-live-on-24-hours-a-day",
    productionAllowed: false,
    firstReleaseCandidate: true,
    humanReviewRequired: true,
    jurisdiction: "review-required",
    translationRisk: "medium",
  },
  {
    slug: "autobiography-of-benjamin-franklin",
    productionAllowed: false,
    firstReleaseCandidate: true,
    humanReviewRequired: true,
    jurisdiction: "review-required",
    translationRisk: "medium",
  },
  {
    slug: "walden",
    productionAllowed: false,
    firstReleaseCandidate: true,
    humanReviewRequired: true,
    jurisdiction: "review-required",
    translationRisk: "medium",
  },
  {
    slug: "self-reliance",
    productionAllowed: false,
    firstReleaseCandidate: true,
    humanReviewRequired: true,
    jurisdiction: "review-required",
    translationRisk: "medium",
  },
];
