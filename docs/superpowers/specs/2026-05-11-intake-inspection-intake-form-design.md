# 2026-05-11 Intake Inspection Intake Form Design

## Goal
Replace the generic inspection-capture form with an intake-first workflow that matches the requested inspection fields while keeping the current save API usable.

## Scope
Included:
- Remove the `Live Vehicle Inspection Capture` card framing from the main intake form area
- Remove the `Workflow Notes` section
- Rework the left-column form in `frontend/src/screens/DigitalIntakeInspectionWorkspace.js` to feel like a car intake inspection screen
- Keep the existing history and selected-inspection panels
- Persist the intake form through the current inspection payload by mapping fields into `inspectionType`, `status`, `bookingId`, `notes`, `attachmentRefs`, and `findings`
- Add or update targeted frontend regression tests for view helpers used by the screen

Excluded:
- New backend inspection tables or DTO expansion for a dedicated intake schema
- Upload handling beyond the existing attachment reference input pattern
- Changes to mobile intake flows

## Screen Structure
The page should remain a two-column workspace:

- Left column: intake form as the primary work area
- Right column: `Vehicle Inspection History` and `Selected Inspection Detail`

The left column should no longer present itself as a separate generic capture card. Instead, the form should read as the main intake inspection content for the page.

## Field Strategy
The existing selectors stay where they already support the workflow:

- Non-technician users keep customer, vehicle, and optional booking selectors
- Technician users keep direct vehicle and booking entry where the current flow already expects it

The form should stay focused on intake capture. Existing generic inspection fields remain available only if they still support the intake flow cleanly.

## Persistence Strategy
Use the current inspection create payload for this pass.

Mapping:
- `inspectionType`: remains the operational record type, defaulting to `intake` for the intake form
- `status`: remains the inspection record status
- `bookingId`: keeps the current booking link behavior
- `notes`: stores the main intake narrative and any intake-only values that do not have first-class DTO fields yet
- `attachmentRefs`: stores the arrival photo references
- `findings`: stores the primary structured intake finding and any condition evidence that already fits the current schema

For intake-only data that does not fit the DTO directly, store it in a clearly labeled structured block inside `notes` rather than widening the backend contract in this pass.

## UI Content Rules
- Remove `Live Vehicle Inspection Capture`
- Remove `Workflow Notes`
- Keep the page copy concise and operational
- Preserve the current history/review behavior on the right side
- Keep role-based behavior intact for technician versus non-technician sessions

## Testing And Verification
- Add or update a small `node:test` regression file for any extracted copy or view-shaping helper
- Verify the workspace still renders with the simplified structure
- Run targeted frontend tests for touched helper modules
- Run frontend lint if the touched files participate cleanly in the existing lint setup

## Risks
- Packing intake-only fields into `notes` may make later backend normalization necessary
- The screen may mix intake-specific labels with generic inspection history language
- Existing save validation for completion inspections must remain intact even after the intake form becomes the primary layout

## Risk Mitigation
- Keep the mapping explicit and centralized
- Leave the backend contract unchanged for this pass
- Limit behavioral change to the intake screen and its immediate helpers
