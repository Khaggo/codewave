# T121 Staff Pending Activation Google Email

## Scope

Create the staff activation flow that requires Google verification plus email OTP before staff accounts become active and usable.

## Routes

- `POST /api/auth/staff-activation/google/start`
- `POST /api/auth/staff-activation/verify-email`

## Request DTOs

### GoogleSignupStartDto

- `googleIdToken` (string)

### VerifyEmailOtpDto

- `enrollmentId` (string)
- `otp` (string)

## Response DTOs

### GoogleSignupStartResponseDto

- `enrollmentId` (string)
- `userId` (string)
- `maskedEmail` (string)
- `otpExpiresAt` (string, ISO)
- `status` (string, `pending_activation`)

### AuthSessionResponseDto

- `accessToken` (string)
- `refreshToken` (string)
- `user` (object, user response payload)

## Behavior Notes

- staff activation is valid only for non-customer roles
- staff accounts must remain inactive until email OTP verification succeeds
- staff activation rejects mismatched Google identity or duplicate identity linkage
- OTP challenges are single-use and time-bounded

## Error Cases

- `404` when staff account or OTP enrollment is missing
- `400` for invalid Google ID token, OTP mismatch, or expired OTP
- `409` for already-consumed OTP or conflicting Google identity linkage
