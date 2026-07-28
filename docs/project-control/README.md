# Project Control Pack

Last updated: 2026-07-28

This folder is the continuity source of truth for AUTOCARE recovery work after the panel evaluation.

Every new chat or agent working on this project should read these files before making changes:

1. `CURRENT_STATE.md` (canonical current implementation, runtime, and verification state)
2. `PANELIST_FEEDBACK_MATRIX.md`
3. `OBJECTIVE_COMPLIANCE_MATRIX.md`
4. `QA_LEDGER.md`
5. `IMPLEMENTATION_ROADMAP.md`
6. `UX_AUDIT_PRO_HANDOFF.md`
7. `UX_AUDIT_BACKLOG.md`
8. `CHAT_HANDOFF_PROMPT.md`

## Operating Rule

If a task changes the system, QA result, documentation status, objective compliance, or panelist feedback status, update this folder in the same work session.

Do not treat chat history as the project record. The repo is the project record.

For UX redesign or panel-demo usability work, start from `UX_AUDIT_PRO_HANDOFF.md`, track findings in `UX_AUDIT_BACKLOG.md`, and use the screenshot packet under `qa/ux-audit/2026-05-21/`.

The UX workflow is:

1. UX Audit Pro reviews screenshots and flow context.
2. Codex converts findings into concrete rebuild instructions and restructures the page or flow.
3. Vercel `web-design-guidelines` reviews the changed UI code.
4. Playwright or manual screenshot QA closes the finding.
