# Customer Google Email Activation Mobile Flow

## Task ID

`T508`

## Title

Integrate customer-mobile Google identity verification and email OTP activation.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/auth.md`
- `../../auth-security-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T507`

## Goal

Define the mobile customer activation flow from Google proof submission through email OTP verification and active-session creation.

## Deliverables

- customer activation route pack
- activation mocks for start, resend, verify, expired OTP, and duplicate identity states
- post-activation handoff state into profile and vehicle onboarding

## Implementation Notes

- use the live email-verification route names
- pending activation and active session must remain separate client states
- resend or retry behavior must not imply hidden auth rate-limit rules

## Acceptance Checks

- activation flow matches live auth DTOs and route names
- wrong OTP, expired OTP, duplicate identity, and mismatch cases are modeled explicitly
- successful activation leads into the correct onboarding continuation state

## Out of Scope

- staff login
- address and vehicle management after activation
