# Zobdino / KetabCast — Engineering Rollup: 2026-08-10 through 2026-08-12

This document is the GitHub-visible source of truth for the major engineering,
product, content-pipeline, audio, TTS, QA, publication, and release changes completed
during the Aug 10–12 project window before `v0.2.0-beta.5.1.10`.

## Governance and platform baseline

- `154677e8ec5d911d7b6ace3bb970b40ffb2427f5` — established project governance baseline (#1/#2).
- `da308545fb6c51a485aab086a5bc3a48a1914e82` — restored GitHub Pages deployment (#3/#4).
- `9a2f1100995d081a67e998b6de25961d5a2dd161` — shipped the v0.2 audio foundation (#6/#7).
- `3a1f73b66cd349a6a49ad11977a34c30a917305f` — added v0.2 audio ingest tooling (#9/#10).

## Online content factory and generation pipeline

- `4cad6aea7545e37354f5211c95ce240dd9b5e17f` — added the online content factory (#11/#12).
- `ff7c425eabf805ed9a3027c0c4a9739d9547f8f1` — moved production audio to GitHub Releases (#14/#15).
- `b650aa006b2f0dde763bdd6126350bc21cf8c76b` — enforced structured episode output (#16/#17).
- `a5ce59fba66ccaf0f61c802f943c93604b07366f` — bounded long-form Persian script generation (#18/#19).
- `81833103bc444eab939c5d2c61302a8fb692e029` — tolerated near-boundary long-form sections (#20/#21).
- `ea85dc4ea02888a6e710ce632c1f9d84681f0103` — hardened hidden factory artifact upload (#22/#23).
- `5bb738bfad0ab94214343d962f3a1b31cfda6425` — added GitHub Models free failover (#24/#25).
- `1f7ff62842f549916dc0b6aab8d306b80e1d8f15` — migrated source-pack generation to Gemini 3.1 (#26/#27).

## Persian Voice Lab and voice approval

- `2c6912b9045784f7e5320ec730f2ef6a400e4692` — added Persian Voice Lab and prosody QA (#28/#29).
- `fa4567130df38eb01b5e74de0250b4e0915c830a` — aligned Voice Lab with the Gemini TTS audio contract (#30/#31).
- `f71a77b74551b5ef0d007cbec8a8c1a04d2771d5` — created selected dual-voice full-episode review packs (#32/#33).
- `ba6ea01c957d1e3a4b944a72f2f5fe4f7fced661` — adapted selected-voice review to Gemini TTS quota constraints (#34/#35).
- `09e220f31f8e4035c01927aa42622fad30d2637e` — published the approved Sulafat/Warm and Schedar/Even previews (#64/#65).

Approved voices remain:

- Sulafat / Warm
- Schedar / Even

The preview milestone did not modify production episode metadata or the existing
Piper production audio.

## Public product, catalog, listening UX, and real audio

- `f6a1a67674347285ae1a5b5649879be15c2074d8` — published reviewed real-audio beta.1 (#36/#37).
- `b87fe44ff73f3812e3630723c34095b921164ee8` — refreshed the public product brand as Zobdino / زبدینو (#38/#39).
- `deb407d6ac977a5641237a92da7bbb7112f8736d` — added the five-book catalog and discovery UX (#40/#41).
- `f0ed60c8ec074d29b7e1f25034d70bd6ff1caef5` — added the next-generation listening experience (#42/#43).
- `513f1370e753ed12e0ac8d0aa98302430f700a60` — made beta.4 deep links GitHub Pages compatible (#42/#44).
- `fae9ab38ad1d5ccaa344bcf1475253c170880ddd` — added the new-three content-factory batch (#45/#46).
- `5cbf295862f6672aff4912751645be1b05975324` — allowed verified new-episode append (#47/#48).
- `05f0363dce5c0546b63c823ae85057b3a0000c33` — published generated Zobdino production audio (#49/#50).

At this point the five-book production-audio milestone is complete; the dual-voice
program is additive and is not allowed to replace current production audio until all
promotion gates pass.

## Dual-voice production foundation and hardening

- `df0906d82a274eb0f8d28940ddb8599c4808c3ba` — dual-voice production foundation (#51/#52).
- `852ab7198698573eeacdcfc36e2324c6d6b95c15` — honored Retry-After and exposed live status (#54/#55).
- `f98c1e3b7b8824e9777925321b7199cfc4842a1e` — hardened Gemini TTS retry policy (#56/#57).
- `3b10a6fc133ca02611c95a60f1be6bf64a4ae9ed` — hardened immutable dual-voice media publication (#58/#59).
- `2bd4fac6596e993a41428a76ba64e9df21b3f90b` — changed accepted Gemini Interactions to same-ID polling instead of duplicate generation POSTs (#60/#61).
- `686f5ff95065d570a5ad8eb845de20c47ef9bf04` — aligned the Gemini TTS audio response-format contract and removed unsupported explicit delivery mode (#62/#63).
- `30c75a04ca29a22c77e7c58b45832b74555991aa` — added bounded completed-Interaction audio materialization (#66/#67), released as `v0.2.0-beta.5.1.7`.
- `87da6953fcc3977266eaf5cb2674f4fcdf12d639` — added exact-transcript `content_blocked` false-rejection recovery (#68/#69), released as `v0.2.0-beta.5.1.8`.
- `e52eea22bb10b50fb5add1ddd921e7b13da47805` — expanded completed/no-audio same-ID materialization to the existing 15-minute Interaction timeout / 180 GET bound (#70/#71), released as `v0.2.0-beta.5.1.9`.

## Production failures converted into deterministic safeguards

The following controlled production runs were not silently retried. Each failure
produced a new explicit contract or test:

- `31516399979` — transient Gemini 429 was misclassified as daily quota.
- `31520914385` — retry logic could not sufficiently honor Retry-After.
- `31565336801` — accepted Interactions were retried with duplicate generation POSTs instead of same-ID GET polling.
- `31570098554` — unsupported `response_format.delivery` caused HTTP 400.
- `31572749438` — accepted completed Interaction exposed no audio immediately; bounded materialization grace was added.
- `31587048578` — Atomic Habits Schedar hit HTTP 400 `content_blocked`; narrow classifier recovery was added.
- `31597210578` — completed/no-audio persisted beyond six same-ID GETs; materialization window expanded to 15 minutes.
- `31601664847` — Sulafat completed, then Schedar primary hit `content_blocked`, recovery hit transient 429, and the next recovery returned `content_blocked`; this triggered the resilience architecture in #72/#73.

None of the failed runs created a valid immutable Batch A media release.

## Release candidate v0.2.0-beta.5.1.10

Issue #72 / PR #73 changes the Batch A production architecture:

- add `batch-a-atomic` and `batch-a-deep-work`;
- 1 book x 2 voices x 2 chunks = 4 planned successful generation POSTs per sub-run;
- overall generation network hard cap remains 10 per sub-run;
- max 5 attempts per chunk;
- recovery-prompt network POST cap = 4;
- classifier `content_blocked` outcome cap = 2;
- retryable 408/429/5xx is separated from classifier outcomes;
- deterministic production-like `400 content_blocked -> 429 -> 400 content_blocked -> audio` path must pass;
- unseen transcript remains fail-closed;
- `prohibited_content` remains fail-closed;
- a failed generation step uploads `.dual-voice` as a 14-day checkpoint artifact;
- checkpoint artifacts are evidence only and never auto-promote partial media;
- no automatic Batch A rerun;
- no production transcript, safety setting, episode metadata, player, or Piper promotion.

## Safety and publication boundary

The immutable production target remains reserved:

`media-dual-v0.2.0-beta.6`

The `v0.2.0-beta.5.1.10` hotfix lifecycle must complete through:

Issue -> branch/commit -> PR -> CI/evidence -> merge -> exact-SHA tag ->
GitHub Release -> main CI -> Pages verification.

The hotfix finalizer must not dispatch Batch A.

After the release, Issue #53 must be source-locked to the exact
`v0.2.0-beta.5.1.10` merge/release SHA. The next separately controlled production
action is `batch-a-atomic`; only after that sub-run passes should
`batch-a-deep-work` be dispatched.
