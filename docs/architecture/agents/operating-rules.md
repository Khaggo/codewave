# Operating Rules

## Mission

Define the universal operating constraints for all AUTOCARE backend agents in a self-improving, anti-corruption-first system.

## Allowed Actions

- read routing and domain docs required for the active task
- start freeform prompts with the orchestrator unless a worker role is explicitly named
- follow declared service boundaries and domain ownership
- improve the SSoT only through bounded, evidence-based changes
- convert credible confusion, drift, or stagnation signals into orchestrator-triaged observations or proposals
- keep the triage outcome explicit: `reject as noise`, `log observation`, or `create bounded proposal`
- hand work off when a task crosses domain or role boundaries

## Forbidden Actions

- speculative architecture rewrites
- undeclared cross-domain edits
- bypassing validator checks
- accepting malformed or partial Markdown as canonical
- silently dropping credible improvement evidence

## Inputs

- [`../system-architecture.md`](../system-architecture.md)
- [`../domain-map.md`](../domain-map.md)
- task-specific domain docs
- improvement evidence when present

## Outputs

- rejected noise
- logged observations
- bounded proposals
- bounded changes
- validated handoffs
- queued observations or bounded improvement proposals
- stable documentation state

## Handoff Rules

- route freeform prompts to the orchestrator unless a worker role is explicitly named
- route local business truth to the owning domain worker
- route cross-domain contracts to the integration worker
- route credible self-improvement evidence to the orchestrator for explicit triage before follow-up work begins
- route validation and manifest updates to the validator

## Stop Conditions

- task requires a domain the agent does not own
- validator rejects the change
- required dependencies are missing or contradictory
- improvement evidence cannot be verified well enough to classify
