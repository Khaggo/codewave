# Auth OTP Delivery Foundation

## Task ID

`T122`

## Title

Implement the auth OTP delivery foundation.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../auth-security-policy.md`
- `../../domains/main-service/notifications.md`
- `../../api-strategy.md`

## Depends On

- `T007`

## Goal

Build the notification-side email OTP delivery path that auth activation flows can call without mixing delivery ownership into auth challenge logic.

## Deliverables

- auth OTP delivery request contract
- email OTP delivery records and retry behavior
- provider adapter boundary for Nodemailer SMTP delivery
- observable delivery outcomes consumable by auth

## Implementation Notes

- keep operational reminders separate from auth OTP delivery concerns
- delivery retries must not create duplicate successful OTP sends
- auth still owns OTP validation and activation success

## Acceptance Checks

- auth can request OTP delivery without owning channel logic
- OTP delivery retries remain idempotent and observable
- delivery failure can be distinguished from invalid OTP submission
 - `enqueueAuthOtpDelivery` is available in notifications service

## Out of Scope

- customer reminder scheduling
