# KetabCast Audio Delivery Contract — v0.2

## Goal

Keep the current static-export architecture while delivering production audio
without requiring a paid object-storage account.

## Episode audio contract

Every episode owns an `audio` object with:

- `status`: `placeholder` or `ready`
- `objectKey`: stable logical key, for example
  `episodes/atomic-habits/atomic-habits-ep1-v1.mp3`
- `previewUrl`: temporary source used only while status is `placeholder`
- `publicUrl`: explicit production URL for verified release assets
- `mimeType`
- `durationSeconds`
- `downloadable`
- production integrity metadata: `sha256` and `bytes`

A production episode must set `status: "ready"` only after the real asset has
been uploaded and independently downloaded back with matching SHA-256.

## v0.2 production storage

The primary v0.2 backend is **GitHub Release Assets**.

Reasons:

- the project is already a public GitHub repository
- no additional storage account or payment method is required
- each release asset may be up to 2 GiB
- GitHub documents no total release-size or release-bandwidth limit
- public release assets expose a stable `browser_download_url`
- the Release Assets API exposes asset size and SHA-256 digest metadata

Official references:

- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- https://docs.github.com/en/rest/releases/assets

## Immutable media-release gate

A production factory run creates a dedicated media tag:

`media-<code-release-tag>`

Example:

`media-v0.2.0-beta.1`

The tag points to the exact factory base SHA and must never move.

The generated MP3s are uploaded to that media release only after:

1. legal-source research passes
2. Persian script QA passes
3. Piper narration succeeds
4. FFmpeg mastering succeeds
5. faster-whisper round-trip QA passes
6. local duration/bytes/SHA-256 inspection passes

After upload, the factory verifies:

- GitHub asset state is `uploaded`
- GitHub asset byte size equals the local file
- GitHub digest equals the local SHA-256 when the digest is present
- a fresh download from `browser_download_url` has identical bytes and SHA-256

Only then may metadata switch to `ready`.

## URL resolution

For `ready` assets, the player resolves in this order:

1. explicit `publicUrl`
2. legacy `NEXT_PUBLIC_AUDIO_BASE_URL` + encoded `objectKey`

For the GitHub Release backend, production episodes always use explicit
`publicUrl`. The legacy base-URL fallback remains only for future optional CDN
or object-storage migration.

For `placeholder` assets, only `previewUrl` is used.

## Cloudflare status

Cloudflare Workers AI remains an optional free-first LLM fallback.

Cloudflare R2 is no longer required for v0.2 production delivery. The R2
tooling remains in the repository as an optional future storage backend if a
billing-enabled account becomes available.

## GitHub Pages is not the media store

MP3 files are intentionally not committed into the repository or copied into
the GitHub Pages output. GitHub Pages has separate site-size and bandwidth
limits, while GitHub Releases are designed for downloadable binary assets.

## Future migration

A later authenticated/CDN architecture may migrate audio to R2 or another
object store. The explicit `publicUrl` contract keeps this migration
non-breaking for the static client.
