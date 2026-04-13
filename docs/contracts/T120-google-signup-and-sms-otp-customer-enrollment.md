# T120 Google Signup And Email OTP Customer Enrollment

## Slice ID

`T120`

## Source Of Truth

- `docs/architecture/domains/main-service/auth.md`
- `docs/architecture/tasks/01-main-service/T120-google-signup-and-sms-otp-customer-enrollment.md`
- live controllers when implemented:
  - `backend/apps/main-service/src/modules/auth/controllers/auth.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/auth/google/signup/start` | `live` | Swagger/controller |
| `POST /api/auth/google/signup/verify-email` | `live` | Swagger/controller |
| `POST /api/auth/register` | `live` | Swagger/controller (legacy) |
| `POST /api/auth/login` | `live` | Swagger/controller (legacy) |
| `POST /api/auth/refresh` | `live` | Swagger/controller |
| `GET /api/auth/me` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/auth/requests.ts`
- `frontend/src/lib/api/generated/auth/responses.ts`
- `frontend/src/lib/api/generated/auth/errors.ts`
- `frontend/src/mocks/auth/mocks.ts`

## Frontend States To Cover

- Google signup start form
- email OTP verification form
- pending activation state
- OTP invalid or expired state
- legacy password login form (until migration completes)

## Notes

- Tokens are issued only after OTP verification succeeds.
- Password-first registration remains legacy until migration completes.
