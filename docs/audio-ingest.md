# KetabCast v0.2 Audio Ingest Tooling

This tooling validates local production MP3 assets before any episode is marked `ready`.

## Local files

Keep production audio outside Git:

- `.local-audio/`
- `audio-ingest.local.json`
- `audio-inspection.local.json`

Example local manifest:

```json
{
  "assets": [
    {
      "episodeId": "atomic-habits-ep1",
      "file": ".local-audio/atomic-habits-ep1.mp3",
      "objectKey": "episodes/atomic-habits/atomic-habits-ep1-v1.mp3"
    }
  ]
}
```

Do not invent episode IDs merely to reach five assets. The five MVP episodes must be selected and approved as content work first.

## Inspect

```bash
npm run audio:inspect -- --manifest audio-ingest.local.json --out audio-inspection.local.json --expected-count 5
```

The inspection report records:

- duration
- byte size
- SHA-256
- codec
- bitrate
- sample rate
- channel count
- declared R2 object key

The tool uses `music-metadata` with full-duration parsing when necessary.

## Cloudflare authentication

Wrangler must be authenticated to the intended Cloudflare account before remote operations. Keep API tokens out of Git.

## Create/list the R2 bucket

Cloudflare's current Wrangler syntax supports:

```bash
npx wrangler r2 bucket list
npx wrangler r2 bucket create ketabcast-audio
```

Bucket names must be lowercase and use letters, numbers, and hyphens.

## Upload with integrity round-trip

Dry run:

```bash
npm run audio:upload -- --report audio-inspection.local.json --bucket ketabcast-audio --dry-run
```

Remote upload:

```bash
npm run audio:upload -- --report audio-inspection.local.json --bucket ketabcast-audio
```

The uploader:

1. re-hashes the local file
2. uploads with `wrangler r2 object put ... --remote`
3. downloads the object with `wrangler r2 object get ... --remote`
4. compares byte size and SHA-256
5. fails before application metadata is allowed to change if integrity differs

Wrangler v4 requires explicit `--remote` for R2 object commands that should affect production storage.

## Production public delivery

Use an R2 custom domain for production audio. Cloudflare documents `r2.dev` as development-only and rate-limited. The custom domain enables the Cloudflare cache/security control plane.

After the custom domain is active, set the GitHub repository variable:

```text
NEXT_PUBLIC_AUDIO_BASE_URL=https://audio.example.com
```

Do not commit the real account API token.

## Production promotion gate

Only after all five assets have passed local inspection and R2 round-trip integrity verification:

1. update episode metadata to `status: "ready"`
2. record verified duration, bytes, and SHA-256
3. remove SoundHelix `previewUrl`
4. set the intended `downloadable` value
5. build/deploy
6. test playback/seek on real mobile devices and constrained networks

Official Cloudflare references:

- https://developers.cloudflare.com/r2/reference/wrangler-commands/
- https://developers.cloudflare.com/r2/objects/upload-objects/
- https://developers.cloudflare.com/r2/buckets/public-buckets/
