# Admin Operations Workspaces Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Catalog Admin, Inventory, Staff Accounts, and Analytics & Summaries on the real `3002` app so they are cleaner, more consistent, and aligned to the interview-driven operations flow.

**Architecture:** Keep the existing routes and data sources, but reshape each workspace around its real operational role. Catalog Admin and Inventory become paired but separate queue-first admin surfaces, Staff Accounts becomes a cleaner provisioning/control workspace, and Analytics remains read-only with current-operations-first emphasis.

**Tech Stack:** Next.js App Router, React, local screen components under `frontend/src/screens`, existing shared UI tokens in `frontend/src/app/globals.css`, Node test runner, ESLint.

---

## File map

- `C:\Vscode\Main\codewave\frontend\src\screens\ShopProductAdmin.js`
  - Catalog Admin screen; currently form-heavy and needs queue-first publishing flow.
- `C:\Vscode\Main\codewave\frontend\src\screens\InventoryWorkspace.js`
  - Inventory screen; currently closer to read-only catalog metadata and needs true stock-ops emphasis.
- `C:\Vscode\Main\codewave\frontend\src\components\StaffProvisioningPanel.js`
  - Staff Accounts surface; currently provisioning-heavy and needs cleaner list/status-first balance.
- `C:\Vscode\Main\codewave\frontend\src\screens\AdminAnalyticsWorkspace.js`
  - Analytics screen; should stay read-only but emphasize current operations first.
- `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
  - Shared regression file for concise copy/layout-order assertions.
- `C:\Vscode\Main\codewave\frontend\src\screens\adminAnalyticsView.test.mjs`
  - Focused analytics helper regression coverage.
- `C:\Vscode\Main\codewave\frontend\src\app\globals.css`
  - Shared visual tokens if any small cross-workspace badge/spacing polish is needed.

### Task 1: Lock redesign expectations in shared tests

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Add failing copy/layout expectations for the four workspaces**

Add assertions for:
- Catalog Admin using concise marketplace-publishing copy
- Inventory using stock-operations wording instead of read-only catalog-inspection emphasis
- Staff Accounts using concise provisioning/control wording
- Analytics using current-operations-first wording

Use patterns like:

```js
test('catalog, inventory, staff, and analytics workspaces use concise operational copy', () => {
  const catalog = readFileSync('C:/Vscode/Main/codewave/frontend/src/screens/ShopProductAdmin.js', 'utf8')
  const inventory = readFileSync('C:/Vscode/Main/codewave/frontend/src/screens/InventoryWorkspace.js', 'utf8')
  const staff = readFileSync('C:/Vscode/Main/codewave/frontend/src/components/StaffProvisioningPanel.js', 'utf8')
  const analytics = readFileSync('C:/Vscode/Main/codewave/frontend/src/screens/AdminAnalyticsWorkspace.js', 'utf8')

  assert.ok(catalog.includes('Publish and manage customer-visible marketplace products.'))
  assert.ok(inventory.includes('Track stock levels, restock needs, and item availability.'))
  assert.ok(staff.includes('Create accounts, manage access, and keep operations staffing usable.'))
  assert.ok(analytics.includes('Review today\'s workload, bottlenecks, and live operational signals.'))
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: FAIL on missing new strings/order.

- [ ] **Step 3: Commit the failing-spec test**

```bash
git -C C:\Vscode\Main\codewave add frontend/src/screens/workspaceCopyCleanup.test.mjs
git -C C:\Vscode\Main\codewave commit -m "test: lock admin operations workspace redesign goals"
```

### Task 2: Redesign Catalog Admin as marketplace publishing workspace

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\ShopProductAdmin.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Write/extend failing assertions for Catalog Admin structure**

Add expectations that the screen now centers on:
- compact header
- product filters/search
- main product list first
- selected product detail below
- create/edit/publish form after list/detail

Use source-order assertions similar to the service-flow cleanup tests.

- [ ] **Step 2: Run test to verify Catalog assertions fail**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: FAIL on Catalog Admin ordering/copy.

- [ ] **Step 3: Implement minimal Catalog Admin redesign**

In `ShopProductAdmin.js`:
- change header copy to marketplace-publishing language
- reduce bulky intro/helper text
- move product list above the large editor form
- keep create/edit/publish features, but make the list the primary surface
- make selected product detail feel like the bridge between list and editor

Use compact wording such as:

```js
<PageHeader
  eyebrow="Marketplace publishing"
  title="Catalog Admin"
  description="Publish and manage customer-visible marketplace products."
/>
```

- [ ] **Step 4: Run test to verify Catalog assertions pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: PASS for Catalog assertions.

- [ ] **Step 5: Commit Catalog Admin redesign**

```bash
git -C C:\Vscode\Main\codewave add frontend/src/screens/ShopProductAdmin.js frontend/src/screens/workspaceCopyCleanup.test.mjs
git -C C:\Vscode\Main\codewave commit -m "style: redesign catalog admin as marketplace workspace"
```

### Task 3: Redesign Inventory as stock-operations workspace

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\InventoryWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Add failing assertions for Inventory wording and order**

Assert that Inventory emphasizes:
- stock levels
- low/out-of-stock state
- adjustment/restock workflow
- product list first, detail below

- [ ] **Step 2: Run focused test to verify it fails**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: FAIL on Inventory expectations.

- [ ] **Step 3: Implement minimal Inventory redesign**

In `InventoryWorkspace.js`:
- retitle and recopy the workspace around stock operations
- keep linked product context, but remove the “inspect current catalog metadata” framing as the primary identity
- surface stock state and inventory attention first
- move detail and adjustment areas below the list
- keep low-stock/out-of-stock filtering visible

Target copy:

```js
<PageHeader
  eyebrow="Stock operations"
  title="Inventory"
  description="Track stock levels, restock needs, and item availability."
/>
```

- [ ] **Step 4: Run tests to verify Inventory assertions pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: PASS for Inventory assertions.

- [ ] **Step 5: Commit Inventory redesign**

```bash
git -C C:\Vscode\Main\codewave add frontend/src/screens/InventoryWorkspace.js frontend/src/screens/workspaceCopyCleanup.test.mjs
git -C C:\Vscode\Main\codewave commit -m "style: redesign inventory as stock workspace"
```

### Task 4: Redesign Staff Accounts as provisioning/control workspace

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\components\StaffProvisioningPanel.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Add failing assertions for Staff Accounts tone**

Assert that the page uses concise account-control wording and avoids overloading the main surface with provisioning-only help text.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: FAIL on Staff Accounts assertions.

- [ ] **Step 3: Implement minimal Staff Accounts redesign**

In `StaffProvisioningPanel.js`:
- keep create + activate/deactivate
- make account list/status more central visually
- tighten helper copy
- group by role/status more clearly
- make the provisioning form feel secondary to the operational list

Use shorter copy like:

```js
'Create accounts, manage access, and keep operations staffing usable.'
```

- [ ] **Step 4: Run tests to verify Staff Accounts assertions pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: PASS for Staff Accounts assertions.

- [ ] **Step 5: Commit Staff Accounts redesign**

```bash
git -C C:\Vscode\Main\codewave add frontend/src/components/StaffProvisioningPanel.js frontend/src/screens/workspaceCopyCleanup.test.mjs
git -C C:\Vscode\Main\codewave commit -m "style: redesign staff accounts workspace"
```

### Task 5: Redesign Analytics & Summaries as current-operations-first insight page

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\AdminAnalyticsWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\adminAnalyticsView.test.mjs`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\adminAnalyticsView.test.mjs`

- [ ] **Step 1: Add failing analytics assertions**

Add or extend tests so analytics is expected to:
- lead with current workload and bottlenecks
- stay read-only
- de-emphasize low-signal filler or chart-first framing

- [ ] **Step 2: Run analytics tests to verify failure**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\adminAnalyticsView.test.mjs C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: FAIL on analytics wording/ordering.

- [ ] **Step 3: Implement minimal analytics redesign**

In `AdminAnalyticsWorkspace.js`:
- keep it read-only
- reorder the page so today/current operations is first
- move secondary historical/trend content lower
- reduce bulky explanation copy
- remove any action-heavy presentation cues

Target description:

```js
<PageHeader
  eyebrow="Operational insight"
  title="Analytics & Summaries"
  description="Review today's workload, bottlenecks, and live operational signals."
/>
```

- [ ] **Step 4: Run analytics tests to verify pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\adminAnalyticsView.test.mjs C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit analytics redesign**

```bash
git -C C:\Vscode\Main\codewave add frontend/src/screens/AdminAnalyticsWorkspace.js frontend/src/screens/adminAnalyticsView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
git -C C:\Vscode\Main\codewave commit -m "style: redesign analytics workspace"
```

### Task 6: Shared consistency sweep and verification

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\app\globals.css` (only if a small shared polish is needed)
- Modify: touched screen files only if final consistency pass reveals issues
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Run the focused redesign tests together**

Run:

```bash
node --test \
  C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs \
  C:\Vscode\Main\codewave\frontend\src\screens\adminAnalyticsView.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run frontend lint**

Run:

```bash
cd C:\Vscode\Main\codewave\frontend
npm.cmd run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 3: Run frontend production build**

Run:

```bash
cd C:\Vscode\Main\codewave\frontend
npm.cmd run build
```

Expected: PASS and all relevant routes generated.

- [ ] **Step 4: Restart/verify the real local app and route checks**

Run/check:

```bash
http://127.0.0.1:3002/admin/catalog
http://127.0.0.1:3002/admin/inventory
http://127.0.0.1:3002/admin/users
http://127.0.0.1:3002/admin/summaries
```

Expected: each route returns `200` and reflects the redesigned layout/copy.

- [ ] **Step 5: Commit final sweep**

```bash
git -C C:\Vscode\Main\codewave add frontend/src/screens frontend/src/components frontend/src/app/globals.css
git -C C:\Vscode\Main\codewave commit -m "style: unify admin operations workspace redesign"
```
