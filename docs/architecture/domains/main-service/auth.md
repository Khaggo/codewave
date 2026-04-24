# auth

## Domain ID

`main-service.auth`

## Agent Summary

This is one of the golden reference domains. Load it for Google-verified signup targets, email OTP activation, legacy login, token, refresh, and guard behavior. Skip it for profile, address, vehicle, or booking behavior.

## Primary Objective

Maintain secure authentication, activation gating, staff-account credential ownership, and token issuance while keeping profile semantics in `main-service.users`.

## Inputs

- user identity references from `main-service.users`
- Google identity verification payloads
- email OTP verification payloads
- legacy login, registration, and refresh payloads during migration
- authenticated delete-account requests with current-password confirmation plus email OTP verification
- super-admin staff-account provisioning and activation changes
- bearer-token protected requests for `GET /auth/me`

## Outputs

- access and refresh tokens
- `auth_accounts`
- `refresh_tokens`
- `login_audit_logs`
- `staff_admin_audit_logs`
- authenticated user identity from JWT claims
- admin-managed staff account credential state
- activation decisions, OTP challenge ownership, and Google identity linkage targets

## Dependencies

- `main-service.users`

## Owned Data / ERD

Primary tables or equivalents:
- `auth_accounts`
- `refresh_tokens`
- `login_audit_logs`
- `staff_admin_audit_logs`
- `auth_google_identities`
- `auth_otp_challenges`

Key relations:
- one `users` record may map to one `auth_accounts` credential owner
- one auth account can issue many refresh tokens over time, but only the latest active stored token remains valid
- one Google identity maps to one AUTOCARE user
- OTP challenges are single-use and time-bounded for activation

## Primary Business Logic

- canonical target flow verifies a Google identity, then verifies email OTP, then activates the account and issues tokens
- provision pending staff identities for `technician`, `service_adviser`, and `super_admin` accounts that must complete activation before use
- current implementation still supports legacy email-and-password registration and login while the Google+email migration is pending, but password signup now also enters pending activation and requires email OTP before tokens are issued
- issue access and refresh tokens
- rotate to one latest active refresh token per user
- archive the authenticated account only after current-password confirmation and email OTP verification, then revoke active refresh tokens
- deactivate or reactivate staff credentials without deleting the user record
- write login audit logs for successful and failed login attempts
- write staff-admin audit logs for staff provisioning and activation-status changes, preserving actor, timestamp, and reason metadata
- expose the authenticated identity through JWT guard resolution

## Process Flow

1. Canonical customer enrollment begins with Google ID token verification and creates or resumes a pending account state linked to `main-service.users`.
2. Auth requests email OTP delivery through `main-service.notifications`, verifies the submitted OTP, activates the account, and only then issues tokens.
3. Super-admin staff provisioning creates a pending staff identity, after which the staff member completes Google verification and email OTP before activation.
4. Current legacy behavior still allows `POST /auth/register` to create password-first customer credentials while the migration tasks are incomplete, but that flow now creates a pending account and sends an email OTP instead of issuing tokens immediately.
5. `POST /auth/register/verify-email` verifies the password-registration OTP, activates the account, and only then issues tokens.
6. `POST /auth/login` resolves the user by email, validates account activity and password, logs the attempt, and returns tokens for currently activated accounts without requiring OTP again.
7. `POST /auth/refresh` verifies the submitted refresh token, checks it against the latest active stored token, and returns a rotated token pair.
8. `POST /auth/account/delete/start` confirms the current password and sends a delete-account OTP without archiving the account yet.
9. `POST /auth/account/delete/verify` verifies the delete-account OTP, archives the authenticated account, and retires active sign-in access without hard deleting history.
10. `GET /auth/me` uses JWT guard resolution to expose the authenticated identity already present on the request.
11. Staff activation begins at `POST /auth/staff-activation/google/start`, then `POST /auth/staff-activation/verify-email` activates the staff identity and issues tokens.
12. Staff-account deactivation updates both the user active flag and auth-account active flag, then revokes active refresh tokens for that identity.

## Use Cases

- customer completes Google verification plus email OTP and receives tokens
- existing activated account signs in and refreshes tokens
- client refreshes an authenticated session
- authenticated customer archives their own account after confirming the current password and verifying the delete-account OTP
- protected endpoints resolve the authenticated user from the bearer token
- super admin provisions a new technician, service adviser, or super-admin account in pending activation state
- staff member completes Google verification + email OTP to activate a pending staff account
- super admin deactivates or reactivates an existing staff account without deleting history

## API Surface

- `POST /auth/register`
- `POST /auth/register/verify-email`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/account/delete/start`
- `POST /auth/account/delete/verify`
- `GET /auth/me`
- `POST /auth/google/signup/start`
- `POST /auth/google/signup/verify-email`
- `POST /auth/staff-activation/google/start`
- `POST /auth/staff-activation/verify-email`
- `POST /admin/staff-accounts`
- `PATCH /admin/staff-accounts/:id/status`

## Edge Cases

- duplicate email during registration
- duplicate email or duplicate `staff_code` during staff provisioning
- duplicate Google identity linkage for a different AUTOCARE account
- Google or email mismatch during activation
- wrong, expired, or already-consumed email OTP
- pending accounts must not receive usable tokens before activation completes
- staff activation requires a matching Google identity and OTP challenge
- missing or inactive auth account rejects login
- wrong current password, wrong delete-account OTP, or missing bearer token blocks account archival
- invalid credentials are logged and rejected
- invalid, stale, or mismatched refresh token is rejected
- missing or invalid bearer token blocks `GET /auth/me`
- non-super-admin callers are forbidden from staff-account admin flows
- customer identities cannot be managed through the staff-account status endpoint

## Writable Sections

- auth-owned ERD, auth flows, token rules, session behavior, staff-account credential rules, auth APIs, and auth edge cases
- do not edit user profile semantics, address ownership, or non-auth domain rules here

## Out of Scope

- credential-recovery features beyond the current login and refresh contract
- session expansion beyond the latest active refresh-token rule
- profile editing
- customer addresses
- role-specific business workflows after authentication
