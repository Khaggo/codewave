# Markdown Contract

This file defines the canonical Markdown schema for the AUTOCARE backend SSoT.

## Allowed Heading Names

### System control-plane headings

- `Shared Goal`
- `Global Objectives`
- `Agent Topology`
- `Token Efficiency Rules`
- `Write Governance`
- `Cross-Domain Coordination`
- `Improvement Loop`
- `Markdown Integrity Rules`

### Domain doc headings

- `Domain ID`
- `Agent Summary`
- `Primary Objective`
- `Inputs`
- `Outputs`
- `Dependencies`
- `Owned Data / ERD`
- `Primary Business Logic`
- `Process Flow`
- `Use Cases`
- `API Surface`
- `Edge Cases`
- `Writable Sections`
- `Out of Scope`

### Golden template headings

- `Reference Purpose`
- `Domain Doc Contract`
- `Code Module Contract`
- `API Documentation Contract`
- `Minimum Test Baseline`
- `Naming and Ownership Rules`
- `Reference Starter Domains`

### API strategy headings

- `Interaction Model`
- `REST and Swagger Contract`
- `Main-Service REST Surface`
- `E-Commerce REST Surface`
- `RabbitMQ Event Contract`
- `BullMQ Job Contract`
- `Recommendations and Exclusions`

### DTO policy headings

- `Policy Goal`
- `Default Rule`
- `Request DTO Policy`
- `Response DTO Policy`
- `Layer Boundaries`
- `Naming Standard`
- `Validation and Swagger`
- `Allowed Exceptions`

### Frontend backend sync headings

- `Shared Slice Workflow`
- `Codex Coordination Model`
- `Contract Artifacts`
- `Contract Pack Rules`
- `Frontend Consumption Rules`
- `Slice Acceptance Workflow`

### RBAC policy headings

- `Role Model`
- `Permission Boundaries`
- `Administrative Provisioning`
- `Digital Identifier Rules`
- `Audit Expectations`

### Auth security policy headings

- `Signup and Activation Model`
- `Google Identity Verification`
- `Email OTP Verification`
- `Pending Account States`
- `Legacy Login Position`
- `Audit and Delivery Expectations`

### AI governance headings

- `Approved AI Scope`
- `Provider Strategy`
- `Human Review Requirements`
- `Prompt and Output Rules`
- `Operational Safety`

### Role doc headings

- `Mission`
- `Allowed Actions`
- `Forbidden Actions`
- `Inputs`
- `Outputs`
- `Handoff Rules`
- `Stop Conditions`

## Required Order

- Domain docs must keep the exact heading order listed above.
- Role docs must keep the exact heading order listed above.
- Control-plane docs may add subheadings, but must not rename top-level headings.

## File Rules

- File names are stable and kebab-case.
- Each domain doc must have one unique `Domain ID`.
- Links must be relative and must resolve inside `docs/architecture/`.
- Tables are allowed only when they improve routing, dependency, or ownership clarity.
- `_backlog/` files are non-canonical and must not be included in the canonical manifest.
- `tasks/` files are non-canonical execution artifacts and must not be included in the canonical manifest unless explicitly promoted later.

## Forbidden Patterns

- duplicate top-level headings
- missing `Agent Summary`
- missing `Writable Sections`
- renamed required headings
- undeclared cross-domain edits
- domain rules duplicated into unrelated domains
- partial Markdown writes accepted as canonical content
- direct orchestrator edits to domain docs

## Validation Expectations

- every canonical doc must match the manifest
- every changed doc must preserve its heading contract
- every domain edit must stay inside declared writable sections
- validator-owned metadata is updated only after structural validation succeeds
- `main-service.auth` and `main-service.users` must stay current-state accurate against code, not roadmap ideas
- `api-strategy.md` must stay aligned with the software-only scope and the current two-service architecture
- `dto-policy.md` must stay aligned with the DTO-first patterns already used in `main-service.auth` and `main-service.users`
- `frontend-backend-sync.md` must keep `live` versus `planned` route labeling explicit whenever a slice has both frontend and backend consumers
- `rbac-policy.md` must stay aligned with the canonical role set `customer | technician | service_adviser | super_admin`
- `auth-security-policy.md` must keep Google+email activation canonical, keep signup 2FA scoped to enrollment or activation only, and keep password-only registration positioned as legacy current-state
- `ai-governance.md` must keep AI scope Phase 2, review-gated, and separate from the deterministic chatbot domain
