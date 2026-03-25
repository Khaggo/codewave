# inspections

## Purpose

Own physical inspection records used to validate vehicle condition and to support trustworthy lifecycle milestones, repairs, and back-job handling.

## Owned Data / ERD

Primary tables or equivalents:
- `vehicle_inspections`
- `inspection_findings`
- references to `file_uploads` for photos or supporting files

Key relations:
- one vehicle may have many inspections
- an inspection may relate to a booking, job order, or back job
- lifecycle events may reference inspections for verification

Inspection types:
- `intake`
- `pre_repair`
- `completion`
- `return_back_job`

Statuses:
- `pending`
- `completed`
- `needs_followup`
- `void`

## Primary Business Logic

- create inspection records at the correct operational checkpoints
- record findings, evidence, and inspector identity
- support verification of condition-sensitive lifecycle events
- prevent completion claims from being treated as verified when no completion inspection exists
- support back-job diagnosis and classification

## Process Flow

1. Vehicle arrives or enters a work stage
2. Staff or technician performs inspection
3. Findings and attachments are recorded
4. Related modules consume the inspection outcome
5. Verified lifecycle updates are emitted or queued

## Use Cases

- staff performs intake inspection
- technician records pre-repair findings
- manager verifies completion before closure
- staff inspects a returned vehicle for back-job classification

## API Surface

- `POST /vehicles/:id/inspections`
- `GET /vehicles/:id/inspections`
- `GET /inspections/:id`
- `PATCH /inspections/:id/status`
- `POST /inspections/:id/attachments`

## Edge Cases

- inspection created without a valid vehicle or operation reference
- completion status recorded without enough findings
- large attachment uploads fail after partial metadata save
- staff voids the wrong inspection and breaks verification lineage

## Dependencies

- `vehicles`
- `bookings`
- `job-monitoring`
- `back-jobs`
- `vehicle-lifecycle`
- `file_uploads`

## Out of Scope

- booking approval
- technician assignment
- customer reminder scheduling
