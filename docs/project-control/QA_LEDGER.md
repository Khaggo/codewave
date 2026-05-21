# QA Ledger

Last updated: 2026-05-21

Use this file to record every QA run, manual test pass, automated test pass, known failure, and fix verification.

## Latest Automated QA

Date: 2026-05-21

Command:

```powershell
npx playwright test --config=playwright.config.mjs qa/playwright/tests
```

Runtime note:

- Backend and staff web were started as temporary PowerShell jobs for this run.
- A stale staff web process on `3002` was returning a Next.js missing chunk error and was stopped before the fresh run.
- Static/mobile QA runtime was reachable for the suite.

Result:

- Passed: 4
- Failed: 0
- Timed out: 0
- Skipped: 0

Report:

- `qa/playwright/artifacts/qa-summary.md`

Tests passed:

- `booking-to-cash.flow.spec.mjs`
- `role-access-and-ux.spec.mjs`

QA closure verdict:

| Severity | Previous Finding | Fresh Rerun Status | Evidence |
|---|---|---|---|
| HIGH | Booking availability marks same-customer same-slot conflicts as bookable. | QA Closed | Finding no longer appears in `qa-summary.md`. |
| MEDIUM | Photo evidence upload success feedback is not reliably visible. | QA Closed | Finding no longer appears in `qa-summary.md`. |
| HIGH | Reservation fee record loaded without a reference number. | QA Closed | Finding no longer appears in `qa-summary.md`. |
| MEDIUM | Mixed Job Orders queue dates need clearer source-picking UX. | QA Closed | Finding no longer appears in `qa-summary.md`. |

Current issues found:

- None in the fresh Playwright evidence pack.

Flow validated:

1. Customer signs in on mobile.
2. Customer books service using seeded vehicle.
3. Reservation fee gate appears and adviser can confirm payment.
4. Service adviser confirms booking and sends to workshop.
5. Service adviser creates job order from booking handoff and assigns technician.
6. Technician records progress and evidence.
7. Head technician completes QA release without super-admin account.
8. Service adviser finalizes and records payment.
9. Invoice lookup succeeds.
10. Customer booking becomes completed only after service and financial flow is finished.

## Panelist Flow QA - 2026-05-21

Command or method:

- `cd backend && npm run seed:booking-catalog`
- `$env:QA_MOBILE_BASE_URL='http://127.0.0.1:8090'; npx playwright test --config=playwright.config.mjs qa/playwright/tests --workers=1`
- `node --test frontend/src/screens/panelObjectiveProofView.test.mjs`
- `node --test mobile/src/screens/customerBookingGarageProof.test.mjs`
- Live Playwright probes for staff references, QA Audit anchors, invoice references, mobile garage pager, and lifecycle reviewed summary.

Scope:

- Customer mobile multi-service booking.
- Customer garage add-vehicle and pagination.
- Staff business-readable booking, job order, QA, and invoice references.
- Objective 5 proof anchors: Risk Score, Semantic Match, Blocking Findings, Review Needed.
- Customer-visible reviewed lifecycle summary card.

Result:

- Playwright live pack: 4 passed, 1 failed.
- Source/helper proof tests: 5 passed.
- Mobile garage pager live proof: passed with `Showing 1-3 of 4 vehicles`.
- Customer reviewed summary live proof: passed after adviser generated and approved a summary.
- Staff QA Audit anchors live proof: passed.

Report:

- `docs/project-control/PANELIST_FLOW_QA_2026-05-21.md`
- `qa/playwright/artifacts/qa-summary.md`

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| CRITICAL | Job Orders does not consistently render the selected booking handoff using the same business-readable reference as mobile bookings. | Playwright failed waiting for `BK-20260601-QAJO1001`; live Job Orders probe showed handoffs as `BK-20260531-PENDING`. | Pass vehicle/display reference through booking handoff DTOs and render the exact same persisted booking reference across mobile, Bookings, and Job Orders. |
| HIGH | Date/plate booking references are not unique when the same vehicle has multiple bookings on the same day. | Playwright saw multiple `#BK-YYYYMMDD-QAJO1001` elements in mobile history. | Replace derived date/plate references with persisted unique business IDs, e.g. `BK-2026-000123`. |
| MEDIUM | Invoice reference still appears to include a UUID-fragment-like suffix. | Live invoice probe found `INV-JO-20260518-A1504708`. | Replace invoice suffixes with business transaction sequences. |
| MEDIUM | Playwright can accidentally test a stale mobile runtime if `QA_MOBILE_BASE_URL` is not set or if the shared listener is not freshly rebuilt. Earlier runs drifted on static export `8095`, and the May 22 Objective 2 rerun showed that even shared `8090` can lag behind source. | First multi-service run used stale export behavior; a later Objective 2 rerun on shared `8090` still showed obsolete copy and hash-style booking references until a fresh Expo web runtime on `8096` was launched from current source. | Always set `QA_MOBILE_BASE_URL` to a verified-fresh current-source mobile runtime (`8090` or a clean alternate port such as `8096`) before treating Playwright output as panel evidence. |

## Booking Reference Recovery Verification - 2026-05-21

Command or method:

- `cd backend && npm test -- bookings.service.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd frontend && npm run build`

Scope:

- Persist a single business-readable booking reference on the booking record.
- Self-heal older bookings missing that reference during reads.
- Pass the persisted booking reference through Job Orders handoff candidates so mobile and staff surfaces render the same booking label.
- Update Playwright helper expectations to use the backend-provided booking reference when available.

Result:

- Backend bookings service spec: passed (`21` tests).
- Backend typecheck: passed.
- Staff web build: passed.

Evidence:

- `backend/apps/main-service/src/modules/bookings/schemas/bookings.schema.ts`
- `backend/apps/main-service/src/modules/bookings/repositories/bookings.repository.ts`
- `backend/apps/main-service/src/modules/bookings/services/bookings.service.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/job-orders/staff-web-workbench.ts`
- `qa/playwright/helpers/flows.mjs`
- `qa/playwright/tests/booking-to-cash.flow.spec.mjs`

Open follow-up:

- Fresh live Playwright rerun is still required to move the reopened booking-to-cash handoff finding from "code-fixed" to "QA closed".

## Invoice Selector Recovery Verification - 2026-05-21

Command or method:

- `cd backend && npm test -- job-orders.service.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd frontend && npm run build`

Scope:

- Remove the current-month blind spot from `Invoices & Orders` service-record option loading.
- Surface unique, staff-readable selector labels for same-day finalized job orders by preferring source booking references when available.
- Keep the job-order workbench summary shape aligned between backend and frontend.

Result:

- Job-orders service spec: passed (`17` tests).
- Backend typecheck: passed.
- Staff web build: passed.

Evidence:

- `backend/apps/main-service/src/modules/bookings/repositories/bookings.repository.ts`
- `backend/apps/main-service/src/modules/job-orders/services/job-orders.service.ts`
- `backend/apps/main-service/test/job-orders.service.spec.ts`
- `frontend/src/lib/jobOrderWorkbenchClient.js`
- `frontend/src/screens/InvoiceOrderManagementWorkspace.js`

Open follow-up:

- Fresh live Playwright rerun is still required to confirm `Invoices & Orders` now shows the just-finalized service record and that same-day duplicate selector labels no longer confuse the QA flow.

## Panelist Feedback QA Audit

Date: 2026-05-21

Command or method:

- `cd backend && npm test -- bookings.service.spec.ts vehicles.service.spec.ts job-orders.service.spec.ts quality-gates.service.spec.ts insurance.service.spec.ts loyalty.service.spec.ts back-jobs.service.spec.ts vehicle-lifecycle.service.spec.ts`
- `cd backend && npm test -- inspections.service.spec.ts`
- `cd frontend && npm run build`
- `node --test mobile/src/lib/mobileSessionAccess.test.mjs mobile/src/screens/technicianMobileAccess.test.mjs mobile/src/screens/insuranceScreenStructure.test.mjs mobile/src/screens/insuranceModuleView.test.mjs`
- `node --test frontend/src/screens/invoiceOrderManagementView.test.mjs frontend/src/screens/inventoryWorkspaceView.test.mjs frontend/src/screens/loyaltyManagerView.test.mjs frontend/src/screens/qaAuditView.test.mjs frontend/src/app/vehicles/vehicleRecordsView.test.mjs frontend/src/app/backjobs/backJobsView.test.mjs frontend/src/app/insurance/insuranceView.test.mjs frontend/src/components/bookingServiceAdminView.test.mjs`
- `cd mobile && npx expo export --platform android --output-dir .runtime/export-panelist-qa`
- `npx playwright test --config=playwright.config.mjs qa/playwright/tests`

Scope:

- Panelist system feedback from Ms. Abad, Ms. Tinaan, and Mr. Tampol.
- Objective coverage for booking, lifecycle, admin data, back-jobs, QA audit, ISO/IEC 25010 evidence, insurance, rewards, billing, technician role behavior, and UI risks.

Result:

- Backend panel-critical service specs: 9 suites passed, 109 tests passed.
- Staff web build: passed.
- Mobile helper/view tests: 59 passed.
- Staff web helper/view tests: 64 passed.
- Mobile Android export: passed.
- Full Playwright booking-to-cash and role-access suite: 4 passed, 0 failed, no findings.
- Shared frontend package `npm test` was not completed because the Windows sandbox setup failed before test startup.

Report:

- `docs/project-control/PANELIST_SYSTEM_QA_AUDIT_2026-05-21.md`

Critical open risks:

- Business-readable vehicle, booking, job-order, invoice, and transaction IDs are not fully implemented.
- Customer mobile booking still submits one selected service even though the backend accepts `serviceIds`.
- Garage multiple-car support needs add-second-vehicle E2E/manual proof and pagination.
- Insurance claim workflow needs road-accident process requirements and supporting documents.
- Technician UI should be checklist-first/checklist-only, not a broad workbench.
- Objective 5 still needs discrepancy detection plus customer-facing generated summary proof.

## QA Run - 2026-05-21 (Targeted Proof Coverage)

Command or method:

- `node --test mobile/src/screens/customerBookingGarageProof.test.mjs mobile/src/screens/insuranceScreenStructure.test.mjs frontend/src/screens/panelObjectiveProofView.test.mjs frontend/src/screens/qaAuditView.test.mjs`
- `cd backend && npm test -- quality-gates.service.spec.ts vehicle-lifecycle.service.spec.ts`
- `cd frontend && npm run build`
- `cd mobile && npx expo export --platform web --output-dir .runtime/export-proof-evidence-pass`

Scope:

- Readable business-reference rollout proof on critical customer/staff screens.
- Mobile multi-service booking contract/UI proof.
- Garage add-second-vehicle and pagination proof.
- Objective 5 discrepancy/customer-summary proof chain.

Result:

- Mobile/source proof tests: 17 passed, 0 failed.
- Backend Objective 5 specs: 2 suites passed, 25 tests passed.
- Staff web production build: passed.
- Mobile web export: passed.

Evidence added:

- `mobile/src/screens/customerBookingGarageProof.test.mjs`
- `frontend/src/screens/panelObjectiveProofView.test.mjs`
- `docs/project-control/OBJECTIVE5_DEMO_PROOF.md`

Important note:

- This pass closes the implementation-proof gap for the four targeted areas.
- A fresh live Playwright/mobile walkthrough for multi-service booking and a visual garage pagination capture were attempted next, but the local backend (`3000`) and mobile web runtime (`8090`) were not left in a healthy running state from this session, so no new live E2E result was recorded here.

## Previous Automated QA

Date: 2026-05-20

Command:

```powershell
npx playwright test --config=playwright.config.mjs qa/playwright/tests
```

Result:

- Passed: 4
- Failed: 0
- Timed out: 0
- Skipped: 0

Report:

- `qa/playwright/artifacts/qa-summary.md`

Tests passed:

- `booking-to-cash.flow.spec.mjs`
- `role-access-and-ux.spec.mjs`

Flow validated:

1. Customer signs in on mobile.
2. Customer books service using seeded vehicle.
3. Reservation fee flow completes.
4. Service adviser confirms booking and sends to workshop.
5. Service adviser creates job order from booking handoff and assigns technician.
6. Technician records progress and evidence.
7. Head technician completes QA release without super-admin account.
8. Service adviser finalizes and records payment.
9. Invoice lookup succeeds.
10. Customer booking becomes completed only after service and financial flow is finished.

Findings still open:

| Severity | Finding | Status | Needed Fix |
|---|---|---|---|
| HIGH | Booking availability marks a date/slot bookable even when same customer already has active same-slot booking. | Open | Align availability and create conflict rules. |
| HIGH | Reservation fee record loaded without a reference number. | Open | Generate/display durable reservation payment references. |
| MEDIUM | Photo evidence upload succeeds but success feedback is not reliably visible. | Open | Keep upload success message visible after refresh/stage changes. |
| MEDIUM | Mixed Job Orders queue needs clear source-picking UX. | Partially Fixed | Continue usability polish and retest. |

## QA Run - 2026-05-21

Command or method:

- AI-assisted Playwright run against the local repo runtime
- Summary source: `qa/playwright/artifacts/qa-summary.md`

Scope:

- Booking-to-cash flow
- Role access checks
- Web login validation

Result:

- Passed: 3
- Failed: 1
- Skipped: 0

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| CRITICAL | Full booking-to-cash flow could not run because the mobile web runtime was not reachable at `http://127.0.0.1:8090`. | `qa/playwright/artifacts/qa-summary.md` shows `ECONNREFUSED 127.0.0.1:8090`. | Start the mobile web runtime with `npm run dev:mobile:web` before rerunning Playwright, then re-evaluate the booking-to-cash assertions. |

Fixes verified:

- Head technician can open `Job Orders` and `QA Audit` without a super-admin session.
- Technician is blocked from role-gated booking and invoice workspaces with meaningful copy.
- Web login rejects empty credentials before attempting staff authentication.

## QA Run - 2026-05-21 (Updated Summary)

Command or method:

- AI-assisted Playwright rerun against the local repo runtime
- Summary source: `qa/playwright/artifacts/qa-summary.md`

Scope:

- Booking-to-cash flow
- Role access checks
- Web login validation

Result:

- Passed: 4
- Failed: 0
- Skipped: 0

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | Booking availability marks a date/slot as bookable even when the same customer already has an active same-slot booking that the create endpoint rejects as a conflict. | `qa/playwright/artifacts/qa-summary.md` finding under `booking-to-cash.flow.spec.mjs` | Align availability and booking-create conflict logic. |
| HIGH | Reservation fee record loaded without a reference number. | `qa/playwright/artifacts/qa-summary.md` finding under `booking-to-cash.flow.spec.mjs` | Generate and display a durable reservation fee reference number. |
| MEDIUM | Photo evidence upload succeeds, but success feedback is not reliably visible because the workbench refreshes or changes stage immediately after upload. | `qa/playwright/artifacts/qa-summary.md` finding under `booking-to-cash.flow.spec.mjs` | Keep the upload success state visible after refresh/stage updates. |
| MEDIUM | Mixed Job Orders queue dates where an existing job order and a new booking handoff share the same work date still need clearer source-picking UX. | `qa/playwright/artifacts/qa-summary.md` finding under `booking-to-cash.flow.spec.mjs` | Improve the source-picker and queue-state guidance. |

Fixes verified:

- Head technician can open `Job Orders` and `QA Audit` without a super-admin session.
- Technician is blocked from role-gated booking and invoice workspaces with meaningful copy.
- Web login rejects empty credentials before attempting staff authentication.
- Customer booking reaches completed history only after workshop, QA, and payment flow.

## QA Run - 2026-05-21 (Targeted Recovery Verification)

Command or method:

- `cd backend && npm test -- bookings.service.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd frontend && npm run build`

Scope:

- Customer booking availability conflict alignment
- Reservation fee reference persistence
- Job-order photo evidence success visibility
- Mixed Job Orders source-picking UX code path

Result:

- Passed: targeted backend test suite and backend/frontend compile checks
- Failed: 0
- Skipped: no end-to-end rerun in this pass

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| MEDIUM | The four QA findings were patched in code and passed targeted verification, but they still need a fresh Playwright rerun to formally close in the evidence pack. | Backend `bookings.service.spec.ts` passed; backend typecheck passed; frontend build passed. | Re-run the Playwright suite against the local runtime and confirm the findings no longer reproduce. |

Fixes verified:

- Availability now treats a customer-owned active same-slot booking as unavailable in the booking window before create is attempted.
- Initial reservation payment persistence now keeps the PayMongo reference number when the gateway provides one.
- Photo evidence uploads now keep the workbench on the `Evidence` stage so the success message remains visible after refresh.
- Mixed Job Orders queue dates now show explicit existing-JO and booking-handoff source guidance.

## Fixes Verified By QA

| Area | Fix | Verification |
|---|---|---|
| Head Technician QA | Head technician can access QA Audit and record release verdict. | Playwright booking-to-cash flow passed. |
| Job Orders Handoff | Adviser can create job order from exact booking handoff even with multiple sources. | Playwright booking-to-cash flow passed. |
| QA Audit Queue | Ready-for-QA jobs are visible to head technician regardless of current month. | Playwright booking-to-cash flow passed. |
| Role Access | Technician blocked from booking/invoice workspaces with meaningful copy. | Playwright role-access test passed. |
| Login Validation | Empty staff login validates before auth request. | Playwright UX test passed. |

## QA Run - 2026-05-21 (Insurance And Loyalty Flow)

Command or method:

- `cd backend && npm test -- insurance.service.spec.ts insurance.integration.spec.ts loyalty.service.spec.ts loyalty.integration.spec.ts loyalty-runtime.service.spec.ts`
- `node --test mobile/src/screens/insuranceModuleView.test.mjs mobile/src/screens/insuranceScreenStructure.test.mjs frontend/src/app/insurance/insuranceView.test.mjs frontend/src/screens/loyaltyManagerView.test.mjs`
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`

Scope:

- Insurance claim request with OR/CR, policy document, and police report attached to one request.
- Staff insurance review visibility and open/download behavior for uploaded files.
- Loyalty service-payment accrual timing across booking, reservation fee, job order, QA, invoice finalization, and manual invoice payment.

Result:

- Passed: targeted backend insurance/loyalty tests, targeted mobile/staff view tests, and the live Playwright loyalty service-payment flow.
- Failed: live staff insurance file open/download action.
- Skipped: ecommerce paid-order loyalty proof remains separate from this run.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | Staff insurance view shows the three uploaded claim files but exposes 0 `Open file` links, so staff cannot open/download OR/CR, policy, or police report documents from the review screen. | `qa/playwright/artifacts/qa-summary.md`; `test-results/insurance-loyalty.flow-ins-b6c9e-d-staff-can-open-every-file/error-context.md`; screenshot shows `Stored in insurance uploads`. | Add authenticated open/download routes for `upload://insurance/...` documents and render one action per file in staff insurance. |
| MEDIUM | Booking can move to completed after invoice finalization before manual payment, while loyalty remains correctly blocked until payment. | `qa/playwright/artifacts/qa-summary.md` finding under `insurance-loyalty.flow.spec.mjs`. | Align completed-history timing with paid invoice completion or make unpaid/finalized distinction clearer to customers. |

Fixes verified:

- Insurance uploads keep OR/CR, policy, and police report attached to the same request in customer and staff API responses.
- Loyalty points do not accrue from reservation-fee payment or unpaid invoice finalization.
- Loyalty points accrue after a qualifying paid service invoice event.

## QA Run - 2026-05-21 (Insurance Document Link Recovery Verification)

Command or method:

- `cd backend && npm test -- insurance.service.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd frontend && npm run build`

Scope:

- Staff insurance document open/download recovery for uploaded `upload://insurance/...` files
- Backend document streaming route and frontend authenticated blob-link rendering

Result:

- Passed (local verification)

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| INFO | The original live QA defect was that staff saw uploaded files but 0 `Open file` links. This local verification was later superseded by the final live rerun, which passed with working backend streams and blob-backed staff links. | Backend insurance tests passed; backend typecheck passed; staff web build passed on 2026-05-21 after the patch. | Closed by the final live rerun below. |

Fixes verified:

- Added backend route support to stream one uploaded insurance document through authenticated access.
- Staff insurance document cards now receive resolved blob URLs and can render `Open file` actions for locally uploaded claim documents.

## QA Run - 2026-05-21 (Insurance Document Live Rerun)

Command or method:

- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`
- Direct authenticated check: `GET http://127.0.0.1:3000/api/insurance/documents/62e2c3b8-b5b7-49de-b327-454c22ff4785/file`

Scope:

- Confirm each uploaded insurance document now shows a real `Open file` action.
- Confirm the generated file URL is actually openable/downloadable.

Historical result, superseded by the final live rerun below:

- Passed: loyalty service-payment timing still passed.
- Partially fixed: staff insurance rendered 3 `Open file` links for the 3 uploaded documents.
- Failed at that time: the first generated document URL returned `404`.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | Staff insurance rendered `Open file` links, but the generated backend file endpoint returned `404` in this superseded run. | Historical error context and direct authenticated request returned `STATUS=404`. | Superseded by the final live rerun below, which passed. |

Fixes verified:

- The previous UI-only failure mode is improved: each uploaded insurance file now has an `Open file` action visible in staff web.

## QA Run - 2026-05-21 (Insurance Storage Root Follow-up Verification)

Command or method:

- `cd backend && npm test -- insurance.service.spec.ts insurance-document-storage.service.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd frontend && npm run build`

Scope:

- Fix backend `404` on uploaded insurance document open/download links after local backend restarts
- Make insurance upload storage independent of the backend launch directory

Historical result, superseded by the final live rerun below:

- Passed (local verification)

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| INFO | Root cause confirmed: uploaded insurance files were being written relative to one working directory and later read from another, depending on whether the backend was started from `backend\\` or the repo root. The follow-up patch now uses a deterministic backend runtime root plus a legacy repo-root fallback. | `insurance-document-storage.service.spec.ts` passes; direct filesystem probe showed the live QA file existed under `backend\\.runtime\\uploads\\insurance-documents\\...` while repo-root `.runtime` was empty. | Rerun `insurance-loyalty.flow.spec.mjs` live to confirm the same three uploaded files now stream with 2xx responses. |

Fixes verified:

- Insurance document reads no longer depend on `process.cwd()` alone.
- Legacy repo-root and backend-root upload locations are both supported for local recovery.

## QA Run - 2026-05-21 (Insurance Document Live Rerun After Backend Restart)

Command or method:

- Restarted the `3000` backend listener from `D:\mainprojects\codewave\backend`.
- Started temporary staff web on `3002`.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`
- Direct authenticated checks against the fresh run:
  - `GET /api/insurance/inquiries/ea72cc57-a52e-4ac0-a9fa-1ec48af5d206` returned the inquiry with 3 documents.
  - `GET /api/insurance/documents/8c217740-04c7-4e9e-be19-8bc91442ba9e/file` returned `404`.

Scope:

- Fresh insurance request/upload set after the backend storage-root patch.
- Verify each staff `Open file` link returns 2xx and opens/downloads the uploaded file.

Result:

- Passed: loyalty service-payment timing still passed.
- Partially fixed: staff insurance still renders 3 `Open file` links for the 3 uploaded documents.
- Failed at that time: the file endpoint still returned `404` after backend restart.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | Staff could see the inquiry and 3 document records, and the files existed under `backend\.runtime\uploads\insurance-documents\...`, but `GET /api/insurance/documents/:documentId/file` returned `404` in this superseded run. | Historical error context and direct authenticated checks listed above. | Superseded by the final live rerun below, which passed. |

Fixes verified:

- Fresh upload writes physical PDF files under the backend runtime upload directory.
- Staff web renders one `Open file` action per uploaded document.

## QA Run - 2026-05-21 (Insurance/Loyalty Final Live Rerun)

Command or method:

- Backend `3000` was already restarted by the implementation chat and responded `200` on `/api/health`.
- Started temporary staff web on `3002`.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`

Scope:

- Fresh insurance request/upload set.
- Verify OR/CR, policy, and police report stay on one request.
- Verify backend file streaming returns 2xx for each uploaded document.
- Verify staff `Open file` actions are visible and the blob-backed links are readable.
- Reconfirm loyalty service-payment accrual timing.

Result:

- Passed: 2
- Failed: 0
- Skipped: 0

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| MEDIUM | Booking moved to completed after invoice finalization before manual payment; loyalty remained correct, but completed-history timing may still confuse financial completion proof. | `qa/playwright/artifacts/qa-summary.md` finding under the loyalty test. | Decide whether completed history should wait for paid invoice state or whether the UI should clearly distinguish invoice-ready from paid/completed. |

Fixes verified:

- Insurance uploads keep OR/CR, policy, and police report attached to the same request.
- Staff insurance renders one `Open file` action per uploaded document.
- Backend insurance document file routes stream non-empty files successfully.
- Blob-backed staff `Open file` links are fetchable and non-empty.
- Loyalty points still accrue only after the qualifying paid service invoice event.

## QA Run - 2026-05-21 (Next Best Moves Targeted Verification)

Command or method:

- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd backend && npm test -- vehicle-lifecycle.service.spec.ts`
- `cd frontend && npm run build`
- `cd mobile && npx expo export --platform web --output-dir .runtime/export-next-best-moves`

Scope:

- Objective 5 customer-visible lifecycle summary route and mobile rendering
- Mobile multi-service booking submission flow
- Mobile lifecycle/garage add-second-vehicle composer and pagination surface
- Readable booking/job-order reference patches on key customer/staff screens

Result:

- Passed

Evidence:

- Backend typecheck passed
- `vehicle-lifecycle.service.spec.ts`: 10 tests passed
- Staff web build passed
- Mobile Expo web export passed

Notes:

- This run verifies implementation/build health only. No fresh Playwright or device/manual QA evidence has been recorded yet for the new multi-service booking, multi-car garage, pagination, or customer-visible AI summary surfaces.

## QA Run - 2026-05-21 (Shop/Ecommerce + Rewards Live Rerun)

Command or method:

- Started a temporary staff web runtime on `http://127.0.0.1:3002`.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001 npx playwright test --config=playwright.config.mjs qa/playwright/tests/shop-ecommerce-rewards.flow.spec.mjs --workers=1`

Scope:

- Create a live QA ecommerce category and product through the ecommerce runtime.
- Verify staff `/shop` handoff and `/admin/catalog` can surface the created product with business-readable SKU and published state.
- Customer mobile signs in, opens Shop, browses the QA product, adds it to cart, and completes invoice checkout.
- Verify no loyalty points are awarded on catalog setup, cart add, order creation, unpaid invoice, or partial ecommerce invoice payment.
- Verify loyalty points are awarded only after the ecommerce invoice is fully paid and an active ecommerce earning rule matches.
- Verify mobile Rewards shows ecommerce loyalty activity and reward unlock progress after the qualifying paid event.
- Verify Reward Config and Earning Rules remain separate in loyalty admin, and deactivating a reward/rule changes redemption/accrual behavior separately.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | `Invoices & Orders` can load ecommerce invoice detail and payment rows, but it does not expose a staff manual payment recording action. The local fallback settlement still requires direct API use. | `qa/playwright/artifacts/qa-summary.md`; live run showed paid ecommerce invoice and two payment entries after API-recorded partial/final payments. | QA-closed by the final live rerun below. |
| MEDIUM | Mobile product detail exposes the raw product UUID under `Product ID`. Customer-facing shop screens should prefer SKU or a business-readable product reference. | `qa/playwright/artifacts/qa-summary.md`; Playwright finding recorded during product detail inspection. | QA-closed by the final live rerun below. |

Fixes verified:

- Customer mobile Shop checkout works against live `8090`.
- Ecommerce order references use `ORD-...` and invoice references use `INV-...`.
- Loyalty points do not accrue until the ecommerce invoice is fully paid.
- Active ecommerce earning rules award points after the qualifying paid ecommerce invoice event.
- Deactivated ecommerce earning rules do not award points for future paid ecommerce invoices.
- Deactivated rewards disappear from customer redemption availability.
- Staff loyalty admin visibly separates `Reward Config` from `Earning Rules`.

## Ecommerce Rewards UX Follow-Up Verification - 2026-05-21

Command or method:

- `cd frontend && npm run build`

Scope:

- Add a staff-visible manual ecommerce payment entry action in `Invoices & Orders`.
- Replace the customer-facing raw UUID in mobile product detail with a business-readable product code.

Result:

- Staff web build: passed.
- Superseded by the final live ecommerce QA rerun below.

Fixes verified:

- `Invoices & Orders` now exposes a manual ecommerce payment form that records invoice payment entries through the existing ecommerce invoice-payment endpoint.
- Mobile product detail now shows a business-readable product code instead of the raw catalog UUID.

## Ecommerce Rewards Final Live Rerun - 2026-05-21

Command or method:

- Started a temporary staff web runtime on `http://127.0.0.1:3002`.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001 npx playwright test --config=playwright.config.mjs qa/playwright/tests/shop-ecommerce-rewards.flow.spec.mjs --workers=1`

Scope:

- Re-run the full customer mobile Shop checkout and ecommerce rewards flow.
- Confirm mobile product detail renders `Product Code` / SKU and does not expose the raw product UUID.
- Confirm staff can record partial and final ecommerce invoice payments from `Invoices & Orders`, not only through direct API calls.
- Reconfirm loyalty points stay blocked for unpaid and partially paid ecommerce invoices, then accrue after full paid ecommerce invoice settlement.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0
- Structured findings: 0

Fixes QA-closed:

- Staff `Invoices & Orders` manual ecommerce payment action is live-verified. The Playwright flow recorded partial and final payment entries from the staff UI and verified invoice/payment/loyalty state afterward.
- Mobile Shop product detail no longer exposes the raw product UUID in the live QA flow. The test verified the customer-facing `Product Code` / SKU and hard-failed if the raw UUID appeared.

## Back-Jobs/Rework Staff Lineage QA - 2026-05-21

Command or method:

- Started a temporary staff web runtime on `http://127.0.0.1:3002`.
- `QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/back-jobs-rework.flow.spec.mjs --workers=1`

Scope:

- Service adviser signs in to staff web and opens `Back-Jobs`.
- Uses an existing finalized/completed job order for the seeded customer vehicle as the original service lineage.
- Creates a back-job case from the staff UI with customer, vehicle, original job order, original booking source, complaint, review notes, and finding.
- Verifies the created back-job persists through the live backend and remains tied to the original customer, vehicle, finalized job order, and booking source.
- Verifies the backend rejects a non-finalized job order as invalid back-job origin work.
- Verifies the rework path is visibly gated until the back-job is approved for rework and no linked rework job order exists.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| MEDIUM | Back-Jobs proves functional lineage, but the staff detail/table still exposes raw UUIDs for the case, customer, vehicle, and original work instead of business-readable references. | `qa/playwright/artifacts/qa-summary.md`; first live Back-Jobs Playwright run. | QA-closed by the Back-Jobs readable reference follow-up live rerun below. |

Fixes verified:

- The prior `400` create-back-job failure did not reproduce in the live staff UI run.
- Staff can create a back-job request linked to finalized prior service lineage.
- Back-job history/detail retains the customer, vehicle, original job order, booking source, complaint, and review context.
- Non-finalized origin work is rejected, protecting the flow from becoming an unrelated fresh booking path.

## Back-Jobs Readable Reference Follow-Up - 2026-05-21

Command or method:

- `cd frontend && npm run build`
- Started a temporary staff web runtime on `http://127.0.0.1:3002`.
- `QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/back-jobs-rework.flow.spec.mjs --workers=1`

Scope:

- Replace raw UUID-heavy Back-Jobs detail/table labels with business-readable case, customer, vehicle, original booking, and original job-order references using the already-loaded staff context.
- Re-run the live staff-linked Back-Jobs flow with hard assertions that the visible detail/table do not expose raw UUIDs for the case, customer, vehicle, original job order, or original booking lineage.

Result:

- Staff web build: passed.
- Live Playwright rerun: passed 1, failed 0, skipped 0.
- Structured findings: 0.

Fixes verified:

- Back-Jobs table now renders a readable case label plus vehicle summary instead of the raw case UUID.
- Back-Jobs detail now renders customer/vehicle, original work, and rework linkage with readable labels instead of raw lineage UUIDs.
- The previous Back-Jobs raw UUID display finding no longer reproduces in the live QA flow.

## Back-Jobs Full Rework Follow-Through QA - 2026-05-21

Command or method:

- Started a temporary staff web runtime on `http://127.0.0.1:3002`.
- `QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/back-jobs-rework.flow.spec.mjs --workers=1`

Scope:

- Re-ran the proven staff-linked Back-Jobs creation/readable-reference test.
- Created a completed return inspection with findings as approval evidence for a new back-job.
- Loaded the back-job in the staff Back-Jobs UI and verified rework job-order creation is blocked before approval.
- Attempted to move the case from `reported` to `inspected` as the first approval step.

Result:

- Passed: 1
- Failed: 1
- Skipped: 0

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| CRITICAL | Back-Jobs full rework follow-through is blocked at the first status transition. A freshly loaded approval-ready case returns `409 Another staff member already updated this back-job case. Reload and try again.` when the adviser tries to move it to `inspected`. | `qa/playwright/artifacts/qa-summary.md`; direct API reproduction using the freshly loaded `updatedAt` also returned 409. Retrying the same transition without `expectedUpdatedAt` succeeded, pointing to the optimistic-concurrency timestamp comparison rather than missing inspection evidence. | QA-closed by the full follow-through live rerun below. |

Fixes verified:

- The previously closed staff-linked creation/readable-reference test still passes.
- Pre-approval rework job-order creation remains blocked as expected.
- Completed return inspection evidence can be created and attached to an approval-ready back-job.

Not yet proven:

- Approval to `approved_for_rework`.
- Rework job-order creation after approval.
- Technician rework progress/evidence/completion.
- Head technician QA release on the rework job order.
- Back-job resolved/final outcome after rework finalization.

## Back-Jobs Concurrency Recovery Verification - 2026-05-21

Command or method:

- `cd backend && npm test -- back-jobs.service.spec.ts back-jobs.integration.spec.ts back-jobs.repository.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`

Scope:

- Fix the false optimistic-concurrency `409 Another staff member already updated this back-job case` during the first approval transition.
- Align Back-Jobs `updatedAt` matching with the millisecond-safe Job Orders approach.
- Keep the test helper runtime aligned with the newer bookings service methods used by the back-jobs integration suite.

Result:

- Passed: focused backend Back-Jobs service, integration, and repository regression tests
- Failed: 0
- Skipped: no fresh live Playwright rerun in this pass

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| INFO | The initial targeted run exposed stale in-memory booking test helper gaps (`findActiveBookingsForUserInRange`, then `assignBookingReference`) before the actual Back-Jobs assertions could complete. Those helper gaps were patched so the focused verification could run cleanly. | Local Jest rerun after helper alignment passed `3` suites / `10` tests. | Keep the main-service in-memory harness aligned with booking-reference and slot-conflict changes when running older module integration specs. |

Fixes verified:

- `BackJobsRepository.updateStatus` no longer performs strict `updated_at = expectedUpdatedAt` equality and now uses a millisecond-safe timestamp range match.
- Focused backend verification passed:
  - `back-jobs.service.spec.ts`
  - `back-jobs.integration.spec.ts`
  - `back-jobs.repository.spec.ts`
- Backend typecheck passed.

## Back-Jobs Full Rework Follow-Through Live Rerun - 2026-05-21

Command or method:

- Started temporary backend and staff web runtimes for the rerun.
- `QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/back-jobs-rework.flow.spec.mjs --workers=1`

Scope:

- Re-run staff-linked Back-Jobs creation from finalized prior service lineage.
- Verify non-finalized original job orders remain rejected as invalid origins.
- Verify Back-Jobs detail/table do not expose raw UUID lineage for case, customer, vehicle, original booking, or original job order.
- Create completed return inspection evidence for an approval-ready back-job.
- Move the case from `reported` to `inspected`, then to `approved_for_rework`.
- Confirm rework creation is blocked before approval and available after approval.
- Create the linked rework job order, assign the technician, progress the work, upload evidence, send to QA, record head-technician QA release, finalize the rework, and verify the back-job reaches `resolved`.

Result:

- Passed: 2
- Failed: 0
- Skipped: 0

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| MEDIUM | Back-Jobs readable lineage was fixed, but the detail panel still showed the linked return inspection as a raw UUID after approval. | `qa/playwright/artifacts/qa-summary.md`; live follow-through rerun. | QA-closed by the return-inspection and selector-label live rerun below. |
| HIGH | Same-day rework job orders produced duplicate visible labels in the assigned job-order, QA Audit job-order, and job-order lookup selectors. | `qa/playwright/artifacts/qa-summary.md`; Playwright findings from technician, QA, and adviser lookup steps. | QA-closed by the return-inspection and selector-label live rerun below. |

Fixes verified:

- The false `409 Another staff member already updated this back-job case` no longer reproduces in the live flow.
- Staff can approve a back-job using completed return inspection evidence.
- Rework job-order creation remains blocked before approval and is available after approval.
- The linked rework job order is created and assigned to the technician.
- Technician progress/evidence and ready-for-QA handoff pass for the rework job order.
- Head technician can QA-release the rework job order.
- Adviser finalization completes the linked rework job order and the back-job reaches resolved outcome.

Remaining Objective 4 limits:

- Customer self-service initiation remains unproven and should not be claimed unless separately tested.

## Back-Jobs Return Inspection and Selector Label Recovery - 2026-05-21

Command or method:

- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd backend && npm test -- job-orders.service.spec.ts`
- `cd frontend && npm run build`
- `cd mobile && npx expo export --platform web --output-dir .runtime/export-backjobs-selector-fix`

Scope:

- Replace the linked return-inspection raw UUID in Back-Jobs detail/review surfaces with a readable inspection label.
- Remove duplicate-looking same-day rework job-order labels across adviser, QA Audit, and technician selector surfaces by carrying unique readable workbench references through the summary payload and selector formatters.
- Keep customer self-service initiation explicitly unclaimed until separately proven.

Result:

- Backend typecheck: passed.
- Job-orders service spec: passed (`17` tests).
- Staff web production build: passed.
- Mobile web export: passed.

Evidence:

- `frontend/src/app/backjobs/BackJobsContent.js`
- `backend/apps/main-service/src/modules/job-orders/services/job-orders.service.ts`
- `backend/apps/main-service/src/modules/job-orders/dto/job-order-workbench-summary-response.dto.ts`
- `frontend/src/lib/jobOrderWorkbenchClient.js`
- `frontend/src/screens/JobOrderWorkbench.js`
- `frontend/src/screens/QAAuditWorkspace.js`
- `frontend/src/screens/InvoiceOrderManagementWorkspace.js`
- `mobile/src/screens/TechnicianDashboard.js`

Live QA follow-up:

- Fresh live Playwright rerun is now complete in the closure entry below.
- Customer self-service Back-Job initiation remains outside this pass and should not be claimed unless a separate QA run proves it.

## Back-Jobs Return Inspection and Selector Label Live QA Closure - 2026-05-21

Command or method:

- Started temporary backend and staff web runtimes on `3000` and `3002`.
- Updated the Playwright QA spec to verify the new readable return-inspection label (`INSP-...`) instead of selecting the old raw UUID text.
- `QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/back-jobs-rework.flow.spec.mjs --workers=1`

Scope:

- Re-ran staff-linked Back-Jobs creation from finalized prior service lineage.
- Re-ran full approval-to-rework follow-through: completed return inspection evidence, approval transitions, linked rework job order, technician progress/evidence, head-technician QA release, adviser finalization, and resolved back-job outcome.
- Confirmed the linked return inspection no longer appears as the raw UUID in the Back-Jobs detail panel after approval.
- Confirmed the same-day rework job-order duplicate selector findings no longer reproduce in the technician assigned-job, QA Audit job-order, and adviser lookup selector steps.

Result:

- Passed: 2
- Failed: 0
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| None | No Back-Jobs return-inspection or selector-label findings reproduced in the live rerun. | Playwright console output and `qa/playwright/artifacts/qa-summary.md` show `2` passed, `0` failed, and `Failed / Needs Fixing: None`. | Mark these two Back-Jobs polish findings QA-closed. |

Remaining Objective 4 limit:

- Customer self-service Back-Job initiation remains unproven and should not be claimed unless a separate QA run proves it.

## Admin CRUD / Pricing / Billing Live QA - 2026-05-21

Command or method:

- Started temporary backend and staff web runtimes on `3000` and `3002`; reused healthy ecommerce service on `3001`.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001 npx playwright test --config=playwright.config.mjs qa/playwright/tests/admin-crud-pricing-billing.flow.spec.mjs --workers=1`

Scope:

- Staff admin signs in to staff web and exercises Catalog Admin, Inventory, Service Management, Loyalty admin, and Invoices & Orders.
- Creates a catalog category/product, edits the product, and archives it from the staff UI.
- Creates an inventory-backed product and records stock policy plus quantity adjustment.
- Creates active and inactive booking-service records from Service Management.
- Verifies Loyalty admin separates `Reward Config` from `Earning Rules`.
- Checks service invoice lookup/detail clarity and ecommerce manual payment behavior from `Invoices & Orders`.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Passed with findings. The flow completed, but admin CRUD/pricing/billing is not panel-ready until the findings below are fixed and rerun.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | Catalog product archive leaves the hidden record inside the `Published products` table and still shows an `Archive` action, so staff cannot clearly tell whether the product is published, hidden, archived, recoverable, or already archived. | `qa/playwright/artifacts/qa-summary.md`; live Playwright run observed archived product row with `Hidden` visibility still in the published table. | Add explicit archived/inactive state handling, filtered views, recovery action if intended, and clearer action labels. |
| HIGH | Catalog Admin can create categories, but the staff UI does not expose category edit/archive/deactivate controls. | `qa/playwright/artifacts/qa-summary.md`; live UI sweep. | Complete category CRUD or update the claim/UI copy if categories are intentionally create-only. |
| HIGH | Inventory stock policy did not persist the edited low-stock threshold. QA entered threshold `6`, but the saved response still returned `3`. | `qa/playwright/artifacts/qa-summary.md`; live API response captured through staff UI action. | Fix threshold persistence and rerun inventory stock policy/low-stock badge QA. |
| MEDIUM | Service Management still exposes raw service UUIDs in the `Live Booking Services` table instead of business-readable service codes. | `qa/playwright/artifacts/qa-summary.md`; live service-row text inspection. | Add readable service references/codes and hide raw UUIDs from staff-facing tables. |
| HIGH | Service Management creates service entries but does not expose edit/deactivate/archive controls for existing services. | `qa/playwright/artifacts/qa-summary.md`; live UI sweep. | Add service edit/deactivate/archive controls and verify inactive services behave consistently in booking surfaces. |
| MEDIUM | Loyalty earning-rule configuration still uses raw `Product ID` and `Product Category ID` text fields instead of searchable product/category pickers. | `qa/playwright/artifacts/qa-summary.md`; live loyalty admin sweep. | Replace raw ID fields with searchable selectors or clear business-readable references. |
| HIGH | Service invoice detail in `Invoices & Orders` did not render a visible `Total` line during the finalized-service lookup check, even though an `INV-...` ready state loaded. | `qa/playwright/artifacts/qa-summary.md`; `verifyInvoiceLookup` finding from live run. | Improve service invoice detail rendering for totals, reservation-fee deduction, status, and payment breakdown, then rerun billing QA. |

Fixes verified / behavior confirmed:

- Staff can create catalog products/categories through the staff UI.
- Staff can edit catalog product name/price and archive/hide the product.
- Staff can create an inventory-backed product and adjust quantity from the staff UI.
- Staff can create active and inactive booking-service records.
- Loyalty admin visibly separates reward redemption config from earning-rule accrual config.
- Ecommerce invoice manual payment remains available from `Invoices & Orders` and the live run completed the ecommerce billing portion.

Post-QA remediation landed on 2026-05-21 (code-fixed claims before live rerun):

- Catalog Admin now treats hidden products as recoverable catalog rows instead of showing a misleading repeated `Archive` action, and it exposes category edit/activate/deactivate controls in the staff UI.
- Inventory policy updates now have explicit numeric DTO coercion plus a live ecommerce integration regression that proves `quantityOnHand` and `reorderThreshold` persist together.
- Service Management now exposes edit/activate/deactivate controls and readable service codes instead of raw UUIDs.
- Loyalty earning-rule configuration now uses product/category picker controls rather than raw Product ID/Product Category ID text fields.
- `Invoices & Orders` service invoice detail now shows a prominent `Invoice total` summary plus subtotal and reservation-fee-deduction lines.
- Service Management now persists a base service price/rate field end to end, exposes that field for create/edit from the staff UI, and surfaces the configured service price in customer booking discovery.
- Superseded by the live rerun below: the remediation is not QA-closed because the Service Management pricing create request still leaks UI-only `basePricePhp` to the backend.

## Admin CRUD / Pricing / Billing Service Pricing Remediation Verification - 2026-05-21

Command or method:

- `cd backend && npm test -- bookings.service.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd backend && npm run db:push`
- `cd frontend && npm run build`
- `cd mobile && npx expo export --platform web --output-dir .runtime/export-service-pricing-admin-fix`

Scope:

- Add a persisted base service price/rate field to booking services.
- Expose that field in Service Management create/edit flows.
- Surface the configured service price in customer booking discovery.
- Keep the schema, DTOs, client mappings, admin UI, and mobile booking view aligned.

Result:

- Backend bookings service spec: passed (`23` tests).
- Backend typecheck: passed.
- Local database schema push: passed.
- Staff web build: passed.
- Mobile web export: passed.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| None | No new local verification failures remained after stubbing service-category lookup in the new bookings service pricing test. | `bookings.service.spec.ts`, backend typecheck, `db:push`, frontend build, mobile export all passed. | Rerun the live admin CRUD / pricing / billing Playwright flow to convert this remediation from code-verified to QA-closed evidence. |

Fixes verified:

- Booking services now persist `basePriceCents` in the backend schema and service CRUD path.
- Service Management now lets staff create and edit a base price/rate from the admin UI.
- Customer booking discovery now renders the configured service price alongside the service metadata.
- Seeded booking-service catalog entries now write explicit base prices instead of burying pricing only inside description text.

## Admin CRUD / Pricing / Billing Live Rerun After Service Pricing Fix - 2026-05-21

Command or method:

- Reused healthy ecommerce service on `3001`, staff web on `3002`, and mobile web on `8090`.
- Stopped the stale backend listener on `3000`, started a fresh backend from the current workspace code, then ran:
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001 npx playwright test --config=playwright.config.mjs qa/playwright/tests/admin-crud-pricing-billing.flow.spec.mjs --workers=1`

Scope:

- Fresh live rerun of the admin CRUD / pricing / billing flow after the service pricing/rate remediation.
- Specifically attempted to create a booking service with visible `Base Price (PHP)` set to `850` and verify it persisted as `basePriceCents`.

Result:

- Passed: 0
- Failed: 1
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Not QA-closed.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| CRITICAL | Service Management pricing create flow still fails live. Fresh backend accepts `basePriceCents`, but the staff web request still includes UI-only `basePricePhp`, causing `/api/services` to reject create with `400 property basePricePhp should not exist`. | `qa/playwright/artifacts/qa-summary.md`; Playwright error context; `frontend/src/lib/bookingServiceAdminClient.js` still spreads `...payload` before adding `basePriceCents`. | Remove UI-only `basePricePhp` from create/update API payloads or explicitly map the request body instead of spreading the form payload, then rerun this Playwright spec. |
| HIGH | Catalog product archive clarity finding still reproduced before the failure point. | `qa/playwright/artifacts/qa-summary.md` recorded the archive-state finding during the failed run. | Confirm the intended Catalog Admin remediation is actually loaded in the live staff runtime and rerun. |
| HIGH | Inventory threshold persistence finding still reproduced before the failure point. | `qa/playwright/artifacts/qa-summary.md` recorded threshold `6` saving as `3` during the failed run. | Confirm the intended inventory remediation is actually loaded in the ecommerce/runtime path and rerun. |

Notes:

- The initial rerun against the already-running backend failed with `basePricePhp` and `basePriceCents` both rejected. After restarting backend from the current code, only `basePricePhp` was rejected, confirming the backend was refreshed but the staff request body still carries the UI-only field.
- The QA spec was adjusted only for current UI locator drift: category creation is now verified by the new category becoming selectable for product creation, and service price input is targeted by the visible number field while asserting `basePriceCents` persistence.

## Admin Service Pricing Payload Leak Verification - 2026-05-21

Command or method:

- `git status --short`
- `cd frontend && npm run build`

Scope:

- Remove the UI-only `basePricePhp` field from the staff create-service request body.
- Keep the staff admin create-service contract aligned with backend `CreateServiceDto`, which accepts `basePriceCents` and rejects unknown properties.
- Leave the broader admin CRUD findings honest and open until a fresh live rerun completes; this was superseded by the final live rerun below.

Result:

- Staff web build: passed.
- Payload leak: code-fixed in `frontend/src/lib/bookingServiceAdminClient.js`.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| INFO | No local build failure remained after removing the `...payload` spread from the staff create-service request body. | `frontend/src/lib/bookingServiceAdminClient.js`; `npm run build` passed in `frontend`. | Rerun `qa/playwright/tests/admin-crud-pricing-billing.flow.spec.mjs` live to confirm service creation succeeds and to reassess the remaining catalog/inventory/billing findings. |

Fixes verified:

- `createBookingService` now sends an explicit backend-shaped request body instead of leaking UI-only `basePricePhp`.
- The staff client still maps the visible PHP form value into backend `basePriceCents`.
- Superseded by the final live rerun below: the `basePricePhp` create-service blocker is now QA-closed.

## Admin CRUD / Pricing / Billing Final Live Rerun - 2026-05-21

Command or method:

- Stopped stale listeners and started fresh runtimes for main backend `3000`, ecommerce `3001`, and staff web `3002`; mobile web `8090` remained available.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001 npx playwright test --config=playwright.config.mjs qa/playwright/tests/admin-crud-pricing-billing.flow.spec.mjs --workers=1`

Scope:

- Re-run the full admin CRUD / pricing / billing flow after fixing the service-pricing payload leak.
- Confirm Catalog Admin category/product create/edit/archive behavior and hidden-product recovery action.
- Confirm Inventory create, stock policy, and stock adjustment behavior against fresh ecommerce runtime.
- Confirm Service Management create/edit/deactivate/readable-code/base-price behavior.
- Confirm Loyalty admin Reward Config versus Earning Rules separation and product/category picker controls.
- Confirm `Invoices & Orders` service invoice total/subtotal/reservation-fee-deduction display and ecommerce manual payment behavior.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Passed with one remaining finding; not fully QA-closed because inventory threshold persistence still fails.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | Inventory stock policy did not persist the edited low-stock threshold. QA entered threshold `6`, but the saved response still returned `3`. | `qa/playwright/artifacts/qa-summary.md`; fresh ecommerce `3001` runtime was used, so this is not stale-runtime evidence. | Fix ecommerce inventory stock-policy persistence for `reorderThreshold`, then rerun this spec. |

Fixes QA-closed in this rerun:

- Service Management no longer leaks UI-only `basePricePhp`; service creation with `Base Price (PHP)` succeeds and the response persists `basePriceCents`.
- Service Management readable service codes and edit/activate/deactivate controls no longer reproduce as findings.
- Catalog Admin hidden product state now exposes a recovery/republish state instead of the prior misleading repeated archive finding.
- Catalog category controls no longer reproduce as a missing-CRUD finding.
- Loyalty earning-rule configuration now exposes product/category picker controls instead of raw Product ID/Product Category ID text fields.
- `Invoices & Orders` service invoice detail now exposes invoice reference, invoice total, subtotal, reservation-fee deduction, total, and payment state.

## Inventory Threshold Persistence Recovery Verification - 2026-05-21

Command or method:

- `git status --short`
- `cd backend && npm test -- ecommerce-service.integration.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`

Scope:

- Fix the last open admin CRUD / pricing / billing bug where editing inventory low-stock threshold from the staff UI saved `6` but the live response still returned `3`.
- Normalize inventory stock-policy inputs explicitly in the ecommerce inventory service before writing through the catalog repository.
- Strengthen the ecommerce integration regression to verify both numeric and browser-like string payloads persist `reorderThreshold` correctly.

Result:

- Ecommerce integration spec: passed (`10` tests).
- Backend typecheck: passed.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| INFO | No focused backend verification failure remained after normalizing inventory stock-policy values in the ecommerce inventory service. | `backend/apps/ecommerce-service/src/modules/inventory/services/inventory.service.ts`; `npm test -- ecommerce-service.integration.spec.ts`; backend typecheck. | Rerun `qa/playwright/tests/admin-crud-pricing-billing.flow.spec.mjs` live to confirm the staff inventory threshold update now returns the edited value and closes Objective 3 admin CRUD evidence. |

Fixes verified:

- Inventory stock-policy updates now explicitly normalize `quantityOnHand` and `reorderThreshold` before persistence.
- Ecommerce integration coverage now proves the policy route persists updated threshold values from both numeric and string-like payloads.
- The inventory threshold persistence bug is now code-fixed and backend-verified, but not yet QA-closed.

## Objective 2 Lifecycle / Readable-ID Live QA - 2026-05-21

Command or method:

- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/objective2-lifecycle-readable-ids.flow.spec.mjs --workers=1`

Scope:

- Customer signs in on mobile and creates a fresh booking for the seeded vehicle.
- Staff service adviser confirms reservation payment, sends the booking to workshop handoff, creates the job order, assigns the technician, finalizes the invoice, and records payment.
- Technician records progress/evidence; head technician records QA release.
- Customer creates an insurance request for the same vehicle; staff insurance workspace confirms the request is visible.
- QA checks `/api/vehicles/:id/timeline`, mobile Garage/lifecycle rendering, customer-visible reviewed summary rendering, and visible raw UUID/hash-like identifier leaks across critical customer/staff surfaces.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Not Objective-2 QA-closed. The flow is reachable, but the unified lifecycle requirement still has critical/high findings.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| CRITICAL | Objective 2 unified lifecycle is still missing insurance request/history evidence. The same vehicle has a staff-visible insurance inquiry, but `/api/vehicles/:id/timeline` contains no insurance-related event. | Fresh Playwright Objective 2 run; staff insurance request visible; lifecycle API source types included booking, job order, quality gate, lifecycle summary, and inspection, but no insurance source/event. | Add insurance inquiry/record events into the vehicle lifecycle timeline and render them customer-safely in mobile Garage/lifecycle. |
| HIGH | Staff Job Orders create/assign and technician progress/evidence surfaces still expose visible raw UUID values for customer/vehicle context. | `qa/playwright/artifacts/qa-summary.md` reported `ab79382f-049e-488e-bd5b-5dd124f79050` and `31613b93-da9d-4de8-9b2a-2932d869ee15` in visible staff text. | Replace raw customer/vehicle IDs in Job Orders/workbench detail surfaces with customer labels, vehicle plate/year/make/model, or business references. |
| MEDIUM | `Invoices & Orders` still shows an invoice reference with a UUID-fragment-like suffix, e.g. `INV-JO-20260521-09C23DC8`. | `qa/playwright/artifacts/qa-summary.md`; visible invoice/payment surface sweep. | Replace invoice suffixes with persisted business transaction sequences, not UUID-derived fragments. |

Fixes verified / capabilities proven:

- The fresh service flow can still move from mobile booking through reservation payment, workshop handoff, job order creation, technician progress/evidence, head-tech QA release, adviser finalization, invoice payment, and completed booking state.
- Customer mobile Garage/lifecycle renders service history milestones including booking, job order, quality gate, invoice-ready release, and reviewed lifecycle summary.
- Customer-visible reviewed lifecycle summary is visible on the mobile lifecycle detail screen when an approved summary exists.
- Staff insurance can see the newly created insurance request for the same vehicle, but it is not yet consolidated into the vehicle lifecycle timeline.

## Objective 2 Lifecycle / Readable-ID Recovery Verification - 2026-05-21

Command or method:

- `cd backend && npm test -- vehicle-lifecycle.service.spec.ts`
- `cd backend && npm test -- job-orders.service.spec.ts`
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `cd frontend && npm run build`
- `node --test frontend/src/screens/panelObjectiveProofView.test.mjs`

Scope:

- Add insurance inquiry/record events plus explicit invoice generation/payment milestones into `/api/vehicles/:id/timeline`.
- Replace Job Orders/workbench customer and vehicle raw-ID fallbacks with readable labels.
- Replace service invoice/official receipt references derived from job-order UUID fragments with business-readable timestamp tokens.

Result:

- `vehicle-lifecycle.service.spec.ts`: passed (`10` tests).
- `job-orders.service.spec.ts`: passed (`18` tests).
- Backend typecheck: passed.
- Staff web build: passed.
- Source/helper proof for critical readable-reference surfaces: passed (`2` tests).

Evidence:

- `backend/apps/main-service/src/modules/vehicle-lifecycle/services/vehicle-lifecycle.service.ts`
- `backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts`
- `backend/apps/main-service/src/modules/job-orders/services/job-orders.service.ts`
- `backend/apps/main-service/test/vehicle-lifecycle.service.spec.ts`
- `backend/apps/main-service/test/job-orders.service.spec.ts`
- `frontend/src/screens/JobOrderWorkbench.js`
- `frontend/src/screens/panelObjectiveProofView.test.mjs`

Open follow-up:

- Superseded by the fresh live rerun below. Readable workbench labels, explicit invoice/payment milestones, and non-UUID invoice references moved forward, but insurance timeline evidence still did not appear in live runtime data.

## Objective 2 Lifecycle / Readable-ID Recovery Live Rerun - 2026-05-22

Command or method:

- Refreshed stale listeners for backend `3000` and staff web `3002`; Expo web `8090` was already reachable.
- Warmed `/admin/job-orders` after the first rerun hit a cold Next.js navigation timeout.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/objective2-lifecycle-readable-ids.flow.spec.mjs --workers=1`

Scope:

- Re-run the Objective 2 lifecycle and readable-ID proof after the recovery patch.
- Confirm live service flow, staff Job Orders/technician labels, QA release, invoice/payment milestones, staff insurance request visibility, mobile lifecycle summary, and visible raw UUID/hash-like sweep.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Not Objective-2 QA-closed. The readable-ID regressions are improved, but the unified lifecycle still lacks insurance request/history evidence in live runtime data.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| CRITICAL | Objective 2 unified lifecycle is still missing insurance request/history evidence. The same vehicle has a staff-visible insurance inquiry, but `/api/vehicles/:id/timeline` contains no insurance-related event. | Fresh May 22 Playwright report; direct live API probe showed `timelineCount: 444`, `sourceTypes: booking, job_order, quality_gate, lifecycle_summary, inspection`, and `insuranceLikeCount: 0`. `VehicleLifecycleModule` still does not import `InsuranceModule`, so the optional `InsuranceRepository` path appears unwired at runtime. | Import/wire `InsuranceModule` into `VehicleLifecycleModule` or otherwise inject insurance repository into the lifecycle service, then rerun this Playwright spec. |

Fixes verified / capabilities proven:

- Staff Job Orders create/assign and technician progress/evidence surfaces no longer reproduced the previous raw customer/vehicle UUID finding in the final structured report.
- `Invoices & Orders` no longer reproduced the previous UUID-fragment invoice reference finding in the final structured report. The QA detector was tightened so date-based `INV-SVC-20260521-...` references are not falsely treated as UUID fragments.
- The live timeline now includes explicit `invoice_generated` and `invoice_paid` events.
- The fresh service flow can still move from mobile booking through reservation payment, workshop handoff, job order creation, technician progress/evidence, head-tech QA release, adviser finalization, invoice payment, and completed booking state.
- Customer mobile Garage/lifecycle still renders service history milestones and the reviewed lifecycle summary when an approved summary exists.
- Staff insurance still sees the newly created insurance request for the same vehicle, but it remains outside the unified lifecycle timeline.

## Objective 2 Lifecycle / Readable-ID Recovery Fresh Current-Source Rerun - 2026-05-22

Command or method:

- Kept refreshed backend `3000` and staff web `3002` running from the earlier rerun.
- Detected that the shared mobile web listener on `8090` was stale: it still rendered obsolete booking copy and hash-style booking history references even though `mobile/src/screens/Dashboard.js` already builds readable `BK-...` references.
- Launched a fresh Expo web runtime from the current mobile source on `8096`.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8096 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.mjs qa/playwright/tests/objective2-lifecycle-readable-ids.flow.spec.mjs --workers=1`

Scope:

- Re-run the same Objective 2 lifecycle and readable-ID proof against a clean current-source mobile runtime.
- Distinguish true code regressions from stale-runtime drift on the shared `8090` listener.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Objective 2 tested flow is QA-passed on the fresh current-source runtime.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| None | No structured findings remained in the fresh current-source rerun. | `qa/playwright/artifacts/qa-summary.md` recorded `Passed: 1`, `Failed / Needs Fixing: None`. | Use a fresh current-source mobile runtime for future Objective 2 evidence when shared `8090` behavior drifts from source. |

Fixes verified / capabilities proven:

- The same tested vehicle lifecycle now shows insurance request/history evidence together with booking, job order, QA, invoice/payment, and reviewed summary milestones.
- Staff Job Orders create/assign and technician progress/evidence surfaces remained free of the previous raw customer/vehicle UUID finding.
- `Invoices & Orders` remained free of the previous UUID-fragment invoice reference finding.
- Mobile booking history no longer reproduced the stale hash-style booking references once the flow ran against the fresh current-source runtime.
- The earlier May 22 `8090` insurance-timeline failure is superseded as stale-runtime drift, not the current checked-in Objective 2 implementation.

## Broad Readable-ID Sweep - 2026-05-22

Command or method:

- Added `qa/playwright/tests/readable-id-sweep.flow.spec.mjs` as a repeatable all-surface readable-ID QA gate.
- Checked active runtimes first: backend `3000`, staff web `3002`, stale shared mobile `8090`, and fresh current-source mobile `8096` were listening; ecommerce `3001` was not listening.
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8096 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001 npx playwright test --config=playwright.config.mjs qa/playwright/tests/readable-id-sweep.flow.spec.mjs --workers=1`

Scope:

- Customer mobile: Home, Garage, Book, Insurance, Rewards, Shop, Shop Orders, and vehicle lifecycle detail when visible.
- Staff adviser web: Bookings, Job Orders, QA Audit, Invoices & Orders, Insurance, Back-Jobs, Catalog Admin, Inventory, Service Management, Loyalty, and Shop/Ecommerce workspace.
- Technician web: Job Orders.
- Head technician web: QA Audit.
- Detector hard-fails visible raw UUID values and hash-like/UUID-fragment business references on critical workflow surfaces.

Result:

- Passed: 0
- Failed: 1
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Not QA-closed. The broad ID sweep now exists, but it found live raw UUID leaks on mobile customer surfaces.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| HIGH | Mobile Rewards exposes raw UUID values in recent loyalty activity rows. | `qa/playwright/artifacts/qa-summary.md`; visible activity text includes entries like `Paid service work May 22, 2026 - fa584e4a-8d52-4dcf-8ca8-667401b5f375`. | Replace loyalty activity source/event IDs with business-readable invoice/order/service references, or hide internal IDs from customer-facing activity copy. |
| HIGH | Mobile Shop Orders exposes a raw UUID value. | `qa/playwright/artifacts/qa-summary.md`; sweep failed on `Mobile Shop Orders` with `ab79382f-049e-488e-bd5b-5dd124f79050`. | Render customer-facing order/invoice references such as `ORD-...` / `INV-...` instead of internal order/payment IDs. |
| MEDIUM | Ecommerce API `3001` was not reachable during the sweep, so ecommerce-backed staff pages have partial readable-ID coverage. | Runtime check showed no listener on `3001`; the Playwright summary recorded partial coverage findings for ecommerce-dependent staff surfaces. | Start/fix the ecommerce service before the next broad sweep so Catalog Admin, Inventory, and Shop/Ecommerce workspace can be fully trusted. |

## Broad Readable-ID Sweep Recovery Rerun - 2026-05-22

Command or method:

- Patched mobile loyalty activity normalization to prefer readable invoice references or reward labels instead of raw loyalty source IDs.
- Patched ecommerce customer/runtime failure copy so it no longer echoes UUID-bearing request URLs.
- Patched the Playwright mobile API proxy synthetic failure text so it no longer inject raw request URLs into the customer UI when a downstream runtime is unavailable.
- `node --test mobile/src/screens/customerReadableReferenceProof.test.mjs`
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8096 npx playwright test --config=playwright.config.mjs qa/playwright/tests/readable-id-sweep.flow.spec.mjs --workers=1`

Scope:

- Re-run the broad customer/staff readable-ID gate after fixing Mobile Rewards loyalty activity rows and the Mobile Shop Orders UUID leak.
- Confirm the gate no longer fails on visible UUID/hash-like identifiers even if ecommerce `3001` is still unavailable.

Result:

- Passed: 1
- Failed: 0
- Skipped: 0
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: Superseded by the full-coverage rerun below. This intermediate run passed the raw-ID gate but still had ecommerce coverage warnings.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| MEDIUM | Ecommerce API `3001` was not reachable during the rerun, so ecommerce-backed staff pages still had partial readable-ID coverage. | Passing `qa-summary.md` still recorded medium coverage findings for ecommerce-dependent surfaces. | Completed by the full-coverage rerun below after confirming ecommerce `3001` and fixing the QA health probe path. |

Fixes verified / capabilities proven:

- Mobile Rewards no longer exposes raw UUID values in customer-visible loyalty activity rows.
- Mobile Shop Orders no longer exposes the previous raw UUID leak.
- The readable-ID sweep gate now passes across the covered customer, staff, technician, and head-technician surfaces.

Fixes verified / capabilities proven:

- The sweep itself is now reusable and hard-fails if a tested critical surface exposes raw UUID/hash-like identifiers.
- The fresh current-source mobile runtime on `8096` should remain the target until the shared `8090` listener is rebuilt and verified fresh.
- Covered staff adviser, technician, and head-technician surfaces did not add new raw-ID findings in this run apart from the ecommerce runtime coverage warnings.

## Broad Readable-ID Sweep Full-Coverage Rerun - 2026-05-22

Command or method:

- Confirmed active listeners for backend `3000`, ecommerce `3001`, staff web `3002`, and fresh current-source mobile web `8096`.
- Verified ecommerce health at `http://127.0.0.1:3001/api/health`.
- Patched the readable-ID sweep ecommerce probe to check `/api/health` before falling back to `/health`, because the service was healthy but the earlier QA probe used the wrong health path.
- `node --test mobile/src/screens/customerReadableReferenceProof.test.mjs`
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8096 QA_STAFF_BASE_URL=http://127.0.0.1:3002 QA_API_BASE_URL=http://127.0.0.1:3000 QA_ECOMMERCE_API_BASE_URL=http://127.0.0.1:3001 npx playwright test --config=playwright.config.mjs qa/playwright/tests/readable-id-sweep.flow.spec.mjs --workers=1`

Scope:

- Re-run the broad customer/staff/technician/head-technician readable-ID gate with ecommerce `3001` available.
- Confirm Mobile Rewards no longer leaks loyalty source UUIDs.
- Confirm Mobile Shop Orders no longer leaks raw UUIDs.
- Confirm ecommerce-backed staff surfaces are included instead of reported as partial coverage.

Result:

- Source proof: 2 passed, 0 failed.
- Playwright: 1 passed, 0 failed, 0 skipped.
- Structured report: `qa/playwright/artifacts/qa-summary.md`
- Verdict: QA Passed for the tested broad readable-ID surfaces.

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
| None | No structured findings remained in the full-coverage rerun. | `qa-summary.md` recorded `Passed: 1`, `Failed / Needs Fixing: None`, and no coverage warnings. | Keep this sweep as a regression gate before panel/demo builds. |

Fixes verified / capabilities proven:

- Mobile Rewards no longer exposes raw UUID values in customer-visible loyalty activity rows.
- Mobile Shop Orders no longer exposes the previous raw UUID leak.
- Ecommerce-backed staff surfaces are now included with `3001` available.
- The readable-ID sweep gate passes across tested customer, staff adviser, technician, and head-technician surfaces.

## QA Update Template

Copy this block for future QA entries:

```markdown
## QA Run - YYYY-MM-DD

Command or method:

- 

Scope:

- 

Result:

- Passed:
- Failed:
- Skipped:

Issues found:

| Severity | Issue | Evidence | Next Action |
|---|---|---|---|
|  |  |  |  |

Fixes verified:

- 
```
