# Contributing to Zobdino

Thank you for helping improve Zobdino.

## Before you start

1. Read `ZOBDINO_MASTER_DOC.md`.
2. Read `AGENTS.md`.
3. Find or create a GitHub Issue for the change.
4. Keep product, legal, audio and provenance constraints explicit.

## Development flow

Use an isolated branch/worktree for meaningful changes.

Run:

```bash
npm ci
npm run lint
npm run typecheck
npm run check:text
npm run check:episodes
npm run factory:validate
npm run build
git diff --check
```

## Pull requests

A good PR should include:

- linked Issue
- exact scope
- validation evidence
- clear exclusions
- no unrelated refactors
- no silent rewrite of historical evidence or published transcript provenance

## Content and copyright

Do not add full copyrighted books, chapter-by-chapter translations, pirated sources or content that violates the source-pack policy.

## Audio

Do not replace production episode audio or voice metadata without the required QA and listening gates.

## Language and UX

Persian copy must remain readable and natural. UI changes must preserve RTL, mobile-first behavior and accessibility.

## Security

Do not publish secrets, tokens, private source material or credentials. Follow `SECURITY.md` for vulnerability reports.