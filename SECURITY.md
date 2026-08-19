# Security Policy

## Supported code

Security fixes are applied to the current `main` branch and active releases.

## Reporting a vulnerability

Please do not open a public Issue containing exploit details, credentials, secrets or private user information.

Use GitHub's private security reporting feature when available. If private reporting is not enabled, contact the repository owner privately through the verified contact method shown on the official Zobdino GitHub organization profile.

Include:

- affected component
- reproduction steps
- impact
- suggested mitigation, if known

## Secrets

Never commit API keys, GitHub tokens, model credentials, private datasets or production secrets.

If a credential is exposed, revoke/rotate it immediately and treat Git history as permanently observable.

## Scope

Security reports may cover the web app, CI/CD, content pipeline, release integrity, dependency risk and audio publishing automation.