---
name: mcp-auto-orchestrator
description: Route codewave repository work through the smallest relevant MCPs before execution. This is MCP selection, not activation of the AUTOCARE task queue or a background agent system.
---

# MCP Auto Orchestrator

## Overview

Select the smallest useful MCP path, then continue the user's active task. Do not replace a direct user objective with the repository task queue.

## Orchestration Order

1. Run `mcp-first-token-efficiency`.
   - Choose the smallest relevant MCP route before any broad local reads.
2. Bootstrap only the MCPs required for the task.
   - If the user explicitly asks to check or activate all MCPs, run `mcp-session-bootstrap` in full-sweep mode.
3. Use Serena for source-level inspection.
4. Use Graphify when the task needs broad dependency, centrality, or blast-radius analysis.
   - Verify important Graphify findings in source with Serena.
   - Ignore generated build nodes when they appear in graph results.
5. Decide whether the task is API-sensitive.
   - If yes, run `swagger-serena-first`.
   - If no, keep Serena or the relevant optional MCPs only.
6. Continue into the actual work skill or repo workflow.
   - If the user explicitly asks to set or restate the current objective, use the global `/goal` prompt first.
   - Load AUTOCARE queue or worker skills only when the user explicitly selects agent/queue mode or an AUTOCARE queue task is already active.
   - For backend or client integration, keep the repo-specific skills in play after the MCP setup is done.

## When To Treat A Task As API-Sensitive

- The user asks for backend implementation
- The task mentions routes, DTOs, Swagger, controllers, services, or contract packs
- The task crosses backend, web, and mobile boundaries
- The task is a `05-client-integration` slice
- The task requires checking whether a route is live or only planned

## Commentary Pattern

Keep the user update short:

- name the MCPs you are using
- say why they fit this task
- move into execution without a long preamble

## Guardrails

- Do not re-bootstrap the full MCP stack before every small step.
- Do not call Swagger for purely local non-API edits.
- Do not call optional MCPs unless the task can benefit from them.
- Do not load the task queue, claim a queue item, or describe workers as active for an ordinary direct request.
- If bootstrap shows a required MCP is missing, say so once and continue with the best fallback.

## Good Outcome

- The MCP-first token-efficiency preference is applied before repo work starts
- MCP activation happens early and consistently
- Swagger and Serena are used automatically on the right tasks
- Queue work starts with the right tool stack instead of rediscovering it each turn
