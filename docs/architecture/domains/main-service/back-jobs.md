# back-jobs

## Purpose

Own return or rework cases after previous service or repair. This domain makes `back job` explicit so quality issues and return handling are traceable.

## Owned Data / ERD

Primary tables or equivalents:
- `back_jobs`
- `back_job_findings`
- references to original `job_orders`

Key relations:
- one back job belongs to one vehicle and one customer
- one back job may reference one original booking and one original job order
- one back job may have many findings or inspection references
- related job orders should support `job_type = normal | back_job`
- returned work can be linked using nullable `parent_job_order_id`

Statuses:
- `reported`
- `inspected`
- `approved_for_rework`
- `in_progress`
- `resolved`
- `closed`
- `rejected`

## Primary Business Logic

- classify whether a return is a true back job or a new concern
- link the case to original work when evidence exists
- track complaint, findings, ownership, and final resolution
- feed quality metrics to analytics and visible history to lifecycle
- ensure return diagnosis is supported by inspection records when needed

## Process Flow

1. Customer returns after previous work
2. Staff opens a back-job case with complaint details
3. Return inspection is performed
4. Manager or staff classifies the case
5. Rework is performed and tracked through job monitoring
6. Case is resolved and reflected in lifecycle and analytics

## Use Cases

- staff opens a back job from a customer complaint
- manager reviews whether the return is warranty-related or a new issue
- technician receives rework instructions tied to original work
- customer tracks back-job status

## API Surface

- `POST /back-jobs`
- `GET /back-jobs/:id`
- `PATCH /back-jobs/:id/status`
- `GET /vehicles/:id/back-jobs`

## Edge Cases

- repeat visit is actually a new concern and not rework
- original work cannot be matched cleanly
- staff closes the back job without linking inspection evidence
- internal quality notes are exposed to customers

## Dependencies

- `vehicles`
- `bookings`
- `inspections`
- `job-monitoring`
- `vehicle-lifecycle`
- `analytics`
- `notifications`

## Out of Scope

- generic service complaints not tied to a return workflow
- autonomous warranty decisioning without staff review
