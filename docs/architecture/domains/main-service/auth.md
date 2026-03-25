# auth

## Purpose

Own authentication, session boundaries, credential lifecycle, and access-token issuance for the AUTOCARE ecosystem.

## Owned Data / ERD

Primary tables or equivalents:
- `auth_accounts`
- `auth_sessions`
- `refresh_tokens`
- `password_reset_tokens`
- `login_audit_logs`

Key relations:
- one `users` record may map to one `auth_accounts` credential owner
- one auth account can have many sessions and refresh tokens

Ownership notes:
- `users` owns customer identity and profile data
- `auth` owns secrets, password hashes, login sessions, and device/session revocation

## Primary Business Logic

- register credentials for a valid user profile
- authenticate by email/username and password
- issue and rotate access and refresh tokens
- revoke sessions on logout, password reset, or admin action
- separate customer roles from staff/admin roles at the permission layer
- record security-relevant events for auditability

## Process Flow

1. User registers or is provisioned
2. Auth validates credentials and issues tokens
3. Guards attach identity and role claims to requests
4. Session refresh rotates refresh token safely
5. Logout or security event revokes the active session

## Use Cases

- customer signs up and logs in
- admin or staff logs in to operational screens
- user resets forgotten password
- system invalidates sessions after password change

## API Surface

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

## Edge Cases

- duplicate identity already attached to another auth account
- leaked refresh token requires targeted revocation
- suspended user tries to authenticate
- customer and staff identities overlap incorrectly

## Dependencies

- `users`
- shared guards, hashing, token, and audit utilities

## Out of Scope

- profile editing
- customer addresses
- role-specific business workflows after authentication
