# T513 Vehicle Timeline And Reviewed Summary Mobile Flow

## Slice ID

`T513`

## Source Of Truth

- `docs/architecture/domains/main-service/vehicle-lifecycle.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T513-vehicle-timeline-and-reviewed-summary-mobile-flow.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/vehicle-lifecycle/controllers/vehicle-lifecycle.controller.ts`
- mobile client helper: `mobile/src/lib/vehicleLifecycleClient.js`
- mobile surface: `mobile/src/screens/Dashboard.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `GET /api/vehicles/:id/timeline` | `live` | Swagger/controller | load the canonical customer-facing lifecycle timeline for one owned vehicle |
| `POST /api/vehicles/:id/lifecycle-summary/generate` | `live` | Swagger/controller | staff-only source of pending summary DTO states reused by the contract pack and mocks |
| `PATCH /api/vehicles/:id/lifecycle-summary/:summaryId/review` | `live` | Swagger/controller | staff-only review gate that determines whether a lifecycle summary may ever become customer-visible |

## Customer Timeline States

| State | Meaning |
| --- | --- |
| `timeline_loading` | the customer mobile app is loading the canonical lifecycle timeline for the selected vehicle |
| `timeline_ready` | at least one normalized lifecycle event is available for customer viewing |
| `timeline_empty` | the selected vehicle has no customer-visible lifecycle events yet |
| `timeline_forbidden` | the lifecycle timeline cannot load without an active customer session |
| `timeline_not_found` | the requested vehicle or lifecycle record no longer exists |
| `timeline_load_failed` | a non-classified network or API failure prevented the lifecycle timeline from loading |

## Reviewed Summary Visibility States

| State | Meaning |
| --- | --- |
| `reviewed_summary_visible` | a lifecycle summary has been approved for customer visibility, either from a reviewed summary DTO or from an approved summary review event in the timeline |
| `pending_summary_hidden` | a summary draft exists but is still queued, generating, or waiting for review and must remain hidden from customers |
| `hidden_summary` | no reviewed customer-visible summary is available yet, or the latest summary remained hidden after rejection or failure |

## Frontend Contract Files

- `frontend/src/lib/api/generated/vehicle-lifecycle/requests.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/responses.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/customer-mobile-lifecycle.ts`
- `frontend/src/mocks/vehicle-lifecycle/mocks.ts`
- `mobile/src/lib/vehicleLifecycleClient.js`
- `mobile/src/screens/Dashboard.js`

## Contract Rules

- customer-mobile timeline cards must derive display copy from customer-safe event metadata and must not render raw lifecycle `notes` directly
- verified lifecycle milestones and administrative lifecycle milestones must stay visually distinct without changing the backend event category semantics
- only reviewed summaries may be treated as customer-visible
- a timeline event for `lifecycle_summary_approved` may prove visibility, but it does not imply that summary text is available from the current customer route
- queued, generating, pending-review, failed, and rejected summary records must remain hidden from customer-visible summary text
- the current customer route of truth is still `GET /api/vehicles/:id/timeline`; no mobile-only summary endpoint is introduced here

## Acceptance States

- timeline loading
- timeline ready
- timeline empty
- reviewed summary visible
- pending summary hidden
- hidden summary

## Notes

- This slice upgrades the real customer mobile timeline surface in `Dashboard`, not just the contract pack.
- The mobile read model is intentionally stricter than the raw backend payload: it preserves lifecycle truth while avoiding internal-only notes in the customer UI.
- Reviewed summary text can render if a future customer-safe summary read path is approved, but the current live customer contract only guarantees timeline events plus reviewed-summary visibility inference.
