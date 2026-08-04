# Web Service Invoice Navigation Surface

## Task ID

`T538`

## Title

Expose finalized Job Order invoices as a focused staff workflow.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Depends On

- `T517`
- Job Order finalization and invoice lookup contracts

## Objective

Expose `/admin/invoices` as a focused staff surface for finalized Job Order invoices,
payment state, aging reminders, and direct return to the owning Job Order workspace.

## Scope

- search finalized Job Orders by reference
- show service invoice totals and reservation-fee deductions
- show recorded payments and remaining balance
- show aging/reminder state
- preserve adviser and super-admin access boundaries

## Acceptance Criteria

- the staff navigation labels the surface `Service Invoices`
- no unrelated sales queue is rendered
- selecting a finalized Job Order loads its invoice record
- payment and aging state refresh without reloading the page
- missing and unavailable invoice states are explicit and recoverable

## Verification

- service invoice view-model tests
- staff web production build
- Booking to Job Order to QA to finalization to payment Playwright flow
