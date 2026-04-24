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
- Domain modules must call the provider adapter boundary, not a provider SDK or vendor client directly.
- Provider-specific authentication, retries, model routing, and response normalization belong behind the adapter layer instead of leaking into domain logic.
- Adapter inputs and outputs should stay structured and versionable so lifecycle summaries and QA assistance can change providers without rewriting domain rules.
- Exact model IDs must remain configurable in implementation, not frozen in canonical docs.
- Approved external AI provider APIs are an explicit exception to the default "no third-party API" rule because they support canonical Phase 2 features.
- AI features must degrade safely when the provider is unavailable.

## Human Review Requirements

- AI-generated lifecycle summaries remain hidden from customers until a human reviewer approves them.
- Quality-gate outputs may recommend risk or discrepancy findings, but manual override and final release authority remain staff-controlled.
- Reviewer identity, review timestamp, and final publish state must be captured for any customer-visible AI-generated content.
- Re-review is required when the provider configuration, prompt template, or governing evidence set changes materially for a stored AI artifact.
- AI output should be treated as advisory evidence, not a substitute for inspection, technician evidence, or approved job-order records.

## Prompt and Output Rules

- Prompts must be bounded to the minimal operational context needed for the task.
- Inputs should use stable IDs, structured evidence, and filtered internal notes rather than raw unrestricted dumps.
- Outputs must be constrained to structured summaries, risk annotations, or review-ready prose that can be audited later.
- Persisted AI output must carry provenance that explains which provider adapter path, prompt version, and evidence bundle produced it.
- Do not allow AI outputs to inject new permissions, state transitions, or customer-facing claims without human approval.

## Operational Safety

- AI jobs should run through BullMQ so retries, failure handling, and observability stay explicit.
- Queue-backed AI work must expose queued, processing, completed, or failed job metadata on the owning domain record so staff and agents can see progress without reading queue internals directly.
- Provider failures must not block core operational write paths such as booking creation, inspection capture, or invoice generation.
- AI-generated artifacts should record provenance such as provider name, adapter route, model configuration, prompt version, source evidence identifiers, generation timestamp, and review status.
- If AI-generated output conflicts with inspection or job-order evidence, the evidence-backed record wins until a human resolves the mismatch.
