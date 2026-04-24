# T520 Notification Preferences Delivery States And Reminder Sync

## Slice ID

`T520`

## Source Of Truth

- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T520-notification-preferences-delivery-states-and-reminder-sync.md`
- `docs/contracts/T111-notifications-reminders-core.md`
- `docs/contracts/T304-notification-trigger-integration.md`
- `docs/contracts/T506-booking-status-sync-reminders-and-cross-surface-acceptance.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- `docs/team-flow-async-orchestration.md`
- live controller: `backend/apps/main-service/src/modules/notifications/controllers/notifications.controller.ts`
- mobile helper: `mobile/src/lib/notificationClient.js`
- mobile surface: `mobile/src/screens/Dashboard.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `GET /api/users/:id/notification-preferences` | `live` | Swagger/controller | load the active customer's email and reminder preferences |
| `PATCH /api/users/:id/notification-preferences` | `live` | Swagger/controller | update customer-owned preference toggles |
| `GET /api/users/:id/notifications` | `live` | Swagger/controller | load the active customer's operational notification history |
| customer read/unread mutation endpoints | `planned` | task API gap | future persistent read-state support; current mobile read state is local-session-only |

## Important Contract Constraint

- there is **no live read/unread notification mutation route** in the current backend Swagger surface
- mobile may mark, dismiss, or open notifications locally for the current session only
- clients must not persist read/unread state or invent synced read counters until backend endpoints are added
- notification delivery status is backend truth; read state is not backend truth yet

## Customer Feed States

| State | Meaning |
| --- | --- |
| `feed_loading` | the customer mobile app is loading the live notification history route |
| `feed_ready` | one or more customer-visible operational notifications were returned |
| `feed_empty` | the backend returned no notifications for this customer |
| `feed_forbidden` | the active user attempted to read another customer's notification history or has no active session |
| `feed_not_found` | the requested customer user record does not exist |
| `feed_load_failed` | a non-classified network or API failure blocked notification history loading |

## Preference States

| State | Meaning |
| --- | --- |
| `preferences_loading` | the customer mobile app is loading the live preference record |
| `preferences_enabled` | email and at least one operational reminder category are enabled |
| `preferences_disabled` | email or all operational reminder categories are disabled |
| `preferences_saving` | a preference update request is in flight |
| `preferences_saved` | the backend accepted the preference update and returned fresh preferences |
| `preferences_forbidden` | the active user attempted to read or update another customer's preferences |
| `preferences_not_found` | the requested customer user record does not exist |
| `preferences_save_failed` | validation, network, or API failure blocked preference persistence |

## Delivery And Read Display States

| State | Backend Source | Meaning |
| --- | --- | --- |
| `pending_delivery` | `queued` | notification exists and delivery is pending or scheduled |
| `delivered_unread` | `sent` | notification was delivered; unread display is local-only |
| `delivered_local_read` | `sent` plus local session mark | customer opened or marked the notification in this app session |
| `failed_retry_pending` | `failed` | delivery failed and may retry through backend policy |
| `skipped_by_preference` | `skipped` | delivery was skipped because preferences disabled the relevant channel or category |
| `cancelled_hidden` | `cancelled` | reminder or notification was cancelled because source-domain truth changed |

## Reminder And Status-Change Mapping

| Category | Source Trigger / Fact | Customer Action | State Owner |
| --- | --- | --- | --- |
| `booking_reminder` | `booking.reminder_requested` | open booking history or detail | `main-service.bookings` |
| `insurance_update` | `insurance.inquiry_status_changed` | open insurance tracking | `main-service.insurance` |
| `back_job_update` | `back_job.status_changed` | open vehicle timeline | `main-service.back-jobs` |
| `invoice_aging` | `order.invoice_issued` / invoice-aging policy | open invoice or order history | `ecommerce.invoice-payments` |
| `service_follow_up` | `job_order.service_follow_up_requested` | open vehicle timeline | `main-service.job-orders` |

## Frontend Contract Files

- `frontend/src/lib/api/generated/notifications/requests.ts`
- `frontend/src/lib/api/generated/notifications/responses.ts`
- `frontend/src/lib/api/generated/notifications/errors.ts`
- `frontend/src/lib/api/generated/notifications/triggers.ts`
- `frontend/src/lib/api/generated/notifications/customer-mobile-notifications.ts`
- `frontend/src/mocks/notifications/mocks.ts`
- `mobile/src/lib/notificationClient.js`
- `mobile/src/screens/Dashboard.js`

## Contract Rules

- customer mobile remains the only customer-facing notification surface in this slice
- web/admin may inspect operational effects elsewhere, but notification preferences are not a staff editing surface here
- auth OTP delivery bypasses customer notification preferences because activation decisions are owned by `main-service.auth`
- booking, insurance, invoice, back-job, and service follow-up notices stay side effects of source-domain truth
- no SMS, push, paid notification channel, or marketing automation behavior is part of this contract
- skipped, queued, failed, sent, and cancelled are delivery states, not source-domain status replacements
- local read/dismiss state may improve the mobile session UX, but it must be visibly documented as non-persistent until backend support exists

## Acceptance States

- notification preferences loaded
- preferences enabled and disabled represented
- preference update saved
- notification feed loaded
- notification feed empty
- queued/pending delivery represented
- delivered unread represented
- local-session read represented
- failed/retry-pending represented
- skipped-by-preference represented
- forbidden own-account guard represented

## Notes

- `T520` completes the customer-notification client integration layer on top of the already live `T111` public routes and `T304` trigger contracts.
- The next durable backend improvement for this surface is read/unread persistence, but this task intentionally records it as an API gap instead of inventing client-owned backend truth.
