When completing work in this repo, verify the smallest relevant set of checks rather than everything blindly. Typical completion steps:
- For backend code changes: run the relevant build (`npm run build`, `build:main`, or `build:ecommerce`) from `backend`.
- Run `npm run test` in `backend` when behavior or endpoints changed.
- Run `npm run docs:validate` when architecture docs or task docs changed.
- For API contract work, use Swagger helpers (`npm run swagger:ready` / `swagger:check`) and compare live `/docs-json` against docs/contracts and frontend generated contract files.
- For shared slices, confirm frontend states cover happy path, empty state, error state, and auth/role behavior per `docs/architecture/frontend-backend-sync.md`.
- Note that there is no runnable frontend app in the repo yet, so frontend verification is currently contract/mocks based unless a future app is added.