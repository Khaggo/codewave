# inspections

## Domain ID

`main-service.inspections`

## Agent Summary

Load this doc for intake, pre-repair, completion, and return inspections. Skip it for booking approval or lifecycle aggregation rules.

## Primary Objective

Record physical inspection evidence that validates vehicle condition and supports trustworthy downstream lifecycle and back-job decisions.

## Inputs

- vehicle and operation reference
- inspection type and status
- findings, notes, and attachments
- inspector identity

## Outputs

- `vehicle_inspections`
- inspection findings
- verification evidence for lifecycle and back-job flows

## Dependencies

- `main-service.vehicles`
- `main-service.bookings`
- `main-service.job-orders`
- `main-service.back-jobs`

## Owned Data / ERD

Primary tables or equivalents:
- `vehicle_inspections`
- `inspection_findings`
- attachment reference metadata for future upload integration

Key relations:
- one vehicle may have many inspections
- an inspection may relate to a booking, job order, or back job
- lifecycle events may reference inspections for verification

## Primary Business Logic

- create inspection records at the correct operational checkpoints
- record findings, evidence, and inspector identity
- support future verification of condition-sensitive lifecycle events
- prevent completion claims from being treated as verified when no completion inspection exists
- keep inspection evidence reusable for future back-job diagnosis and classification

## Process Flow

1. Vehicle arrives or enters a work stage.
2. Staff or technician performs an inspection.
3. Findings and attachments are recorded.
4. Related modules can consume the inspection outcome when they are implemented.
5. Inspection evidence is preserved for later lifecycle and back-job integration.

## Use Cases

- staff performs intake inspection
- technician records pre-repair findings
- manager verifies completion before closure
- staff inspects a returned vehicle for back-job classification

## API Surface

- `POST /vehicles/:id/inspections`
- `GET /vehicles/:id/inspections`

## Edge Cases

- inspection created without a valid vehicle or operation reference
- completion status recorded without enough findings
- large attachment uploads fail after partial metadata save
- staff voids the wrong inspection and breaks verification lineage

## Writable Sections

- inspection types, inspection ERD, evidence rules, inspection APIs, and inspection edge cases
- do not edit booking approval, lifecycle aggregation, or file-storage platform details here

## Out of Scope

- booking approval
- vehicle timeline ownership
- file-storage implementation
