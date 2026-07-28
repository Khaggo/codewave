# AUTOCARE Current State

Last updated: 2026-07-28

## Project Goal

AUTOCARE is a mobile and web-based service management and customer engagement system for Cruisers Crib Auto Care Center.

The system must support:

- Customer mobile booking, garage, shop, rewards, insurance requests, and service tracking.
- Staff web operations for booking, job orders, QA audit, invoices, inventory/catalog, loyalty, insurance, back-jobs, and vehicle lifecycle.
- ISO/IEC 25010 evaluation evidence for functional suitability, reliability, usability, compatibility, and security.

## Repository Modernization Baseline - 2026-07-27

The reliability-first repository modernization baseline is implemented:

- One root npm workspace and lockfile now cover backend, staff web, customer mobile, contracts,
  and pure domain utilities.
- Root `check`, `test`, `build`, `lint`, `audit`, `contracts:check`, and scoped commands are
  canonical. The local backend check uses no-emit typechecking so a running API cannot lock it;
  clean CI and deployments still execute emitted production builds.
- GitHub Actions now provide affected application jobs, repository policy, contract drift,
  empty-database migration, opt-in Playwright, and CodeQL workflows with pinned action SHAs.
  CODEOWNERS, Dependabot grouping, contribution guidance, and security reporting are present.
- Drizzle has a committed migration baseline. Production schema push is removed from normal
  operation, and repair, cleanup, import, and seed mutations require `--execute`, an audit
  reason, and an additional production acknowledgement.
- Generated OpenAPI transport contracts and framework-independent domain utilities live under
  `packages/`; contract drift is deterministic and checked in CI.
- Graphify now excludes generated output and passes with 1,373 source nodes and 3,157 edges.
  File-growth guards prevent existing oversized modules from growing and apply 500-line UI,
  800-line backend, and 1,000-line test limits to new modules.
- Backend coverage is ratcheted from the measured 71.88% line, 71.96% statement, 43.31% branch,
  and 60.52% function baseline.
- Staff web bundle budgets allow at most 5% unexplained growth. Current first-load values are
  115 kB for the Job Orders board, 150 kB for the focused workspace, and 164 kB for QA Audit.
  The current Android export baseline is 3.74 MiB.
- Job Order service-progress rules and mobile invoice-checkout rules have begun moving out of
  the oversized screens into independently tested feature models.

Verification on this baseline is green: 280 backend tests, 191 staff-web tests, 73 mobile tests,
the production Next build, backend typechecks, ESLint, Drizzle consistency, OpenAPI drift,
documentation integrity, agent-system validation, Graphify policy, coverage ratchet, and web
performance budgets.

External rollout remains deliberately separate: rehearse the initial migration against a
restored production-shaped database before enabling Railway pre-deploy migration, enable GitHub
branch protections and repository security features in the host UI, and continue the
characterization-first decomposition of the large Job Order, mobile dashboard, booking, and
insurance modules. The existing mixed worktree must be reviewed and split into subsystem commits
before merge.

## Repository Checkup - 2026-07-28

The current reliability pass is locally green:

- Root workspace dependency resolution is clean (`npm ls --depth=0`) and still uses one root
  lockfile.
- Backend typechecks and production builds pass for both services.
- Staff web lint, all 216 Node-runner tests, and an isolated production build pass.
- All 73 mobile tests and all 3 runtime-manager tests pass.
- Focused Job Order, QA, and staff-work-queue backend coverage passes with 36 tests across
  4 suites.
- Repository policy, file-growth policy, OpenAPI contract drift, agent manifests, and all
  41 canonical architecture documents pass.
- The rebuilt Graphify source graph passes policy with 1,373 nodes and 3,157 edges. Graphify MCP
  reports 99% extracted and 1% inferred confidence.
- Critical staff-web bundle growth remains within the 5% budget: Job Orders board 0.36%,
  focused Job Order workspace 1.88%, and QA Audit 1.16%.
- The backend on port `3000` and staff web on port `3002` remain managed by the detached runtime
  manager and are included in the final live health smoke.

Repository hygiene remediation is prepared in the worktree:

- 1,325 generated browser/runtime files under `frontend/.runtime` and `mobile/.runtime` are staged
  for removal from version control while the local runtime directories remain available.
- A root `.gitattributes` policy now keeps source text on LF while preserving CRLF for Windows
  command and PowerShell scripts.
- Oversized Job Order, QA, queue, booking, and backend test/service modules were decomposed behind
  existing public interfaces; the file-growth policy now passes without raising baselines.
- The web bundle checker accepts `NEXT_DIST_DIR`, so isolated verification no longer touches a
  running development build.

The fresh online package-advisory audit remains unverified in this pass because the execution
environment did not authorize sending package metadata to the external npm registry. The prior
2026-07-26 dependency-audit result below remains historical evidence, not a new audit result.
Static secret and unsafe-pattern scans found no high-confidence findings in the current tree.

## Performance and Security Baseline - 2026-07-26

The staff website delay was traced to both a real asset bottleneck and local development behavior:

- The login background was a non-progressive 7001 x 4001 JPEG weighing 2,903,810 bytes.
- The active login asset is now a priority-loaded 1920 x 1097 WebP weighing 103,936 bytes, a 96.4% reduction.
- Chrome's unthrottled login LCP improved from 2,289 ms to 246 ms. Post-fix TTFB was 102 ms and CLS was 0.02.
- The authenticated Job Orders board measured 454 ms LCP, 103 ms TTFB, and 0.02 CLS.
- Session restoration now renders a branded checking-session state instead of a blank screen.
- The global My Work badge requests one current record instead of a 25-record page.
- Next output tracing is pinned to `frontend/`, avoiding accidental monorepo-root tracing.
- Root web and mobile runtime scripts no longer run `npm install` on every launch.
- Local Next development still has a one-time cold compile cost: the measured first request was 17.5 seconds and the next request was 0.9 seconds. This is development-only behavior; the production build compiles successfully.

Security baseline after remediation:

- Root, frontend, and backend production dependency audits report zero known vulnerabilities.
- Frontend development tooling retains 13 high transitive advisories in the ESLint 8 compatibility chain.
- Backend development tooling retains 26 transitive advisories: 22 high and 4 moderate, primarily Nest CLI/Jest/Drizzle tooling.
- Mobile has no remaining critical advisory. Expo SDK 54 retains 27 transitive advisories: 18 high and 9 moderate. npm's available remediation requires the breaking Expo 57 and React Native 0.86 migration, so that upgrade must be handled as a dedicated compatibility task.
- Production env validation now rejects weak or placeholder secrets, duplicate JWT secrets, localhost databases, wildcard CORS, and production OTP bypass.
- Both backend services now apply Helmet and global throttling. Sensitive auth routes use tighter throttles.
- OTP generation is cryptographically secure, failed attempts are bounded to five, and attempt accounting is atomic.
- Job Order evidence and insurance uploads now enforce size limits, file-signature validation, safe extensions, and storage-root containment. Internal upload URLs cannot be forged through external document fields.
- Current-tree and Git-history secret pattern scans found no high-confidence private keys or provider tokens.

Open repository-hygiene follow-ups:

- Review and commit the staged removal of generated runtime files after confirming the cleanup
  does not overlap another active branch.
- Plan the Expo SDK 57 / React Native 0.86 migration and rerun Android export plus device QA.
- Upgrade or replace the remaining dev-only lint, test, CLI, and Drizzle toolchain packages when compatible major versions are approved.

## Current Recovery Context

Panel feedback indicates the project is not yet considered compliant with most stated objectives. The main issue is not only bugs; it is missing or weak proof that each objective works end to end.

The immediate recovery goal is to align:

- Working system features.
- Automated QA evidence.
- Paper/documentation claims.
- Demo flow for panel defense.

## Notion Source-of-Truth Sync

Latest Notion extraction reconciled:

- Page read: `Extracted decisions from Implementation Chat — 2026-05-23`
- Notion URL: `https://www.notion.so/3694cd25f32c81d9a77cc08bc7d8abec`
- Reconciled into repo docs on 2026-05-23.

Key implementation-chat decisions now reflected in repo documentation:

- Technician web/mobile logins are retired in the active product flow.
- The active workshop model is service-adviser owned.
- Technicians are non-auth operational profiles with specialties, assignment context, checklist/PDF proof, and evidence requirements.
- Workshop stages are adviser-owned: `Received`, `Diagnosis`, `In Repair`, `Quality Check`, and `Ready`.
- QA release is owned by the service adviser or super admin in the active flow, not by a separate retired QA role login.
- Mobile tracking and Objective 2 lifecycle should prefer adviser-owned stage-tracker evidence over old technician-progress assumptions.
- Focused reruns may close specific blockers, but broad full-suite status must stay honest until the whole suite is rerun.
- Notion is now the team-facing knowledge hub, while `docs/project-control` remains the engineering evidence source.

## Latest QA Status

Automated Playwright QA is tracked under `qa/playwright`.

## Latest Business-Process Alignment Audit

The uploaded client `Business-Process.pdf` was rechecked against the live implementation and the captured source in `docs/business-process-cruisers-crib.md`.

Latest audit result:

- Report: `docs/business-process-implementation-alignment-report.md`
- Verdict: the system is strong on booking-to-cash, insurer-document handling, reminder/broadcast flows, adviser-owned workshop execution, and staff-managed back-jobs, but the insurance business-process bridge is still incomplete.

Highest-risk honesty gaps:

- Critical: there is still no structured insurance estimate/quotation record that moves through insurer submission, approval, and explicit job-order/billing linkage.
- Critical: the system should not yet claim it blocks repair/job-order work based on a linked insurance approval gate.
- High: customer self-service back-job initiation from mobile service history is still not implemented and must not be claimed.
- High: insurance compliance handling is only partial; CTPL/comprehensive, OR/CR, policy, police report, renewal/payment state exist, but filing deadlines, previous-policy specificity, and stronger conditional compliance blocking are still incomplete.
- Medium: communication scope must stay honest as reminders/broadcasts/notifications, not built-in direct chat or current-scope push notifications.

Latest structured QA result:

- Method: Whole-system panel/objectives Playwright rerun on 2026-05-22 against fresh backend `3000`, ecommerce `3001`, staff web `3002`, and fresh mobile web export `8096`
- Result: `20` passed, `0` failed, `0` timed out, `0` skipped
- Report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: The full automated Playwright gate is now green. Panel-critical system areas covered by the suite now pass together: admin CRUD/pricing/billing, booking-to-cash, multi-service booking, Shop/ecommerce rewards, insurance documents, insurance reminder/broadcast, Back-Jobs, Objective 2 lifecycle/readable IDs, readable-ID sweep, role retirement/adviser access, human-QA PDF recovery, and adviser-owned checklist/PDF workshop proof.
- Residual polish findings remain: invoice lookup specificity, immediate invoice visibility, stale mobile completed-history refresh, completed-state timing before manual payment, non-finalized Back-Jobs negative dataset coverage, and deterministic approved lifecycle summary data for panel capture.

Previous broad regression context:

- Method: Full-system panel/objectives Playwright rerun on 2026-05-22 against fresh backend `3000`, ecommerce `3001`, staff web `3002`, and fresh mobile web export `8096`
- Result: `17` passed, `3` failed, `0` timed out, `0` skipped
- Report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Historical and superseded by the later 20/20 full-system rerun above. This run is retained only to explain the blocker-recovery sequence for booking-to-cash, service-loyalty booking setup, and mobile multi-service booking setup.

- Method: Focused booking / loyalty / multi-service blocker-closure rerun on 2026-05-22 against fresh backend `3000`, ecommerce `3001`, staff web `3002`, and fresh mobile web export `8096`
- Result: `4` passed, `0` failed
- Report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: `booking-to-cash.flow.spec.mjs`, both `insurance-loyalty.flow.spec.mjs` checks, and `mobile-multi-service-booking.flow.spec.mjs` became green together in focused live evidence, then were superseded by the latest 20/20 full-system rerun.
- QA nuance: the focused rerun still records residual findings around invoice lookup specificity, immediate invoice visibility, stale mobile completed-history refresh, and completed-state timing before manual payment. These do not fail the three reopened blockers, but they should be cleaned up before demo polish is considered done.

Targeted closure context:

- Method: Final blocker-closure reruns on 2026-05-22 across fresh backend `3000`, ecommerce `3001`, rebuilt staff web `3002`, and fresh current-source mobile export `8097` where needed
- Result: admin billing `1/0`, Back-Jobs `2/0`, Objective 2 `1/0`, insurance manual reminder/broadcast `1/0`, adviser-owned checklist-only workshop `1/0`
- Report: `qa/playwright/artifacts/qa-summary.md` plus individual Playwright console/traces for the targeted closure runs
- Verdict: The May 22 blocker bundle is now QA-closed in targeted live evidence. Admin CRUD/pricing/billing is green again, Back-Jobs finalized-origin creation plus full follow-through are green, Objective 2 is green again, insurance manual reminder/broadcast send is green, and the retired-technician replacement flow now has live checklist-only workshop proof under the adviser-owned technician-profile model.

- Method: Booking / Shop closure rerun on 2026-05-22 against fresh backend `3000`, ecommerce `3001`, fresh mobile web export on `8096`, and a rebuilt healthy staff web runtime on `3002`
- Result: `3` passed, `0` failed
- Report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: The targeted booking/shop blocker bundle is now QA-closed. `booking-to-cash.flow.spec.mjs`, `mobile-multi-service-booking.flow.spec.mjs`, and `shop-ecommerce-rewards.flow.spec.mjs` all passed together after rebuilding the broken staff web runtime onto a clean production-mode `next start` server on `3002`. The closure also verifies the adviser-owned workshop/QA model in the live booking-to-cash path.

- Method: Booking / Shop recovery rerun on 2026-05-22 against fresh backend `3000`, ecommerce `3001`, staff web `3002`, and fresh mobile web export on `8096`
- Result: 0 passed, 3 failed
- Report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Still not QA-closed. The old mobile booking `trimOrNull is not defined` crash did not reproduce, but booking-to-cash and multi-service booking still could not submit because the selected seeded vehicle/date/slot rendered as blocked/full and no submit button existed. Shop/ecommerce rewards still did not reach Shop because the helper misclassified the public signed-out landing page as an authenticated surface.

Previous targeted recovery result:

- Method: Targeted full-suite blocker recovery rerun on 2026-05-22 against fresh backend `3000`, ecommerce `3001`, staff web `3002`, and fresh mobile web export on `8096`
- Result: 5 passed, 3 failed
- Report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Historical partial-recovery context only. These blockers were later recovered and superseded by the latest 20/20 full-system rerun.

Previous full panel-recovery QA result:

- Method: Full panel-recovery Playwright suite on 2026-05-22 against backend `3000`, ecommerce `3001`, refreshed staff web `3002`, and a fresh Playwright-served mobile web export from `mobile/.runtime/qa-mobile-web-export`
- Historical result: 7 passed, 11 failed
- Report: `docs/project-control/PANELIST_FULL_SYSTEM_QA_2026-05-22.md`
- Verdict: Historical failed gate only. The obsolete role/readable-ID assumptions and flow blockers were later replaced by adviser-owned coverage and superseded by the latest 20/20 full-system rerun.

Important scope correction:

- Technician staff web logins are intentionally retired in the current product model.
- QA must stop treating retired technician login failures as product regressions.
- The replacement acceptance target is adviser/admin-managed technician profiles, selected specialties, workshop checklist/progress/evidence, checklist-only constraints, and QA release through the adviser-owned workshop flow.

Latest blocker-recovery implementation/live status from 2026-05-22:

- Mobile booking availability and booking-to-cash are now QA-closed in the targeted recovery bundle. The latest live rerun uses fresh temporary vehicles inside the booking specs, reaches reservation payment, adviser confirmation, workshop handoff, adviser-owned job-order progress/evidence, adviser QA release, invoice/payment, and customer-visible completed history.
- Mobile multi-service booking is now QA-closed in the targeted recovery bundle. The latest live rerun submits more than one requested service in one booking on the fresh temporary-vehicle setup.
- Exported mobile Shop catalog routing and ecommerce reward timing are now QA-closed in the targeted recovery bundle. The authenticated-only mobile sign-in detection now reaches the actual Shop surface, checkout succeeds, and rewards proof passes against healthy ecommerce `3001`.
- Staff web `3002` had to be rebuilt onto a clean production-mode `next start` runtime during this closure work because the prior listener served the HTML shell but returned `404` for Next client bundles. The current closure verdict depends on that rebuilt healthy `3002` runtime.
- Admin billing is now live QA-closed again. The previous inventory-threshold persistence blocker was traced to a QA locator/scoping issue in the Playwright spec, and the corrected rerun now passes the full admin CRUD/pricing/billing flow cleanly.
- Role/readable-ID QA coverage is now live QA-passed for the adviser-owned model: the adviser can open Job Orders and QA Audit, retired technician accounts show explicit retirement copy, and the readable-ID sweep passes for critical customer/adviser surfaces.
- Customer validation is now stronger in the current tree: mobile customer flows normalize/validate plate numbers, backend vehicle writes reject malformed short plates and canonical duplicate plates, and backend user writes reject duplicate active PH mobile numbers. These are code-fixed and targeted-verified, not live QA-closed.
- Back-Jobs finalized-origin creation and the full staff-linked rework lifecycle are both live QA-closed in the current adviser-owned / technician-profile model.
- Objective 2 is live QA-closed again on a fresh current-source runtime after removing the flaky mobile booking date-card dependency from the spec setup; the rerun again proves service + insurance + invoice/payment + summary on one vehicle timeline.
- Insurance staff manual reminder/broadcast send is now live QA-closed from the staff insurance workspace.
- Adviser-owned checklist-only workshop proof is now live QA-closed: checklist PDF export, work-item photo-evidence guardrail, readable selected-file handling, and in-flight save/upload locking all passed in the new targeted run.

Latest backend regression result:

- Method: `npm test -- job-orders.integration.spec.ts rbac-regression.integration.spec.ts vehicle-lifecycle.integration.spec.ts`
- Result: 6 passed, 5 failed across 3 failing suites
- Blockers: test/integration wiring still lacks `bookingsRepository.findBookingReadModelByIds` and `insuranceRepository.findInquiriesByVehicleId` in the relevant test paths.

Latest build/export result:

- Backend typecheck passed.
- Staff web production build passed.
- Expo web export passed.
- Repo-root runtime commands now use a detached runtime manager around the single-instance watchdog for `3000`, `3001`, `3002`, `8081`, and `8090`. Start commands return immediately; `runtime:wait` provides the separate bounded readiness check. The manager normalizes duplicate Windows `Path`/`PATH` entries, refuses unknown listeners, and exposes managed `status`, `restart`, `stop`, and `logs` operations.
- Focused mobile garage helper passed for add-vehicle, pagination, and approved summary rendering.
- Staff UX/copy helper `workspaceCopyCleanup.test.mjs` failed 19 of 25 tests, so usability polish is not closed.

Latest readable-ID result:

- The broad readable-ID sweep now passes with ecommerce-backed staff coverage included.
- The previous Mobile Rewards loyalty activity raw UUID leak no longer reproduces.
- The previous Mobile Shop Orders raw UUID leak no longer reproduces.

Latest human-QA PDF recovery result:

- Method: targeted Playwright closure rerun on 2026-05-22 against backend `3000`, staff web `3002`, and fresh current-source mobile web export served on `8096`.
- Result: passed (`5` passed, `0` failed).
- Runtime prerequisite: local Postgres needed `cd backend && npm run db:push` because the current job-order assignment model requires the `technician_profiles` table.
- Checks passed: Job Orders banner Step 6 opens `/admin/qa-audit`; selected Intake Inspection detail shows captured intake snapshot/notes; mobile Booking can clear selected services without auto-selecting `Body repair`; re-tapping active `Book` and `Garage` tabs triggers refresh traffic; booking is blocked while the same vehicle has an active workshop job; Dashboard Insurance launcher opens the request/home surface without the previous blank-screen `ReferenceError`.
- Verdict: human-QA PDF recovery is QA-closed for the tested checklist items. Insurance staff manual reminder/broadcast send behavior remains separate and was not included in this closure run.

Important nuance:

- The readable-ID sweep is QA-passed for tested critical surfaces, but it is not the same as a full-system pass.
- The earlier May 22 full-suite failures for booking-to-cash, service-loyalty booking setup, and mobile multi-service booking are superseded by the later focused blocker-closure rerun and the latest 20/20 one-command full-system rerun.

Covered and passed except where noted:

- Fresh Objective 2 service flow can move from mobile booking through reservation payment, workshop handoff, job order creation, adviser-owned technician-profile progress/evidence/checklist work, adviser-owned QA release, adviser finalization, invoice payment, and completed booking state.
- Staff insurance can see the newly created insurance request for the same seeded vehicle used in the service flow.
- Mobile Garage/lifecycle renders service history milestones and the customer-visible reviewed summary when an approved summary exists.
- Objective 2 is green again in the latest full-system rerun, but panel-ready screenshot/video evidence and deterministic approved-summary setup are still needed for defense materials.
- Readable-ID sweep improved in the latest live rerun: the previous Job Orders/technician raw customer/vehicle UUID findings and the previous UUID-fragment invoice-reference finding no longer reproduced in the final structured report.
- A broader all-surface readable-ID sweep now exists and hard-fails visible internal identifiers; the latest full rerun passes after fixing Mobile Rewards and Mobile Shop Orders leakage and includes ecommerce-backed staff surfaces with `3001` up.
- The earlier May 22 `8090` verdict is now known to have been polluted by a stale mobile web runtime. Use a fresh current-source mobile export/listener such as `8096`, or rebuild `8090` before trusting it for panel evidence.
- Staff admin can create catalog categories/products through `Catalog Admin`, edit product name/price, and archive/hide a product from the staff UI.
- Staff admin can create an inventory-backed product and record a quantity adjustment from the staff UI.
- Staff admin can create active and inactive booking-service records with visible base pricing; the previous `basePricePhp` request-body leak is QA-closed by the latest live rerun.
- Loyalty admin still shows a clear separation between `Reward Config` and `Earning Rules`.
- Ecommerce manual payment in `Invoices & Orders` remains reachable during the admin/pricing/billing sweep.
- Staff Back-Jobs can create a rework/back-job case from finalized prior service lineage without reproducing the previous create `400`.
- Created back-job cases persist the selected customer, vehicle, complaint, original finalized job order, and booking source lineage.
- Back-Jobs rejects non-finalized original work as invalid lineage, protecting the flow from becoming a normal unrelated booking path.
- Back-Jobs detail/table no longer expose raw UUIDs for the case, customer, vehicle, original job order, or original booking lineage in the live QA flow.
- Back-Jobs full follow-through now passes for the staff-linked path: completed return inspection evidence, `reported` -> `inspected` -> `approved_for_rework`, linked rework job order creation, adviser-owned technician-profile progress/evidence, QA release, adviser finalization, and resolved back-job outcome.
- Staff `/shop` handoff points to live admin surfaces and `/admin/catalog` can surface the QA-created ecommerce category/product.
- Customer mobile Shop checkout creates an ecommerce order/invoice.
- Ecommerce order/invoice surfaces use business-readable `ORD-...` and `INV-...` references.
- Loyalty points do not accrue from catalog setup, cart add, order creation, unpaid invoice, or partial ecommerce invoice payment.
- Loyalty points accrue after a qualifying fully paid ecommerce invoice event with an active ecommerce earning rule.
- Mobile Rewards shows ecommerce loyalty activity and reward unlock progress after the paid event.
- Loyalty admin separates `Reward Config` from `Earning Rules`; deactivated rewards stop redemption availability and deactivated earning rules stop future accrual.
- Insurance API keeps OR/CR, policy, and police report attached to the same request.
- Staff insurance renders one `Open file` action per uploaded insurance document, the backend file route streams each document, and the blob-backed browser links are readable.
- Loyalty points do not accrue from reservation-fee payment or unpaid invoice finalization.
- Loyalty points accrue after a qualifying paid service invoice event.

Follow-up status from the latest ecommerce rewards QA:

- QA-closed: `Invoices & Orders` now includes a staff-visible manual ecommerce payment action wired to the existing ecommerce invoice-payment endpoint. The final live rerun recorded partial and final ecommerce payments from the staff UI.
- QA-closed: Mobile product detail no longer renders the raw product UUID under `Product ID`; the final live rerun verified `Product Code` / SKU and hard-failed if the raw UUID appeared.

Follow-up status from the latest Back-Jobs QA:

- QA-closed for the staff-linked creation path: the service adviser can create a back-job tied to a finalized original service/job order, and the live backend keeps the lineage intact.
- QA-closed on 2026-05-21: the staff Back-Jobs detail/table now maps case, customer, vehicle, original booking, and original work into business-readable references instead of printing the raw UUIDs directly.
- QA-closed on 2026-05-21 for the staff-linked full rework lifecycle and preserved in the latest adviser-owned coverage: approval to rework, linked rework job order, technician-profile progress/evidence, QA release, adviser finalization, and resolved back-job outcome all passed live Playwright.
- QA-closed on 2026-05-21 for the Back-Jobs polish rerun: linked return-inspection display no longer exposes the raw UUID after approval, and same-day rework job-order selector duplication no longer reproduces in adviser, QA Audit, or technician selector steps.
- Still open for complete Objective 4 claims: customer self-service initiation remains unproven and should not be claimed unless separately tested.

Follow-up status from the latest Admin CRUD / pricing / billing QA:

- QA-closed: Catalog Admin hidden product recovery/republish state and category edit/activate/deactivate controls no longer reproduce as findings.
- Code-fixed, pending fresh live rerun: Inventory stock policy now normalizes and persists edited low-stock thresholds through the ecommerce inventory service, and the focused ecommerce integration regression now proves `reorderThreshold` updates from `6`/`9` style values correctly.
- QA-closed: Service Management exposes readable service codes plus edit/activate/deactivate controls for existing services.
- QA-closed: Service Management no longer leaks UI-only `basePricePhp`; create-service now succeeds with backend-shaped `basePriceCents`.
- QA-closed: Loyalty earning-rule configuration now uses product/category picker controls instead of raw Product ID/Product Category ID text fields.
- QA-closed: Service invoice detail in `Invoices & Orders` surfaces invoice reference, invoice total, subtotal, reservation-fee deduction, total, and payment state.
- Latest admin CRUD / pricing / billing rerun result remains `1` passed, `0` failed in the last recorded live evidence, but the remaining high inventory threshold finding is now code-fixed and awaiting a fresh rerun.

Open finding from the previous insurance/loyalty run:

- Playwright recorded a medium concern that booking can move to completed after invoice finalization before manual payment, even though loyalty points correctly remain blocked until payment.

Local recovery status after that run:

- A protected insurance document stream route is mapped and staff insurance renders blob-backed `Open file` links in the review UI.
- Backend document storage now reads from a deterministic backend runtime root with a legacy repo-root fallback.
- Backend `insurance.service.spec.ts`, `insurance-document-storage.service.spec.ts`, backend typecheck, and staff web build all passed after this follow-up fix.
- Fresh live insurance/loyalty Playwright rerun after backend restart now passes both tests and closes the insurance staff open/download defect.

## Recently Fixed or Improved

- Human-QA PDF recovery on 2026-05-22 is now code-patched for several concrete UI defects: the Job Orders step-banner `QA Audit` CTA now routes to `/admin/qa-audit` instead of the dead `/qa-audit` path, so the banner and sidebar no longer disagree.
- Staff intake inspection review now shows the saved intake snapshot/notes inside the selected inspection detail view instead of only showing linked booking ids plus findings/attachments.
- Mobile Booking now lets the customer clear all selected services without silently auto-selecting `Body repair`, which removes the forced fallback behavior called out in the human QA PDF.
- Re-tapping the active `Book` bottom-nav tab now triggers a real customer refresh path for booking discovery/history instead of leaving the current booking view stale, and re-tapping `Garage` now refreshes that vehicle workspace too.
- Dashboard-origin insurance launcher now opens the insurance request/home surface in the fresh live human-QA PDF closure run; the previous blank-screen `ReferenceError` did not reproduce.
- Follow-up recovery after that rerun is now in the current tree: the Insurance screen no longer references `rememberedInquiryStorageKey` before initialization, and a focused insurance source-proof plus fresh Expo web export both pass.
- Follow-up recovery after that rerun is also in the current tree for booking duplication: new booking creation now rejects the same vehicle when a linked service job order is still active (`assigned`, `in_progress`, `blocked`, or `ready_for_qa`), and the focused backend booking-service spec plus backend typecheck both pass.
- Follow-up recovery after the latest blocker rerun is now in the current tree for customer validation and booking discovery: `bookingDiscoveryClient.js` now defines the missing `trimOrNull(...)` helper, mobile customer forms now normalize/validate plate numbers more strictly, backend vehicle writes reject malformed/canonical-duplicate plates, backend user writes reject duplicate active PH mobile numbers, and the Shop mobile sign-in helper now tolerates already-authenticated sessions.
- Session stability is now code-patched across both customer mobile and staff web shells. Mobile now refreshes saved sessions during startup hydration, refreshes active sessions every 10 minutes, refreshes again when the app returns to the foreground, and tries token refresh before clearing the customer session on 401-expiry events. Staff web now refreshes stored sessions during restore, refreshes active sessions every 10 minutes, refreshes again when the portal regains focus/visibility, and tries token refresh before falling back to login on staff-session unauthorized events.
- The dedicated mobile `Vehicle Timeline & Lifecycle` screen now has a demo-oriented redesign in the current tree: compact top actions, stronger hero/vehicle context, improved garage selector cards, richer metric presentation, and more polished empty-state/section hierarchy. This is aimed at panel/demo readability and is focused-proof/export verified, but not separately QA-closed yet.
- Booking discovery recovery in the current tree now includes the missing `trimOrNull(...)` helper plus a hardened mobile Shop sign-in helper for already-authenticated customer sessions.
- Technician login retirement is now code-patched across backend auth, staff web session guards, and mobile session guards. Workshop execution has moved to service-adviser ownership instead of technician-authenticated portals.
- Admin now has a dedicated non-auth technician directory flow in code, with multi-specialty technician profiles and create/update/list endpoints.
- Job Orders now support technician-profile assignments with selected specialty, adviser-owned workshop stage tracking (`Received`, `Diagnosis`, `In Repair`, `Quality Check`, `Ready`), and printable per-technician checklist PDF generation in code.
- Printable technician checklist PDF export exists end to end through Job Orders and is QA-closed in the latest adviser-owned checklist-only workshop flow.
- Mobile booking detail/tracking is now wired in code to prefer adviser-owned workshop stages when linked job-order stage history exists, instead of only inferring workshop progress from booking status.
- QA ownership has shifted from a separate retired QA-role login assumption to service adviser ownership in the active quality-gate access path and staff-web navigation model.
- Job Orders can expose booking handoff sources even when the date already has existing job orders.
- Job Orders source picker was added for multiple handoff-ready bookings on one date.
- QA Audit now lists ready-for-QA jobs without limiting visibility to the current month.
- Playwright harness now handles stale local dev UI refreshes, async dropdowns, and static mobile web API proxying.

## Recently QA-Closed

Fresh Playwright rerun confirms these previous findings no longer reproduce in `qa-summary.md`:

- Booking availability now hides customer-owned same-slot conflicts before create is attempted.
- Job-order photo evidence uploads now keep the workbench on the `Evidence` stage so the success state remains visible.
- Reservation fee records now provide a durable reference in the end-to-end booking flow.
- Mixed Job Orders queue source-picking UX no longer appears as a QA finding in the Playwright evidence pack.
- Ecommerce `Invoices & Orders` now records partial and final manual ecommerce payments from the staff UI.
- Mobile Shop product detail no longer exposes the raw product UUID in the live ecommerce rewards QA flow.
- Back-Jobs staff-linked case creation from finalized service lineage passes live Playwright QA, and non-finalized origin work is rejected.
- Back-Jobs readable-reference cleanup is QA-closed; the strengthened Playwright spec hard-fails if visible detail/table lineage shows raw UUIDs.
- Back-Jobs full staff-linked rework follow-through is QA-closed; the prior false status-update concurrency conflict no longer reproduces in live Playwright.

## Known Remaining Findings

From panel feedback and remaining recovery work:

Latest full-system QA residuals from 2026-05-22:

- The automated Playwright gate is green at 20 passed / 0 failed, but backend integration regression wiring still needs a separate clean pass for job-order/RBAC/lifecycle helper methods.
- Staff UX polish is not QA-closed: `frontend/src/screens/workspaceCopyCleanup.test.mjs` currently fails 19 of 25 helper checks.
- Mobile/web session-login stability is still not timed live-proven beyond the old 10-15 minute failure window, even though the refresh/recovery implementation is in place.

From panel feedback:

- Mobile app UX is confusing and needs redesign.
- Mobile/web session/login stability is now implementation-patched, but it still needs timed live QA proof beyond the old 10-15 minute failure window.
- Customer multi-car garage and pagination are QA-passed in the current evidence set; keep screenshots for the defense pack.
- Customer multi-service booking is QA-passed in the latest full-system rerun; keep it in regression.
- Latest human-QA PDF closure rerun proves mobile active-tab refresh, service de-selection, Dashboard Insurance launch, and active-service booking blocking in the targeted flow.
- Technician should only perform checklist/progress/evidence work. This is now live-proven in the adviser-owned technician-profile flow, but keep it in regression and demo evidence.
- Billing details are now functionally live-proven in the targeted admin closure rerun; remaining work is clarity/paper/demo evidence, not a current blocking product failure.
- Insurance accident process and supporting documents must be added.
- Loyalty qualification standards must be defined and enforced.
- Vehicle IDs and transaction IDs should use business-readable generated IDs, not raw hash/UUID display. Fresh current-source Objective 2 QA no longer reproduced the Job Orders raw UUID, invoice UUID-fragment, or stale mobile booking-history hash-reference findings on the tested flow, and the final broad readable-ID sweep now passes across the tested critical customer, staff, retired-login, and ecommerce-backed staff surfaces.
- Shop, catalog, and service data-entry modules pass automated admin/customer QA; remaining work is presentational polish and paper/demo evidence.
- Latest admin CRUD QA confirms the previous inventory threshold and finalized service invoice concerns are closed in the fresh live rerun.
- Paper diagrams, gap analysis, and objective evidence need revision. The client business process source has now been captured from `Business-Process.pdf` into `docs/business-process-cruisers-crib.md`; it still needs to be inserted into the final paper and diagrams.

Latest implementation movement on 2026-05-21:

- Mobile booking now submits multiple selected services through the live `serviceIds` contract.
- Vehicle lifecycle mobile now supports adding another vehicle and paginating garage vehicles in the detail surface.
- Customer-visible reviewed lifecycle summary text is now exposed through a dedicated backend route and rendered on mobile.
- Main booking/job-order customer/staff surfaces now favor business-readable booking/job-order references over raw UUID fragments where patched.
- Objective 2 recovery patches added code paths for insurance inquiry/record events and explicit invoice/payment milestones in `/api/vehicles/:id/timeline`, replace Job Orders/workbench raw customer/vehicle fallback IDs with readable labels, and switch service invoice / official receipt references to business-readable timestamp tokens instead of UUID fragments. Fresh current-source live QA on `8096` confirms the insurance timeline, invoice milestone, and readable-ID portions together on the tested flow.
- Booking records now have a durable backend booking reference source-of-truth, and Job Orders handoff candidates now consume that same persisted reference instead of rebuilding a local `BK-...-PENDING` fallback.
- `Invoices & Orders` now loads finalized service-record options from full history instead of only the current month, and invoice selector labels prefer the unique source booking reference when available so same-day `JO-...-WORK` duplicates stop confusing staff.
- Mobile booking history/detail now renders explicit requested-service chips so multi-service bookings remain clearly visible after submit instead of collapsing into one ambiguous title string.
- Mobile app shell now persists and rehydrates the signed-in customer session through AsyncStorage-backed startup restore, so refresh no longer cold-boots the app back to an empty auth state.
- Staff insurance review now renders working `Open file` links for uploaded OR/CR, policy, police report, and other `upload://insurance/...` files.
- Shop/ecommerce rewards live QA now proves customer checkout, paid ecommerce invoice accrual timing, Rewards activity display, staff catalog visibility, and Reward Config versus Earning Rules separation.
- Back-Jobs/rework staff lineage live QA now proves a service adviser can open a back-job from finalized prior service history, the backend rejects non-finalized origin work, the staff detail/table no longer expose raw lineage UUIDs, and the staff-linked rework lifecycle can reach resolved after adviser-owned technician-profile work, QA release, and adviser finalization.
- UX Audit Pro findings for the customer Mobile Book flow were converted into tracked rebuild work, and the first-pass mobile redesign now ships friendlier booking sign-in copy, a single next-step dashboard card, clearer `Service Booking` / `Choose Services` / `Active Services` labels, a four-step booking journey, and human-readable reservation fee urgency copy.
- New proof tests now verify:
  - multi-service mobile booking source/contract wiring,
  - multi-service booking history/detail requested-service visibility,
  - mobile app session persistence and startup route restore,
  - garage add-second-vehicle and pagination UI structure,
  - customer-visible reviewed lifecycle summary rendering,
  - business-readable booking/job-order reference usage across critical staff/mobile screens,
  - Objective 5 discrepancy/customer-summary proof anchors through `docs/project-control/OBJECTIVE5_DEMO_PROOF.md`.
- Many of these items now also have live Playwright proof in the latest 20/20 rerun; what remains is panel-style screenshot/video capture and paper alignment, not a failing automated gate.
- The booking-reference consistency fix above is QA-passed in the latest booking-to-cash rerun, with residual polish around invoice lookup specificity and immediate invoice visibility.
- Same-day rework job-order selector duplication is QA-closed by the latest live Back-Jobs rerun; remaining Back-Jobs scope is customer self-service initiation only if the defense intends to claim it.
- The mobile multi-service booking history visibility and active-tab refresh fixes are QA-passed in the latest live evidence. Timed long-session stability still needs a dedicated live proof beyond the old 10-15 minute failure window.
- Fresh Objective 2 lifecycle recovery QA on a clean current-source runtime now passes end to end; the previous insurance-timeline failure is superseded as stale-runtime drift from the old `8090` listener, not the current checked-in source.

## Important Workspace Note

The repository currently has multiple modified and untracked files. Some existed before the QA work. Future chats must not revert unrelated changes unless the user explicitly asks.

Run `git status --short` before editing and after finishing.

## Agentic Workflow Note

The repo now also contains a self-improving agentic control plane under `docs/architecture/`.

- Future implementation chats may use that architecture as workflow source-of-truth in addition to the project-control docs.
- Start from `docs/architecture/README.md`, then `system-architecture.md`, `agents/orchestrator.md`, and `agent-manifest.json` when agent routing or agent ownership matters.
- Repo-defined agent roles currently include `orchestrator`, `domain-worker`, `integration-worker`, `test-worker`, `validator`, `docs-worker`, and `refactor-worker`.
- Codex may spawn subagents to parallelize bounded work, but those subagents should follow the repo-defined role contracts rather than invent ad hoc ownership.
- The main chat still owns the final integrated answer plus updates to `CURRENT_STATE.md`, `PANELIST_FEEDBACK_MATRIX.md`, `OBJECTIVE_COMPLIANCE_MATRIX.md`, `QA_LEDGER.md`, and `IMPLEMENTATION_ROADMAP.md`.
