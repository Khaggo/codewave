# Release Checklist

## Panel Defense Evidence

- [ ] Cite persisted `VEH`, `JO`, `INS`, and `BJ` references from the current API/UI evidence;
  never show UUIDs or hash-derived labels.
- [ ] Demonstrate Booking/Intake -> Job Order -> QA -> Finalization -> Payment with the current
  adviser-owned technician-profile role model.
- [ ] Explain Insurance as guided inquiry, document tracking, staff review, and customer updates;
  do not claim insurer approval, repair authorization, or structured estimate handoff.
- [ ] Explain Loyalty qualification from qualifying paid service work and show the customer-safe
  earning policy; do not claim Accessories purchases earn points.
- [ ] Explain that lifecycle AI is optional, disabled by default, evidence-filtered, and hidden
  until adviser or super-admin approval. Do not present failed/unconfigured output as AI.
- [ ] Use the current Mermaid sources for process, state, staff lifecycle, use-case, activity,
  FDD, and architecture figures; check rendered figure readability in the final manuscript.
- [ ] Attach exact automated evidence and label live Playwright, live viewport, and survey results
  as pending until they have actually been run or collected.
- [ ] Keep Kanban as the declared methodology. Treat Sprint headings as planning groupings, not a
  claim of Scrum ceremonies or fixed iteration results.

## Before Merge

- Required CI and CODEOWNERS review pass.
- API and database compatibility are documented.
- Relevant tests and responsive UI checks pass.
- No credential, runtime output, generated build, or local screenshot is staged.

## Before Deploy

- `npm run check`, production builds, and dependency audits pass.
- Drizzle migrations pass against an empty database and a current-schema copy.
- Railway environment variables and health paths are verified.
- Operational scripts remain in dry-run unless the approved release step requires execution.

## After Deploy

- Main API, staff web, and customer mobile API discovery are healthy.
- Login, Booking to Job Order, QA, Finalization, Payment, and notification smoke flows pass.
- Logs show no new authorization, migration, contract, or unhandled request errors.
- Rollback owner and deployment identifier are recorded in the release note.
