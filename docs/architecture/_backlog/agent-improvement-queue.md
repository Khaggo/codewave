# Agent Improvement Queue

This file is a non-canonical evidence queue for orchestrator-triaged improvements. It exists to make routing, drift, and stagnation visible without bypassing the validator-backed SSoT.

## Rules

- log evidence here before promoting it into a formal recovery task
- keep canonical doc changes human-approved and validator-checked
- use `Status` values such as `observation`, `proposed`, `approved`, `rejected`, and `done`
- use `Approval` to show whether a human has approved promotion into canonical work

| ID | Date | Signal | Evidence | Affected Docs | Proposed Owner | Status | Approval | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AQ-001` | `2026-04-18` | orchestrator-first routing gap | freeform prompts still depend on users understanding worker roles instead of the orchestrator acting as the default front door | `system-architecture.md`, `README.md`, `agents/orchestrator.md`, `agents/operating-rules.md` | `orchestrator` | `approved` | `human-approved` | promote into `T409` and update control-plane routing language |
| `AQ-002` | `2026-04-18` | missing improvement-evidence intake | repeated clarification, validator failure, and drift signals are described but not captured in one visible queue or recovery flow | `system-architecture.md`, `agents/orchestrator.md`, `agents/docs-worker.md`, `agents/operating-rules.md` | `orchestrator` | `approved` | `human-approved` | make evidence triage explicit and keep follow-up items visible in this queue |
| `AQ-003` | `2026-04-18` | stale agent-control docs versus active queue | agent-control docs last changed on 2026-04-14 while the active `05-client-integration` queue remains large and `ready`, which suggests safety without visible adaptation | `system-architecture.md`, `README.md`, `frontend-backend-sync.md`, `tasks/04-quality-and-ops/T409-orchestrator-routing-and-improvement-intake.md` | `integration-worker` | `approved` | `human-approved` | keep `T409` in progress until the recovery protocol is documented and validated |
