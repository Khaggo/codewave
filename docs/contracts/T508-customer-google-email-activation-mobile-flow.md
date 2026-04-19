# T508 Customer Google Email Activation Mobile Flow

## Slice ID

`T508`

## Source Of Truth

- `docs/architecture/domains/main-service/auth.md`
- `docs/architecture/auth-security-policy.md`
- `docs/architecture/tasks/05-client-integration/T508-customer-google-email-activation-mobile-flow.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/auth/controllers/auth.controller.ts`
- mobile client helper: `mobile/src/lib/authClient.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `POST /api/auth/google/signup/start` | `live` | Swagger/controller | submit Google proof, create pending activation, and trigger email OTP delivery |
| `POST /api/auth/google/signup/verify-email` | `live` | Swagger/controller | verify OTP, activate the account, and issue the first active session |
| `POST /api/auth/register` | `live` | Swagger/controller | legacy password fallback only while migration remains incomplete |
| `POST /api/auth/register/verify-email` | `live` | Swagger/controller | legacy password fallback verification only |

## Mobile Activation State Model

| State | Meaning |
| --- | --- |
| `google_identity_required` | customer must complete Google identity proof before activation can start |
| `starting_google_signup` | Google proof submission is in flight |
| `pending_email_otp` | auth returned a pending activation and the latest enrollment is waiting for OTP |
| `resend_by_restart` | resend is handled by restarting Google signup, not by a hidden resend API |
| `otp_invalid` | entered OTP is wrong for the active enrollment |
| `otp_expired` | enrollment exists but the OTP has expired and the flow must restart |
| `duplicate_identity_blocked` | Google identity or email is already linked to an account and the flow must stop |
| `activation_context_mismatch` | local OTP screen is no longer aligned with the latest enrollment context |
| `active_session_issued` | OTP verification succeeded and the first usable customer session exists |
| `profile_onboarding_handoff` | active session continues into customer profile completion |
| `vehicle_onboarding_handoff` | active session continues into first-vehicle onboarding |
| `onboarding_complete` | profile and first-vehicle handoff steps are complete and customer home can load |

## Error And Retry Coverage

| Case | Expected Handling |
| --- | --- |
| invalid Google proof | block activation start and keep the user in pre-activation state |
| duplicate email | stop the flow and explain that the email is already registered |
| duplicate Google identity | stop the flow and explain that the Google identity is already linked |
| wrong OTP | keep the user in pending activation and allow retry |
| expired OTP | require restart through `POST /api/auth/google/signup/start` |
| missing or stale enrollment | treat as activation context mismatch and restart |
| resend request | restart Google signup and replace the stale enrollmentId with the newest one |

## Frontend Contract Files

- `frontend/src/lib/api/generated/auth/requests.ts`
- `frontend/src/lib/api/generated/auth/responses.ts`
- `frontend/src/lib/api/generated/auth/errors.ts`
- `frontend/src/lib/api/generated/auth/customer-google-activation.ts`
- `frontend/src/mocks/auth/mocks.ts`
- `mobile/src/lib/authClient.js`

## Post-Activation Handoff

- successful `POST /api/auth/google/signup/verify-email` lands in `active_session_issued`
- the next continuation state is `profile_onboarding_handoff`, not customer home
- after profile persistence succeeds, the next continuation state is `vehicle_onboarding_handoff`
- only after first-vehicle capture succeeds should the mobile app land in `onboarding_complete`
- onboarding continuation failures must not send the user back to OTP; the active session remains valid

## Acceptance States

- start Google-backed customer activation
- enter pending email OTP state
- retry wrong OTP without inventing new backend rules
- restart activation after expired OTP
- block duplicate identity or duplicate email cleanly
- recover from local activation-context mismatch
- continue into profile and vehicle onboarding after session issuance

## Notes

- No live resend endpoint exists for the Google activation flow.
- Mobile resend must call the start route again and replace the latest `enrollmentId`.
- Pending activation and active session must remain separate client states.
