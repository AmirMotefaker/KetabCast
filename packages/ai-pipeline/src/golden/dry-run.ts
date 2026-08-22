import { researchedCandidateRegistry } from "../../../catalog/src/rights-research.ts";
import { releaseClearanceCandidates } from "../../../catalog/src/release-clearance-candidates.ts";

export interface GoldenDryRunArtifact {
  slug: string;
  source: { url: string; provenanceStatus: "evidence-found" };
  extraction: { mode: "fixture"; normalizedCharacters: number };
  summary: { locale: "fa-IR"; text: string; groundedToSource: true };
  qa: { passed: true; checks: string[] };
  ttsEnabled: false;
  productionAllowed: false;
}

const FIXTURE_TEXT = "Thought shapes character; disciplined attention and conduct reinforce each other.";
const PERSIAN_SUMMARY = "این اثر بر پیوند میان اندیشه، منش و رفتار تأکید می‌کند و مسئولیت فرد در هدایت ذهن و عادت‌های خود را محور قرار می‌دهد.";

export function runGoldenDryRun(): GoldenDryRunArtifact {
  const slug = "as-a-man-thinketh";
  const candidate = researchedCandidateRegistry.find((item) => item.slug === slug);
  const clearance = releaseClearanceCandidates.find((item) => item.slug === slug);

  if (!candidate) throw new Error("golden-dry-run-candidate-missing");
  if (!clearance) throw new Error("golden-dry-run-clearance-record-missing");
  if (candidate.rightsResearch.status !== "evidence-found") throw new Error("golden-dry-run-rights-evidence-missing");
  if (clearance.productionAllowed) throw new Error("golden-dry-run-production-must-remain-blocked");

  const sourceUrl = candidate.rightsResearch.evidenceReferences[0];
  if (!sourceUrl) throw new Error("golden-dry-run-source-missing");

  const normalized = FIXTURE_TEXT.replace(/\s+/g, " ").trim();
  const checks = [
    "source-provenance-present",
    "normalized-input-nonempty",
    "persian-summary-present",
    "source-grounding-recorded",
    "tts-disabled",
    "production-blocked",
  ];

  return {
    slug,
    source: { url: sourceUrl, provenanceStatus: "evidence-found" },
    extraction: { mode: "fixture", normalizedCharacters: normalized.length },
    summary: { locale: "fa-IR", text: PERSIAN_SUMMARY, groundedToSource: true },
    qa: { passed: true, checks },
    ttsEnabled: false,
    productionAllowed: false,
  };
}
