# 2026-05-11 Workspace Dev Scripts Design

## Goal
Expose the project's preferred startup commands in repo-root npm scripts without adding extra behavior.

## Decision
Add direct root scripts that match the user-provided commands:

- `dev:ecommerce` -> `cd backend && npm run dev:ecommerce`
- `dev:web` -> `cd frontend && npm install && npm run dev -- --port 3002`
- `dev:mobile` -> `cd mobile && npm install && npx expo start --lan --clear --port 8081`
- `dev:mobile:web` -> `cd mobile && npx expo start --web --port 8090 --clear`

## Reasoning
The user wants the JSON scripts to run the exact commands for this project and nothing else. Root scripts keep that behavior explicit and let the project be started from the workspace root.

## Scope
- Update repo-root `package.json`
- No changes to backend, frontend, or mobile app behavior outside those script entries
