import { createGoldenLiveProbePlan } from "./live-tts-probe.ts";

const plan = createGoldenLiveProbePlan();

if (plan.slug !== "as-a-man-thinketh") throw new Error("golden-live-probe-slug-mismatch");
if (plan.locale !== "fa-IR") throw new Error("golden-live-probe-locale-mismatch");
if (plan.voices.join(",") !== "sulafat,iapetus") throw new Error("golden-live-probe-voices-mismatch");
if (!plan.sourceUrl) throw new Error("golden-live-probe-source-missing");
if (!plan.summaryText || plan.summaryText.length > plan.maxTextCharacters) throw new Error("golden-live-probe-summary-invalid");
if (!plan.nonPublic) throw new Error("golden-live-probe-must-remain-nonpublic");
if (plan.productionAllowed) throw new Error("golden-live-probe-production-must-remain-blocked");
if (plan.publishAllowed) throw new Error("golden-live-probe-publish-must-remain-blocked");
if (!plan.requiredQa.includes("audio-nonempty") || !plan.requiredQa.includes("summary-grounding-preserved")) {
  throw new Error("golden-live-probe-qa-incomplete");
}

console.log("Golden Pipeline v4 live TTS probe contract PASS");
