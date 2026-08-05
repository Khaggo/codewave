# Objective 5 Demo Proof

Last updated: 2026-08-05

## Goal

Objective 5 requires visible proof that AUTOCARE:

1. detects service-completion discrepancies through QA rules and semantic/NLP-style review,
2. blocks or warns the release flow based on that evidence,
3. records an auditable service-adviser/super-admin decision, and
4. exposes a customer-facing reviewed summary after reviewer approval.

## Current AI Boundary

- Deterministic QA risk, semantic, and blocking rules remain the source of release decisions.
- Lifecycle-summary generation is optional and uses an OpenAI-compatible provider only when
  `AI_SUMMARY_PROVIDER=openai_compatible` is configured.
- The default is `disabled`; unavailable, timed-out, malformed, or failed generation does not
  create customer-visible AI text.
- Provider/model/prompt/evidence provenance is retained, customer-safe evidence is filtered, and
  adviser or super-admin review is required before publication.
- The current focused remediation evidence reports backend AI/reference/loyalty `21/21` and the
  web/mobile suites `230/230` and `213/213`. This is not a new live Playwright claim.

## Proof Chain

### 1. Backend discrepancy evidence

Primary backend evidence:

- `backend/apps/main-service/test/quality-gates.service.spec.ts`

Key test:

- `blocks the quality gate when a verified high-severity completion finding is not reflected in the completed work record`

Supporting backend evidence:

- `adds a Gate 1 semantic finding with provenance when the completed work supports the concern narrative`
- queue/rerun/blocked-audit tests in the same file confirm risk-state and release gating behavior remains auditable.

What this proves:

- discrepancy findings are not just UI copy,
- risk and blocking states are produced from live backend QA logic,
- the release workflow can be blocked before final release when the completed work record conflicts with verified findings.

### 2. Staff QA audit visual evidence

Primary UI evidence:

- `frontend/src/screens/QAAuditWorkspace.js`
- `frontend/src/screens/panelObjectiveProofView.test.mjs`

Visible proof anchors on the QA screen:

- `Risk Score`
- `Semantic Match`
- `Blocking Findings`
- `Review Needed`
- `Continue in Job Orders`

What this proves:

- reviewers can see the discrepancy/risk evidence,
- staff are not limited to a hidden backend-only rule result,
- the discrepancy story is visible during QA review and release decision-making.

### 3. Customer-facing reviewed summary evidence

Backend route:

- `GET /api/vehicles/:id/lifecycle-summary/latest`
- file: `backend/apps/main-service/src/modules/vehicle-lifecycle/controllers/vehicle-lifecycle.controller.ts`

Backend service evidence:

- `backend/apps/main-service/src/modules/vehicle-lifecycle/services/vehicle-lifecycle.service.ts`
- `backend/apps/main-service/test/vehicle-lifecycle.service.spec.ts`

Key test:

- `returns the latest customer-visible lifecycle summary for customer-safe surfaces`

Mobile client + rendering:

- `mobile/src/lib/vehicleLifecycleClient.js`
- `mobile/src/screens/VehicleLifecycleScreen.js`

Visible customer proof anchor:

- `Customer-visible reviewed summary`

What this proves:

- customer-facing summary text is gated through reviewer-visible lifecycle summary records,
- the summary route is distinct from internal-only lifecycle records,
- the reviewed summary is actually rendered on the customer mobile surface.

## Recommended Demo Story

1. Show a job order reaching QA with evidence and completion notes.
2. Show QA audit highlighting:
   - risk score,
   - semantic match section,
   - blocking/review-needed findings.
3. Use the discrepancy scenario from backend QA evidence to explain how a release can be blocked.
4. Show the recorded reviewer decision path in the QA workspace.
5. Open the customer vehicle lifecycle screen and show the `Customer-visible reviewed summary` card.

## Current Limitation

This document proves the chain in implementation and automated evidence. A fresh guided
screenshot/video capture of the full discrepancy path is still the final panel-defense artifact;
live Playwright output and actual survey results remain pending.
