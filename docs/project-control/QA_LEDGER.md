# QA Ledger

Last updated: 2026-08-05

## Panelist Remediation Verification - 2026-08-05

### Scope

Wave 1/2 implementation evidence and documentation alignment for persisted references, optional
review-gated AI, loyalty earning policy, customer-safe Garage/Insurance surfaces, selectors, and
panelist-facing references. No servers, builds, or live browser runs were started for this docs-only
pass.

### Verified Results

| Check | Result |
| --- | --- |
| Web focused tests | Passed: `230/230` |
| Mobile focused tests | Passed: `213/213` |
| Focused backend AI/reference/loyalty tests | Passed: `21/21` |
| `0003_panelist_alignment_ids` migration smoke | Passed; concurrent persisted references are unique and immutable |
| OpenAPI contract drift | Passed |
| Backend typecheck | Passed |
| Repository policy checks | Passed |
| Storybook interaction and accessibility tests | Passed: `34/34` |
| Static Storybook Playwright smoke | Passed: `5/5`; bounded runner released port `6006` |
| AI provider boundary | Disabled by default; optional OpenAI-compatible adapter, safe evidence filtering, failure handling, and review gating are implemented |
| Loyalty policy boundary | Active service rules only; customer-safe endpoint and mobile display; Accessories purchases excluded |

### Evidence Boundary

- These are focused implementation and contract results from the current worktree.
- The Storybook smoke is isolated component/catalog evidence, not a live application E2E result.
- Live application Playwright flows, live viewport screenshots, production performance, and respondent survey
  results are not claimed here.
- The ISO instrument is [`ISO_25010_INSTRUMENT.md`](./ISO_25010_INSTRUMENT.md); survey status is
  `pending` until real customers/staff complete it.
- Historical QA sections below retain their original dates and remain useful as historical evidence,
  but they must not be presented as the current Wave 3 execution result.

## Scope-Aligned Repository Verification - 2026-08-02

### Objective

Verify that the repository contains only current service-management surfaces, contracts, runtimes, data definitions, tests, and documentation.

### Repository Checks

- Active source imports and route scans contain no stale removed-surface references.
- Root and workspace package scripts expose only current runtimes.
- Environment examples contain only current API, notification, payment, storage, and infrastructure settings.
- The canonical OpenAPI document exposes only active service endpoints.
- Drizzle history is a single clean service baseline generated from the current schema.
- Canonical architecture documents and Serena memories describe the same runtime and role boundaries.

### Verification Results

| Check | Result |
| --- | --- |
| `npm run check` | Passed end to end after the offline lockfile-exact reinstall in 365.6 seconds through bounded staged orchestration. |
| `npm run check:policy` | Passed, including four file-growth, three retired-scope, four dirty-state partition, and four recovery-snapshot regression tests. |
| `npm run agents:check` | Passed in opt-in mode. |
| `npm run check:docs` | Passed for 35 canonical files. |
| `npm run contracts:check` | Passed; the generated OpenAPI artifact is current. |
| `npm --workspace backend run typecheck` | Passed. |
| `npm run test:backend:serial` | Passed: 51 suites and 279 tests. |
| `npm run build:backend` | Passed. |
| `npm run test:web` | Passed: 221 tests. |
| `npm run build:web` | Passed; 23 app routes were generated or registered. |
| `npm run test:mobile` | Passed: 200 tests. |
| Android Expo export | Passed: 1,125 modules bundled for Android; 3.62 MB bundle is 7.60% below baseline. |
| `npm run test:runtime` | Passed: 34 tests, including transient health-probe recovery, retry disclosure, current-instance log isolation, and wrapped-child listener ownership. |
| `npm run db:check` | Passed; the root alias verifies the clean migration baseline and metadata. |
| `npm run migration:smoke` | Passed against local PostgreSQL: 58 exact public tables, zero missing or extra columns, and 6 migration journal rows. |

### Dirty-State and Integrity Audit

- Main worktree: 668 entries (`228` modified, `202` deleted, `238` untracked), with zero staged files, conflicts, or unclassified paths.
- Branch: `codex/ops-workspace-polish-clean-v4`, 197 commits ahead and 2 behind `main`, with no configured upstream.
- Auxiliary worktrees: Railway and mobile-redesign worktrees are clean; `web-nav-fix` contains 92 preserved changes.
- The validated `web-nav-fix` recovery manifest covers all 92 entries and its archive contains all 17 untracked files.
- A verified main-worktree recovery checkpoint is `.runtime/repo-audits/otp-recovery-20260802-043014Z-manifest.json`. Its Git patch parses successfully; SHA-256 is `6EDBC262B77CEE026F9B86E34420D86F6FEEF899EC7113082250235BC0394C5F`. Its 235-entry untracked archive SHA-256 is `DE22032B5586D543B33E1112B3D3104B954E78D614038573B8C290D905A60A28`.
- `git fsck --full --no-reflogs` reported no connectivity or object corruption. It reported only recoverable unreachable history: 470 blobs, 41 trees, and 2 commits.
- `git diff --check` reported zero whitespace errors. Its 92 messages are line-ending normalization warnings.
- Graphify was refreshed and its repository freshness gate passed for 8,016 nodes and 20,236 edges.
- Offline production-dependency audit reported zero known vulnerabilities in the local advisory cache.
- Managed runtime status: backend `3000` and Expo LAN `8081` healthy; staff web `3002`, Storybook `6006`, and Expo web `8090` intentionally stopped.
- Human-facing runtime status performs at most two readiness probes and discloses when the retry was needed; lifecycle ownership and startup polling retain their existing single-probe behavior.
- Runtime stdout and stderr now rotate at the watchdog-instance boundary, so current-instance diagnostics are separated from retained lifecycle history.
- Windows runtime launch now uses a short normalized-environment `Start-Process` bootstrap, so persistent watchdog descendants no longer keep Codex command callers attached. A live backend start returned in 2.2 seconds and Metro launch returned in 6.9 seconds.
- Runtime listener discovery is shared by the manager and watchdog and executes `netstat` without a shell pipeline. The watchdog continues low-frequency ownership discovery after the nominal startup deadline and invalidates old polling generations on child restart; live backend and Metro locks record their exact listener PIDs, and a delayed wrapped-child regression proves stop releases the port.
- The local workspace dependency tree was rebuilt offline from the current root lockfile with lifecycle scripts isolated. The source lock SHA-256 remained `631A10AA5CA16F719EBA3AEC92D43603BEA1599393BBE6AD842C0B9DEE78978A`; Storybook MCP bridging and required bcrypt, esbuild, and sharp rebuilds completed, and the full repository check passed afterward. The four root `npm ls` extraneous labels are lockfile-matching optional WASM peer artifacts rather than stale versions.
- A live backend boot exposed missing event-bus wiring after the service-only scope removal. `EventsModule` now provides and exports `AutocareEventBusService`; focused Events/Loyalty module tests pass and the managed backend reaches database-aware readiness.
- The active-source scope scan removed unused mobile Shop/Product styles, customer-facing product-ordering copy, and the orphaned `/api/orders/:id/invoice` generated client and mock. A repository policy gate now rejects known retired ecommerce paths, routes, clients, event wiring, and mobile Shop UI keys while allowing current workshop and service-catalog terminology.
- The AUTOCARE task validator now rejects missing, duplicate, and unsupported canonical statuses with path-specific errors. T538 was normalized to the shared task format; all 68 task files now resolve to `done`, with no duplicate IDs or filename/content mismatches.
- Job Order invoice transport was extracted behind compatibility re-exports into focused client modules. The workbench client dropped from 629 to 438 physical lines and no longer needs a file-growth exception; 217 web tests, the 23-route production build, and all monitored bundle budgets pass.
- Insurance reminder and broadcast request validation now lives in a focused payload module while the public staff-client exports remain compatible. `insuranceStaffClient.js` dropped from 571 to 432 physical lines and no longer needs a file-growth exception; the 39 focused insurance tests, all 217 web tests, the production build, and bundle budgets pass.
- Dirty-worktree snapshots now emit bounded phase-level progress for repository resolution, patch capture, untracked archiving, artifact promotion, and completion. Four snapshot regression tests and the repository policy gate pass, and an interrupted attempt left no partial artifacts.
- The Insurance Collections workflow editor now has its own 220-line panel and a 40-line pure guidance model while `CollectionsPanels.js` retains reusable display/detail responsibilities at 301 physical lines. Existing imports remain compatible through re-exports, the old 517-line growth exception is removed, and four new guidance tests cover unselected, terminal, overdue, and proof-review states.
- Mobile Dashboard tab rendering now lives in a focused 280-line `DashboardTabContent` boundary while `Dashboard.js` owns controller orchestration, navigation, animation, overlays, bottom navigation, and account deletion at 443 physical lines. The old 697-line growth exception is removed, five-tab plus internal Rewards routing is covered by a pure model test, and the Android export and bundle budget pass.
- Mobile OTP purpose copy and callback execution now live in a framework-independent model, while React Native styling lives in a dedicated style module. `OTPScreen.js` dropped from 583 to 385 physical lines and no longer needs a file-growth exception; callback rejections for login, registration, password change, and account deletion now produce recoverable UI errors instead of unhandled promises. Five focused model tests, all 200 mobile tests, the Android export, and the bundle budget pass.
- Integration boundaries and the no-blind-merge order are recorded in `WORKTREE_INTEGRATION_GUIDE.md`.

### Data Safety

- The user explicitly approved replacing the unapplied repository migration baseline.
- Before local schema cleanup, a validated PostgreSQL custom dump and a readable export of the retired records were stored under ignored `.runtime/db-backups/` paths.
- The approved service-only cleanup removed 10 retired commerce tables and two obsolete loyalty product-reference columns in one transaction, without `CASCADE`; the affected-record report showed one cart/order/invoice chain and product references on 15 loyalty rules.
- Post-cleanup comparison against `backend/drizzle/meta/0000_snapshot.json` found exactly 58 public tables with zero missing or extra columns.
- Future local database cleanup still requires a separate backup, affected-record report, explicit target verification, and transactional execution.

## Runtime Management Verification

Managed runtime commands must:

- return within their hard deadline;
- avoid duplicate listeners;
- distinguish owned, external, stale, unhealthy, and stopped processes;
- never terminate an unknown listener automatically;
- keep logs and ownership metadata in ignored runtime directories.

## QA Entry Template

### QA Run - YYYY-MM-DD

- Scope:
- Environment:
- Commands:
- Automated result:
- Manual result:
- Findings:
- Evidence:
- Follow-up:
