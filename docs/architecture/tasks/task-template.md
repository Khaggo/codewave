# Task Template

Use this template for new implementation tasks.

## Required Sections

1. `Task ID`
2. `Title`
3. `Type`
4. `Status`
5. `Priority`
6. `Owner Role`
7. `Source of Truth`
8. `Depends On`
9. `Goal`
10. `Deliverables`
11. `Implementation Notes`
12. `Acceptance Checks`
13. `Out of Scope`

## Usage Rules

- keep the task decision-complete before assigning it
- list only direct dependencies
- link back to the owning domain or control-plane docs
- acceptance checks must be testable and specific
- move completed tasks to `_archive/` only after checks are satisfied

## Skeleton

```md
# <Task Title>

## Task ID

`T000`

## Title

Short implementation title.

## Type

`domain` | `integration` | `foundation` | `quality`

## Status

`ready`

## Priority

`high` | `medium` | `low`

## Owner Role

`domain-worker` | `integration-worker` | `validator` | `test-worker`

## Source of Truth

- `../path/to/doc.md`

## Depends On

- direct prerequisite task or domain

## Goal

One paragraph describing the concrete implementation outcome.

## Deliverables

- implementation output 1
- implementation output 2

## Implementation Notes

- concrete decisions or constraints
- API or schema expectations if already known

## Acceptance Checks

- command, test, or behavior check 1
- command, test, or behavior check 2

## Out of Scope

- explicitly excluded work
```
