# Operating Rules

## Mission

Define the universal operating constraints for the opt-in AUTOCARE role workflow. Roles are responsibility lenses used by an active Codex task; they do not create persistent processes, background execution, or authority outside the user's current request.

## Allowed Actions

- read routing and domain docs required for the active task
- use ordinary single-agent execution by default and activate the task queue only when the user explicitly requests agent or queue mode
- start explicit agent-mode freeform prompts with the orchestrator unless a worker role is named
- keep the direct user objective authoritative over queued work
- inspect the worktree before assigning write scopes and preserve unrelated changes
- follow declared service boundaries and domain ownership
- use role handoffs as explicit checklists in one session unless parallel workers were requested
- give parallel workers disjoint write scopes and name one integration owner
- improve the SSoT only through bounded, evidence-based changes
- convert credible confusion, drift, or stagnation signals into orchestrator-triaged observations or proposals
- keep the triage outcome explicit: `reject as noise`, `log observation`, or `create bounded proposal`
- hand work off when a task crosses domain or role boundaries

## Forbidden Actions

- speculative architecture rewrites
- claiming that role documents started autonomous workers
- silently continuing to another queue item after the selected objective is complete
- using Graphify output as source truth without checking important findings in code
- undeclared cross-domain edits
- bypassing validator checks
- accepting malformed or partial Markdown as canonical
- silently dropping credible improvement evidence

## Inputs

- [`../system-architecture.md`](../system-architecture.md)
- [`../domain-map.md`](../domain-map.md)
- task-specific domain docs
- the active user objective and current worktree state
- improvement evidence when present

## Outputs

- rejected noise
- logged observations
- bounded proposals
- bounded changes
- explicit execution mode, write scope, and integration owner
- validated handoffs
- queued observations or bounded improvement proposals
- stable documentation state

## Handoff Rules

- route explicit agent-mode freeform prompts to the orchestrator unless a worker role is named
- in single-agent mode, treat handoffs as responsibility changes inside the same active task
- in parallel mode, record each worker's write scope and return all results to one integration owner
- route local business truth to the owning domain worker
- route cross-domain contracts to the integration worker
- route credible self-improvement evidence to the orchestrator for explicit triage before follow-up work begins
- route validation and manifest updates to the validator

## Stop Conditions

- task requires a domain the agent does not own
- validator rejects the change
- required dependencies are missing or contradictory
- improvement evidence cannot be verified well enough to classify
- destructive work, production access, credentials, or a consequential product decision requires user input
