# back-jobs

## Domain ID

`main-service.back-jobs`

## Agent Summary

Load this doc for reviewed return and rework cases tied to finalized previous work. Skip it for generic complaints that are not formal back-job workflows.

## Primary Objective

Make return and rework handling explicit, traceable, and inspection-backed so repeat-work quality issues are not lost inside generic job tracking.

## Inputs

- customer return complaint
- related vehicle, booking, or original job reference
- inspection findings
- classification and resolution updates

## Outputs

- `back_jobs`
- `back_job_findings`
- linkage to original work, return inspections, and rework job orders
- validated service-history review outcomes

## Dependencies

- `main-service.vehicles`
- `main-service.inspections`
- `main-service.job-orders`

## Owned Data / ERD

Primary tables or equivalents:
- `back_jobs`
- `back_job_findings`
- references to original `job_orders`

Key relations:
- one back job belongs to one vehicle and one customer
- one back job references one original finalized job order and may also snapshot the original booking
- one back job may link one return inspection and one rework job order
- related job orders should support `job_type = normal | back_job`
- returned work can be linked using nullable `parent_job_order_id`

## Primary Business Logic

- classify whether a return is a true back job or a new concern
- require service-history validation against a finalized original job order before formal rework proceeds
- link the case to original work when evidence exists
- require return-inspection evidence before reviewed approval
- track complaint, findings, ownership, rework linkage, and final resolution
- feed quality metrics to analytics and visible history to lifecycle
- ensure return diagnosis is supported by inspection records when needed
- keep customer-facing back-job visibility limited to approved customer-safe states and dedicated read models

## Process Flow

1. Customer returns after previous work.
2. Staff opens a back-job case against a finalized original job order.
3. Return inspection is performed and attached to the case.
4. Service adviser or super admin validates the case against service history and classifies it.
5. Approved cases create rework job orders with explicit lineage back to the original job order.
6. Rework is performed and tracked through linked job orders.
7. Case is resolved and reflected in lifecycle and analytics.

## Use Cases

- service adviser opens a back job from a customer complaint
- service adviser or super admin reviews whether the return is warranty-related or a new issue
- customer reads the status of their own reviewed return case
- downstream rework job orders inherit the original-work lineage
- customer tracks back-job status
- service adviser validates whether the return should proceed to rework

## API Surface

- `POST /back-jobs`
- `GET /back-jobs/:id`
- `PATCH /back-jobs/:id/status`
- `GET /vehicles/:id/back-jobs`
- planned dedicated customer back-job list if mobile gets a standalone back-job screen

## Edge Cases

- repeat visit is actually a new concern and not rework
- original work cannot be matched cleanly
- original job order is not finalized and cannot be used as back-job lineage
- service history is incomplete and blocks proper classification
- staff tries to approve rework without return-inspection evidence
- staff tries to move rework forward before a linked rework job order exists
- internal quality notes are exposed to customers
- mobile client depends on staff-only review records instead of a customer-safe back-job read model

## Writable Sections

- back-job classification, lineage, status rules, back-job APIs, and back-job edge cases
- do not redefine generic job execution or lifecycle aggregation here

## Out of Scope

- generic service complaints not tied to a return workflow
- staff-only review fields in customer mobile back-job history
