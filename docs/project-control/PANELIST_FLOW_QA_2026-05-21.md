# Panelist Flow QA - 2026-05-21

Purpose: fresh runtime-backed QA for the panelist proof flow covering mobile multi-service booking, garage add/pagination, business-readable references, Objective 5 QA anchors, and customer-visible lifecycle summary.

## Runtime

Live endpoints checked before QA:

- Backend: `http://127.0.0.1:3000/api/health` returned `200`.
- Staff web: `http://127.0.0.1:3002/bookings` returned `200`.
- Mobile web: `http://127.0.0.1:8090` returned `200`.

QA note: the Playwright config can auto-use the stale static mobile export at `8095` when `QA_MOBILE_BASE_URL` is not set. For this run, the live mobile command used `QA_MOBILE_BASE_URL=http://127.0.0.1:8090`.

## Commands Run

```powershell
cd backend
npm run seed:booking-catalog
```

```powershell
$env:QA_MOBILE_BASE_URL='http://127.0.0.1:8090'
npx playwright test --config=playwright.config.mjs qa/playwright/tests --workers=1
```

```powershell
node --test frontend/src/screens/panelObjectiveProofView.test.mjs
node --test mobile/src/screens/customerBookingGarageProof.test.mjs
```

Additional live probes were run with Playwright scripts for:

- Staff readable reference sweep on `/bookings`, `/admin/job-orders`, `/admin/qa-audit`, `/admin/invoices`.
- QA Audit Objective 5 anchors after loading a review.
- Invoice reference lookup.
- Mobile lifecycle garage pager and reviewed summary card.

## Result Summary

| Area | Result | Evidence |
|---|---|---|
| Mobile multi-service booking storage | Passed | Live Playwright created a booking with `Air Filter Replacement` and `Brake Pad Replacement (Front)` stored in `requestedServices`. |
| Garage add vehicle | Passed | Mobile lifecycle UI added vehicles through the `Add vehicle` modal. |
| Garage pagination | Passed | Live mobile lifecycle screen showed `Showing 1-3 of 4 vehicles` with pager controls. |
| Staff readable refs, broad sweep | Mostly Passed | Staff routes did not expose full UUIDs or `#XXXXXXXX` hash fragments in the visible body text. |
| QA Audit Objective 5 anchors | Passed | Live QA Audit showed `Risk Score`, `Semantic Match`, `Blocking Findings`, and `Review Needed` after loading a review. |
| Customer reviewed summary card | Passed after data setup | Adviser generated and approved a lifecycle summary; mobile lifecycle screen rendered `Customer-visible reviewed summary` and review metadata. |
| Booking-to-cash cross-role flow | Failed | Job Orders did not expose the selected booking handoff reference expected by the flow, blocking job-order creation from the exact booking. |

## Fresh Playwright Pack

Structured report:

- `qa/playwright/artifacts/qa-summary.md`

Result:

- Passed: 4
- Failed: 1
- Timed out: 0
- Skipped: 0

Failed test:

- `booking-to-cash.flow.spec.mjs > customer booking reaches completed history only after workshop, QA, and payment flow`

Failure:

- The customer mobile booking showed `#BK-20260601-QAJO1001`.
- The Job Orders handoff surface did not render a matching `BK-20260601-QAJO1001` source.
- A live probe on a similar date showed Job Orders rendering handoff sources as `BK-20260531-PENDING`, including multiple sources with the same pending reference.
- Result: the adviser cannot reliably select the exact booking handoff, so the job-order creation step is not QA-closed.

## Findings

| Severity | Finding | Impact | Needed Fix |
|---|---|---|---|
| Critical | Job Orders handoff references can fall back to `BK-YYYYMMDD-PENDING` instead of the customer-visible `BK-YYYYMMDD-PLATE` reference. | Adviser cannot reliably identify or create a JO from the exact booking handoff, especially when multiple handoffs exist on the same date. | Pass vehicle plate/display reference into handoff records and render the same stable booking reference across mobile, bookings, and Job Orders. |
| High | `BK-YYYYMMDD-PLATE` is not unique when the same customer/vehicle has multiple bookings on the same date. | Business-readable references are better than UUIDs but still ambiguous under repeat QA/customer flows. | Add a persisted sequence/reference such as `BK-2026-000123` or append a non-hash daily sequence. |
| Medium | Invoice reference `INV-JO-20260518-A1504708` still appears to use an 8-character UUID-derived suffix. | Panelist feedback said vehicle/transaction IDs should not use hash-like data. | Replace invoice suffixes with persisted business sequence IDs. |
| Medium | If `QA_MOBILE_BASE_URL` is not set, Playwright may test a stale static mobile export on `8095` instead of live Expo web on `8090`. | QA can produce false failures or false confidence against old mobile code. | Require `QA_MOBILE_BASE_URL=http://127.0.0.1:8090` for live panel QA or refresh/remove the static export before runs. |

## Passed Proof Details

- Multi-service API isolation: direct API create with two `serviceIds` stored both services, proving backend persistence is correct.
- Multi-service live mobile: Playwright against `8090` stored both selected services in one booking.
- Garage: customer account now has enough vehicles for pager proof, and the mobile lifecycle screen showed `Showing 1-3 of 4 vehicles`.
- Objective 5 staff proof: QA Audit live page showed the required anchors after selecting a reviewable job order.
- Objective 5 customer proof: after adviser summary generation/review, mobile lifecycle rendered the customer-visible reviewed summary card.

## Recommended Fix Order

1. Fix booking handoff reference consistency so Job Orders uses the same reference as mobile/staff bookings.
2. Replace date/plate-only booking references with persisted unique business IDs.
3. Replace invoice UUID-fragment suffixes with business transaction sequences.
4. Keep the multi-service Playwright test in the suite and always run it with live `QA_MOBILE_BASE_URL=8090`.
5. Add a first-class Playwright test for garage pagination and reviewed lifecycle summary once test data setup is made idempotent.
