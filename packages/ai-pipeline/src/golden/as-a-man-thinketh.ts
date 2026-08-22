import { researchedCandidateRegistry } from "../../../catalog/src/rights-research.ts";
import { releaseClearanceCandidates } from "../../../catalog/src/release-clearance-candidates.ts";

export type GoldenStage = "source" | "extract" | "normalize" | "summarize-fa" | "qa" | "tts";

export interface GoldenPipelineManifest {
  slug: string;
  source: {
    kind: "project-gutenberg";
    recordUrl: string;
    sourceLanguage: string;
  };
  extraction: {
    acceptedFormats: readonly ["epub", "pdf"];
    preserveHeadings: boolean;
  };
  normalization: {
    outputLanguage: "en";
    chapterStrategy: "source-headings-with-fallback";
  };
  summary: {
    outputLanguage: "fa-IR";
    mode: "abstractive";
    requireSourceTraceability: true;
  };
  qa: {
    requiredBeforeTts: true;
    checks: readonly ["persian-language", "source-grounding", "no-extraneous-content", "clearance-boundary"];
  };
  tts: {
    voices: readonly ["sulafat", "iapetus"];
    allowedOnlyAfterQa: true;
  };
  productionAllowed: false;
  stages: readonly GoldenStage[];
}

const slug = "as-a-man-thinketh";
const candidate = researchedCandidateRegistry.find((item) => item.slug === slug);
const clearance = releaseClearanceCandidates.find((item) => item.slug === slug);

if (!candidate) throw new Error(`golden-candidate-missing:${slug}`);
if (!clearance) throw new Error(`golden-clearance-missing:${slug}`);
if (candidate.rightsResearch.status !== "evidence-found") throw new Error(`golden-rights-evidence-missing:${slug}`);
if (clearance.productionAllowed) throw new Error(`golden-production-must-remain-blocked:${slug}`);

export const asAManThinkethGoldenManifest: GoldenPipelineManifest = {
  slug,
  source: {
    kind: "project-gutenberg",
    recordUrl: candidate.rightsResearch.evidenceReferences[0]!,
    sourceLanguage: candidate.sourceLanguage,
  },
  extraction: {
    acceptedFormats: ["epub", "pdf"],
    preserveHeadings: true,
  },
  normalization: {
    outputLanguage: "en",
    chapterStrategy: "source-headings-with-fallback",
  },
  summary: {
    outputLanguage: "fa-IR",
    mode: "abstractive",
    requireSourceTraceability: true,
  },
  qa: {
    requiredBeforeTts: true,
    checks: ["persian-language", "source-grounding", "no-extraneous-content", "clearance-boundary"],
  },
  tts: {
    voices: ["sulafat", "iapetus"],
    allowedOnlyAfterQa: true,
  },
  productionAllowed: false,
  stages: ["source", "extract", "normalize", "summarize-fa", "qa", "tts"],
};
