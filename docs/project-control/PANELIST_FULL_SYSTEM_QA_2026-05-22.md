# Panelist Full System QA Audit - 2026-05-22

## Superseding Rerun - 2026-05-22 10:20 AM

Scope: same panelist system feedback and Objectives 1-4 plus Objective 6. Objective 5 remains out of closure scope for this pass.

Runtime used:

- Backend main service: `http://127.0.0.1:3000`, healthy after controlled restart.
- Ecommerce service: `http://127.0.0.1:3001`, listener present.
- Staff web: `http://127.0.0.1:3002`, stale runtime was restarted before the final rerun.
- Mobile web: fresh static Expo web export served by Playwright from `mobile/.runtime/qa-mobile-web-export` on `8095`.

Commands and results:

| Check | Result | Notes |
|---|---:|---|
| `npx expo export --platform web --output-dir .runtime/qa-mobile-web-export` from `mobile` | Passed | Fresh mobile web export was generated before rerun. |
| `npm run seed:booking-job-order-qa-accounts` from `backend` | Passed | QA accounts and seeded vehicle were refreshed. |
| `npx playwright test --config=playwright.config.mjs --workers=1` | 7 passed, 11 failed | Full live flow suite after stale staff web was restarted. |
| `backend/node_modules/.bin/tsc.cmd -p backend/tsconfig.json --noEmit` | Passed | Backend typecheck is clean. |
| `npm run build` from `frontend` | Passed | Staff web production build is clean. |

Latest verdict: **Not panel-ready yet.**

Important scope correction:

- technician login failures in the Playwright suite are **obsolete test coverage**, not valid product failures, because the project has intentionally retired technician staff login roles.
- The correct current QA target is: service adviser/admin manages technician profiles, selected specialties, workshop checklist/progress/evidence, QA release, and checklist-only restrictions through the adviser-owned workshop flow.
- Future tests should stop requiring retired workshop accounts such as `qa.booking.tech@autocare.com` to sign in as web users unless the product decision changes.

Passed in the latest full rerun:

- Job Orders Step 6 banner opens live QA Audit instead of a 404.
- Intake Inspection detail shows captured snapshot and notes.
- Mobile Booking clearing selected services and active-tab refresh behavior works.
- Booking is blocked while the same vehicle has an ongoing service job.
- Dashboard Insurance launcher opens the insurance request/home surface.
- Insurance claim keeps OR/CR, policy, and police report on one request, and staff can open every file.
- Web login validates empty credentials before attempting staff auth.

Failed or blocked in the latest full rerun:

| Severity | Area | Latest Evidence | QA Interpretation |
|---|---|---|---|
| Critical | Booking-to-cash / multi-service / Objective 2 dependent service flows | Mobile booking repeatedly stopped at `Slot conflict` even though the selected date card showed open capacity. The expected `Reservation Fee` state never appeared. | Real flow blocker or shared QA data conflict. This blocks booking-to-cash, service-loyalty, multi-service proof, and Objective 2 service-flow proof in the full suite. |
| Critical | Shop/ecommerce + rewards | Mobile Shop searched for the newly created QA product but rendered `Catalog service unavailable` / `0 results`. | Customer shop checkout and ecommerce rewards cannot be claimed closed from this rerun. Staff catalog proof exists, but mobile catalog consumption failed. |
| High | Admin CRUD / pricing / billing | The flow ended on Loyalty Management and could not find the expected `Order Invoices` action. The structured summary also recorded inventory threshold persistence and missing finalized service invoice proof concerns. | Admin CRUD is not clean in the latest full rerun. Needs either product fix or QA harness navigation/precondition repair, then rerun. |
| High | Back-Jobs Objective 4 creation path | Both Back-Jobs tests failed because no finalized customer job order was available for origin selection. | Objective 4 follow-through cannot be re-proven unless the suite first creates/seeds a finalized service origin. Treat as data-precondition blocked, not passed. |
| Medium | Readable-ID sweep | Failed at the technician role sweep because the test still tries retired technician login. | Obsolete test assertion. Needs rewrite around adviser-owned technician-profile/workshop surfaces. |
| Medium | Role access tests | adviser/technician web login tests fail with `Technician login has been retired`. | Expected under the new product decision. Retire or rewrite these tests. |

Panelist recommendation status after this rerun:

| Panelist Concern | Latest Status | Notes |
|---|---|---|
| Fix vehicle IDs / avoid hash IDs | Partially proven | Previous readable-ID sweep passed, but latest full sweep is blocked by obsolete technician-login coverage. |
| Customer can avail multiple services | Not closed in latest full rerun | Flow hit slot conflict before reservation-fee proof. |
| Mobile session / active nav refresh | Partially closed | Active Book/Garage refresh passed; timed session expiry/restart proof still needs separate QA. |
| Mobile app UX clarity | Not closed | Needs UX audit/screenshot review beyond functional automation. |
| Customer can add multiple cars | Capability proven, presentation evidence created | Add-vehicle UI and pager evidence exist; keep screenshot evidence for defense. |
| Technician error / technician skill | Product model changed | Technician login is retired. QA should verify technician profiles, specialties, checklist/progress/evidence, and adviser-owned assignment instead. |
| Technician should only do checklists | Not closed | Checklist-only acceptance criteria and targeted proof are still needed under the new adviser-owned model. |
| Garage pagination | Proven in focused evidence | Keep live/presentation screenshot evidence. |
| Objective 2 lifecycle polish | Not closed in latest full rerun | Blocked by booking slot-conflict before lifecycle proof could complete. |
| Duplicate same day/time/service | Not closed in latest full rerun | Slot conflict appeared despite open-capacity copy; this needs targeted duplicate/availability QA. |
| Billing details | Not closed in latest full rerun | Admin billing flow failed before `Order Invoices` proof. |
| Data entries: shop/catalog/service | Partially proven | Staff catalog/service evidence exists, but mobile shop catalog failed. |
| Insurance supporting documents | QA passed | Multi-file upload/open/download passed. |
| Loyalty qualification standards | Not closed in latest full rerun | Service/ecommerce rewards were blocked by booking/shop failures in this run. |
| Paper/documentation concerns | Not covered | Needs a separate paper QA pass. |

Next recommended QA targets:

1. Create or isolate a fresh finalized service origin before Back-Jobs and billing checks, or make the flow suite create one deterministically.
2. Debug mobile booking availability: the UI shows open capacity but returns slot conflict after submit.
3. Debug mobile Shop catalog runtime: staff-created products are visible to admin but unavailable to customer mobile catalog.
4. Rewrite role/readable-ID tests around the retired technician-login decision and the adviser-owned technician-profile workflow.
5. Add a targeted checklist-only QA flow for technician-profile assignments, task/checklist circles, progress/evidence concurrency, and photo evidence readability.
6. Rerun the full suite after those corrections and update this document again.

---

Scope: panelist system feedback and Objectives 1-4 plus Objective 6. Objective 5 was not treated as a closure requirement in this pass per instruction.

Rule for this pass: documentation updates only. No product code was changed.

## Runtime Used

- Backend main service: `http://127.0.0.1:3000`, healthy.
- Ecommerce service: `http://127.0.0.1:3001`, healthy.
- Staff web: `http://127.0.0.1:3002`, started as a controlled PowerShell job during Playwright because the detached runtime was not staying alive.
- Mobile web: `http://127.0.0.1:8096`, fresh current-source Expo web runtime.
- Shared mobile `8090` was not used as proof because earlier QA showed it can serve stale mobile output.

## Executive Verdict

Current verdict: **Not panel-ready yet.**

The system is much healthier than the original panel feedback suggested, but the full-system QA gate is not clean. The latest live Playwright run passed 10 of 13 flows and failed 3 flows. Build/export checks passed, but there are still objective-critical flow and regression-test blockers.

## Commands And Results

| Check | Result | Notes |
|---|---:|---|
| `npx playwright test --config=playwright.config.mjs qa/playwright/tests --workers=1` with `QA_MOBILE_BASE_URL=http://127.0.0.1:8096`, `QA_STAFF_BASE_URL=http://127.0.0.1:3002`, `QA_API_BASE_URL=http://127.0.0.1:3000`, `QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001` | 10 passed, 3 failed | Controlled fresh staff web runtime was used. |
| `npm test -- job-orders.integration.spec.ts rbac-regression.integration.spec.ts vehicle-lifecycle.integration.spec.ts` from `backend` | 6 passed, 5 failed | Backend integration regression pack is still not clean. |
| `backend/node_modules/.bin/tsc.cmd -p tsconfig.json --noEmit` | Passed | No backend TypeScript compile failure. |
| `npm run build` from `frontend` | Passed | Staff web production build completed. |
| `npx expo export --platform web --output-dir .runtime/export-panel-full-system-qa` from `mobile` | Passed | Mobile web export completed. |
| `node --test --test-name-pattern "mobile garage supports adding another vehicle" mobile/src/screens/customerBookingGarageProof.test.mjs` | Passed | Source/helper proof for add-vehicle, garage pagination, and approved summary rendering. |
| Live API check for `qa.booking.customer@example.com` vehicles | Passed | Customer currently has 4 vehicles: `QAJO1001`, `QAPG10931`, `QAPG71902`, `QAPG95983`. |
| `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs` | 6 passed, 19 failed | Staff UX/copy/order helper checks are not clean. |

## Live Playwright Results

Passed:

- Admin CRUD / pricing / billing.
- Back-Jobs full follow-through from approved case to rework job order, technician work, QA release, and resolved outcome.
- Insurance multi-file upload with staff `Open file` actions.
- Service-loyalty accrual timing after paid service invoice.
- Mobile multi-service booking submission.
- Broad readable-ID sweep across tested customer/staff/technician/adviser/ecommerce-backed surfaces.
- Service Adviser access to Job Orders and QA Audit.
- Technician role blocked from booking and invoice workspaces with meaningful copy.
- Web login empty-field validation.
- Shop/ecommerce checkout and rewards after fully paid ecommerce invoice.

Failed:

| Severity | Flow | Failure | Why It Matters |
|---|---|---|---|
| Critical | Booking-to-cash | Mobile detail shows `Pay Reservation Fee`, but the test expects exact `Pay reservation fee`; the E2E stops before staff confirmation/job order/invoice completion. | The main end-to-end service flow cannot currently be re-closed by automation. Decide the canonical CTA copy and align UI/test. |
| Critical | Objective 2 lifecycle | The spec created/tracked `#BK-20260605-0002`, then timed out trying to reopen that booking from mobile history. | The current full-system run does not prove the unified timeline from service + insurance + invoice + summary, even though older targeted runs did. |
| High | Back-Jobs creation/origin validation | The finalized job-order picker only showed `Choose finalized job order` and did not offer expected finalized origins such as `JO-20260521-001106` or `JO-BFF8D612`. | Follow-through still passed, but creation from finalized lineage is not reliable enough for Objective 4 closure. |

## Backend Regression Findings

The targeted backend integration rerun still fails:

- `job-orders.integration.spec.ts` returns 500 because `bookingsRepository.findBookingReadModelByIds` is missing in the test helper path.
- `rbac-regression.integration.spec.ts` also fails on the same `findBookingReadModelByIds` missing helper path.
- `vehicle-lifecycle.integration.spec.ts` returns 500 because `insuranceRepository?.findInquiriesByVehicleId` is missing in the integration test wiring.

Interpretation: these may be test-harness dependency drift rather than live production endpoint defects, but they still block a trustworthy regression pack. They must be fixed before claiming backend reliability under Objective 6.

## Panelist Feedback Status

| Panelist Concern | Current QA Status | Evidence / Gap |
|---|---|---|
| Vehicle/transaction IDs should not use hash/UUID display | QA Passed on tested critical surfaces | Broad readable-ID sweep passed with backend, ecommerce, staff, and fresh mobile runtimes. |
| Customer can avail multiple services | QA Passed for submission/storage | Live Playwright multi-service booking passed. |
| Mobile session should be fixed | In Progress | Build/export and source proof exist, but real device restart/expiry/LAN-host proof is still needed. |
| Mobile app UX confusing | Not Passed | Staff UX helper still fails heavily; mobile UX needs screenshot/manual audit closure, not just builds. |
| Customer can add multiple cars | Capability Proven / UX Risk | Live backend shows 4 vehicles for QA customer, and focused garage helper passes add/pagination. The add-car entry point should still be made obvious in the main Garage flow. |
| Technician error | Mostly Passed | Technician role-access and work execution flows pass; checklist-only UX is still not proven. |
| Technician should only do checklists | Not Passed | Current tested technician flow still centers on progress/evidence actions. A checklist-first role flow needs explicit QA proof. |
| Garage pagination | Proven in focused helper/source proof | Focused garage proof passes; keep a live screenshot/demo capture for defense. |
| Objective 2 polish/unified lifecycle | Not QA-closed today | Earlier targeted evidence exists, but the latest full suite failed before proving the lifecycle. |
| Duplicate same day/time/service booking | Existing evidence only | Current full run did not report a duplicate-booking finding, but the booking-to-cash test failed early. Keep the conflict tests in the regression pack. |
| Billing details | Partially QA Passed | Admin billing and ecommerce/manual payment passed; service booking-to-cash payment history cannot be re-closed until the CTA blocker is fixed. |
| Data entries: shop, catalog, service | QA Passed on latest live admin flow | Admin CRUD/pricing/billing Playwright passed. |
| Insurance road-accident supporting documents | Functional upload/view passed; process documentation still needed | Insurance multi-file upload and staff open/download passed. Accident-procedure standards still need paper/process mapping. |
| Loyalty qualification standards | Functional accrual passed; paper standards still needed | Service and ecommerce rewards accrue only after paid qualifying invoices. Written qualification standards still need documentation. |
| Service quotation/pricing | QA Passed on admin flow | Service Management pricing and invoice detail passed in the admin CRUD/pricing/billing flow. |
| Initial inspection issue notes | Existing evidence only | Not re-tested in this full pass; keep inspection note coverage in the regression checklist. |
| Paper/documentation feedback | Not QA-closed | Figures, diagrams, gap analysis, business process, captions, methodology, and indentation still need a separate paper QA pass. |

## Objective Status After This Pass

| Objective | Status | Reason |
|---|---|---|
| Objective 1 | In Progress | Booking, shop, rewards, insurance, multi-service, and garage have strong evidence, but booking-to-cash and mobile session/UX still have open proof gaps. |
| Objective 2 | In Progress | The latest full-system Objective 2 Playwright flow failed before proving the unified lifecycle. Earlier targeted pass is not enough for current closure. |
| Objective 3 | Mostly QA Passed / In Progress | Admin CRUD, pricing, billing, loyalty config, and ecommerce rewards passed; backend regression pack still has related integration failures. |
| Objective 4 | Partial QA Passed | Full rework follow-through passed, but the create/select finalized-origin test failed in the same suite. Customer self-service initiation remains unclaimed. |
| Objective 5 | Out of scope for closure in this pass | QA Audit was exercised indirectly by flows, but Objective 5 was excluded by instruction. |
| Objective 6 | In Progress | Builds passed and many Playwright flows passed, but full regression is not green and UX helper tests are failing. |

## Priority Fix List For Next Chat

1. Fix or align the reservation fee CTA gate in `booking-to-cash.flow.spec.mjs` versus mobile copy `Pay Reservation Fee`.
2. Debug why Objective 2 cannot reopen the tracked booking `#BK-20260605-0002` from mobile history in the full-suite run.
3. Debug Back-Jobs create-case finalized-origin picker loading; follow-through works, but create/select origin failed.
4. Repair backend integration test helpers/wiring for `findBookingReadModelByIds` and `findInquiriesByVehicleId`.
5. Decide whether `workspaceCopyCleanup.test.mjs` represents current desired UX. If yes, fix staff copy/order; if no, update the test to the new UX standard.
6. Capture panel-ready screenshots/video for garage pagination, multiple vehicles, multi-service booking, insurance docs, rewards timing, and readable IDs after the full suite is green.
