# Security Policy

## Supported Code

Security fixes target the current default branch and the currently deployed Railway services.

## Reporting

Do not open a public issue containing credentials, personal information, exploit details, or
production URLs. Send a private report to the repository owner with:

- affected route, application, and version
- reproduction steps and required role
- expected and observed behavior
- impact and suggested containment

Rotate any credential included in a report immediately.

## Repository Controls

- GitHub secret scanning and push protection should be enabled.
- CodeQL and Dependabot run from `.github/`.
- Actions are pinned to immutable commit SHAs.
- Production database changes use committed migrations.
- Operational scripts refuse production mutation unless explicitly authorized.

## Dependency Response

Critical advisories block all applications. High advisories block backend and web releases.
Mobile high/moderate advisories are tracked through staged Expo upgrades; bypasses require a
documented owner, expiry date, and compensating control.
