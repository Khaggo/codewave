---
name: backend-testing-workflow
description: Use when validating changes in the Nest backend for this repo, especially around auth, users, vehicles, bookings, loyalty, job orders, events, or repositories. This skill is for choosing targeted backend tests, schema sync checks, and type checks without defaulting to broad unfocused runs.
---

# Backend Testing Workflow

## Overview

Use this skill when a backend change lands in `backend/apps/**` or `backend/shared/**`.
The goal is to run the narrowest test set that still proves the change, then widen only when the contract or shared behavior actually crosses module boundaries.

## Choose the Test Depth

### Service or repository logic changed

- Update or add targeted service specs first.
- If the change touches persistence, transactions, or read-after-write behavior, also run the integration spec for that module.

Example:

```powershell
cd backend
npm test -- users.service.spec.ts users.integration.spec.ts
```

### Controller or DTO/contract behavior changed

- Run the module's integration spec.
- If the change affects auth/session payloads, bookings, or any user-facing contract, pair it with the related service spec too.

### Shared events or cross-module behavior changed

- Run the relevant specs under `backend/shared/events/**`.
- Expand to affected module integration tests if the event payload shape or consumer behavior changed.

## Required Checks for Contract Work

### Type check

```powershell
cd backend
node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit
```

### Schema sync

Run this when schemas, tables, enums, or persisted fields changed.

```powershell
cd backend
npm run db:push
```

### Infra and health

Use this when integration tests or live smoke checks need Postgres, Redis, and RabbitMQ.

```powershell
cd backend
docker compose up -d
npm run dev:main
```

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing
```

## Repo Hotspots

- Main service modules: `backend/apps/main-service/src/modules/**`
- Ecommerce service modules: `backend/apps/ecommerce-service/src/modules/**`
- Shared contracts/events: `backend/shared/events/**`
- Test files: `backend/apps/main-service/test/**`, `backend/apps/ecommerce-service/test/**`, `backend/shared/events/*.spec.ts`

## What to Protect

- Auth and session shape stability
- User profile updates, especially transaction freshness and returned fields
- Vehicle ownership and booking ownership boundaries
- Booking schedule, queue, reschedule, and status transitions
- Event contract compatibility between publishers and consumers

## Red Flags

- A unit test passes but the integration test fails on real DB behavior.
- `db:push` changes more than expected after a small contract edit.
- A repository or service returns a stale row after an update.
- An endpoint shape changes without a matching frontend/mobile caller update.

