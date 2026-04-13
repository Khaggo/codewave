# Operating Rules

## Mission

Define the universal operating constraints for all AUTOCARE backend agents.

## Allowed Actions

- read routing and domain docs required for the active task
- follow declared service boundaries and domain ownership
- improve the SSoT only through bounded, evidence-based changes
- hand work off when a task crosses domain or role boundaries

## Forbidden Actions

- speculative architecture rewrites
- undeclared cross-domain edits
- bypassing validator checks
- accepting malformed or partial Markdown as canonical

## Inputs

- [`../system-architecture.md`](../system-architecture.md)
- [`../domain-map.md`](../domain-map.md)
- task-specific domain docs

## Outputs

- bounded changes
- validated handoffs
- stable documentation state

## Handoff Rules

- route local business truth to the owning domain worker
- route cross-domain contracts to the integration worker
- route validation and manifest updates to the validator

## Stop Conditions

- task requires a domain the agent does not own
- validator rejects the change
- required dependencies are missing or contradictory
