# notifications

## Domain ID

`main-service.notifications`

## Agent Summary

Load this doc for reminder scheduling, customer notices, notification preferences, and delivery state. Skip it for channel UI or marketing automation.

## Primary Objective

Send the right operational notices at the right time while keeping delivery policy and retry behavior separate from source-domain business truth.

## Inputs

- notify-worthy domain events
- `booking.reminder_requested` internal trigger contracts from `main-service.bookings`
- `insurance.inquiry_status_changed` internal trigger contracts from `main-service.insurance`
- `back_job.status_changed` internal trigger contracts from `main-service.back-jobs`
- `job_order.service_follow_up_requested` internal trigger contracts from `main-service.job-orders`
- `order.invoice_issued` facts from `ecommerce-service`
- `invoice.payment_recorded` facts from `ecommerce-service`
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
- translate source-domain facts into notification-owned queue actions without taking over source-domain state
- schedule reminders and retries through BullMQ
- store delivery status and failures
- support operational email delivery without changing trigger ownership
- expose user-facing preference and history endpoints for operational notifications
- deliver email OTP challenges for signup and staff activation without taking ownership of activation decisions
- react to commerce invoice-issued and payment-recorded facts without reaching into ecommerce tables directly
- keep trigger contracts explicit per source domain instead of relying on one generic `notification.requested` event
- hide internal-only operational events from customer notification streams
- keep SMS and other paid delivery channels out of the canonical scope unless explicitly reapproved

## Process Flow

1. Source module emits a notify-worthy event or an explicit notification trigger contract.
2. Notification planning maps the source fact to `enqueueNotification`, `scheduleReminder`, or cancellation actions with stable dedupe keys.
3. Notification policy checks preferences, templates, and delivery constraints for the relevant channel.
4. Queue schedules immediate or delayed delivery, or existing reminder policy is cancelled when a downstream fact closes the workflow.
5. Delivery result is stored and retried if needed.
6. Auth OTP delivery uses Nodemailer over SMTP, but challenge validation and activation ownership stay in `auth`.

## Use Cases

- booking reminder before appointment
- insurance inquiry update notice
- back-job status change notice
- service follow-up reminder after a completed job-order workflow
- invoice issuance starts aging reminder policy for unpaid commerce orders
- invoice payment recorded updates or stops aging reminder policy
- insurance renewal and service reminder notices
- customer signup email OTP delivery
- pending staff activation email OTP delivery

## API Surface

- `GET /users/:id/notification-preferences`
- `PATCH /users/:id/notification-preferences`
- `GET /users/:id/notifications`
- internal `enqueueNotification`
- internal `scheduleReminder`
- internal `applyTrigger`
- internal `enqueueAuthOtpDelivery`

## Edge Cases

- duplicate notifications from repeated upstream events
- duplicate trigger delivery reuses the same dedupe key and must not create a second customer-visible notification
- user opts out of a channel after a job is already queued
- reminder jobs remain queued after booking cancellation
- invoice reminders keep sending after payment is fully recorded
- email delivery fails after a reminder has already been scheduled
- reminder preferences change between queueing time and delivery time
- auth email OTP expiry and OTP flood control are handled in `auth`

## Writable Sections

- notification policy, reminder rules, delivery semantics, notification APIs, and notification edge cases
- do not redefine source-domain events or frontend messaging UX here

## Out of Scope

- frontend messaging UX
- template localization beyond basic placeholders
- marketing automation campaigns
