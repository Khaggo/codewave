---
name: mcp-first-token-efficiency
description: Use when working anywhere in the AUTOCARE codewave repo and token efficiency matters. Attempt Serena or another relevant MCP before broad shell reads, especially for code, APIs, Notion docs, browser checks, design sync, or documentation lookups.
---

# MCP First Token Efficiency

## Purpose

Make MCP-first exploration the default for this repo so work starts with the smallest reliable context instead of broad file reads.

## Default Order

1. Try Serena first for local code and symbol-aware exploration.
   - Activate `codewave` if needed.
   - Prefer `get_symbols_overview` and `search_for_pattern` before full file reads.
2. Try Swagger first for implemented backend route or contract questions.
   - Warm `http://127.0.0.1:3000/docs-json`.
   - Use live endpoints to narrow the code target before reading controllers or services.
3. Try the matching MCP for non-code deliverables.
   - `notion` for plans, architecture notes, and captured decisions
   - browser tooling for local UI inspection
   - `figma` for design sync or visual source-of-truth work
   - docs MCPs for official references
4. Fall back to shell reads only after MCPs have narrowed the slice or when the relevant MCP is unavailable.

## Routing Rules

- Code question with known files or symbols: Serena first.
- Backend/API question: Swagger plus Serena.
- Repo planning or wiki capture: Notion plus Serena when code grounding is needed.
- Frontend/browser verification: browser MCP, then Serena for owning code.
- Design sync: Figma, then Serena for code references.
- Purely local non-code files with no relevant MCP: targeted shell read is fine.

## Guardrails

- Do not read whole files when Serena can answer with symbols or patterns.
- Do not grep broad repo domains before trying the relevant MCP.
- Do not call every MCP on every prompt; choose the smallest relevant one.
- If an MCP is unhealthy, say so once and use the lightest fallback.
- Keep user updates short: name the MCPs in use, why they fit, then continue working.

## Good Outcome

- Serena or another relevant MCP is attempted on nearly every repo task.
- Token-heavy local reads happen only after the task slice is narrowed.
- Planning, docs, API, and UI work use the right MCP instead of the same generic workflow.
