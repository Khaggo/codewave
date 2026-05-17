# Insurance Root Branch Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the completed insurance phases from clean local `main` into the real updated `feat/web-mobile-frontend-update` system that powers `http://127.0.0.1:3002`.

**Architecture:** Treat this as a targeted sync, not a rewrite. Copy the finalized insurance stack and its notification dependencies from the clean `main` snapshot into the real updated UI branch, preserve unrelated local edits, then verify the live root app and insurance-specific automated coverage.

**Tech Stack:** Next.js web frontend, NestJS backend, Jest, Node test runner, Git diff/copy workflow.

---

### Task 1: Inventory the insurance-specific delta against clean main

**Files:**
- Modify: `C:/Vscode/Main/codewave/docs/superpowers/plans/2026-05-15-insurance-root-branch-reconciliation.md`
- Inspect: `C:/Vscode/Main/codewave/frontend/src/app/insurance/InsuranceContent.js`
- Inspect: `C:/Vscode/Main/codewave/frontend/src/app/insurance/collections/CollectionsContent.js`
- Inspect: `C:/Vscode/Main/codewave/frontend/src/app/insurance/renewals/RenewalsContent.js`
- Inspect: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Inspect: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/notifications/services/notifications.service.ts`
- Inspect baseline: `C:/Vscode/Main/codewave/.worktrees/main-clean-inspection`

- [ ] **Step 1: Capture the insurance-only diff list against clean `main`**

Run:
```powershell
git diff --name-status --no-renames d19a1b0..feat/web-mobile-frontend-update -- frontend/src/app/insurance frontend/src/lib/insuranceStaffClient.js backend/apps/main-service/src/modules/insurance backend/apps/main-service/src/modules/notifications backend/shared/events/contracts/notification-triggers.ts docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md frontend/src/components/ui/PageHeader.js
```
Expected: only a focused list of insurance and notification-support files to reconcile.

- [ ] **Step 2: Verify the real branch already contains the route skeletons we expect**

Run:
```powershell
Get-ChildItem -Name 'frontend/src/app/insurance'
Get-ChildItem -Name 'backend/apps/main-service/src/modules/insurance/dto'
```
Expected: insurance, collections, renewals, reminders, and broadcast DTO entrypoints already exist so reconciliation can be file-level instead of architecture-level.

- [ ] **Step 3: Commit nothing yet**

Do not stage or commit after inventory. This task only confirms scope.

### Task 2: Sync finalized insurance frontend files into the real updated branch

**Files:**
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/InsuranceContent.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/insuranceView.mjs`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/insuranceView.test.mjs`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/collections/CollectionsContent.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/app/insurance/renewals/RenewalsContent.js`
- Modify: `C:/Vscode/Main/codewave/frontend/src/lib/insuranceStaffClient.js`
- Modify if needed: `C:/Vscode/Main/codewave/frontend/src/components/ui/PageHeader.js`

- [ ] **Step 1: Copy the finalized insurance UI files from clean `main` into the root branch**

Run:
```powershell
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/frontend/src/app/insurance/InsuranceContent.js' 'C:/Vscode/Main/codewave/frontend/src/app/insurance/InsuranceContent.js' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/frontend/src/app/insurance/insuranceView.mjs' 'C:/Vscode/Main/codewave/frontend/src/app/insurance/insuranceView.mjs' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/frontend/src/app/insurance/insuranceView.test.mjs' 'C:/Vscode/Main/codewave/frontend/src/app/insurance/insuranceView.test.mjs' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/frontend/src/app/insurance/collections/CollectionsContent.js' 'C:/Vscode/Main/codewave/frontend/src/app/insurance/collections/CollectionsContent.js' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/frontend/src/app/insurance/renewals/RenewalsContent.js' 'C:/Vscode/Main/codewave/frontend/src/app/insurance/renewals/RenewalsContent.js' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/frontend/src/lib/insuranceStaffClient.js' 'C:/Vscode/Main/codewave/frontend/src/lib/insuranceStaffClient.js' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/frontend/src/components/ui/PageHeader.js' 'C:/Vscode/Main/codewave/frontend/src/components/ui/PageHeader.js' -Force
```
Expected: root branch now has the verified insurance UI behavior from clean `main` while keeping the surrounding updated shell.

- [ ] **Step 2: Run the focused frontend insurance test suite**

Run:
```powershell
node --test frontend/src/app/insurance/insuranceView.test.mjs
```
Expected: all insurance frontend helper/view tests pass.

- [ ] **Step 3: Run frontend lint on the root branch**

Run:
```powershell
npm.cmd run lint
```
Workdir: `C:/Vscode/Main/codewave/frontend`
Expected: no ESLint errors.

- [ ] **Step 4: Commit the frontend reconciliation slice**

Run:
```powershell
git add frontend/src/app/insurance/InsuranceContent.js frontend/src/app/insurance/insuranceView.mjs frontend/src/app/insurance/insuranceView.test.mjs frontend/src/app/insurance/collections/CollectionsContent.js frontend/src/app/insurance/renewals/RenewalsContent.js frontend/src/lib/insuranceStaffClient.js frontend/src/components/ui/PageHeader.js
git commit -m "feat: reconcile insurance frontend into updated shell"
```
Expected: one focused frontend commit.

### Task 3: Sync finalized insurance backend and notification foundation into the real updated branch

**Files:**
- Modify: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- Modify: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Modify: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts`
- Modify: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts`
- Modify: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/notifications/schemas/notifications.schema.ts`
- Modify: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/notifications/services/notification-trigger-planner.service.ts`
- Modify: `C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/notifications/services/notifications.service.ts`
- Modify: `C:/Vscode/Main/codewave/backend/shared/events/contracts/notification-triggers.ts`
- Modify tests: `C:/Vscode/Main/codewave/backend/apps/main-service/test/insurance.integration.spec.ts`
- Modify tests: `C:/Vscode/Main/codewave/backend/apps/main-service/test/insurance.service.spec.ts`
- Modify tests: `C:/Vscode/Main/codewave/backend/apps/main-service/test/notifications.integration.spec.ts`
- Modify tests: `C:/Vscode/Main/codewave/backend/apps/main-service/test/notifications.service.spec.ts`

- [ ] **Step 1: Copy the finalized backend insurance and notification files from clean `main`**

Run:
```powershell
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/src/modules/insurance/services/insurance.service.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/services/insurance.service.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/src/modules/notifications/schemas/notifications.schema.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/notifications/schemas/notifications.schema.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/src/modules/notifications/services/notification-trigger-planner.service.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/notifications/services/notification-trigger-planner.service.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/src/modules/notifications/services/notifications.service.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/src/modules/notifications/services/notifications.service.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/shared/events/contracts/notification-triggers.ts' 'C:/Vscode/Main/codewave/backend/shared/events/contracts/notification-triggers.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/test/insurance.integration.spec.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/test/insurance.integration.spec.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/test/insurance.service.spec.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/test/insurance.service.spec.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/test/notifications.integration.spec.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/test/notifications.integration.spec.ts' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/backend/apps/main-service/test/notifications.service.spec.ts' 'C:/Vscode/Main/codewave/backend/apps/main-service/test/notifications.service.spec.ts' -Force
```
Expected: the real branch gets the exact backend layer already verified on clean `main`.

- [ ] **Step 2: Run the insurance and notifications backend suites on the root branch**

Run:
```powershell
npm.cmd test -- notifications.integration.spec.ts notifications.service.spec.ts insurance.service.spec.ts insurance.integration.spec.ts
```
Workdir: `C:/Vscode/Main/codewave/backend/apps/main-service`
Expected: all listed suites pass.

- [ ] **Step 3: Commit the backend reconciliation slice**

Run:
```powershell
git add backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts backend/apps/main-service/src/modules/insurance/services/insurance.service.ts backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts backend/apps/main-service/src/modules/notifications/schemas/notifications.schema.ts backend/apps/main-service/src/modules/notifications/services/notification-trigger-planner.service.ts backend/apps/main-service/src/modules/notifications/services/notifications.service.ts backend/shared/events/contracts/notification-triggers.ts backend/apps/main-service/test/insurance.integration.spec.ts backend/apps/main-service/test/insurance.service.spec.ts backend/apps/main-service/test/notifications.integration.spec.ts backend/apps/main-service/test/notifications.service.spec.ts
git commit -m "feat: reconcile insurance backend workflows into updated shell"
```
Expected: one focused backend commit.

### Task 4: Sync supporting docs and verify the real root app runtime

**Files:**
- Modify: `C:/Vscode/Main/codewave/docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `C:/Vscode/Main/codewave/docs/architecture/domains/main-service/insurance.md`
- Modify: `C:/Vscode/Main/codewave/docs/superpowers/specs/2026-05-15-insurance-module-phase-4c-broadcasts-design.md`

- [ ] **Step 1: Copy the finalized docs from clean `main`**

Run:
```powershell
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/docs/contracts/T515-insurance-review-and-status-web-flow.md' 'C:/Vscode/Main/codewave/docs/contracts/T515-insurance-review-and-status-web-flow.md' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/docs/architecture/domains/main-service/insurance.md' 'C:/Vscode/Main/codewave/docs/architecture/domains/main-service/insurance.md' -Force
Copy-Item 'C:/Vscode/Main/codewave/.worktrees/main-clean-inspection/docs/superpowers/specs/2026-05-15-insurance-module-phase-4c-broadcasts-design.md' 'C:/Vscode/Main/codewave/docs/superpowers/specs/2026-05-15-insurance-module-phase-4c-broadcasts-design.md' -Force
```
Expected: root docs match the reconciled runtime behavior.

- [ ] **Step 2: Commit the docs sync**

Run:
```powershell
git add docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md docs/superpowers/specs/2026-05-15-insurance-module-phase-4c-broadcasts-design.md
git commit -m "docs: sync insurance reconciliation notes"
```
Expected: docs commit is separate from code changes.

- [ ] **Step 3: Verify the real updated system routes load on `3002`**

Run:
```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/insurance -TimeoutSec 20).StatusCode
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/bookings -TimeoutSec 20).StatusCode
```
Expected: both commands return `200`.

- [ ] **Step 4: Commit nothing if runtime verification fails**

If either route fails, stop and debug before any more commits.

### Task 5: Final verification and handoff on the real updated branch

**Files:**
- Inspect: `C:/Vscode/Main/codewave`

- [ ] **Step 1: Run all required verification commands fresh on the root branch**

Run:
```powershell
npm.cmd test -- notifications.integration.spec.ts notifications.service.spec.ts insurance.service.spec.ts insurance.integration.spec.ts
```
Workdir: `C:/Vscode/Main/codewave/backend/apps/main-service`

Run:
```powershell
node --test frontend/src/app/insurance/insuranceView.test.mjs
```
Workdir: `C:/Vscode/Main/codewave`

Run:
```powershell
npm.cmd run lint
```
Workdir: `C:/Vscode/Main/codewave/frontend`

Run:
```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/insurance -TimeoutSec 20).StatusCode
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/bookings -TimeoutSec 20).StatusCode
```
Expected: backend suites pass, insurance frontend tests pass, lint passes, and both live routes return `200`.

- [ ] **Step 2: Capture final git status for honest reporting**

Run:
```powershell
git status --short
```
Expected: shows the new insurance reconciliation commits plus any pre-existing unrelated local changes that were intentionally preserved.

- [ ] **Step 3: Handoff**

Report exactly:
- which insurance phases are now reconciled into `3002`
- which verification commands passed
- any remaining non-insurance dirty files preserved on the branch
- that the user should now inspect the actual updated system on `http://127.0.0.1:3002`
