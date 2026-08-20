# Zobdino Book Ingestion Contract

Tracks [#100](https://github.com/Zobdino/Zobdino/issues/100).

## Boundary

This milestone defines the provider-neutral contract before adding an upload API or UI. A file is accepted only after extension, declared MIME type, encryption/DRM status, size and rights confirmation have been evaluated. Production must additionally inspect magic bytes and archives server-side; client-provided MIME data is never sufficient.

## Format tiers

| Tier | Formats | Extraction path |
|---|---|---|
| P0 | PDF, EPUB, DOCX, TXT, Markdown, HTML | embedded text; OCR fallback for PDF |
| P1 | DRM-free AZW3/KF8, MOBI, CBZ, CBR | text for ebooks; OCR and reading order for comics |
| P2 | DRM-free KFX | best effort and explicitly experimental |

Encrypted or DRM-protected content fails closed. Zobdino does not remove or bypass DRM.

## Output modes

- `full`: chapter-aware narration of a private, lawfully accessible source.
- `summary`: an independent structured summary followed by narration.
- `both`: produce both artifacts without re-running extraction.

The public catalog remains separate from private uploads. Uploading never grants publication permission.

## Job lifecycle

`received → validating → extracting/OCR → normalizing → segmenting → summarizing? → narrating → quality-check → ready`

Terminal failure states are `rejected` for policy/input failures and `failed` for recoverable or system processing failures. Workers must use the source SHA-256 and stage as idempotency inputs.

## Voice contract

- `sulafat`: approved female Persian voice.
- `iapetus`: approved male Persian voice.

Provider credentials and model calls remain server-side. Voice IDs are product-domain identifiers so the underlying provider can be changed without changing user data.
