# KetabCast Audio Delivery Contract — v0.2

## Goal

Keep the current static-export architecture while making episode metadata ready for production audio delivered from Cloudflare R2/CDN.

## Episode audio contract

Every episode owns an `audio` object with:

- `status`: `placeholder` or `ready`
- `objectKey`: stable storage key, for example `episodes/atomic-habits/atomic-habits-ep1-v1.mp3`
- `previewUrl`: optional temporary source used only while status is `placeholder`
- `publicUrl`: optional explicit production URL override
- `mimeType`
- `durationSeconds`
- `downloadable`
- optional production integrity metadata: `sha256` and `bytes`

A production episode must set `status: "ready"` only after the real asset has been uploaded and verified.

## URL resolution

For `ready` assets, the player resolves in this order:

1. explicit `publicUrl`
2. `NEXT_PUBLIC_AUDIO_BASE_URL` + encoded `objectKey`

For `placeholder` assets, only `previewUrl` is used.

This makes the static app independent from a specific bucket hostname while keeping the final URL deterministic at build time.

## Cloudflare R2 production rule

Cloudflare documents `r2.dev` as a development endpoint and recommends a custom domain for production public buckets. A custom domain also allows Cloudflare Cache and the normal Cloudflare security/control plane.

Production setup therefore uses:

- R2 bucket
- custom domain, e.g. `audio.<domain>`
- repository variable `NEXT_PUBLIC_AUDIO_BASE_URL=https://audio.<domain>`
- stable object keys from the episode contract

Official references:

- https://developers.cloudflare.com/r2/buckets/public-buckets/
- https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/
- https://developers.cloudflare.com/r2/buckets/cors/

## Current alpha limitation

`v0.2.0-alpha.1` does not claim that production audio has been uploaded.

The two existing episodes remain explicitly marked `placeholder` and continue to use the old SoundHelix URLs only as temporary previews. The player visibly labels them as samples, and download is disabled.

## Next asset milestone

For each real episode:

1. produce/approve the audio
2. upload to R2 under the declared `objectKey`
3. verify duration, byte size, MIME type, and SHA-256
4. configure the production custom domain and repository variable
5. switch `status` to `ready`
6. remove `previewUrl`
7. decide `downloadable` according to product/legal policy
8. validate playback on mobile and constrained networks

Signed/private delivery belongs to the later authenticated architecture; no secret signing material is shipped in this static client.
