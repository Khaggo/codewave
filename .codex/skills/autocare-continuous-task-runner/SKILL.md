---
name: autocare-continuous-task-runner
description: Keep AUTOCARE implementation work moving continuously with minimal interruptions. Use when the user asks Codex to continue, keep building, stop asking repeated approvals, do the next task, follow the build order, or work autonomously on repo tasks while still respecting sandbox, destructive-action, network, credential, and production-safety boundaries.
---

# AUTOCARE Continuous Task Runner

## Purpose

Continue AUTOCARE repo work by default. Make reasonable assumptions, execute safe local steps without asking first, and only pause for decisions or approvals that cannot be safely inferred.

## Continuous Work Rules

1. Treat direct task requests as permission to inspect, edit, and validate files inside `D:\mainprojects\codewave`.
2. Prefer safe local commands that do not need escalation. If a command fails because of sandbox restrictions, request the narrowest approval needed and continue after approval.
3. Batch unavoidable approval requests. Ask once for a clear category of work instead of repeatedly asking for the same kind of command.
4. Do not ask broad clarification questions when a reasonable default is available. State the assumption in the progress update or final summary.
5. Keep moving through implementation, verification, and summary unless blocked by missing credentials, missing services, destructive actions, paid tools, production access, or a user decision with real tradeoffs.
6. Do not bypass platform approvals. A skill can reduce interruptions, but it cannot silently approve restricted commands or override sandbox policy.

## Default Skill Chain

1. Load `autocare-agent-system-bootstrap` for build-order task selection and role handoffs.
2. Load `port-aware-dev-runtime` before starting, stopping, or debugging backend, frontend, Expo, Metro, or Node processes.
3. Load `swagger-serena-first` for backend route, DTO, controller, OpenAPI, or client API integration work.
4. Load `backend-web-mobile-integration` when a change crosses backend, web, and mobile.
5. Load `backend-contract-shapes` and `frontend-data-shapes` when request/response/session shapes change.
6. Load `backend-testing-workflow` and `frontend-testing-workflow` before choosing verification commands.

## Approval Discipline

Proceed without asking for:

- reading repo files and docs
- editing repo files requested by the user
- running local static checks, type checks, unit tests, and builds that do not need network or destructive access
- checking active ports and process metadata
- creating repo-local skills, docs, tests, and implementation files

Pause or request approval for:

- destructive filesystem or git actions
- broad process kills or stopping unknown PIDs
- dependency installation, package downloads, network calls, or paid tools
- commands requiring sandbox escalation
- changing secrets, credentials, production-like data, or `.env` values without an explicit user request
- spawning Codex subagents unless the user explicitly asks for parallel agent execution

## Execution Loop

1. Read the active task queue or user-selected task.
2. Identify the smallest safe implementation slice.
3. Edit files directly with focused patches.
4. Run targeted validation.
5. If validation fails, fix and rerun targeted checks.
6. If blocked, document the blocker, the exact approval or service needed, and the next command to run after unblocking.
7. Continue to the next acceptance check when the current one passes.
