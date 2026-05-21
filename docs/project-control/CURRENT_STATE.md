# AUTOCARE Current State

Last updated: 2026-05-22

## Project Goal

AUTOCARE is a mobile and web-based service management and customer engagement system for Cruisers Crib Auto Care Center.

The system must support:

- Customer mobile booking, garage, shop, rewards, insurance requests, and service tracking.
- Staff web operations for booking, job orders, QA audit, invoices, inventory/catalog, loyalty, insurance, back-jobs, and vehicle lifecycle.
- ISO/IEC 25010 evaluation evidence for functional suitability, reliability, usability, compatibility, and security.

## Current Recovery Context

Panel feedback indicates the project is not yet considered compliant with most stated objectives. The main issue is not only bugs; it is missing or weak proof that each objective works end to end.

The immediate recovery goal is to align:

- Working system features.
- Automated QA evidence.
- Paper/documentation claims.
- Demo flow for panel defense.

## Latest QA Status

Automated Playwright QA is tracked under `qa/playwright`.

Latest structured QA result:

- Method: Broad readable-ID sweep full-coverage rerun on 2026-05-22 against backend `3000`, ecommerce `3001`, staff web `3002`, and a fresh current-source mobile web runtime on `8096`
- Result: 1 passed, 0 failed, with no structured findings
- Report: `qa/playwright/artifacts/qa-summary.md`

Latest readable-ID result:

- The broad readable-ID sweep now passes with ecommerce-backed staff coverage included.
- The previous Mobile Rewards loyalty activity raw UUID leak no longer reproduces.
- The previous Mobile Shop Orders raw UUID leak no longer reproduces.

Covered and passed except where noted:

- Fresh Objective 2 service flow can move from mobile booking through reservation payment, workshop handoff, job order creation, technician progress/evidence, head-tech QA release, adviser finalization, invoice payment, and completed booking state.
- Staff insurance can see the newly created insurance request for the same seeded vehicle used in the service flow.
- Mobile Garage/lifecycle renders service history milestones and the customer-visible reviewed summary when an approved summary exists.
- Objective 2 tested flow is now QA-passed on the fresh current-source mobile runtime: the unified vehicle timeline includes insurance lifecycle evidence alongside booking, job order, QA, invoice/payment, and reviewed summary milestones.
- Readable-ID sweep improved in the latest live rerun: the previous Job Orders/technician raw customer/vehicle UUID findings and the previous UUID-fragment invoice-reference finding no longer reproduced in the final structured report.
- A broader all-surface readable-ID sweep now exists and hard-fails visible internal identifiers; the latest full rerun passes after fixing Mobile Rewards and Mobile Shop Orders leakage and includes ecommerce-backed staff surfaces with `3001` up.
- The earlier May 22 `8090` verdict is now known to have been polluted by a stale mobile web runtime. A fresh Expo web listener on `8096` picked up the current source, stopped reproducing the obsolete hash-style booking history IDs, and passed the full Objective 2 Playwright flow cleanly.
- Staff admin can create catalog categories/products through `Catalog Admin`, edit product name/price, and archive/hide a product from the staff UI.
- Staff admin can create an inventory-backed product and record a quantity adjustment from the staff UI.
- Staff admin can create active and inactive booking-service records with visible base pricing; the previous `basePricePhp` request-body leak is QA-closed by the latest live rerun.
- Loyalty admin still shows a clear separation between `Reward Config` and `Earning Rules`.
- Ecommerce manual payment in `Invoices & Orders` remains reachable during the admin/pricing/billing sweep.
- Staff Back-Jobs can create a rework/back-job case from finalized prior service lineage without reproducing the previous create `400`.
- Created back-job cases persist the selected customer, vehicle, complaint, original finalized job order, and booking source lineage.
- Back-Jobs rejects non-finalized original work as invalid lineage, protecting the flow from becoming a normal unrelated booking path.
- Back-Jobs detail/table no longer expose raw UUIDs for the case, customer, vehicle, original job order, or original booking lineage in the live QA flow.
- Back-Jobs full follow-through now passes for the staff-linked path: completed return inspection evidence, `reported` -> `inspected` -> `approved_for_rework`, linked rework job order creation, technician progress/evidence, head-technician QA release, adviser finalization, and resolved back-job outcome.
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
- QA-closed on 2026-05-21 for the staff-linked full rework lifecycle: approval to rework, linked rework job order, technician progress/evidence, head-technician QA release, adviser finalization, and resolved back-job outcome all passed live Playwright.
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

- Head technician can now access and act on QA release without relying on super admin.
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

From panel feedback:

- Mobile app UX is confusing and needs redesign.
- Mobile session/login stability needs fixing.
- Customer must be able to add multiple cars.
- Customer must be able to avail multiple services.
- Technician should only perform checklist/progress/evidence work.
- Billing details are not fully functional or not clear enough.
- Latest admin/pricing/billing QA closes the service-pricing payload leak and service invoice-detail clarity; the remaining admin finding, inventory low-stock threshold persistence, is now code-fixed and awaiting a fresh live rerun.
- Insurance accident process and supporting documents must be added.
- Loyalty qualification standards must be defined and enforced.
- Vehicle IDs and transaction IDs should use business-readable generated IDs, not raw hash/UUID display. Fresh current-source Objective 2 QA no longer reproduced the Job Orders/technician raw UUID, invoice UUID-fragment, or stale mobile booking-history hash-reference findings on the tested flow, and the final broad readable-ID sweep now passes across the tested critical customer, staff, technician, head-technician, and ecommerce-backed staff surfaces.
- Shop, catalog, and service data-entry modules need polish.
- Latest admin CRUD QA confirms most staff data-entry fixes are live, and the last remaining inventory low-stock threshold persistence finding is now code-fixed pending a fresh live rerun.
- Paper diagrams, business process, gap analysis, and objective evidence need revision.

Latest implementation movement on 2026-05-21:

- Mobile booking now submits multiple selected services through the live `serviceIds` contract.
- Vehicle lifecycle mobile now supports adding another vehicle and paginating garage vehicles in the detail surface.
- Customer-visible reviewed lifecycle summary text is now exposed through a dedicated backend route and rendered on mobile.
- Main booking/job-order customer/staff surfaces now favor business-readable booking/job-order references over raw UUID fragments where patched.
- Objective 2 recovery patches added code paths for insurance inquiry/record events and explicit invoice/payment milestones in `/api/vehicles/:id/timeline`, replace Job Orders/workbench raw customer/vehicle fallback IDs with readable labels, and switch service invoice / official receipt references to business-readable timestamp tokens instead of UUID fragments. Fresh current-source live QA on `8096` confirms the insurance timeline, invoice milestone, and readable-ID portions together on the tested flow.
- Booking records now have a durable backend booking reference source-of-truth, and Job Orders handoff candidates now consume that same persisted reference instead of rebuilding a local `BK-...-PENDING` fallback.
- `Invoices & Orders` now loads finalized service-record options from full history instead of only the current month, and invoice selector labels prefer the unique source booking reference when available so same-day `JO-...-WORK` duplicates stop confusing staff.
- Mobile booking history/detail now renders explicit requested-service chips so multi-service bookings remain clearly visible after submit instead of collapsing into one ambiguous title string.
- Mobile app shell now persists and rehydrates the signed-in customer/workshop session through AsyncStorage-backed startup restore, so refresh no longer cold-boots the app back to an empty auth state.
- Staff insurance review now renders working `Open file` links for uploaded OR/CR, policy, police report, and other `upload://insurance/...` files.
- Shop/ecommerce rewards live QA now proves customer checkout, paid ecommerce invoice accrual timing, Rewards activity display, staff catalog visibility, and Reward Config versus Earning Rules separation.
- Back-Jobs/rework staff lineage live QA now proves a service adviser can open a back-job from finalized prior service history, the backend rejects non-finalized origin work, the staff detail/table no longer expose raw lineage UUIDs, and the staff-linked rework lifecycle can reach resolved after technician work, QA release, and adviser finalization.
- UX Audit Pro findings for the customer Mobile Book flow were converted into tracked rebuild work, and the first-pass mobile redesign now ships friendlier booking sign-in copy, a single next-step dashboard card, clearer `Service Booking` / `Choose Services` / `Active Services` labels, a four-step booking journey, and human-readable reservation fee urgency copy.
- New proof tests now verify:
  - multi-service mobile booking source/contract wiring,
  - multi-service booking history/detail requested-service visibility,
  - mobile app session persistence and startup route restore,
  - garage add-second-vehicle and pagination UI structure,
  - customer-visible reviewed lifecycle summary rendering,
  - business-readable booking/job-order reference usage across critical staff/mobile screens,
  - Objective 5 discrepancy/customer-summary proof anchors through `docs/project-control/OBJECTIVE5_DEMO_PROOF.md`.
- These items are now implementation-verified with automated source/helper proof, but they still need fresh live panel-style E2E/manual capture before they can be marked fully panel-closed.
- The booking-reference consistency fix above is code-patched and targeted-verified, but it still needs a fresh live panelist rerun before the reopened booking-to-cash finding can be marked closed again.
- Same-day rework job-order selector duplication is QA-closed by the latest live Back-Jobs rerun; remaining Back-Jobs scope is customer self-service initiation only if the defense intends to claim it.
- The mobile multi-service booking history visibility and session-restore fixes above are code-patched and targeted mobile-test verified, but they still need a fresh live panelist rerun before the remaining mobile findings can be marked QA-closed.
- Fresh Objective 2 lifecycle recovery QA on a clean current-source runtime now passes end to end; the previous insurance-timeline failure is superseded as stale-runtime drift from the old `8090` listener, not the current checked-in source.

## Important Workspace Note

The repository currently has multiple modified and untracked files. Some existed before the QA work. Future chats must not revert unrelated changes unless the user explicitly asks.

Run `git status --short` before editing and after finishing.
