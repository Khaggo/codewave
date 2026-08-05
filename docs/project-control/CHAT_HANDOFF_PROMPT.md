# Chat Handoff Prompt

Copy this into every new project chat before asking for work:

```text
You are working on the AUTOCARE codewave project at D:\mainprojects\codewave.

Before doing any work, read these project-control files:

1. docs/project-control/CURRENT_STATE.md
2. docs/project-control/PANELIST_FEEDBACK_MATRIX.md
3. docs/project-control/OBJECTIVE_COMPLIANCE_MATRIX.md
4. docs/project-control/QA_LEDGER.md
5. docs/project-control/IMPLEMENTATION_ROADMAP.md
6. docs/project-control/UX_AUDIT_PRO_HANDOFF.md
7. docs/project-control/UX_AUDIT_BACKLOG.md

If the task may benefit from the repo's self-improving agent system, also read:

8. docs/architecture/README.md
9. docs/architecture/system-architecture.md
10. docs/architecture/agents/orchestrator.md
12. docs/architecture/agent-manifest.json

Treat these files as the source of truth for what is done, what failed panel review, what passed QA, and what still needs work.

Current remediation evidence (2026-08-05) reports web `230/230`, mobile `213/213`, and focused
backend AI/reference/loyalty `21/21`, with migration smoke, contract drift, typecheck, and policy
checks passing. Persisted VEH/JO/INS/BJ references, optional disabled-by-default AI, customer-safe
loyalty earning policy, and reference/Garage/selector changes are implementation-verified.
This does not replace dated live Playwright reports; no new live Playwright or respondent survey
result may be inferred from these counts. Survey status is pending.

Do not rely only on chat history.

If Notion access is available, also check the AUTOCARE Wiki dashboard for team-facing context:

- `Current QA and project-control dashboard — 2026-05-23`
- `Extracted decisions from QA Chat — 2026-05-23`
- `Extracted decisions from Implementation Chat — 2026-05-23`

The repo project-control docs remain the engineering evidence source. Notion is the team-facing knowledge hub and may contain summaries, decisions, pipelines, and paper-facing guidance.

The repo includes a self-improving agentic system under `docs/architecture/`.

- Default freeform routing should start from the orchestrator model described there.
- Repo-defined agent roles include: `orchestrator`, `domain-worker`, `integration-worker`, `test-worker`, `validator`, `docs-worker`, and `refactor-worker`.
- Codex is allowed to spawn subagents when that helps the task, but those spawned subagents should follow the repo role docs and ownership rules instead of improvising their own workflow.
- Use subagents especially for parallel, well-bounded work. Keep the main chat responsible for integration, truthfulness, and final control-file updates.
- Do not bypass the repo's validator/orchestrator ownership rules just because subagents are available.

Before editing, run git status and do not revert unrelated dirty files.

When you complete a task, update the relevant project-control files:

- CURRENT_STATE.md if the overall state changes.
- PANELIST_FEEDBACK_MATRIX.md if a panel comment is addressed.
- OBJECTIVE_COMPLIANCE_MATRIX.md if objective evidence changes.
- QA_LEDGER.md after every QA/manual test run.
- IMPLEMENTATION_ROADMAP.md if priority/order changes.
- UX_AUDIT_PRO_HANDOFF.md if the UX workflow changes.
- UX_AUDIT_BACKLOG.md if a UX Audit Pro or Vercel `web-design-guidelines` finding is added, changed, or closed.

Current recovery priority:

Make the system and documentation comply with the panel feedback and Objectives 1-6, with QA evidence for each claim.

Latest full-system QA truth:

- The latest 2026-05-22 whole-system panel/objectives Playwright rerun is green: 20 passed, 0 failed, 0 timed out, 0 skipped.
- The green gate covers booking-to-cash, mobile multi-service booking, service-earned rewards, insurance documents, insurance manual reminder/broadcast, service administration, Back-Jobs, Objective 2 lifecycle/readable IDs, broad readable-ID sweep, human-QA PDF recovery, adviser-owned role access, and adviser-owned checklist/PDF workshop proof.
- Residual polish items remain: invoice lookup specificity, immediate invoice visibility, stale mobile completed-history refresh, completed-state timing before manual payment, non-finalized Back-Jobs negative dataset coverage, deterministic approved lifecycle summary data for panel capture, timed session-stability proof, Objective 5 guided demo capture, UX polish, and paper/diagram updates.
- Technician web logins are intentionally retired. Do not treat retired-login failures as product regressions; rewrite QA around adviser/admin-managed technician profiles, selected specialties, checklist/task controls, evidence upload, and adviser-owned workshop stages.
- `docs/architecture/rbac-policy.md` is updated to the current canonical authenticated roles: `customer`, `service_adviser`, and `super_admin`; technicians are non-auth operational profiles with specialties.

For UX work, use the combined workflow:

1. Send screenshots and flow context to UX Audit Pro.
2. Convert findings into Codex rebuild instructions.
3. Restructure the page or flow.
4. Run Vercel `web-design-guidelines` on changed UI files.
5. Re-run Playwright or capture manual screenshot evidence before marking QA passed.
```

## Short Version

Use this if the chat is small:

```text
Before answering, read docs/project-control/CURRENT_STATE.md and QA_LEDGER.md. For UX work, also read docs/project-control/UX_AUDIT_PRO_HANDOFF.md and UX_AUDIT_BACKLOG.md. Use docs/project-control as the source of truth and update it after any fix or QA run.
```
