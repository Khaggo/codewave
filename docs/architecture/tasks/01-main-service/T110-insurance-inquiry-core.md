# Insurance Inquiry Core

## Task ID

`T110`

## Title

Implement core insurance inquiry handling.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/insurance.md`
- `../../domains/main-service/notifications.md`

## Depends On

- `T104`

## Goal

Build customer and staff-facing insurance inquiry handling for CTPL and comprehensive workflows without implying insurer integrations.

## Deliverables

- inquiry records
- document linkage
- inquiry status endpoints
- frontend-ready contract pack and mock set for the slice

## Implementation Notes

- this is internal workflow tracking only
- notifications should consume inquiry state changes later

## Acceptance Checks

- inquiries can be created and updated
- supporting documents attach to the right inquiry
- contract pack clearly marks all routes as planned until Swagger is live

## Out of Scope

- direct insurer APIs
