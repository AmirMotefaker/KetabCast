import { buildDualVoiceOfflineArtifact } from "./dual-voice-offline.ts";

const artifact = buildDualVoiceOfflineArtifact();
const voices = artifact.requests.map((request) => request.voice).sort();

if (artifact.slug !== "as-a-man-thinketh") throw new Error("dual-voice-v3-wrong-slug");
if (voices.join(",") !== "iapetus,sulafat") throw new Error("dual-voice-v3-targets-invalid");
if (artifact.requests.some((request) => request.liveTtsEnabled)) throw new Error("dual-voice-v3-live-tts-enabled");
if (artifact.requests.some((request) => request.productionAllowed)) throw new Error("dual-voice-v3-production-enabled");
if (artifact.requests.some((request) => !request.summaryGrounded)) throw new Error("dual-voice-v3-grounding-missing");
if (!artifact.qa.passed) throw new Error("dual-voice-v3-qa-failed");
if (artifact.publishAllowed) throw new Error("dual-voice-v3-publish-enabled");

console.log("Golden Pipeline v3 dual-voice offline contract: OK");
