# T105 Bookings Operations And Queue

## Slice ID

`T105`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/tasks/01-main-service/T105-bookings-operations-and-queue.md`
- live controller when implemented: `backend/apps/main-service/src/modules/bookings/controllers/bookings.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/services` | `live` | Swagger/controller |
| `GET /api/time-slots` | `live` | Swagger/controller |
| `POST /api/bookings` | `live` | Swagger/controller |
| `GET /api/bookings/:id` | `live` | Swagger/controller |
| `PATCH /api/bookings/:id/status` | `live` | Swagger/controller |
| `POST /api/bookings/:id/reschedule` | `live` | Swagger/controller |
| `GET /api/users/:id/bookings` | `live` | Swagger/controller |
| `GET /api/bookings/daily-schedule` | `live` | Swagger/controller |
| `GET /api/queue/current` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/errors.ts`
- `frontend/src/mocks/bookings/mocks.ts`

## Frontend States To Cover

- service list load
- time-slot list load
- booking creation success
- booking validation error
- booking detail view
- reschedule success
- daily schedule view
- queue snapshot view
- unauthorized staff action state
- forbidden customer-on-staff-route state

## Notes

- `daily-schedule` and `queue/current` are now live, but they are staff-only routes and require bearer-auth flows in the frontend.
- Frontend should prefer the live DTO-aligned booking response for implemented booking screens and keep mocks for empty, loading, and forbidden states.
