---
name: autocare-agent-system-bootstrap
description: Activate the AUTOCARE agentic workflow for build-order or queued implementation work. Use when the user asks to activate agents, start the agent system, continue build-order work, route work to agents, prepare MCPs and skills, or coordinate existing integration-worker, domain-worker, validator, and test-worker handoffs without spawning subagents by default.
---

# AUTOCARE Agent System Bootstrap

## Purpose

Prepare the existing AUTOCARE agent system for the next build-order task. Bootstrap MCPs, select repo skills, read the task queue, and prepare role handoffs without automatically spawning Codex subagents.

## Activation Flow

1. Load `mcp-first-token-efficiency` so Serena or another relevant MCP is attempted before broad local reads.
2. Load `mcp-session-bootstrap` and verify MCP readiness. Run a full MCP sweep only when the user explicitly asks for it.
3. For API-sensitive work, load `swagger-serena-first`, activate Serena for `codewave`, check onboarding, and warm Swagger at `http://127.0.0.1:3000/docs-json`.
4. Before starting, stopping, or debugging backend/web/Expo runtimes, load `port-aware-dev-runtime` and check active listeners first.
5. Read `docs/architecture/tasks/README.md`, resolve the next task from the active queue, then read only the target task file and directly referenced source-of-truth docs.
6. Select supporting repo skills based on the task surface:
   - backend/API contracts: `backend-contract-shapes`
   - backend validation: `backend-testing-workflow`
   - cross-surface auth, booking, vehicle, profile, admin, or mobile integration: `backend-web-mobile-integration`
   - web/mobile request, response, state, and screen shapes: `frontend-data-shapes`
   - web/mobile verification: `frontend-testing-workflow`
7. Produce a short execution brief before implementation: task ID, status, source docs loaded, API contract status, selected skills, role handoffs, and validation plan.

## Role Handoffs

Use these handoffs for the user's existing agent roles. Do not spawn new agents unless the user explicitly requests parallel execution.

- `integration-worker`: own cross-surface contract alignment and web/mobile integration details.
- `domain-worker`: own backend domain rules, DTO/API gaps, repository shape implications, and source-of-truth doc updates.
- `validator`: own acceptance checks, docs validation, build checks, and regression evidence.
- `test-worker`: own focused backend/frontend/manual flow test plans tied to the selected task.

## Guardrails

- Keep web staff/admin-only and mobile customer-only.
- Treat task files as execution aids; update canonical architecture docs first when business truth is missing or conflicting.
- Preserve completed task status. Add follow-up verification notes instead of reopening done tasks unless implementation truly needs a new or existing ready task.
- Record known API gaps in task files so clients do not invent endpoints or local-only source-of-truth state.
- Reuse healthy dev servers. Never spawn duplicate backend, web, Expo, Metro, or Node runtimes blindly.
- If the user asks for parallel agents, prepare disjoint write scopes and tell workers they are not alone in the codebase.
