# Notification Trigger Integration

## Task ID

`T304`

## Title

Wire cross-domain notification triggers.

## Type

`integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/notifications.md`
- `../../api-strategy.md`

## Depends On

- `T111`
- `T205`

## Goal

Connect bookings, insurance, job orders, back jobs, and invoice tracking to the notification domain through explicit triggers and retry-safe jobs.

## Deliverables

- trigger map by source domain
- event or job contracts
- retry and dedupe policy

## Implementation Notes

- keep notifications subscriber-owned
- customer-invisible internal signals must stay filtered

## Acceptance Checks

- each trigger source has a named contract
- duplicate trigger delivery does not spam customers

## Out of Scope

- channel template copywriting
