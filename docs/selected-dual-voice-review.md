# Selected Dual-Voice Full Episode Review

Human-selected product voices:

- female: Gemini Sulafat / Warm
- male: Gemini Schedar / Even

The labels female/male are human product-role selections made after Voice Lab
run 31462344234.

alpha.12 does not regenerate the Persian episode scripts. It pins the successful
alpha.10 script artifact from run 31457755919, artifact id 9088681208, and
verifies its SHA-256 before extraction.

For each book and voice, the renderer:

1. preserves the visible script unchanged,
2. applies the fa-IR pronunciation lexicon only to spoken input,
3. splits by paragraphs and bounded sentence groups,
4. uses calm standard Iranian-Persian TTS directions,
5. inserts explicit 520 ms bounded-chunk and 900 ms paragraph pauses,
6. masters a dry narration,
7. adds a four-second procedural ambient intro plus subtle transitions/outro,
8. runs faster-whisper QA against the unchanged script.

The procedural bed contains no third-party recording. It is a review-stage
music/ducking reference, not the final licensed artistic soundtrack.

No production publish occurs in alpha.12. Exact approved bytes are promoted
only after human listening approval.
