import { runGoldenDryRun } from "./dry-run.ts";

export type GoldenLiveProbeVoice = "sulafat" | "iapetus";

export interface GoldenLiveProbePlan {
  slug: "as-a-man-thinketh";
  locale: "fa-IR";
  sourceUrl: string;
  summaryText: string;
  voices: GoldenLiveProbeVoice[];
  maxTextCharacters: 420;
  nonPublic: true;
  artifactRetentionDays: 3;
  productionAllowed: false;
  publishAllowed: false;
  requiredQa: string[];
}

export function createGoldenLiveProbePlan(): GoldenLiveProbePlan {
  const dryRun = runGoldenDryRun();
  if (!dryRun.qa.passed) throw new Error("golden-live-probe-upstream-qa-failed");
  if (!dryRun.summary.groundedToSource) throw new Error("golden-live-probe-summary-not-grounded");
  if (dryRun.productionAllowed) throw new Error("golden-live-probe-production-must-remain-blocked");

  return {
    slug: "as-a-man-thinketh",
    locale: "fa-IR",
    sourceUrl: dryRun.source.url,
    summaryText: dryRun.summary.text.slice(0, 420),
    voices: ["sulafat", "iapetus"],
    maxTextCharacters: 420,
    nonPublic: true,
    artifactRetentionDays: 3,
    productionAllowed: false,
    publishAllowed: false,
    requiredQa: [
      "audio-nonempty",
      "duration-positive",
      "sha256-present",
      "mime-type-audio",
      "source-provenance-preserved",
      "summary-grounding-preserved",
      "production-blocked",
      "publish-blocked",
    ],
  };
}
