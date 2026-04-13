# Auth Security Policy

This file defines the canonical account-enrollment and activation model for AUTOCARE identity. Use it when signup, staff activation, OTP handling, Google identity verification, or legacy-login migration is in scope.

## Signup and Activation Model

- The canonical account-creation flow is `Google account verification + email OTP`.
- This policy applies to both customer self-enrollment and staff activation after super-admin provisioning.
- Two-factor verification is required for signup and activation only. It is not the default rule for every later login.
- Tokens should be issued only after account activation succeeds.
- Current password-first signup and login may remain temporarily during migration, but they are legacy compatibility behavior rather than the forward product direction.

## Google Identity Verification

- Customer signup starts by verifying a Google ID token before the account can proceed to activation.
- Staff activation also begins with backend verification of a Google ID token against the pending staff record created by a super admin.
- One Google identity should map to one AUTOCARE credential owner at a time.
- Email mismatch between the pending account and the verified Google identity must be rejected cleanly and auditably.
- Implementation should use an approved identity-provider adapter rather than hard-coding vendor details into domain logic.

## Email OTP Verification

- Email OTP is the second activation step after Google identity confirmation.
- OTP challenges must be single-use, time-bounded, and rate-limited.
- Expired, duplicate, or already-consumed OTP attempts must fail without activating the account.
- Delivery execution belongs to `main-service.notifications`, while OTP challenge state and activation decisions belong to `main-service.auth`.
- Nodemailer-backed SMTP delivery is the canonical transport for activation emails.

## Pending Account States

- Customer and staff accounts should enter a `pending_activation` state until Google verification and email OTP verification both succeed.
- Super-admin staff provisioning creates a pending staff identity rather than an immediately usable active account.
- Pending accounts may store partial identity state, but they must not be treated as fully authenticated users.
- Activation should set the account to an active state and unlock token issuance.
- Deactivation must remain auditable and separate from pending-activation handling.

## Legacy Login Position

- Current password-based `POST /auth/register`, `POST /auth/register/verify-email`, `POST /auth/login`, and `POST /auth/refresh` remain valid as legacy compatibility behavior until the migration tasks land.
- `POST /auth/register` must create a pending account and send an email OTP. It must not issue usable tokens by itself.
- `POST /auth/register/verify-email` activates the pending password-based account and is the point where tokens may first be issued.
- `POST /auth/login` remains email-and-password only for already activated accounts. OTP is not required as part of normal later login.
- Canonical docs must not present password-only registration as the target steady state.
- New implementation work should prioritize Google+email activation flows before expanding password-only behavior.
- Migration planning should keep refresh-token and bearer-token behavior stable for already activated accounts.

## Audit and Delivery Expectations

- OTP requests, delivery attempts, verification failures, and activation success must be audit-visible.
- Minimal sensitive data should be retained for OTP challenge records and Google identity linkage.
- Notifications must expose delivery status clearly enough for auth to distinguish provider failure from invalid user input.
- Repeated failed activation attempts should remain observable without leaking implementation secrets to clients.
