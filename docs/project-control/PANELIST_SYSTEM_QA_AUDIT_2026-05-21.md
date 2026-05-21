# Panelist System QA Audit - 2026-05-21

Purpose: QA the current AUTOCARE system against the panelist feedback, separating proven behavior from partially implemented features and remaining demo/documentation risks.

## Verification Run

Commands executed:

```powershell
npm test -- bookings.service.spec.ts vehicles.service.spec.ts job-orders.service.spec.ts quality-gates.service.spec.ts insurance.service.spec.ts loyalty.service.spec.ts back-jobs.service.spec.ts vehicle-lifecycle.service.spec.ts
npm test -- inspections.service.spec.ts
npm run build
node --test mobile/src/lib/mobileSessionAccess.test.mjs mobile/src/screens/technicianMobileAccess.test.mjs mobile/src/screens/insuranceScreenStructure.test.mjs mobile/src/screens/insuranceModuleView.test.mjs
node --test frontend/src/screens/invoiceOrderManagementView.test.mjs frontend/src/screens/inventoryWorkspaceView.test.mjs frontend/src/screens/loyaltyManagerView.test.mjs frontend/src/screens/qaAuditView.test.mjs frontend/src/app/vehicles/vehicleRecordsView.test.mjs frontend/src/app/backjobs/backJobsView.test.mjs frontend/src/app/insurance/insuranceView.test.mjs frontend/src/components/bookingServiceAdminView.test.mjs
npx expo export --platform android --output-dir .runtime/export-panelist-qa
npx playwright test --config=playwright.config.mjs qa/playwright/tests
```

Results:

- Backend panel-critical service specs: 9 suites passed, 109 tests passed.
- Staff web build: passed.
- Mobile helper/view tests: 59 passed.
- Staff web helper/view tests: 64 passed.
- Mobile Android export: passed.
- Full Playwright booking-to-cash and role-access suite: 4 passed, 0 failed, no findings.
- Shared frontend package `npm test` could not be executed in this session because the Windows sandbox setup failed before test startup; no product assertion failed there.

## Executive Verdict

The system is stronger than the original panel feedback implied for booking-to-cash, role access, QA release, invoice payment, insurance document handling, loyalty accrual rules, back-job logic, vehicle lifecycle, and inspection issue notes.

However, several panel-facing promises are still not safe to claim as fully complete:

- Business-readable vehicle/transaction IDs are not fully implemented; several UI paths still expose UUID fragments or fallback raw IDs.
- Customer mobile booking still submits one selected service, even though the backend supports `serviceIds`.
- Garage supports multiple vehicles, but add-second-car and pagination need a focused mobile E2E/manual demo.
- Insurance supports claim inquiries and documents, but the documented road-accident insurance process is still too thin for panel expectations.
- Technician permissions are improved, but the UI is not yet a checklist-only workflow.
- Objective 5 has strong backend QA gate/rule evidence, but the customer-facing AI summary/discrepancy demo still needs a dedicated proof path.

## Panelist Feedback QA Matrix

| Panelist Item | QA Status | Evidence | Severity | Next Action |
|---|---|---|---|---|
| Fix vehicle ID / do not use hash. | Failed / Open | Mobile and web still use UUID slices/fallbacks such as `booking.id.slice(0, 8)`, `Vehicle ${vehicleId}`, and `JO-${uuid-fragment}`. | High | Add persisted display IDs such as `VEH-2026-0001`, `BK-2026-0001`, and use them across API responses and UI. |
| Customer can avail multiple services. | Partial | Backend accepts `serviceIds`; mobile booking currently submits `serviceIds: [selectedService.id]`. | High | Convert mobile booking service selection from single-select to multi-select and add Playwright/mobile QA. |
| Mobile session/login stability. | Partial | `mobileSessionAccess.test.mjs` passed; Android export passed. No real device/session restore QA was run. | High | Add device/manual session persistence QA: login, restart app, token refresh/expiry, LAN API host recovery. |
| Mobile app user-friendly / not confusing. | Partial | Insurance/mobile structure tests passed; broader booking, garage, shop, rewards UX still needs usability pass. | High | Run task-based usability QA and redesign confusing entry points. |
| Customer can add multiple cars. | Partial | Backend vehicle service tests passed; mobile client has create/list vehicle functions; garage displays multiple owned vehicles. No add-second-car E2E proof yet. | High | Add customer "add second vehicle" E2E/manual QA and screenshot evidence. |
| Fix technician error. | QA Passed for known flow | Playwright role tests passed; job order and QA release service specs passed. | Medium | Keep monitoring; merge with checklist-only requirement below. |
| Add technician skill/checklist. | Open | No dedicated skill/checklist-only workflow proven. | Medium | Define technician checklist model and UI. |
| Technician should only be able to do checklists. | Partial | Backend restricts technician status/progress access; Playwright blocks technician from booking/invoice workspaces. UI still exposes progress/evidence rather than a checklist-only experience. | High | Convert technician workspace to assigned checklist/tasks plus evidence only. |
| Garage pagination. | Failed / Open | Booking service picker has pagination, but garage vehicle lists are not paginated; web vehicle records show all filtered records. | Medium | Add pagination/search limits to mobile garage and web vehicle directory. |
| Objective 2 lifecycle polish. | Partial | Vehicle lifecycle service specs passed; timeline module exists. Needs panel-ready UI proof with service, inspection, insurance, invoice, and QA events together. | High | Create demo vehicle timeline and QA evidence. |
| Objective 5 QA/NLP/rule/AI module. | Partial | Quality-gates service specs include semantic/rule findings and head-tech verdict; Playwright covers QA release. Customer-facing generated summary still lacks dedicated demo proof. | High | Add discrepancy scenario and generated customer summary QA. |
| Duplicate booking data for same day/time/service. | QA Passed | Booking service tests cover same-slot conflict and availability hiding; full Playwright evidence has no duplicate finding. | High | Keep regression in suite. |
| Billing details not fully functional. | Partial | Booking-to-cash Playwright passed finalization/payment/invoice lookup; invoice UI helper tests passed. Pricing/quotation completeness still not panel-ready. | High | Add quotation/pricing fields and invoice-detail E2E. |
| Shop/catalog/service data entry. | Partial | Staff web build includes catalog/inventory/service routes; inventory and booking service view helper tests passed. No live CRUD E2E yet. | Medium | Add CRUD validation QA for shop/catalog/service setup. |
| Insurance road accident procedure and supporting documents. | Partial / At Risk | Insurance supports `claim`, document upload, required document checks, reminders, and staff review. Required claim docs are still minimal and not a full road-accident process. | High | Model accident claim steps and required documents: OR/CR, license, police report, photos, estimate, insurer claim number. |
| Loyalty qualification standards. | Partial | Loyalty service tests passed for paid service/ecommerce accrual and inactive/missing rule behavior. Standards need UI/paper explanation. | Medium | Document earning rules and add admin/customer demo proof. |
| Quotation/pricing needed for services. | Partial / At Risk | Reservation fee and invoice payments exist; service pricing/quotation proof is not complete. | High | Add service pricing/quotation fields to booking/service admin and invoice flow. |
| Notes for each initial inspection issue. | QA Passed at service/UI level | Inspection service spec passed; inspection findings support severity and notes; staff UI displays finding notes. | Medium | Add this to demo script and documentation screenshots. |
| Improve UI for web/mobile. | Partial | Staff web build passed; several helper tests passed. UX still needs panel-facing polish and usability evidence. | High | Prioritize mobile booking/garage, staff billing, job order clarity, and readable IDs. |

## Objective-Level QA Result

| Objective | Current QA Status | Reason |
|---|---|---|
| Objective 1: mobile booking, shop, rewards, insurance | Partial | Booking and insurance are supported; shop/rewards/multi-service/multi-car/session UX still need E2E proof. |
| Objective 2: unified vehicle lifecycle timeline | Partial / At Risk | Backend lifecycle works, but full UI proof with insurance + service + inspection + invoice is still needed. |
| Objective 3: admin web booking, inventory, loyalty rules | Partial | Booking/job-order/invoice path passed; inventory/catalog/loyalty CRUD needs live E2E proof. |
| Objective 4: back-job/rework module | Backend QA Passed, E2E Needed | Back-job service specs passed; customer-to-staff rework demo still needs end-to-end evidence. |
| Objective 5: QA audit with NLP/rules/generative summary | Partial | QA gate/rule logic and head-tech release passed; generated customer summary/discrepancy demo remains. |
| Objective 6: ISO/IEC 25010 evaluation | In Progress | Automated QA evidence exists, but formal usability/compatibility/security evaluation table is still needed. |

## Recommended Next QA Order

1. Add business-readable IDs and rerun booking/job-order/vehicle QA.
2. Implement mobile multi-service booking and add E2E/manual proof.
3. Add customer second-vehicle QA path and garage pagination.
4. Expand insurance claim workflow to actual road-accident requirements.
5. Build Objective 5 discrepancy + generated summary demo proof.
6. Add live CRUD QA for shop/catalog/service/loyalty configuration.
