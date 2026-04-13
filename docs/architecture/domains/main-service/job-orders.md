# job-orders

## Domain ID

`main-service.job-orders`

## Agent Summary

Load this doc for digital job orders, technician assignments, and staff status flow after confirmed booking intake or validated back-job review. Skip it for appointment intake and QA policy.

## Primary Objective

Own workshop execution through digital job orders without collapsing booking intake, inspection evidence, invoice tracking, or QA release authority into one module.

## Inputs

- confirmed bookings
- validated back-job intake
- service-adviser assignment
- technician progress and work evidence

## Outputs

- `job_orders`
- `job_order_items`
- technician assignment and progress records
- `job_order_invoice_records`
- invoice-readiness and QA trigger signals

## Dependencies

- `main-service.bookings`
- `main-service.back-jobs`
- `main-service.users`

## Owned Data / ERD

Primary tables or equivalents:
- `job_orders`
- `job_order_items`
- `job_order_assignments`
- `job_order_progress_logs`
- `job_order_photos`
- `job_order_invoice_records`

Key relations:
- one confirmed booking or approved back job may create one job order in the current slice
- one job order belongs to one service adviser and may have many assigned technicians
- one job order has many work items, progress logs, and photos
- one job order may generate one invoice-ready record
- one job order stores `job_type = normal | back_job` and nullable `parent_job_order_id` for rework lineage
- one job order stores immutable `service_adviser_user_id` and adviser-code snapshot data for auditability

## Primary Business Logic

- create digital job orders from confirmed booking intake
- create rework job orders from approved back-job intake
- snapshot the service-adviser identity and code for auditability
- assign technicians before operational execution begins
- let assigned technicians append structured progress entries
- let staff with job-order access attach photo evidence before finalization
- generate one invoice-ready record from a finalized job order while carrying adviser snapshot data forward
- link rework job orders back to the original finalized job order when source type is `back_job`
- separate workshop execution state from booking state and payment tracking
- reserve ecommerce payment tracking for later slices

## Process Flow

1. A confirmed booking or approved back-job case is approved for workshop execution.
2. Service adviser creates a job order with work items and optional technician assignments.
3. Rework job orders inherit source and parent-job lineage when the source is a validated back job.
4. Assigned technicians or staff reviewers read the job order and coordinate execution.
5. Assigned technicians append progress entries and update work-item completion evidence.
6. Staff attach supporting photos while the job order is still active.
7. Staff update the job-order status through draft, assigned, in-progress, blocked, or ready-for-QA transitions.
8. The responsible service adviser or super admin finalizes the job order and generates an invoice-ready record.
9. Downstream quality-gates and invoice-tracking flows build on this enriched job-order and invoice-ready record set.

## Use Cases

- service adviser opens a digital job order
- service adviser opens a rework job order from an approved back-job case
- technician reads assigned work, updates execution status, and records progress
- service adviser or super admin attaches supporting evidence photos
- service adviser or super admin finalizes a ready-for-QA job order into an invoice-ready record
- super admin reviews adviser and technician accountability
- release workflow prepares invoice tracking without implying payment settlement

## API Surface

Live in the current slice:
- `POST /job-orders`
- `GET /job-orders/:id`
- `PATCH /job-orders/:id/status`
- `POST /job-orders/:id/progress`
- `POST /job-orders/:id/photos`
- `POST /job-orders/:id/finalize`

Planned for later slices:
- none in the current job-orders contract pack

## Edge Cases

- staff tries to create a job order from a booking that is not yet confirmed
- technician updates status on a job order without an assignment
- technician records progress for work items outside the target job order
- staff attach evidence after the job order is cancelled or finalized
- staff attempt invoice generation before all work items are complete
- duplicate invoice-ready records are generated for the same job order
- service adviser snapshot is mismatched or missing
- adviser snapshot is missing when an invoice-ready job order is created
- job-order lineage for back-job rework becomes inconsistent
- unapproved back-job intake attempts to create a rework job order

## Writable Sections

- job-order lifecycle, assignment rules, work evidence, invoice-readiness triggers, and job-order APIs
- do not redefine booking intake, inspection ownership, QA override policy, or invoice payment tracking here

## Out of Scope

- appointment-slot ownership
- quality-gate override authority
- payment settlement
