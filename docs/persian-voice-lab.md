# Persian Voice Lab

`v0.2.0-alpha.11` adds a human-listening lab for Persian narration quality.

The lab uses Gemini 3.1 Flash TTS Preview and directs standard contemporary
Iranian Persian (`fa-IR`), calm nonfiction-podcast pacing, punctuation-aware
pauses, clear articulation and exact transcript recitation.

The first pack contains eight official Gemini voices. Repository metadata stores
Google's published style descriptors only; gender is not assigned before
listening.

The reviewer chooses one preferred perceived-female voice and one preferred
perceived-male voice. Those labels are added only after human audition.

`data/pronunciation/fa-ir.json` changes only spoken/TTS input. Visible episode
transcripts remain unchanged.

Every raw sample also gets a podcast-demo mix. The demo bed is synthesized
locally by FFmpeg from simple tones. No third-party music recording is bundled.
The demo exists to judge music level and speech clarity, not to define the final
artistic soundtrack.

Voice Lab artifacts are review material only and cannot promote production
episode metadata.

## Gemini TTS REST audio contract

v0.2.0-alpha.11.1 follows the current Interactions API contract:
response_format is exactly type=audio; no requested mime_type, bit_rate or
delivery fields. output_audio.data is decoded from Base64. Raw/no-container
output defaults to 24 kHz mono signed 16-bit PCM and FFmpeg creates review MP3.
Provider source MIME/sample-rate/channel metadata is retained in the manifest.

This fixes Voice Lab run 31461329382, which failed HTTP 400 before the first
Sulafat sample.