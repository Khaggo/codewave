# Edge Cases and Risks

This document highlights situations that can easily be modeled incorrectly.

## Repeat Visit vs Back Job

- Not every repeat visit is a back job.
- A back job should be treated as return/rework related to previous work.
- If the issue is unrelated, it should be modeled as a new case.

## Unverified Completion

- A job marked completed without completion inspection may create misleading lifecycle accuracy.
- The system should distinguish completed from verified-completed when needed.

## Partial Invoice Payments

- Invoice payment tracking must support partial settlement.
- Reporting should avoid treating partial as fully paid.
- Customer-facing views should present payment state clearly.

## Cross-Domain Sync Lag

- Loyalty and analytics may lag behind order completion if event delivery or workers are delayed.
- Read models should tolerate eventual consistency.

## Inventory Mismatch Risk

- Inventory counts may drift if reservation, deduction, and manual adjustments are not modeled clearly.
- Service materials and retail products may need separate stock handling rules.

## Internal vs Customer-Visible Notes

- Lifecycle, inspection, and back-job records may contain internal operational notes.
- Customer-facing outputs should be filtered intentionally.

## Shared Base Layer Risk

- If base CRUD abstractions absorb domain logic, the design will become harder to evolve.
- Keep domain rules close to services and domain-specific repositories.

## Insurance Misinterpretation Risk

- Users may assume insurance inquiry tracking means insurer integration.
- The docs and UI should keep this boundary explicit.

## Payment Misinterpretation Risk

- Users may assume invoice payment tracking means direct financial processing.
- The system should not overstate payment certainty if verification is manual.
