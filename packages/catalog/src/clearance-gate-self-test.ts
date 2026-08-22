import { releaseClearanceCandidates } from "./release-clearance-candidates.ts";

for (const candidate of releaseClearanceCandidates) {
  if (candidate.productionAllowed) {
    throw new Error(`production-enable-requires-review:${candidate.slug}`);
  }

  if (!candidate.humanReviewRequired) {
    throw new Error(`human-review-required:${candidate.slug}`);
  }
}

console.log(`clearance gate OK: ${releaseClearanceCandidates.length} candidates require human review.`);
