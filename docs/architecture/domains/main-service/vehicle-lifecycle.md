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
- job-order completion and QA release signals
- AI summary generation requests and human review actions

## Outputs

- `vehicle_timeline_events`
- customer-facing and admin-facing vehicle history
- normalized timeline signals for current UI read models
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
- generate layman-friendly AI summaries from approved lifecycle evidence
- hide AI summaries from customers until a reviewer approves them
- expose an ordered timeline view for vehicle history consumers
- prevent duplicate timeline entries during retries or replays

## Process Flow

1. Lifecycle loads booking and inspection records for the target vehicle.
2. The service normalizes those records into timeline entries.
3. Verified milestones are accepted only when inspection-backed.
4. Optional AI summary generation uses filtered lifecycle evidence.
5. Customer visibility changes only after human review approval.
6. The projection is refreshed and returned for UI consumption.

## Use Cases

- customer views a full vehicle history
- staff reviews all past interactions before new work starts
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
- customer-facing timeline accidentally includes internal notes
- AI summary is published before human review
- tied booking and inspection timestamps must still sort deterministically

## Writable Sections

- lifecycle event normalization, verified-event rules, lifecycle-summary review rules, timeline API behavior, and lifecycle-owned edge cases
- do not redefine source-domain rules for bookings, inspections, or insurance here

## Out of Scope

- vehicle master data ownership
- booking approval semantics
- inspection content ownership
