---
name: mcp-session-bootstrap
description: Warm and verify the workspace MCP tools before task work begins. Use when starting a new repo session, after Codex reloads, when MCP health is uncertain, or before codewave work where Serena or another relevant MCP should be tried first.
---

# MCP Session Bootstrap

## Overview

Warm the MCP layer once per session, confirm which tools are actually usable, and avoid discovering tool problems halfway through a task.

## Workflow

1. Use `tool_search` if the expected MCP tools are not visible yet.
2. Treat Serena as the default MCP for local repo exploration.
   - Use `mcp__serena__.activate_project` with `codewave`.
   - Use `mcp__serena__.check_onboarding_performed` after activation.
3. Warm Swagger for backend or contract-sensitive work.
   - Use `mcp__swagger__.fetch_swagger_info` against `http://127.0.0.1:3000/docs-json`.
   - Use `mcp__swagger__.list_endpoints` only when route discovery is needed.
4. Probe the rest of the MCPs with the lightest useful check.
   - If the user explicitly asks to activate, verify, or check **all** MCPs, sweep every visible MCP once.
   - Otherwise, probe only the MCPs the current task can actually use.
   - `notion`: when the user wants docs or task sync there
   - `figma`: when the user wants design capture, import, or sync
   - `chrome-devtools`: when the task needs browser inspection
   - `context7` or `openaiDeveloperDocs`: when the task needs live documentation
5. Report availability briefly.
   - Say which MCPs are ready.
   - Call out missing or unhealthy MCPs plainly.
   - Do not dump raw config unless the user asks.

## Guardrails

- Warm all relevant MCPs once per session, not before every substep.
- Start with Serena or the smallest relevant MCP before broad shell or file reads.
- Do not spend tokens probing unrelated MCPs for a task that will not use them.
- Treat missing MCPs as a tooling fact, not a blocker by default.
- If Swagger is down because the backend is not reachable, say so explicitly and continue with local code inspection when possible.
- If Serena fails to activate, fall back to targeted local file reads and mention the loss of symbol-aware navigation.

## Good Outcome

- Serena is active for `codewave`
- Swagger is reachable when backend contract work matters
- Optional MCPs are only touched when the task can benefit from them
- The user gets a short health summary instead of repeated tool surprises later
