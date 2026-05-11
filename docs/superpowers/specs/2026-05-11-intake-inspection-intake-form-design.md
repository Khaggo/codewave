# 2026-05-11 Intake Inspection Intake Form Design

## Goal
Replace the generic inspection-capture form with an intake-first workflow that matches the requested inspection fields while keeping the current save API usable.

## Scope
Included:
- Remove the `Live Vehicle Inspection Capture` card framing from the main intake form area
- Remove the `Workflow Notes` section
- Rework `frontend/src/screens/DigitalIntakeInspectionWorkspace.js` into a tabbed intake screen
- Keep `Vehicle Inspection History` and `Selected Inspection Detail`, but group them together inside a `Vehicle Inspection` tab
- Persist the intake form through the current inspection payload by mapping fields into `inspectionType`, `status`, `bookingId`, `notes`, `attachmentRefs`, and `findings`
- Reuse the existing image upload/storage flow already used elsewhere in the web app for arrival photos
- Add or update targeted frontend regression tests for view helpers used by the screen

Excluded:
- New backend inspection tables or DTO expansion for a dedicated intake schema
- A brand-new intake-specific upload backend
- Changes to mobile intake flows

## Screen Structure
The page should become a tabbed workspace under the existing header/meta row.

Tabs:
- `Booking Reference`
- `Vehicle Inspection`

`Booking Reference` contains the intake-first workflow:
- customer / vehicle / optional booking context
- vehicle details
- fuel level on arrival
- existing damage / marks
- arrival photos
- pre-service checklist
- customer items in vehicle
- customer acknowledgment
- save actions

`Vehicle Inspection` contains:
- `Vehicle Inspection History`
- `Selected Inspection Detail`

This replaces the current side-by-side split so the inspection review surfaces are grouped together in one tab.

## Field Strategy
The existing selectors stay where they already support the workflow:

- Non-technician users keep customer, vehicle, and optional booking selectors
- Technician users keep direct vehicle and booking entry where the current flow already expects it

The form should stay focused on intake capture. Existing generic inspection fields that do not fit the intake-first flow should be removed from the main UI.

### Arrival Photos
Arrival photos should no longer use raw text inputs in the visible UI.

Instead:
- Render photo-slot cards matching the requested layout
- Reuse the existing upload/storage workflow already used by `JobOrderWorkbench`
- Store the returned upload refs back into the existing intake draft so payload output remains `attachmentRefs`

Initial slot set:
- `Front`
- `Rear`
- `Left side`
- `Right side`
- `Dashboard / odometer`
- `Interior`
- `Damage close-up`
- `Additional`

### Fuel Level On Arrival
The fuel selector should remain a segmented control, but it needs layout cleanup:
- equal-width options
- vertically centered labels
- stable active-pill alignment
- no uneven wrapping or offset between the active state and surrounding options

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
- Group history and selected-inspection detail inside one `Vehicle Inspection` tab
- Reuse existing upload behavior instead of inventing a separate intake uploader
- Keep role-based behavior intact for technician versus non-technician sessions

## Testing And Verification
- Add or update a small `node:test` regression file for any extracted copy or view-shaping helper
- Verify the workspace renders with the tabbed structure
- Verify arrival-photo slots still serialize into `attachmentRefs`
- Run targeted frontend tests for touched helper modules
- Run frontend lint if the touched files participate cleanly in the existing lint setup

## Risks
- Packing intake-only fields into `notes` may make later backend normalization necessary
- Reusing the existing upload flow may require adapter code if that uploader is tightly coupled to another screen
- The screen may mix intake-specific labels with generic inspection history language
- Existing save validation for completion inspections must remain intact even after the intake form becomes the primary layout

## Risk Mitigation
- Keep the mapping explicit and centralized
- Reuse the proven upload path, but wrap it in intake-specific photo-slot UI instead of duplicating uploader logic
- Leave the backend contract unchanged for this pass
- Limit behavioral change to the intake screen and its immediate helpers
