# T111 Notifications Reminders Core

## Slice ID

`T111`

## Source Of Truth

- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/tasks/01-main-service/T111-notifications-reminders-core.md`
- live controllers when implemented:
  - `backend/apps/main-service/src/modules/notifications/controllers/notifications.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/users/:id/notification-preferences` | `live` | Swagger/controller |
| `PATCH /api/users/:id/notification-preferences` | `live` | Swagger/controller |
| `GET /api/users/:id/notifications` | `live` | Swagger/controller |
| internal `enqueueNotification` | `live` | service |
| internal `scheduleReminder` | `live` | service |
| internal `enqueueAuthOtpDelivery` | `planned` | `T122` |

## Frontend Contract Files

- `frontend/src/lib/api/generated/notifications/requests.ts`
- `frontend/src/lib/api/generated/notifications/responses.ts`
- `frontend/src/lib/api/generated/notifications/errors.ts`
- `frontend/src/mocks/notifications/mocks.ts`

## Frontend States To Cover

- own notification-preferences view
- preference update success state
- empty notification history state
- queued operational notification state
- skipped notification state when a channel or category is disabled
- foreign-customer forbidden state

## Notes

- This slice is for operational reminders and notices only.
- Auth OTP delivery is intentionally excluded here and remains planned in `T122`.
- Frontend should treat queued and skipped notifications as live states.
- Reminder scheduling is BullMQ-backed, but the frontend contract only depends on the public preference and history routes.
