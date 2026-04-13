# Frontend Backend Contract Packs

This folder contains human-readable handoff packs for slices that need frontend and backend to move in parallel.

## Purpose

- make one slice understandable without loading the entire architecture tree
- show which routes are `live` from Swagger and which are only `planned` from task and domain docs
- point frontend teammates to the matching TypeScript contract files and mock fixtures

## Rules

- these files are non-canonical helpers, not the source of business truth
- canonical behavior still lives in `docs/architecture/domains/...`
- execution intent still lives in `docs/architecture/tasks/...`
- live backend contract still comes from `/docs-json`
- if a route is marked `planned`, frontend must treat it as mock-only until backend Swagger exposes it

## Current Packs

- `T105-bookings-operations-and-queue.md`
- `T106-job-orders-core.md`
- `T109-back-jobs-review-and-validation.md`
- `T110-insurance-inquiry-core.md`
