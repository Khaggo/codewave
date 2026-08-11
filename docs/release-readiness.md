# Release readiness

This checklist covers the Railway web and API services. It lists environment
variable names only; values belong in the target Railway service.

## API service

- Root directory: `/backend`
- Build command: `npm run build:main`
- Pre-deploy migration command: `npm run db:migrate`
- Start command: `npm run start:main:compiled`
- Healthcheck: `/api/health/ready`
- Required variable names: `NODE_ENV`, `DATABASE_URL`, `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `ACCESSORY_COMMERCE_MODE`, and
  `ACCESSORY_MEDIA_DRIVER`
- Redis variable names: `REDIS_URL` or `REDISHOST` with `REDISPORT` (plus
  provider-supplied Redis credential names when applicable)
- Release/configuration variable names: `RELEASE_VERSION` and
  `ENABLE_PUBLIC_OPENAPI`
- Railway supplies `PORT`; do not replace it with a fixed port.

Production must keep `ENABLE_PUBLIC_OPENAPI` disabled. The API must report a
non-placeholder release identity from `RELEASE_VERSION` or deployment commit
metadata on `/api/health` and `/api/health/ready`.

## Web service

- Root directory: `/frontend`
- Build command: `npm run build`
- Start command: `npm run start -- --hostname 0.0.0.0 --port $PORT`
- Healthcheck: `/health`
- Required variable names: `NEXT_PUBLIC_API_BASE_URL`,
  `NEXT_PUBLIC_ENABLE_AI`, and Railway-provided `PORT`

## Artifact gates

- Include `backend/drizzle/0008_acoustic_white_tiger.sql`,
  `backend/drizzle/0009_staff_first_login_security.sql`, their journal entries,
  and the checked-in generated metadata.
- Run `npx drizzle-kit check` from `backend`; do not apply remote migrations as
  part of this local release check.
- Verify `/payments/success`, `/payments/cancel`,
  `/accessories/payment/success`, `/accessories/payment/cancel`, and
  `/favicon.ico` resolve on the web service.
