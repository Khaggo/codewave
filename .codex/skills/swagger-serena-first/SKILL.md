---
name: swagger-serena-first
description: Use Swagger MCP and Serena before broad file reads when a task touches backend routes, DTOs, controllers, integration contracts, or client work tied to live APIs. This skill reduces token usage by anchoring to live OpenAPI first and narrowing code reads with Serena before opening large files.
---

# Swagger Serena First

## Overview

Anchor API-sensitive work in the live contract first, then narrow the code search with Serena so you do not waste tokens reading the wrong files.

## Workflow

1. Start with Swagger when the task touches implemented routes.
   - Use `mcp__swagger__.fetch_swagger_info` if the local spec is not warm yet.
   - Use `mcp__swagger__.list_endpoints` to identify the exact live routes, methods, and summaries.
2. Turn the route list into a narrow code target.
   - Identify the owning controller, DTO, service, or client boundary from the route names.
   - Treat Swagger as the source of truth for implemented route shape.
3. Use Serena to narrow the local search.
   - Activate `codewave` if Serena is not active yet.
   - Prefer `search_for_pattern` or `get_symbols_overview` over broad shell reads.
   - Read only the owning files and the direct consumers.
4. Open full file contents only after Swagger and Serena have identified the right slice.
5. For client-integration work, keep the live-vs-planned split explicit.
   - `live`: route exists in Swagger and controller code
   - `planned`: route exists only in docs or task files

## Decision Rules

- Use Swagger first for implemented API work.
- Use Serena first for local code-only work that does not depend on live routes.
- Use both for backend-web-mobile integration, DTO alignment, controller changes, queue slices, and contract packs.
- Skip Swagger only when the task is clearly non-API work.

## Token-Saving Rules

- Do not read whole domains before checking the live route surface.
- Do not grep the whole repo when Serena can narrow the search.
- Do not invent client fields that Swagger and DTOs do not support.
- Prefer one small set of owning files over many adjacent files.

## Good Outcome

- Live routes are identified before implementation decisions
- Code reads stay focused on the owning modules
- Contract packs stay aligned with real backend behavior
- Token usage stays low because large unrelated files never get opened
