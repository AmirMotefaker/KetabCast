# KetabCast Online Content Factory

## Purpose

The Online Content Factory turns the static v0.2 application into an online,
repeatable content-production system while preserving static export.

The factory runs on GitHub Actions.

## Current books

Only the two books already present in KetabCast are targeted:

- Atomic Habits — James Clear
- Deep Work — Cal Newport

No third, fourth or fifth book is invented by the automation.

## Legal research policy

For copyrighted books, the factory uses `web-research-only`.

Allowed inputs include:

- official author and publisher pages
- legal Google Books metadata/previews
- Open Library metadata
- author interviews, talks and articles
- reputable secondary reviews
- Google Search grounding when Gemini is available

The factory must not search for or consume pirate PDFs, leaked ebooks,
unauthorized full-text mirrors, chapter dumps or wholesale copyrighted text.

## Free-first provider strategy

Primary research/writing:

- Gemini API free tier when configured
- Gemini Google Search grounding for research
- Gemini 2.5 Flash-Lite for grounded research
- Gemini 2.5 Flash for Persian script generation

Fallback:

- Cloudflare Workers AI
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

The fallback receives the legal source pack and does not pretend to have
Google Search grounding.

## Audio

Primary free TTS:

- Piper `fa_IR-amir-medium`

Audio QA:

1. Piper creates WAV.
2. FFmpeg loudness-normalizes and creates MP3.
3. faster-whisper transcribes the generated MP3.
4. `audio-qa.py` compares STT with the source script.
5. `audio:inspect` records duration, bytes and SHA-256.

## Production storage: GitHub Release Assets

R2 is not required.

For a publish run:

1. create/reuse immutable `media-<release_tag>`
2. upload verified MP3 assets to the GitHub media release
3. compare GitHub API size/digest with local inspection
4. download every `browser_download_url`
5. recompute download-back SHA-256
6. write `github-release-assets.json`
7. promote only verified episodes from `placeholder` to `ready`
8. set explicit `publicUrl`
9. remove SoundHelix `previewUrl`
10. create generated publication PR
11. dispatch CI, merge, post-merge CI and Pages
12. create the exact-SHA code tag and GitHub prerelease

The exact code release also attaches the generated MP3 files for discoverability.

## Why not GitHub Pages for MP3 storage?

The website remains on GitHub Pages, but MP3 binaries are release assets.
This keeps media out of the Git repository and avoids consuming the Pages
site-size budget.

## Credentials

Storage requires no additional secret: the workflow uses its scoped
`GITHUB_TOKEN`.

For AI generation, configure either:

- `GEMINI_API_KEY`

or both:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional:

- `GOOGLE_BOOKS_API_KEY`

No secret value belongs in Git, evidence, artifacts, PR bodies or release
notes.
## Workers AI structured output reliability

Episode generation uses Cloudflare Workers AI JSON Mode instead of relying on
prompt-only JSON instructions.

The Cloudflare path:

1. requests `response_format.type = json_schema`
2. supplies a lowercase JSON Schema for the episode envelope
3. accepts either a structured object response or a JSON string response
4. performs a bounded second schema attempt
5. falls back to `json_object` only after schema attempts fail
6. validates the envelope before deterministic content QA

Successful Google Books and Open Library metadata queries are counted as legal
source records alongside official pages and grounded-search sources. This keeps
the source-count gate meaningful in Cloudflare-only mode without fabricating
web-search results.
## Bounded long-form Persian generation

Long spoken transcripts are not requested as one giant structured JSON field.

For the Cloudflare-only path:

1. JSON Mode creates a compact episode plan with exactly five key ideas.
2. The opening is generated as plain spoken Persian with a bounded word range.
3. Each of the five core ideas is generated independently with its own range.
4. The conclusion/action section is generated independently.
5. A section outside its acceptance range is rewritten up to three times.
6. The assembled transcript must still pass the global 1,500–2,500 word safety
   gate before TTS.
7. `script-sections.json` records section word counts and attempt counts.

This keeps structured output focused on metadata while using ordinary text
generation for narration. Copyright-safe source constraints apply to every
section.
