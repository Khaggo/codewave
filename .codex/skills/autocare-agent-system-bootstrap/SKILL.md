---
name: autocare-agent-system-bootstrap
description: Activate the opt-in AUTOCARE role workflow for build-order or queued implementation work. Use only when the user explicitly asks for the agent system, build queue, worker roles, or coordinated handoffs. Do not trigger it for ordinary repo work or a generic request to continue.
---

# AUTOCARE Agent System Bootstrap

## Purpose

Prepare the existing AUTOCARE role workflow for a user-selected or queued task. This skill does not start a daemon, background worker, or autonomous process. By default, one Codex session applies the role checklists sequentially; Codex subagents are used only when the user explicitly requests parallel execution.

## Activation Flow

1. Confirm the user explicitly selected agent/queue mode and identify the active user objective. The active user request wins over the repository queue.
2. Check `git status --short` and preserve unrelated worktree changes.
3. Load `mcp-first-token-efficiency` so Serena or another relevant MCP is attempted before broad local reads.
4. Load `mcp-session-bootstrap` and verify only the MCPs needed for the task. Run a full sweep only when the user explicitly asks for it.
5. Use Serena for symbol-level truth. Use Graphify for broad dependency or blast-radius questions, then verify important results in source because generated artifacts can make graph searches noisy.
6. For API-sensitive work, load `swagger-serena-first`, activate Serena for `codewave`, check onboarding, and warm Swagger at `http://127.0.0.1:3000/docs-json`.
7. Before starting, stopping, or debugging backend/web/Expo runtimes, load `port-aware-dev-runtime` and check active listeners first.
8. If the user selected a task, use it directly. Otherwise read `docs/architecture/tasks/README.md` and select only a task whose status is `ready`. If none is ready, report an empty queue instead of reopening completed tasks or inventing work.
9. Read only the selected task file and its directly referenced source-of-truth docs.
10. Select supporting repo skills based on the task surface:
   - backend/API contracts: `backend-contract-shapes`
   - backend validation: `backend-testing-workflow`
   - cross-surface auth, booking, vehicle, profile, admin, or mobile integration: `backend-web-mobile-integration`
   - web/mobile request, response, state, and screen shapes: `frontend-data-shapes`
   - web/mobile verification: `frontend-testing-workflow`
11. Produce a short execution brief before implementation: objective or task ID, source docs loaded, API contract status, selected skills, write scope, role checklist, and validation plan.

## Role Handoffs

Use these roles as responsibility checklists. A handoff is not proof that another process ran. In the default single-agent mode, the same Codex session changes roles explicitly and retains ownership of integration.

- `integration-worker`: own cross-surface contract alignment and web/mobile integration details.
- `domain-worker`: own backend domain rules, DTO/API gaps, repository shape implications, and source-of-truth doc updates.
- `validator`: own acceptance checks, docs validation, build checks, and regression evidence.
- `test-worker`: own focused backend/frontend/manual flow test plans tied to the selected task.

## Guardrails

- Keep web staff/admin-only and mobile customer-only.
- Do not activate this workflow implicitly for ordinary implementation, investigation, or a generic `continue`.
- Do not claim that workers are running in the background.
- Treat task files as execution aids; update canonical architecture docs first when business truth is missing or conflicting.
- Preserve completed task status. Add follow-up verification notes instead of reopening done tasks unless implementation truly needs a new or existing ready task.
- Record known API gaps in task files so clients do not invent endpoints or local-only source-of-truth state.
- Reuse healthy dev servers. Never spawn duplicate backend, web, Expo, Metro, or Node runtimes blindly.
- If the user asks for parallel agents, prepare disjoint write scopes, name the integration owner, and tell workers they are not alone in the codebase.
