---
name: mcp-auto-orchestrator
description: Automatically chain the repo MCP-first workflow, session bootstrap, and Swagger-plus-Serena routing before executing repo work. Use when the user says continue, do the next task, investigate a module, or otherwise wants codewave work without re-deciding which MCPs to use first.
---

# MCP Auto Orchestrator

## Overview

Run the MCP setup path first, then hand the real work to the right workflow instead of choosing tools from scratch every turn.

## Orchestration Order

1. Run `mcp-first-token-efficiency`.
   - Choose the smallest relevant MCP route before any broad local reads.
2. Run `mcp-session-bootstrap`.
   - If the user explicitly asks to check or activate all MCPs, run bootstrap in full-sweep mode.
3. Decide whether the task is API-sensitive.
   - If yes, run `swagger-serena-first`.
   - If no, keep Serena or the relevant optional MCPs only.
4. Continue into the actual work skill or repo workflow.
   - For queue work, use `autocare-queued-task-runner` when available.
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
- If bootstrap shows a required MCP is missing, say so once and continue with the best fallback.

## Good Outcome

- The MCP-first token-efficiency preference is applied before repo work starts
- MCP activation happens early and consistently
- Swagger and Serena are used automatically on the right tasks
- Queue work starts with the right tool stack instead of rediscovering it each turn
