# Worktree Integration Guide

Last verified: 2026-08-02

This guide is the safety boundary for integrating the current large worktree. It
does not authorize a wholesale merge, rebase, reset, or cleanup.

## Current Dirty State

Run the classifier before and after every integration batch:

```powershell
npm run worktree:partition -- --fail-on-unclassified
```

Create a collision-safe recovery checkpoint before staging a batch:

```powershell
npm run worktree:snapshot
```

The command writes a binary-safe tracked patch, an untracked archive, and an
atomic checksummed manifest under `.runtime/repo-audits/`. It refuses clean
worktrees and existing artifact names, and removes partial output after errors.

The verified main-worktree baseline is 640 changes, with no staged files,
conflicts, unclassified paths, or Git lock files:

| Group | Paths |
| --- | ---: |
| Cross-cutting workspace | 49 |
| Service-only scope removal | 137 |
| Database and contracts | 13 |
| Backend identity and customer | 8 |
| Backend insurance and notifications | 4 |
| Backend loyalty, analytics, and support | 14 |
| Backend platform | 33 |
| Staff Job Order and QA | 39 |
| Staff insurance and admin | 6 |
| Staff shell and other | 32 |
| Mobile insurance and Garage | 51 |
| Mobile booking and service | 20 |
| Mobile auth, shell, and other | 103 |
| QA, Storybook, and evidence | 37 |
| Documentation and planning | 94 |

## No-Blind-Merge Rule

- Do not merge or rebase `main` wholesale into this branch. The two commits on
  `main` after the merge base touch 44 files; all 44 overlap branch commits and
  28 overlap the current dirty worktree.
- Do not merge `codex/web-nav-fix` wholesale. Its 92 changes contain 39 files
  overlapping this worktree, 49 divergent files, and four paths that would
  restore retired or superseded work.
- Preserve these current deletions during integration:
  - `mobile/src/components/shop/ShopCatalogSection.js`
  - `mobile/src/screens/TechnicianDashboard.js`
  - `mobile/src/lib/catalogClient.js`
  - `qa/playwright/tests/shop-ecommerce-rewards.flow.spec.mjs`
- Treat `mobile/src/lib/jobOrdersClient.js`,
  `mobile/src/screens/FeatureModuleScreen.js`, the retired pricing/billing QA
  flow, and the old panelist report as manual-review paths. Do not restore them
  based only on another branch having a file at that path.

Ignored audit reports and recovery bundles are stored under
`.runtime/repo-audits/`. The complete merge-base and worktree comparisons are:

- `integration-overlap-merge-base-20260802-075630.json`
- `integration-overlap-complete-20260802-075738.json`
- `dirty-state-20260802-004315Z-manifest.json`
- `web-nav-fix-dirty-20260802-075823-manifest.json`

The listed main recovery checkpoint covers all 639 dirty entries, including all 217
untracked files in its validated archive. The web-navigation recovery manifest
covers all 92 dirty entries, including all 17 untracked files in its archive.

## Integration Order

1. Repository safety, runtime management, and quality tooling.
2. Service-only scope removal. Keep retired ecommerce, generic shop/catalog routes,
   port `3001`, and technician-login paths deleted.
3. Accessories safety policy and the isolated `02-accessories-store` partition. The new
   namespace does not permit restoring any retired ecommerce path.
4. Database baseline, forward Accessories migration, Drizzle snapshots/journal, shared schema, and
   generated contracts as one reviewed unit.
5. Active backend domain groups.
6. Staff Job Order and QA, followed by staff admin and shell work.
7. Mobile insurance and Garage, then Booking and service, then mobile shell.
8. QA, Storybook, screenshots, and evidence.
9. SSOT and planning documents after behavior and contracts are stable.

`package.json`, `package-lock.json`, and generated OpenAPI files cross ownership
boundaries and require hunk-aware review. Never split the migration baseline,
snapshot, and journal into inconsistent states.

## Batch Acceptance

For each batch:

1. Confirm the recovery snapshot exists before staging.
2. Generate a fresh `worktree:partition` report.
3. Stage only the intended group and review `git diff --cached --check`.
4. Run the smallest subsystem checks plus `npm run check:policy` and
   `npm run contracts:check` when contracts are touched.
5. Run `npm run migration:smoke` when schema or migration files are touched.
6. Record the result in `QA_LEDGER.md` before proceeding to the next group.

The two clean auxiliary worktrees may remain untouched. The 92-change
`web-nav-fix` worktree must be manually harvested only after its recovery bundle
has been revalidated.
