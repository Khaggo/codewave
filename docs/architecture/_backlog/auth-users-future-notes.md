# Auth/Users Future Notes

This file is non-canonical roadmap material. It is not part of the validator-backed SSoT and should not be used as the default implementation reference for agents.

## Auth Ideas Not Yet Implemented

- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- explicit `auth_sessions` table
- explicit `password_reset_tokens` table
- broader session revocation flows beyond the latest active refresh token

## Users Ideas Not Yet Implemented

- `user_preferences` persistence
- richer profile completeness tracking
- dedicated user search/list endpoints
- broader customer-account administration flows

## Usage Rule

Use this file only for roadmap discussion or future planning. If an item here becomes implemented, move it into the canonical domain doc and validator-backed manifest state.
