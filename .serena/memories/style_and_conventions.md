Project conventions observed from docs and TypeScript contract files:
- Treat `docs/architecture` as canonical SSoT; task files and frontend contract packs are helpers, not business truth.
- Load architecture docs in the documented order, especially `system-architecture.md`, `api-strategy.md`, `dto-policy.md`, and `frontend-backend-sync.md` for shared slices.
- Frontend/backend work is slice-based and keyed by task IDs like `T105`, `T109`, `T111`.
- Frontend contract artifacts live under `frontend/src/lib/api/generated/<slice>` and `frontend/src/mocks/<slice>`.
- Every route in a contract pack must be labeled `live` or `planned`; implemented truth comes from backend Swagger `/docs-json`.
- TypeScript style in contract files uses explicit exported union types, interfaces, and typed route maps (`Record<string, RouteContract>`).
- Paths and docs use kebab-case file names; TypeScript exported types/interfaces use PascalCase; mock constants use descriptive camelCase names ending with `Mock`.