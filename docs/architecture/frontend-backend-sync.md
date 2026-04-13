# Frontend Backend Sync

This file defines the canonical coordination model between frontend and backend work in AUTOCARE.

## Shared Slice Workflow

- Use one task file as the shared coordination unit for every feature slice.
- For each slice, load:
  - `README.md`
  - `system-architecture.md`
  - `api-strategy.md`
  - `dto-policy.md`
  - the owning domain doc
  - the task file
- The slice output is a shared contract pack that both frontend and backend can use without inventing parallel behavior.
- The task ID is the common reference for backend implementation, frontend mock mode, and integration review.

## Codex Coordination Model

- Codex acts as the contract coordinator between backend and frontend work.
- Backend work uses domain docs, task docs, DTO policy, and live Swagger to implement the slice.
- Frontend work uses the same domain doc and task doc plus the generated or curated contract pack and mocks.
- Codex should prevent frontend assumptions that are not supported by:
  - the domain doc
  - the task doc
  - the live Swagger contract for implemented routes

## Contract Artifacts

- Canonical business intent lives in `docs/architecture/domains/...`.
- Slice execution intent lives in `docs/architecture/tasks/...`.
- Runtime API truth lives in backend Swagger at `/docs-json`.
- Frontend-ready contract packs live outside the canonical SSoT and should include:
  - route list
  - request types
  - response types
  - error cases
  - mock fixtures
- Default workspace locations are:
  - `frontend/src/lib/api/generated/<slice>/` for typed contracts
  - `frontend/src/mocks/<slice>/` for mock fixtures
- Human-readable handoff notes may live in `docs/contracts/`.

## Contract Pack Rules

- Every route in a contract pack must be labeled as either `live` or `planned`.
- `live` means the route exists in backend Swagger and controller code.
- `planned` means the route is derived from the task and domain docs but is not yet implemented.
- For implemented routes, Swagger wins over older task wording if they diverge.
- For unimplemented routes, the task and domain docs define the intended next contract and must be marked clearly as planned.

## Frontend Consumption Rules

- Frontend may build against mocks first only when the mocks are derived from the same slice contract pack.
- Frontend should not depend on undocumented fields or infer hidden backend behavior.
- Typed request and response shapes should be treated as the frontend integration baseline, not ad hoc JSON guessed from UI needs.
- Shared runtime packages are not required in the current stage; generated or curated frontend contracts are the default.

## Slice Acceptance Workflow

1. Codex prepares or refreshes the slice contract pack.
2. Frontend builds UI states using typed contracts and mocks.
3. Backend implements or refines the matching endpoints, DTOs, Swagger, and tests.
4. Codex compares frontend expectations against live `/docs-json`.
5. The slice is accepted only after happy path, empty state, error state, and auth or role behavior all match.
