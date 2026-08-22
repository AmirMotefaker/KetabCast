import assert from "node:assert/strict";
import { runGoldenDryRun } from "./dry-run.ts";

const first = runGoldenDryRun();
const second = runGoldenDryRun();

assert.deepEqual(first, second, "golden-dry-run-not-deterministic");
assert.equal(first.slug, "as-a-man-thinketh");
assert.equal(first.source.provenanceStatus, "evidence-found");
assert.match(first.source.url, /^https:\/\//);
assert(first.extraction.normalizedCharacters > 20, "golden-dry-run-normalized-input-too-short");
assert.equal(first.summary.locale, "fa-IR");
assert(first.summary.text.length > 40, "golden-dry-run-summary-too-short");
assert.equal(first.summary.groundedToSource, true);
assert.equal(first.qa.passed, true);
assert(first.qa.checks.includes("source-provenance-present"));
assert(first.qa.checks.includes("production-blocked"));
assert.equal(first.ttsEnabled, false);
assert.equal(first.productionAllowed, false);

console.log("Golden Pipeline v2 dry run OK: deterministic artifact, QA passed, TTS disabled, production blocked.");
