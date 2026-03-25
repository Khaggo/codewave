# notifications

## Purpose

Own reminder scheduling, outbound customer notices, notification preferences, and delivery tracking for operational events.

## Owned Data / ERD

Primary tables or equivalents:
- `notification_preferences`
- `notifications`
- `reminder_rules`
- optional `notification_delivery_attempts`

Key relations:
- one user may have one preference profile
- one domain event may generate many notification records
- reminder rules can be attached to booking or invoice-aging flows

## Primary Business Logic

- decide whether a user should receive a notice
- schedule reminders and retries through BullMQ
- store delivery status and failures
- support different channels if added later without changing domain triggers
- hide internal-only operational events from customer notification streams

## Process Flow

1. Source module emits a notify-worthy event
2. Notification policy checks preferences and templates
3. Queue schedules immediate or delayed delivery
4. Delivery result is stored and retried if needed

## Use Cases

- booking reminder before appointment
- insurance inquiry update notice
- back-job status change notice
- invoice aging reminder for unpaid commerce orders

## API Surface

- `GET /users/:id/notification-preferences`
- `PATCH /users/:id/notification-preferences`
- `GET /users/:id/notifications`
- internal `enqueueNotification`
- internal `sendNotification` worker

## Edge Cases

- duplicate notifications from repeated upstream events
- user opts out of a channel after a job is already queued
- reminder jobs remain queued after booking cancellation
- invoice reminders keep sending after payment is fully recorded

## Dependencies

- `bookings`
- `insurance`
- `back-jobs`
- `invoice-payments`
- BullMQ infrastructure

## Out of Scope

- frontend messaging UX
- template localization beyond basic placeholders
- marketing automation campaigns
