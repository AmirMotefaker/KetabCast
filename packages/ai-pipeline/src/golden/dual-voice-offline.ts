import { runGoldenDryRun } from "./dry-run.ts";

export type GoldenVoiceTarget = "sulafat" | "iapetus";

export interface OfflineRenderRequest {
  slug: string;
  voice: GoldenVoiceTarget;
  locale: "fa-IR";
  sourceUrl: string;
  summaryText: string;
  summaryGrounded: true;
  renderMode: "offline-contract";
  liveTtsEnabled: false;
  productionAllowed: false;
}

export interface DualVoiceOfflineArtifact {
  slug: string;
  requests: OfflineRenderRequest[];
  qa: {
    passed: true;
    checks: string[];
  };
  publishAllowed: false;
}

export function buildDualVoiceOfflineArtifact(): DualVoiceOfflineArtifact {
  const dryRun = runGoldenDryRun();
  if (!dryRun.qa.passed) throw new Error("dual-voice-v3-upstream-qa-failed");
  if (dryRun.productionAllowed) throw new Error("dual-voice-v3-production-must-remain-blocked");
  if (dryRun.ttsEnabled) throw new Error("dual-voice-v3-live-tts-must-remain-disabled");

  const voices: GoldenVoiceTarget[] = ["sulafat", "iapetus"];
  const requests = voices.map((voice): OfflineRenderRequest => ({
    slug: dryRun.slug,
    voice,
    locale: dryRun.summary.locale,
    sourceUrl: dryRun.source.url,
    summaryText: dryRun.summary.text,
    summaryGrounded: dryRun.summary.groundedToSource,
    renderMode: "offline-contract",
    liveTtsEnabled: false,
    productionAllowed: false,
  }));

  return {
    slug: dryRun.slug,
    requests,
    qa: {
      passed: true,
      checks: [
        "v2-summary-qa-passed",
        "source-provenance-preserved",
        "dual-voice-targets-present",
        "summary-grounding-preserved",
        "live-tts-disabled",
        "production-blocked",
        "publishing-blocked",
      ],
    },
    publishAllowed: false,
  };
}
