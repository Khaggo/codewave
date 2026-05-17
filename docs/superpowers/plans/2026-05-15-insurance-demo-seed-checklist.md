# Insurance Demo QA Checklist

## Demo logins

- [ ] Staff web login: `demo.insurance.staff@example.com` / `DemoInsurance123!`
- [ ] Customer mobile/web login: `demo.insurance.review@example.com` / `DemoInsurance123!`
- [ ] Customer mobile/web login: `demo.insurance.documents@example.com` / `DemoInsurance123!`
- [ ] Customer mobile/web login: `demo.insurance.payment@example.com` / `DemoInsurance123!`
- [ ] Customer mobile/web login: `demo.insurance.overdue@example.com` / `DemoInsurance123!`
- [ ] Customer mobile/web login: `demo.insurance.renewal@example.com` / `DemoInsurance123!`
- [ ] Customer mobile/web login: `demo.insurance.history@example.com` / `DemoInsurance123!`

## Demo scenarios

- [ ] Review queue: `demo.insurance.review@example.com` -> `submitted`, `under_review`
- [ ] Missing documents: `demo.insurance.documents@example.com` -> `needs_documents`
- [ ] Payment follow-up: `demo.insurance.payment@example.com` -> `payment_pending`, `proof_submitted`
- [ ] Overdue payment: `demo.insurance.overdue@example.com` -> `payment_pending`, `overdue`
- [ ] Renewal workflow: `demo.insurance.renewal@example.com` -> `for_renewal`, `awaiting_customer`
- [ ] Completed history: `demo.insurance.history@example.com` -> `closed`

## Staff web checks

- [ ] Open `/insurance` and confirm the queue is not empty.
- [ ] Confirm summary cards reflect seeded states:
  new inquiry, payment pending, for renewal, needs documents.
- [ ] Search for `DEMO_INS_review_submitted` and confirm the case appears.
- [ ] Search for `DEMO_INS_documents_missing` and confirm the missing-documents case appears.
- [ ] Search for `DEMO_INS_payment_overdue` and confirm the overdue payment case appears.
- [ ] Search for `DEMO_INS_renewal_awaiting_customer` and confirm the renewal case appears.
- [ ] Select a case and confirm the detail tabs load:
  Overview, Documents, Timeline, Payment, Renewal, Activity.

## Phase 1: Intake and review workspace

- [ ] Open the review-queue customer cases and confirm one case is `submitted`.
- [ ] Open the second review-queue case and confirm one case is `under_review`.
- [ ] Update a workflow field and save successfully.
- [ ] Confirm activity/timeline updates still load after refresh.

## Phase 2: Collections

- [ ] Open the payment follow-up scenario and confirm one case shows unpaid/payment follow-up behavior.
- [ ] Open the proof-submitted scenario and confirm proof/payment review details are visible.
- [ ] Open the overdue scenario and confirm overdue status is visible in the insurance workspace.
- [ ] Open `/insurance/collections` and confirm payment states appear there too.

## Phase 3: Renewals

- [ ] Open the renewal scenario and confirm one case is due/upcoming.
- [ ] Confirm the second renewal case reflects `awaiting_customer`.
- [ ] Open `/insurance/renewals` and confirm renewal-focused filtering/listing works.
- [ ] Update renewal status or dates and confirm the save succeeds.

## Phase 4A: Workflow-triggered in-app reminders

- [ ] Log in as `demo.insurance.documents@example.com` and confirm a missing-documents notification exists.
- [ ] Log in as `demo.insurance.payment@example.com` and confirm a payment-pending notification exists.
- [ ] Log in as `demo.insurance.overdue@example.com` and confirm an overdue-payment notification exists.
- [ ] Log in as `demo.insurance.renewal@example.com` and confirm renewal-related notifications exist.

## Phase 4B: Manual staff reminders

- [ ] In `/insurance`, select a seeded case and send a manual reminder.
- [ ] Test single-case reminder sending.
- [ ] Test selected-cases reminder sending.
- [ ] Test filtered-results reminder sending.
- [ ] Confirm the result summary shows sent/skipped/failed information.
- [ ] Confirm the case `Activity` history shows `manual_reminder_sent`.

## Phase 4C: Custom in-app broadcasts

- [ ] In `/insurance`, enter a custom broadcast title and message.
- [ ] Test selected-cases broadcast sending.
- [ ] Test filtered-results broadcast sending.
- [ ] Confirm the audience preview updates before send.
- [ ] Confirm the result summary shows deduped customer send results.
- [ ] Confirm the case `Activity` history shows `manual_broadcast_sent`.

## Customer mobile checks

- [ ] Review queue customer: confirm active inquiry list and status tracking load.
- [ ] Missing-documents customer: confirm required-document guidance is visible.
- [ ] Payment customer: confirm payment/proof-of-payment area is visible.
- [ ] Overdue customer: confirm overdue payment messaging is visible.
- [ ] Renewal customer: confirm renewal reminder/status is visible.
- [ ] History customer: confirm completed insurance history is visible.

## Quick pass / done signal

- [ ] Web queue populated
- [ ] Collections usable
- [ ] Renewals usable
- [ ] In-app reminders visible
- [ ] Manual reminders working
- [ ] Custom broadcasts working
- [ ] Mobile customer scenarios visible
