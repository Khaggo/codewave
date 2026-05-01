# Railway Cheapest Deployment

This branch is prepared for the lower-cost Railway rollout:

- `autocare-cc.com` -> `frontend/`
- `api.autocare-cc.com` -> `backend/` main service
- ecommerce stays undeployed for now

## Railway Service Setup

Create two Railway services from this repository.

### Web service

- Root directory: `/frontend`
- Config-as-code path: `/frontend/railway.toml`
- Domain: `autocare-cc.com`
- Required variables:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.autocare-cc.com`
  - `NEXT_PUBLIC_ENABLE_AI=false`
  - Leave `NEXT_PUBLIC_ECOMMERCE_API_BASE_URL` unset on this cheaper setup

### API service

- Root directory: `/backend`
- Config-as-code path: `/backend/railway.toml`
- Domain: `api.autocare-cc.com`
- Required variables:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `RABBITMQ_URL`
  - `RABBITMQ_QUEUE`
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `CORS_ORIGINS=https://autocare-cc.com`

## Managed Railway Resources

The main API currently expects these backing services:

- PostgreSQL
- Redis
- RabbitMQ

Use Railway-managed resources and wire their variables into the API service.

## Optional Variables

Only set these when the feature is actually in use:

- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Healthchecks

- web: `/health`
- api: `/api/health`

## Notes

- This repo is a monorepo, so Railway root directories and config file paths must be set per service.
- The frontend already disables ecommerce-only surfaces when `NEXT_PUBLIC_ECOMMERCE_API_BASE_URL` is empty.
- The backend now respects Railway's injected `PORT`.
