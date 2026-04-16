# vehicle-lifecycle

## Domain ID

`main-service.vehicle-lifecycle`

## Agent Summary

Load this doc for the unified vehicle timeline, event normalization, and reviewed AI summaries over lifecycle history. Skip it for source-domain business rules.

## Primary Objective

Provide one trustworthy vehicle timeline that combines operational history while keeping condition-sensitive milestones verification-backed.

## Inputs

- booking events
- inspection-linked verification signals
- job-order creation and latest stable job-order milestone signals
- QA release outcomes and override decisions
- AI summary generation requests and reviewed summary decisions

## Outputs

- `vehicle_timeline_events`
- customer-facing and admin-facing vehicle history
- normalized timeline signals for bookings, inspections, job orders, QA outcomes, and reviewed summaries
- review-gated lifecycle summaries

## Dependencies

- `main-service.vehicles`
- `main-service.bookings`
- `main-service.inspections`
- `main-service.job-orders`
- `main-service.quality-gates`

## Owned Data / ERD

Primary tables or equivalents:
- `vehicle_timeline_events`
- `vehicle_lifecycle_summaries`

Key relations:
- each event belongs to one vehicle
- an event may reference a source record by `source_type` and `source_id`
- verified events may reference a `vehicle_inspections` record
- one vehicle may have many lifecycle summaries with review state

## Primary Business Logic

- derive timeline-worthy events from implemented operational modules
- differentiate administrative events from condition-sensitive events
- mark condition-sensitive milestones as verified only when inspection-backed
- project immutable job-order creation facts, the latest stable job-order milestone, QA outcomes, and reviewed summary decisions into the unified timeline
- keep lifecycle projection rebuild-safe by replacing derived events from source-domain truth instead of appending duplicate derived rows
- keep current lifecycle projection honest: until source domains publish richer status history, do not pretend to reconstruct every transient job-order or QA transition
- queue layman-friendly AI summary generation on the shared `ai-worker-jobs` BullMQ lane and expose `generationJob` metadata on the lifecycle summary record
- hide AI summaries from customers until a reviewer approves them
- expose an ordered timeline view for vehicle history consumers
- prevent duplicate timeline entries during retries or replays

## Process Flow

1. Lifecycle loads booking, inspection, job-order, QA, and reviewed-summary records for the target vehicle.
2. The service normalizes those records into deterministic timeline entries with stable dedupe keys.
3. Verified milestones are accepted only when inspection-backed.
4. The projection is rebuilt by replacement so replay or refresh does not duplicate derived lifecycle events.
5. Optional AI summary generation creates a queued draft and enqueues `generate-vehicle-lifecycle-summary` on the shared AI worker queue.
6. Successful worker completion moves the summary to `pending_review`; worker failure moves it to `generation_failed` with visible metadata.
7. Customer visibility changes only after human review approval.
8. The projection is refreshed and returned for UI consumption.

## Use Cases

- customer views a full vehicle history
- staff reviews all past interactions before new work starts
- staff sees whether a job order reached QA, passed, blocked, or was manually overridden before release
- analytics reads lifecycle summaries for repeat issues and turnaround trends
- reviewer approves or rejects an AI-generated customer summary

## API Surface

- `GET /vehicles/:id/timeline`
- `POST /vehicles/:id/lifecycle-summary/generate`
- `PATCH /vehicles/:id/lifecycle-summary/:summaryId/review`
- internal `appendVehicleTimelineEvent`
- internal `refreshVehicleTimeline`

## Edge Cases

- duplicate events from retries or outbox replay
- verified flag set without a valid inspection reference
- current lifecycle projection must not claim full job-order status history when the source domain only exposes the latest stable milestone
- customer-facing timeline accidentally includes internal notes
- AI summary is published before human review
- queued or failed summary generation is hidden from customers but must stay visible to staff for retry and review coordination
- tied booking and inspection timestamps must still sort deterministically

## Writable Sections

- lifecycle event normalization, verified-event rules, lifecycle-summary review rules, timeline API behavior, and lifecycle-owned edge cases
- do not redefine source-domain rules for bookings, inspections, or insurance here

## Out of Scope

- vehicle master data ownership
- booking approval semantics
- inspection content ownership
