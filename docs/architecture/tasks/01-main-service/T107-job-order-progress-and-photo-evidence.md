# Job Order Progress And Photo Evidence

## Task ID

`T107`

## Title

Add job-order progress logs and photo evidence.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../dto-policy.md`

## Depends On

- `T106`

## Goal

Let technicians and authorized staff record structured progress updates and work evidence on job orders.

## Deliverables

- progress log records
- photo evidence upload linkage
- progress and photo endpoints

## Implementation Notes

- evidence should be attachable without finalizing the job order
- preserve technician accountability on updates

## Acceptance Checks

- technicians can append progress entries
- photo evidence is linked to the correct job order
- frontend contract pack marks progress and photo routes as live

## Out of Scope

- customer-visible media gallery
