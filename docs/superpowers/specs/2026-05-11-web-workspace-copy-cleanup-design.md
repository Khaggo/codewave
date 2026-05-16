# 2026-05-11 Web Workspace Copy Cleanup Design

## Goal
Make the web workspaces feel cleaner by shortening major visible descriptions to one brief sentence.

## Scope
This cleanup applies only to top-level web workspace copy in the frontend.

Included:
- `PageHeader.description` content on workspace screens
- Summary and stat card descriptions shown near the top of a workspace
- Major section descriptions directly under section titles on workspace screens
- Small workspace-specific copy helpers that feed the descriptions above

Excluded:
- Form labels
- Placeholders
- Validation messages
- Modal subtitles
- Empty-state messages
- Inline operational guidance inside forms unless it is the main section description
- Mobile app copy

## Target Screens
The initial pass covers the main web workspaces currently surfaced in `frontend/src/screens` and related admin workspace components, including:

- `frontend/src/screens/Dashboard.js`
- `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
- `frontend/src/screens/QAAuditWorkspace.js`
- `frontend/src/screens/AdminAnalyticsWorkspace.js`
- `frontend/src/screens/ShopProductAdmin.js`
- `frontend/src/screens/SettingsWorkspace.js`
- `frontend/src/screens/LoyaltyManager.js`
- `frontend/src/screens/InvoiceOrderManagementWorkspace.js`
- `frontend/src/screens/InventoryWorkspace.js`
- `frontend/src/components/BookingServiceAdmin.js`

If another workspace file clearly matches the same pattern during implementation, it can be included as long as it stays within the same copy-only cleanup.

## Copy Rule
Every targeted description should become one brief sentence.

Guidelines:
- Prefer 6-16 words when possible
- Keep operational meaning intact
- Remove repeated explanations and process layering
- Avoid combining multiple instructions with "and" when one core idea is enough
- Preserve product-specific terms users rely on, such as booking, job order, QA, or analytics

Examples:
- "Use this workspace as the staff command center for booking review, intake coordination, job-order handoff, QA checks, and finance follow-through."
  becomes
  "Manage booking, intake, job-order, QA, and finance work from one workspace."

- "Review automated pre-check summaries, let the head technician record the final pass or block verdict, and keep overrides auditable when a super admin must intervene."
  becomes
  "Review QA checks, record verdicts, and keep overrides auditable."

## Implementation Approach
Update copy in place without changing layout or behavior.

Preferred approach:
- Trim string literals directly where they are used
- Simplify helper modules when a workspace already centralizes display copy
- Remove no longer needed helper exports only if they become unused as part of the copy pass

Non-goals:
- No navigation changes
- No visual redesign
- No workflow or API changes
- No broad text rewrites outside the included workspace descriptions

## Testing And Verification
- Run targeted `node --test` commands for any helper test files touched during the cleanup
- Run `npm run lint` in `frontend`
- Check for unused imports or dead helper exports caused by copy-only edits

## Risks
- Over-shortening may remove important staff context
- Inconsistent tone may appear if some screens stay verbose while others become terse
- Some descriptions may look like "help text" but still belong to the visible workspace surface

## Risk Mitigation
- Keep the cleanup limited to the agreed workspace-level descriptions
- Use the same one-sentence pattern across screens
- Leave detailed operational guidance in forms, empty states, and validation copy untouched
