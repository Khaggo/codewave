# Insurance And Loyalty QA - 2026-05-21

## Scope

Insurance:

- Customer creates one insurance claim/request.
- Customer uploads OR/CR, policy document, and police report as supporting files for the same request.
- Staff opens the insurance workspace and verifies the same request, attached files, and open/download behavior.

Loyalty:

- Customer completes the service path through booking, reservation fee, job order, technician progress/evidence, head technician QA, invoice finalization, and manual payment.
- QA verifies loyalty points do not accrue from booking completion, reservation-fee payment, or unpaid invoice finalization.
- QA verifies loyalty points accrue only after the qualifying paid service invoice event.

## Commands Run

- `cd backend && npm test -- insurance.service.spec.ts insurance.integration.spec.ts loyalty.service.spec.ts loyalty.integration.spec.ts loyalty-runtime.service.spec.ts`
- `node --test mobile/src/screens/insuranceModuleView.test.mjs mobile/src/screens/insuranceScreenStructure.test.mjs frontend/src/app/insurance/insuranceView.test.mjs frontend/src/screens/loyaltyManagerView.test.mjs`
- `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`
- Rerun after the staff open-link patch: `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`
- Rerun after backend storage-root patch and backend restart: `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`
- Final blob-aware rerun after backend restart: `QA_MOBILE_BASE_URL=http://127.0.0.1:8090 QA_STAFF_BASE_URL=http://127.0.0.1:3002 npx playwright test --config=playwright.config.mjs qa/playwright/tests/insurance-loyalty.flow.spec.mjs --workers=1`

Staff web was restarted through a temporary local job during the Playwright run because the existing `3002` process was serving HTML with missing Next.js chunks.

## Result

- Backend targeted tests: Passed, 5 suites / 55 tests.
- Mobile and staff helper/view tests: Passed, 95 tests.
- Final live Playwright flow: 2 passed, 0 failed.

## Passed

| Area | Evidence | Notes |
|---|---|---|
| Insurance same-request storage | API upload response and staff API response both contained 3 documents on the same inquiry. | OR/CR, policy, and police report stayed tied to one request. |
| Insurance staff open/download | Final live Playwright rerun passed. | Backend file streams returned 2xx and staff `Open file` blob URLs were fetchable and non-empty. |
| Loyalty paid-invoice timing | `insurance-loyalty.flow.spec.mjs` passed the loyalty service-payment test. | Points did not accrue after reservation fee or unpaid finalization; points accrued after manual paid service invoice. |

## Failed / Needs Fixing

| Severity | Issue | Evidence | Recommended Fix |
|---|---|---|---|
| Medium | Booking can move to completed after invoice finalization before manual payment while loyalty remains correct. | Playwright added a medium finding in `qa/playwright/artifacts/qa-summary.md`. | Keep completed-history timing aligned with the final paid service state, or make the unpaid/finalized distinction clearer in customer history. |

## Evidence Files

- `qa/playwright/artifacts/qa-summary.md`
- `test-results/insurance-loyalty.flow-ins-b6c9e-d-staff-can-open-every-file/error-context.md`
- `test-results/insurance-loyalty.flow-ins-b6c9e-d-staff-can-open-every-file/test-failed-1.png`

## Status

Insurance multi-file same-request storage and staff open/download are QA-closed by the final live Playwright rerun.

Loyalty service-payment accrual timing is QA-passed for the service invoice path. Ecommerce paid-order accrual still needs a separate live proof if the panel asks for ecommerce-specific rewards evidence.
