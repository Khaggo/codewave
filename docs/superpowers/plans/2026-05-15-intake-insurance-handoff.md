# Intake + Insurance Handoff

Date: 2026-05-15  
Primary review app: `http://127.0.0.1:3002`  
Repo: `C:\Vscode\Main\codewave`  
Working branch: `feat/web-mobile-frontend-update`

## Current app target

- The real local app to review is `3002`, not the older worktree ports like `3112` or the clean `main` inspection app on `3122`.
- Backend paired with this flow is the local root backend on `3000`.

## Insurance status

The insurance module work is already reconciled onto the real `3002` system.

Included on the current branch:
- Phase 1: insurance workspace
- Phase 2: collections
- Phase 3: renewals
- Phase 4A: automatic in-app reminders
- Phase 4B: manual staff reminders
- Phase 4C: custom in-app broadcasts

## Insurance UX cleanup already done

Recent cleanup/polish already applied on the real branch includes:
- removed redundant "ready" chips at the top of the insurance workspace
- removed bulky reminder/broadcast readiness helper cards
- widened the insurance tables to use the available width better
- changed the theme picker to a Radix dropdown menu
- reduced bulky dashboard shortcut cards
- shortened bulky insurance copy and helper text in several places

## Interview context summary

This work was guided by the interview and recording context, not only by the older screens.

Key interview takeaways:
- the real process starts with customer assistance and concern capture
- missing documents are a common blocker
- insurance progress needs a centralized workspace instead of scattered manual follow-up
- payment checking and proof-of-payment follow-up are recurring staff pain points
- renewals are recurring work and should be tracked explicitly
- reminders are needed for:
  - missing documents
  - payment follow-up
  - renewal follow-up
  - later promo or product outreach
- walk-ins and non-booked arrivals are part of the real business flow
- front desk should first identify:
  - who arrived
  - why they came in
  - what requirements or documents they already brought
  - then continue into inspection, service, or insurance handling

How that interview context maps into the product decisions:
- intake is being redesigned as a front-desk arrival and triage flow
- insurance is a specialized lifecycle workspace for:
  - review
  - collections
  - renewals
  - reminders
  - broadcasts
- insurance-related arrivals should start in intake, then hand off into the insurance module
- arrival inspection remains always visible because condition capture matters across service, insurance, and back-job visits
- notifications stay in-app only for now

## Demo seed

Reusable insurance demo seed exists.

Run:

```powershell
cd C:\Vscode\Main\codewave\backend
npm.cmd run seed:insurance-demo
```

Demo staff login:
- `demo.insurance.staff@example.com`
- `DemoInsurance123!`

Demo customer logins:
- `demo.insurance.review@example.com`
- `demo.insurance.documents@example.com`
- `demo.insurance.payment@example.com`
- `demo.insurance.overdue@example.com`
- `demo.insurance.renewal@example.com`
- `demo.insurance.history@example.com`
- Password for all: `DemoInsurance123!`

Related files:
- `C:\Vscode\Main\codewave\backend\scripts\seed-insurance-demo.ts`
- `C:\Vscode\Main\codewave\docs\superpowers\plans\2026-05-15-insurance-demo-seed-checklist.md`

## Intake redesign direction

Approved product direction:
- Intake becomes the first front-desk arrival screen for both regular service and insurance-related arrivals
- Insurance-specific deeper processing still belongs in the insurance module
- Walk-ins are first-class
- Visit type choices:
  - `regular_service`
  - `insurance_related`
  - `back_job_complaint`
  - `inspection_only`
- Customer concern is required before inspection
- Requirements check is lightweight
- Arrival inspection is always shown

Approved intake structure:
1. Arrival
2. Visit Type
3. Customer Concern
4. Requirements
5. Arrival Inspection
6. Inspection History
7. Next Step Actions

## Intake docs created

Spec:
- `C:\Vscode\Main\codewave\docs\superpowers\specs\2026-05-15-intake-inspection-front-desk-alignment-design.md`

Plan:
- `C:\Vscode\Main\codewave\docs\superpowers\plans\2026-05-15-intake-inspection-front-desk-alignment.md`

## Intake implementation status

### Task 1 completed

Commit:
- `a1ca92b` `feat: extend intake draft for front-desk triage`

Added draft/payload support for:
- `arrivalType`
- `visitType`
- `reasonForVisit`
- `requestedServiceSummary`
- `isRepeatVisit`
- `urgencyFlag`
- `requirementsChecklist`
- `missingRequirementsNote`
- `nextRoute`

Files:
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.mjs`
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs`

### Task 2 completed

Commit:
- `df2785b` `feat: refresh intake hero and actions`

Updated:
- intake hero copy
- primary action label helper
- fallback tests

Files:
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.mjs`
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.test.mjs`

### Task 3 completed

Commit:
- `a57e5dc` `feat: reorder intake workspace for front-desk flow`

Updated:
- intake page reordered into the approved front-desk flow
- primary save label now reflects visit type more honestly
- requirements badge no longer overstates readiness

Files touched in the current Task 3 slice:
- `C:\Vscode\Main\codewave\frontend\src\screens\DigitalIntakeInspectionWorkspace.js`
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.mjs`
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.test.mjs`
- `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

Focused tests that passed:

```powershell
node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
```

## Current live task

Task 4 is in progress:
- wire lightweight requirements logic and next-route behavior by visit type
- keep booking optional for walk-ins
- keep insurance-related requirements more relevant without inventing deeper backend routing yet

Expected Task 4 file scope:
- `C:\Vscode\Main\codewave\frontend\src\screens\DigitalIntakeInspectionWorkspace.js`
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.mjs`
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs`

## Useful commands

Frontend focused tests:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs
node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Frontend lint:

```powershell
cd C:\Vscode\Main\codewave\frontend
npm.cmd run lint
```

## Recommended next-session prompt

Use something like:

> Continue from `C:\Vscode\Main\codewave\docs\superpowers\plans\2026-05-15-intake-inspection-front-desk-alignment.md` and `C:\Vscode\Main\codewave\docs\superpowers\plans\2026-05-15-intake-insurance-handoff.md`. Work on the real local app at `http://127.0.0.1:3002`. Tasks 1-3 are complete. Resume at Task 4.
