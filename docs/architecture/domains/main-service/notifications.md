# notifications

## Domain ID

`main-service.notifications`

## Agent Summary

Load this doc for reminder scheduling, customer notices, notification preferences, and delivery state. Skip it for channel UI or marketing automation.

## Primary Objective

Send the right operational notices at the right time while keeping delivery policy and retry behavior separate from source-domain business truth.

## Inputs

- notify-worthy domain events
- auth OTP delivery requests
- user notification preferences
- reminder rules and queue jobs
- service reminders and renewal schedules

## Outputs

- notification records
- delivery attempts and statuses
- delayed reminders and retries
- queued BullMQ jobs for operational reminders
- auth OTP delivery outcomes for activation flows

## Dependencies

- `main-service.auth`
- `main-service.bookings`
- `main-service.insurance`
- `main-service.back-jobs`
- `ecommerce.invoice-payments`

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
- support different channels without changing trigger ownership
- support operational email and SMS delivery patterns
- expose user-facing preference and history endpoints for operational notifications
- deliver email OTP challenges for signup and staff activation without taking ownership of activation decisions
- hide internal-only operational events from customer notification streams

## Process Flow

1. Source module emits a notify-worthy event or schedules a reminder.
2. Notification policy checks preferences, templates, and delivery constraints for the relevant channel.
3. Queue schedules immediate or delayed delivery.
4. Delivery result is stored and retried if needed.
5. Auth OTP delivery uses Nodemailer over SMTP, but challenge validation and activation ownership stay in `auth`.

## Use Cases

- booking reminder before appointment
- insurance inquiry update notice
- back-job status change notice
- invoice aging reminder for unpaid commerce orders
- insurance renewal and service reminder notices
- customer signup email OTP delivery
- pending staff activation email OTP delivery

## API Surface

- `GET /users/:id/notification-preferences`
- `PATCH /users/:id/notification-preferences`
- `GET /users/:id/notifications`
- internal `enqueueNotification`
- internal `scheduleReminder`
- internal `enqueueAuthOtpDelivery`

## Edge Cases

- duplicate notifications from repeated upstream events
- user opts out of a channel after a job is already queued
- reminder jobs remain queued after booking cancellation
- invoice reminders keep sending after payment is fully recorded
- email and SMS channel states diverge after a partial delivery failure
- SMS reminder requests arrive for users without a phone number on file
- auth email OTP expiry and OTP flood control are handled in `auth`

## Writable Sections

- notification policy, reminder rules, delivery semantics, notification APIs, and notification edge cases
- do not redefine source-domain events or frontend messaging UX here

## Out of Scope

- frontend messaging UX
- template localization beyond basic placeholders
- marketing automation campaigns
