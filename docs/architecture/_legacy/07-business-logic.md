# Business Logic

This document captures the rules that should stay close to the domain layer.

## Vehicle Lifecycle Verification Rules

- The vehicle timeline contains both administrative and verified events.
- Administrative events may be written automatically from system actions.
- Condition-sensitive events should not be marked verified unless they reference an inspection.
- Verified milestones should be queryable separately from raw lifecycle events.

## Inspection Rules

- Recommended inspection types:
  - intake
  - pre-repair or pre-service
  - completion
  - return/back-job
- Inspections should capture:
  - vehicle
  - linked booking or job reference if applicable
  - inspector
  - findings
  - attachments if available
  - status
  - created timestamp
- Inspection completion may trigger lifecycle read-model refresh.

## Back-Job Rules

- A back job is a return or rework case after previous service or repair.
- It is not the same as a generic repeat visit.
- A back job should link to original work when that linkage exists.
- Back jobs should track:
  - complaint
  - relation to prior work
  - return inspection findings
  - current status
  - resolution notes
- Suggested back-job statuses:
  - `reported`
  - `inspected`
  - `approved_for_rework`
  - `in_progress`
  - `resolved`
  - `closed`
  - `rejected`

## Booking Rules

- Booking states should be explicit and historical.
- Booking history should support traceability for:
  - confirmation
  - reschedule
  - decline
  - cancellation
  - completion
- Booking transitions should feed lifecycle events and reminder jobs.

## Loyalty Rules

- Loyalty points may be earned from services and qualifying purchases.
- E-commerce should not write directly into loyalty tables.
- Main service should compute and record loyalty transactions after relevant events.
- Loyalty should remain ledger-based where possible.

## Invoice Payment Rules

- Payment handling is invoice-based and tracking-oriented.
- Suggested invoice payment states:
  - `pending`
  - `partial`
  - `paid`
  - optional `cancelled` or `void`
- Payment tracking should not imply automated bank settlement verification.
- Manual validation notes may be recorded when needed.

## Chatbot Rules

- The chatbot is rule-based.
- It should use predefined intents and guided answers.
- It should support escalation or fallback when no guided flow fits the question.
- It should not be treated as an AI decision-maker for operational logic.
