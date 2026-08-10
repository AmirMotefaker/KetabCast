<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ketabcast-project-rules -->

# KetabCast Project Operating Rules

`KETABCAST_MASTER_DOC.md` is the product and engineering source of truth for this repository.

Before making a meaningful change:

1. Read `README.md`, `AGENTS.md` / `CLAUDE.md`.
2. Read section **0. Executive Summary** and section **13. Roadmap** of `KETABCAST_MASTER_DOC.md`.
3. Confirm the current roadmap phase before coding. The current phase after v0.1.0 is **v0.2.0 — Real Audio**.
4. Preserve the architecture in section 6.2 unless an architecture change is explicitly documented in the Master Doc.
5. Check/update the data model before features that change persisted product state.
6. Never feed wholesale copyrighted book text to the AI pipeline; the idea-only/legal constraints in the Master Doc are mandatory.
7. UI work is RTL-first and mobile-first.

## GitHub lifecycle — mandatory for meaningful milestones

Do not commit meaningful project progress directly to `main`.

Use:

**Issue → branch → commit(s) → Pull Request → evidence/checks → merge → exact-SHA tag → GitHub Release**

Requirements:

- Link the Pull Request to its Issue.
- Run and publish validation evidence.
- Never publish secrets, credentials, private source material, or unsanitized logs.
- After every meaningful milestone, update the roadmap/checklist in `KETABCAST_MASTER_DOC.md`.
- A local-only result is not considered finished project progress until the sanitized evidence and release state are visible on GitHub.

Do not edit or remove the Next.js-managed agent-rules block above; Next.js may regenerate it.

<!-- END:ketabcast-project-rules -->
