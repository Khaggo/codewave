# T304 Notification Trigger Integration

## Slice ID

`T304`

## Source Of Truth

- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/api-strategy.md`
- `docs/architecture/tasks/03-integration/T304-notification-trigger-integration.md`
- internal contract code:
  - `backend/shared/events/contracts/notification-triggers.ts`
  - `backend/apps/main-service/src/modules/notifications/services/notification-trigger-planner.service.ts`

## Route Status

This slice does not add new public frontend routes.

It adds live notification-trigger contracts and source-domain trigger planning:

| Trigger Or Fact | Status | Source |
| --- | --- | --- |
| `booking.reminder_requested` | `live` | shared notification trigger contract |
| `insurance.inquiry_status_changed` | `live` | shared notification trigger contract |
| `back_job.status_changed` | `live` | shared notification trigger contract |
| `job_order.service_follow_up_requested` | `live` | shared notification trigger contract |
| `order.invoice_issued` | `live` | commerce event consumed by notification trigger planner |
| `invoice.payment_recorded` | `live` | commerce event consumed by notification trigger planner |

It also adds a live internal orchestration path:

| Internal Operation | Status | Source |
| --- | --- | --- |
| `applyTrigger` | `live` | notifications service |

## Frontend Contract Files

- `frontend/src/lib/api/generated/notifications/requests.ts`
- `frontend/src/lib/api/generated/notifications/responses.ts`
- `frontend/src/lib/api/generated/notifications/triggers.ts`
- `frontend/src/mocks/notifications/mocks.ts`

## Frontend States To Cover

- back-job update notification in the customer notification history
- booking reminder trigger preview with stable dedupe
- invoice-issued reminder-policy state
- invoice-payment-recorded cancellation state where queued aging reminders are no longer customer-visible work

## Notes

- Notifications remains subscriber-owned: source domains emit facts or trigger contracts, but notification copy, delivery policy, queueing, retries, and cancellation stay inside `main-service.notifications`.
- Duplicate trigger delivery is handled by stable dedupe keys before queue work is added.
- `invoice.payment_recorded` may cancel invoice-aging reminder policy without creating a new customer-visible notification.
- Customer-invisible internal reconciliation stays filtered out of the public notification history route.
