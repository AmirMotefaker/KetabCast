# KetabCast Online Content Factory

## Purpose

The Online Content Factory turns the current static v0.2 application into an
online, repeatable content-production system without introducing a backend.
It runs on GitHub Actions and preserves static export.

## Current books

The first production run targets only the two books already present:

- Atomic Habits — James Clear
- Deep Work — Cal Newport

No third, fourth or fifth book is fabricated by the automation.

## Legal research policy

For copyrighted books, the factory is `web-research-only`.

Allowed inputs include official author/publisher pages, legal Google Books
metadata/previews, Open Library metadata, author interviews/talks/articles,
reputable secondary reviews, and Google Search grounding.

The factory must not search for or consume pirate PDFs, leaked ebooks,
unauthorized full-text mirrors, chapter dumps, or wholesale copyrighted text.

## Free-first provider strategy

Primary:
- Gemini API free tier
- Gemini Google Search grounding
- Gemini 2.5 Flash-Lite for research
- Gemini 2.5 Flash for Persian script generation

Fallback:
- Cloudflare Workers AI
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

The fallback receives the legal source pack and does not pretend to have
Google Search grounding.

## Source pack

Before LLM research the factory collects:
- Google Books public metadata
- Open Library public metadata
- explicitly configured official author pages

A single provider failure does not invalidate the remaining source pack.

## Script contract

The Persian output is an original summary/analysis, not a translation.
The prompt targets 1,800–2,200 Persian words, 4–6 key ideas, a strong opening,
transitions, conclusion, and a practical action. It prohibits URLs, production
notes, unsupported claims, and close reproduction of copyrighted prose.

Deterministic QA uses a wider 1,500–2,500 word safety range.

## TTS and audio QA

Primary free TTS is Piper with `fa_IR-amir-medium`.

The voice model repository reports MIT metadata and the model card reports a
CC0 source dataset. Piper itself is GPL-3.0-or-later and is executed as external
runner tooling; it is not bundled into the web application.

Audio flow:
1. Piper -> WAV
2. FFmpeg loudness normalization -> 96 kbps mono MP3
3. faster-whisper transcribes the MP3 in Persian
4. `audio-qa.py` compares STT with the source script
5. `audio:inspect` records duration, bytes, codec and SHA-256
6. only passing assets are publishable

## R2 publication truth gate

On `stage=publish`:
1. the existing R2 uploader re-hashes the local MP3
2. Wrangler uploads with explicit `--remote`
3. the object is downloaded back
4. byte size and SHA-256 are compared
5. only after round-trip PASS may `factory-promote.mjs` set `status=ready`
6. `previewUrl` is removed only for successfully promoted assets

## Online GitHub lifecycle

The publish job:
1. creates a generated branch
2. commits production metadata and sanitized evidence
3. creates a PR tracking Issue #8
4. explicitly dispatches CI for the branch
5. publishes a successful commit status and PR evidence comment
6. squash-merges with an exact-head guard
7. explicitly dispatches post-merge CI and Pages
8. creates an annotated exact-SHA tag
9. creates a GitHub prerelease
10. comments Issue #8

Explicit workflow dispatch is used because workflow-token events do not reliably
recurse into additional workflow runs.

## One-time configuration

Required secrets:
- `GEMINI_API_KEY` (primary generation path)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional secret:
- `GOOGLE_BOOKS_API_KEY` (public metadata identification/quota)

Repository variables:
- `R2_BUCKET_NAME`
- `NEXT_PUBLIC_AUDIO_BASE_URL`

Optional variables:
- `GEMINI_RESEARCH_MODEL`
- `GEMINI_SCRIPT_MODEL`
- `CLOUDFLARE_AI_MODEL`
- `GOOGLE_BOOKS_API_KEY`

No secret belongs in Git, evidence, artifacts, PR bodies or release notes.

## Dispatch stages

- `research`: source pack + grounded research artifact
- `script`: research + Persian script + content QA
- `audio`: script + Piper + FFmpeg + faster-whisper + SHA inspection
- `publish`: all stages + R2 + promotion + PR + CI + merge + tag + release

The first real publish of both current books should use `slug=all` and a new
exact release tag such as `v0.2.0-beta.1`.
