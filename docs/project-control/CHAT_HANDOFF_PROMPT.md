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

Treat these files as the source of truth for what is done, what failed panel review, what passed QA, and what still needs work.

Do not rely only on chat history.

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
