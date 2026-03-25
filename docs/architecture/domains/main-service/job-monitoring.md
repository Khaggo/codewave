# job-monitoring

## Purpose

Own execution tracking for operational work after intake: job orders, work items, technician assignments, progress updates, evaluations, and damage assessments.

## Owned Data / ERD

Primary tables or equivalents:
- `job_orders`
- `job_order_items`
- `job_order_technicians`
- `technicians`
- `evaluations`
- `damage_assessments`
- optional `job_order_progress_logs`

Key relations:
- one booking or back job may produce one or more job orders
- one job order has many job items
- many technicians may be assigned through `job_order_technicians`
- evaluations and damage assessments may feed job-order creation or updates

Important fields:
- `job_type = normal | back_job`
- nullable `parent_job_order_id` for rework lineage

## Primary Business Logic

- create and manage job orders after booking or return intake
- assign technicians and track execution progress
- keep operational status distinct from booking status
- support evaluations and damage findings that justify work scope
- publish progress and closure events to notifications, lifecycle, and analytics

## Process Flow

1. Booking or back job is approved for work
2. Job order is created with items and assignments
3. Technicians update progress and findings
4. Completion inspection verifies final condition if required
5. Job order closes and downstream modules are updated

## Use Cases

- manager creates job order
- technician updates work progress
- admin reviews open work across vehicles and technicians
- back-job rework is tied to original job lineage

## API Surface

- `POST /job-orders`
- `GET /job-orders/:id`
- `PATCH /job-orders/:id/status`
- `POST /job-orders/:id/progress`
- `POST /job-orders/:id/assign-technician`

## Edge Cases

- job order closes while required inspection is still pending
- technician updates progress on a cancelled or closed job
- damage assessment and job-order scope diverge without review
- parent-child job linkage becomes inconsistent for back jobs

## Dependencies

- `bookings`
- `inspections`
- `back-jobs`
- `vehicle-lifecycle`
- `notifications`
- `analytics`

## Out of Scope

- appointment scheduling
- direct inventory reservation ownership
- invoice payment tracking
