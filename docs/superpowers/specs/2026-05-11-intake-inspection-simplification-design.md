# 2026-05-11 Intake Inspection Simplification Design

## Goal
Reduce duplicate navigation cards and shorten the Intake Inspection workspace copy so the page reads faster.

## Decision
- Remove the route-card row that repeats sidebar destinations.
- Keep the top summary area focused on capture, history, and QA context.
- Rewrite hero and card descriptions to one short sentence each.

## Reasoning
The current page explains the same workflow in multiple places and uses long paragraphs for guidance. Removing duplicate cards and tightening the text keeps the workspace clearer without changing inspection behavior.

## Scope
- Update the Intake Inspection workspace view content
- Add a small regression test for the simplified content model
- No API, form, or workflow behavior changes
