# T302 Lifecycle Event Expansion

## Slice ID

`T302`

## Source Of Truth

- `docs/architecture/domains/main-service/vehicle-lifecycle.md`
- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/tasks/03-integration/T302-lifecycle-event-expansion.md`
- internal contract code:
  - `backend/shared/events/contracts/lifecycle-events.ts`

## Route Status

This slice does not add new public routes.

It expands the live `GET /api/vehicles/:id/timeline` response so timeline entries may now carry these additional source types and lifecycle facts:

| Timeline Fact | Status | Source |
| --- | --- | --- |
| `job_order_created` | `live` | lifecycle projection |
| `job_order_finalized` | `live` | lifecycle projection |
| `quality_gate_passed` | `live` | lifecycle projection |
| `quality_gate_blocked` | `live` | lifecycle projection |
| `quality_gate_overridden` | `live` | lifecycle projection |
| `lifecycle_summary_approved` | `live` | lifecycle projection |
| `lifecycle_summary_rejected` | `live` | lifecycle projection |

It also adds internal lifecycle event contract definitions:

| Event | Status | Source |
| --- | --- | --- |
| `job_order.created` | `live` | shared lifecycle contract |
| `job_order.finalized` | `live` | shared lifecycle contract |
| `quality_gate.passed` | `live` | shared lifecycle contract |
| `quality_gate.blocked` | `live` | shared lifecycle contract |
| `quality_gate.overridden` | `live` | shared lifecycle contract |
| `vehicle.lifecycle_summary_reviewed` | `live` | shared lifecycle contract |

## Frontend Contract Files

- `frontend/src/lib/api/generated/vehicle-lifecycle/requests.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/responses.ts`
- `frontend/src/mocks/vehicle-lifecycle/mocks.ts`

## Frontend States To Cover

- job-order milestone state inside the vehicle timeline
- QA passed, blocked, or overridden timeline states
- reviewed lifecycle-summary state after approval or rejection

## Notes

- This slice keeps the lifecycle route stable and expands only the timeline payload meaning.
- Projection remains rebuild-safe because derived timeline rows are replaced from source truth instead of appended blindly.
- Verified lifecycle events still require inspection-backed evidence; job-order and QA facts remain administrative timeline entries unless the owning source domain adds stronger evidence rules later.
- Current projection intentionally models immutable job-order creation plus the latest stable job-order and QA milestone, not every transient operational hop.
