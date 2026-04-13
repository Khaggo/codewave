# AI Governance

This file defines the approved AI scope, provider model, and safety guardrails for AUTOCARE Phase 2 features.

## Approved AI Scope

- Approved AI usage is limited to Phase 2 features after the operational core is stable.
- Canonical approved use cases are:
  - layman-friendly vehicle lifecycle summaries
  - semantic QA audit support for job-order release checks
- `main-service.chatbot` remains rule-based and FAQ-oriented; it is not part of the approved generative AI scope.
- AI may assist staff decisions, but it may not become the final authority for release, override, or customer-visible publication.

## Provider Strategy

- Use a provider adapter so the backend depends on a stable internal interface rather than a hard-coded vendor model.
- Exact model IDs must remain configurable in implementation, not frozen in canonical docs.
- Approved external AI provider APIs are an explicit exception to the default "no third-party API" rule because they support canonical Phase 2 features.
- AI features must degrade safely when the provider is unavailable.

## Human Review Requirements

- AI-generated lifecycle summaries remain hidden from customers until a human reviewer approves them.
- Quality-gate outputs may recommend risk or discrepancy findings, but manual override and final release authority remain staff-controlled.
- Reviewer identity, review timestamp, and final publish state must be captured for any customer-visible AI-generated content.
- AI output should be treated as advisory evidence, not a substitute for inspection, technician evidence, or approved job-order records.

## Prompt and Output Rules

- Prompts must be bounded to the minimal operational context needed for the task.
- Inputs should use stable IDs, structured evidence, and filtered internal notes rather than raw unrestricted dumps.
- Outputs must be constrained to structured summaries, risk annotations, or review-ready prose that can be audited later.
- Do not allow AI outputs to inject new permissions, state transitions, or customer-facing claims without human approval.

## Operational Safety

- AI jobs should run through BullMQ so retries, failure handling, and observability stay explicit.
- Provider failures must not block core operational write paths such as booking creation, inspection capture, or invoice generation.
- AI-generated artifacts should record provenance such as provider name, model configuration, prompt version, and review status.
- If AI-generated output conflicts with inspection or job-order evidence, the evidence-backed record wins until a human resolves the mismatch.
