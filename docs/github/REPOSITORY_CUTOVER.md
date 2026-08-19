# Zobdino GitHub Repository Cutover Runbook

## Target

From:

`AmirMotefaker/KetabCast`

To:

`Zobdino/Zobdino`

## Hard gates before transfer

- current `main` exact-SHA validated
- current GitHub Pages deployment successful
- `zobdino.ir` DNS resolves to the GitHub Pages apex A set
- GitHub Pages certificate approved
- HTTPS enforced
- live production endpoint returns HTTP 200
- `Zobdino` organization exists and current maintainer is an owner

## Transfer method

Use the GitHub repository transfer API with:

- `new_owner = Zobdino`
- `new_name = Zobdino`

Do not create a new repository at the old path after transfer because that can destroy GitHub's repository redirects.

## Immediately after transfer

1. Resolve `Zobdino/Zobdino`.
2. Update the local `origin`.
3. Verify Issues, PRs, releases, tags and Actions history.
4. Verify or re-bind GitHub Pages custom domain.
5. Verify `https://zobdino.ir/`.
6. Update active repository metadata and topics.
7. Update active repository identity references through a new PR.
8. Keep historical evidence/release/transcript provenance unchanged unless a specific migration is proven safe.
9. Re-publish the Organization profile README with the new canonical product link.
10. Record exact evidence on the branding Issue.

## Roll-forward principle

Prefer fixing the transferred repository in place. Do not recreate `AmirMotefaker/KetabCast` during recovery.