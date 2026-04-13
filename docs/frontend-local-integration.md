# Frontend Local Integration Workflow

This workflow is the easiest way to bring a frontend project from another computer into this repo without losing the backend-owned contract packs and mocks.

## Goal

- import the full frontend app into `frontend/`
- preserve the slice contracts under `frontend/src/lib/api/generated/`
- preserve the slice mocks under `frontend/src/mocks/`
- keep AI features present but disabled by env until core backend integration is stable

## What To Request From The Frontend Developer

Ask for the full project, including:

- `package.json`
- lockfile: `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`
- app code: `src/`, `app/`, `pages/`, `components/`
- `public/`
- framework config such as `next.config.*` or `vite.config.*`
- `tsconfig.json` or `jsconfig.json`
- styling config such as `tailwind.config.*` and `postcss.config.*`
- `.env.example`
- API/auth utilities
- AI-related files and dependencies

Also ask them:

- which framework they are using
- how they currently call APIs
- which env vars are required for AI features

## Safe Import Steps

1. Copy the frontend project somewhere outside the target `frontend/` directory.
   - Example: `D:\mainprojects\codewave\incoming\frontend-app`
2. Run the import command from `backend/`:

```powershell
cd backend
npm run frontend:import -- ..\incoming\frontend-app
```

3. Inspect the imported app:

```powershell
npm run frontend:inspect
```

4. Install the frontend dependencies using the detected package manager.
5. Review `frontend/.codex-integration/README.md`.
6. Keep AI features disabled by env until the first live slices are working.

## AI Default

If the imported frontend does not already expose an AI feature flag, add one for the relevant framework and default it to `false` during backend integration:

- `NEXT_PUBLIC_ENABLE_AI=false`
- `VITE_ENABLE_AI=false`
- `REACT_APP_ENABLE_AI=false`

Set the backend base URL alongside it:

- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000`
- `VITE_API_BASE_URL=http://127.0.0.1:3000`
- `REACT_APP_API_BASE_URL=http://127.0.0.1:3000`

## First Slice Integration Order

Use the existing contract packs and live Swagger truth to integrate these first:

1. `T110` insurance
2. `T111` notifications
3. `T109` back jobs

These slices already have clearer live contracts and are better first targets than loyalty.
