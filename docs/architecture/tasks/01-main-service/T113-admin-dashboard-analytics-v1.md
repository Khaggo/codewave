# Admin Dashboard Analytics V1

## Task ID

`T113`

## Title

Build the first admin analytics dashboard.

## Type

`domain`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/analytics.md`
- `../../domains/main-service/job-orders.md`

## Depends On

- `T106`
- `T110`
- `T111`

## Goal

Provide the first rebuildable analytics views for bookings, sales, insurance activity, service demand, and peak-hour reporting.

## Deliverables

- analytics snapshot model
- admin dashboard endpoints
- audit-friendly aggregation jobs

## Implementation Notes

- analytics stays derived and rebuildable
- include peak hours and most-availed services

## Acceptance Checks

- dashboard endpoints read from derived models
- key metrics can be traced back to source records

## Out of Scope

- replacing operational source-of-truth screens
