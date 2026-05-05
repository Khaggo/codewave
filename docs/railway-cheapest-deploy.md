# Railway Cheapest Deployment

This branch is prepared for the lower-cost Railway rollout:

- `autocare-cc.com` -> `frontend/`
- `api.autocare-cc.com` -> `backend/` main service
- ecommerce stays undeployed for now

If you decide to enable ecommerce later:

- `ecommerce.autocare-cc.com` -> `backend/` ecommerce service

## Railway Service Setup

Create two Railway services from this repository for the cheapest setup.

### Web service

- Root directory: `/frontend`
- Config-as-code path: `/frontend/railway.toml`
- Domain: `autocare-cc.com`
- Required variables:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.autocare-cc.com`
  - `NEXT_PUBLIC_ENABLE_AI=false`
  - Leave `NEXT_PUBLIC_ECOMMERCE_API_BASE_URL` unset on this cheaper setup
- Fastest setup:
  - open the Variables tab for the web service
  - use the Raw Editor
  - paste the contents of `frontend/.env.railway`

### API service

- Root directory: `/backend`
- Config-as-code path: `/backend/railway.toml`
- Domain: `api.autocare-cc.com`
- Required variables:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `REDIS_URL` or `REDIS_HOST` and `REDIS_PORT`
  - `CORS_ORIGINS=https://autocare-cc.com`
- Fastest setup:
  - open the Variables tab for the API service
  - use the Raw Editor
  - paste the contents of `backend/.env.railway`

### Ecommerce service

- Root directory: `/backend`
- Config-as-code path: `/backend/railway.ecommerce.toml`
- Domain: `ecommerce.autocare-cc.com`
- Required variables:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `REDIS_URL` or `REDIS_HOST` and `REDIS_PORT`
  - `CORS_ORIGINS=https://autocare-cc.com,https://api.autocare-cc.com`
- Fastest setup:
  - open the Variables tab for the ecommerce service
  - use the Raw Editor
  - paste the contents of `backend/.env.railway.ecommerce.example`

## Managed Railway Resources

The main API currently expects these backing services:

- PostgreSQL
- Redis
- RabbitMQ optional on the cheapest deploy

Use Railway-managed resources and wire their variables into the API service.

The checked-in `backend/.env.railway.example` uses Railway reference variables and assumes the backing service names are:

- `Postgres`
- `Redis`
- `RabbitMQ` when enabled

If your Railway canvas uses different service names, change those namespaces before pasting.

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
- ecommerce: `/api/health`

## Notes

- This repo is a monorepo, so Railway root directories and config file paths must be set per service.
- The frontend already disables ecommerce-only surfaces when `NEXT_PUBLIC_ECOMMERCE_API_BASE_URL` is empty.
- The backend now respects Railway's injected `PORT`.
- The backend now accepts Railway Redis variables from either `REDIS_URL` or the standard `REDISHOST` / `REDISPORT` / `REDISUSER` / `REDISPASSWORD` values documented by Railway.
- The ecommerce service can share the same Postgres and Redis backing services as the main API.
- RabbitMQ is optional for the cheapest Railway deploy; when it is omitted, event publishing stays in-process only until you add RabbitMQ later.
