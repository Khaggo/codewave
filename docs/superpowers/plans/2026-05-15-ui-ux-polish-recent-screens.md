# UI/UX Polish for Recently Touched Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the recently touched web and mobile screens cleaner, more guided, more consistent, and easier to use without changing the current Cruiser’s Crib dark/orange brand direction.

**Architecture:** Execute the cleanup in layers: shared UI foundation first, then web workspaces, then mobile screens, then a final consistency and verification sweep. Keep the pass usability-first by fixing missing/weak actions, strengthening guidance, and only then refining the visual polish.

**Tech Stack:** Next.js web frontend, React Native / Expo mobile frontend, shared CSS/Tailwind utility patterns, local browser verification, Node test runner, ESLint.

---

### Task 1: Shared UI Foundation Cleanup

**Files:**
- Modify: `C:/Vscode/Main/codewave/frontend/src/components/ui/PageHeader.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/components/ui/ConfirmDialog.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/globals.css`
- Inspect: `C:/Vscode/Main/codewave/frontend/src/components/layout/Sidebar.js`
- Test: `C:/Vscode/Main/codewave/frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Audit the shared UI touchpoints used by the recent screens**

Run:
```powershell
rg "PageHeader|ConfirmDialog|badge-|card|empty-panel|btn-" -n frontend/src
```
Expected: identify the shared visual primitives used by the recently touched screens.

- [ ] **Step 2: Normalize shared header, panel, and button visual rhythm**

Adjust:
- header spacing and hierarchy
- primary/secondary/disabled button consistency
- card/panel padding and border treatment
- empty-state and badge balance

Edit only the shared files listed above and keep the existing dark/orange direction intact.

- [ ] **Step 3: Run focused frontend insurance helper tests**

Run:
```powershell
node --test frontend/src/app/insurance/insuranceView.test.mjs
```
Expected: PASS

- [ ] **Step 4: Run frontend lint**

Run:
```powershell
npm.cmd run lint
```
Workdir: `C:/Vscode/Main/codewave/frontend`
Expected: no ESLint errors.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/ui/PageHeader.js frontend/src/components/ui/ConfirmDialog.js frontend/src/app/globals.css frontend/src/components/layout/Sidebar.js
git commit -m "style: refine shared ui foundation for recent screens"
```

### Task 2: Web Insurance Main Workspace Polish

**Files:**
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/InsuranceContent.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/insuranceView.mjs`
- Test: `C:/Vscode/Main/codewave/frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Improve the insurance main workspace hierarchy**

Refine:
- summary banner density
- summary cards
- queue filter bar
- action grouping
- reminder/broadcast sections
- selected/visible count presentation

Keep the functionality intact while improving readability and next-step clarity.

- [ ] **Step 2: Fix missing or weak actions in the main workspace**

Specifically review:
- primary action emphasis
- select/clear/send actions
- refresh controls
- empty state guidance
- send-readiness messaging

- [ ] **Step 3: Run the insurance view tests**

Run:
```powershell
node --test frontend/src/app/insurance/insuranceView.test.mjs
```
Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/app/insurance/InsuranceContent.js frontend/src/app/insurance/insuranceView.mjs frontend/src/app/insurance/insuranceView.test.mjs
git commit -m "style: polish insurance main workspace ux"
```

### Task 3: Web Collections and Renewals Workspace Polish

**Files:**
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/collections/CollectionsContent.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/collections/CollectionsPanels.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/collections/insuranceCollectionsView.mjs`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/renewals/RenewalsContent.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/renewals/RenewalsPanels.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/renewals/insuranceRenewalsView.mjs`
- Test: `C:/Vscode/Main/codewave/frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
- Test: `C:/Vscode/Main/codewave/frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`

- [ ] **Step 1: Improve collections workspace layout and action hierarchy**

Refine:
- due/payment emphasis
- filter readability
- action panel grouping
- card spacing
- empty and loading states

- [ ] **Step 2: Improve renewals workspace urgency/readability**

Refine:
- time-window emphasis
- stage/action clarity
- summary card readability
- queue/detail relationship
- follow-up actions

- [ ] **Step 3: Run collections and renewals helper tests**

Run:
```powershell
node --test frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs
```
Expected: PASS

- [ ] **Step 4: Run frontend lint**

Run:
```powershell
npm.cmd run lint
```
Workdir: `C:/Vscode/Main/codewave/frontend`
Expected: no ESLint errors.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/app/insurance/collections/CollectionsContent.js frontend/src/app/insurance/collections/CollectionsPanels.js frontend/src/app/insurance/collections/insuranceCollectionsView.mjs frontend/src/app/insurance/renewals/RenewalsContent.js frontend/src/app/insurance/renewals/RenewalsPanels.js frontend/src/app/insurance/renewals/insuranceRenewalsView.mjs frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs
git commit -m "style: polish insurance collections and renewals workspaces"
```

### Task 4: Mobile Insurance and Recently Touched Customer Flow Polish

**Files:**
- Modify: `C:/Vscode/Main/codewave/mobile/src/screens/InsuranceInquiryScreen.js`
- Modify: `C:/Vscode/Main/codewave/mobile/src/screens/insuranceModuleView.mjs`
- Modify: `C:/Vscode/Main/codewave/mobile/src/screens/Dashboard.js`
- Modify if needed: `C:/Vscode/Main/codewave/mobile/src/lib/notificationClient.js`
- Modify if needed: `C:/Vscode/Main/codewave/mobile/src/lib/insuranceClient.js`
- Test: `C:/Vscode/Main/codewave/mobile/src/screens/insuranceModuleView.test.mjs`
- Test: `C:/Vscode/Main/codewave/mobile/src/lib/notificationClient.test.mjs`

- [ ] **Step 1: Improve mobile insurance home and inquiry guidance**

Refine:
- top-level card hierarchy
- spacing and section balance
- upload/payment/renewal action visibility
- status and timeline readability

- [ ] **Step 2: Improve recently touched dashboard/reminder surfaces**

Refine:
- reminder visibility
- action-needed vs informational balance
- button placement and tap clarity

- [ ] **Step 3: Run mobile insurance/reminder tests**

Run:
```powershell
node --test mobile/src/screens/insuranceModuleView.test.mjs mobile/src/lib/notificationClient.test.mjs
```
Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add mobile/src/screens/InsuranceInquiryScreen.js mobile/src/screens/insuranceModuleView.mjs mobile/src/screens/Dashboard.js mobile/src/lib/notificationClient.js mobile/src/lib/insuranceClient.js mobile/src/screens/insuranceModuleView.test.mjs mobile/src/lib/notificationClient.test.mjs
git commit -m "style: polish mobile insurance and reminder flows"
```

### Task 5: Cross-Screen Consistency Sweep and Runtime Verification

**Files:**
- Inspect: `C:/Vscode/Main/codewave/frontend`
- Inspect: `C:/Vscode/Main/codewave/mobile`

- [ ] **Step 1: Re-check the shared visual system after all screen-level changes**

Review:
- button consistency
- panel spacing
- empty states
- labels and helper text
- action emphasis

Make only minimal cleanup edits needed to harmonize the final pass.

- [ ] **Step 2: Run full required verification commands**

Run:
```powershell
node --test frontend/src/app/insurance/insuranceView.test.mjs frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs
```
Workdir: `C:/Vscode/Main/codewave`

Run:
```powershell
npm.cmd run lint
```
Workdir: `C:/Vscode/Main/codewave/frontend`

Run:
```powershell
node --test mobile/src/screens/insuranceModuleView.test.mjs mobile/src/lib/notificationClient.test.mjs
```
Workdir: `C:/Vscode/Main/codewave`

Run:
```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/insurance -TimeoutSec 20).StatusCode
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/bookings -TimeoutSec 20).StatusCode
```
Expected: tests pass, lint passes, and both routes return `200`.

- [ ] **Step 3: Commit the final polish sweep**

```powershell
git add frontend mobile
git commit -m "style: unify recent web and mobile screen polish"
```

- [ ] **Step 4: Capture final git status for honest handoff**

Run:
```powershell
git status --short
```
Expected: show the new polish commits plus any preserved unrelated dirty files already on the branch.
