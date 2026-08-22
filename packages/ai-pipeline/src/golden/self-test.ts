import { asAManThinkethGoldenManifest as manifest } from "./as-a-man-thinketh.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(manifest.slug === "as-a-man-thinketh", "golden-slug-invalid");
assert(manifest.source.kind === "project-gutenberg", "golden-source-kind-invalid");
assert(manifest.source.recordUrl === "https://www.gutenberg.org/ebooks/4507", "golden-source-provenance-invalid");
assert(manifest.source.sourceLanguage === "en", "golden-source-language-invalid");
assert(manifest.extraction.acceptedFormats.includes("epub"), "golden-epub-missing");
assert(manifest.extraction.acceptedFormats.includes("pdf"), "golden-pdf-missing");
assert(manifest.normalization.outputLanguage === "en", "golden-normalization-language-invalid");
assert(manifest.summary.outputLanguage === "fa-IR", "golden-summary-language-invalid");
assert(manifest.summary.requireSourceTraceability === true, "golden-summary-traceability-required");
assert(manifest.qa.requiredBeforeTts === true, "golden-qa-before-tts-required");
assert(manifest.qa.checks.includes("no-extraneous-content"), "golden-content-hygiene-gate-missing");
assert(manifest.qa.checks.includes("clearance-boundary"), "golden-clearance-gate-missing");
assert(manifest.tts.allowedOnlyAfterQa === true, "golden-tts-order-invalid");
assert(manifest.tts.voices.length === 2, "golden-dual-voice-required");
assert(manifest.tts.voices[0] === "sulafat" && manifest.tts.voices[1] === "iapetus", "golden-voice-selection-invalid");
assert(manifest.productionAllowed === false, "golden-production-must-remain-blocked");
assert(manifest.stages.join(",") === "source,extract,normalize,summarize-fa,qa,tts", "golden-stage-order-invalid");

console.log("Golden Pipeline v1 OK: As a Man Thinketh is provenance-aware, Persian-first, QA-gated, dual-voice, and production-blocked.");
