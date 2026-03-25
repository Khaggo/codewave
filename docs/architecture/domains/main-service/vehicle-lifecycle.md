# vehicle-lifecycle

## Purpose

Own the unified vehicle timeline. This module is the operational history view that combines bookings, inspections, insurance, job execution, back jobs, and selected commerce summaries.

## Owned Data / ERD

Primary tables or equivalents:
- `vehicle_timeline_events`

Key relations:
- each event belongs to one vehicle
- an event may reference a source module record by `source_type` and `source_id`
- verified events may reference `vehicle_inspections.inspection_id`

Core fields:
- vehicle ID
- event type
- source type
- source ID
- occurred at
- `verified` flag
- nullable inspection reference
- actor ID
- customer-visible notes
- internal notes if split

## Primary Business Logic

- accept timeline-worthy events from operational modules
- differentiate administrative events from condition-sensitive events
- mark condition-sensitive milestones as verified only when inspection-backed
- expose a filtered timeline for customer and admin views
- prevent duplicate events when retries or event replays happen

### Administrative Events

May be system-generated without physical verification:
- booking created
- booking confirmed
- insurance inquiry submitted
- order placed
- invoice updated

### Verified Condition Events

Must be inspection-backed or staff-verified through the inspection workflow:
- intake condition recorded
- repair findings confirmed
- work completion verified
- return issue diagnosed
- back job confirmed as rework

## Process Flow

1. Source modules publish operational events
2. Lifecycle normalizes them into timeline events
3. Verified milestones wait for inspection linkage before being flagged verified
4. Read models are refreshed for UI consumption

## Use Cases

- customer views a full vehicle history
- staff reviews all past interactions before new work starts
- analytics reads lifecycle summaries for repeat issues and turnaround trends

## API Surface

- `GET /vehicles/:id/timeline`
- internal `appendVehicleTimelineEvent`
- internal `refreshVehicleTimeline` job

## Edge Cases

- duplicate events from retries or outbox replay
- verified flag set without a valid inspection reference
- customer-facing timeline accidentally includes internal notes
- cross-service order summary arrives late and appears out of order

## Dependencies

- `vehicles`
- `bookings`
- `inspections`
- `insurance`
- `back-jobs`
- optional commerce summary events

## Out of Scope

- creating or editing inspections
- booking scheduling rules
- owning raw order or invoice records
