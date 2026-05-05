import type { JobOrderQualityGateResponse, QualityGateFindingResponse } from './responses';

export type StaffQualityGateReviewRole = 'technician' | 'head_technician' | 'service_adviser' | 'super_admin';
export type StaffQualityGateOverrideRole = 'super_admin';
export type StaffQualityGateVerdictRole = 'head_technician';

export type StaffQualityGateReviewState =
  | 'qa_ready'
  | 'qa_loading'
  | 'qa_loaded'
  | 'qa_unavailable'
  | 'qa_forbidden_role'
  | 'qa_not_found'
  | 'qa_failed';

export type StaffQualityGateOverrideState =
  | 'override_ready'
  | 'override_submitting'
  | 'override_saved'
  | 'override_forbidden_role'
  | 'override_not_blocked'
  | 'override_not_found'
  | 'override_failed';

export type StaffQualityGateVerdictState =
  | 'verdict_ready'
  | 'verdict_submitting'
  | 'verdict_saved'
  | 'verdict_forbidden_role'
  | 'verdict_not_found'
  | 'verdict_failed';

export type QualityGateReleaseState =
  | 'release_unavailable'
  | 'release_pending_audit'
  | 'release_blocked'
  | 'release_allowed'
  | 'release_allowed_by_override';

export interface StaffQualityGateRule<TState extends string> {
  state: TState;
  allowedRoles: StaffQualityGateReviewRole[];
  backendRoute: string;
  releaseEffect: QualityGateReleaseState | 'no_release_change';
  notes: string;
}

export const staffQualityGateReviewRoles: StaffQualityGateReviewRole[] = [
  'technician',
  'service_adviser',
  'super_admin',
];

export const staffQualityGateOverrideRoles: StaffQualityGateOverrideRole[] = [
  'super_admin',
];

export const staffQualityGateVerdictRoles: StaffQualityGateVerdictRole[] = [
  'head_technician',
];

export const staffQualityGateReviewRules: StaffQualityGateRule<StaffQualityGateReviewState>[] = [
  {
    state: 'qa_ready',
    allowedRoles: staffQualityGateReviewRoles,
    backendRoute: 'GET /api/job-orders/:jobOrderId/qa',
    releaseEffect: 'release_unavailable',
    notes: 'A known job-order id and valid staff session are required before QA can be loaded.',
  },
  {
    state: 'qa_loaded',
    allowedRoles: staffQualityGateReviewRoles,
    backendRoute: 'GET /api/job-orders/:jobOrderId/qa',
    releaseEffect: 'no_release_change',
    notes: 'The QA record, findings, risk score, audit job, and override audit trail are visible.',
  },
  {
    state: 'qa_unavailable',
    allowedRoles: staffQualityGateReviewRoles,
    backendRoute: 'GET /api/job-orders/:jobOrderId/qa',
    releaseEffect: 'release_unavailable',
    notes: 'The backend returns conflict when the job order has not entered ready-for-QA.',
  },
  {
    state: 'qa_forbidden_role',
    allowedRoles: staffQualityGateReviewRoles,
    backendRoute: 'GET /api/job-orders/:jobOrderId/qa',
    releaseEffect: 'release_unavailable',
    notes: 'Assigned technicians and staff reviewers can read QA; customers cannot use this web surface.',
  },
];

export const staffQualityGateOverrideRules: StaffQualityGateRule<StaffQualityGateOverrideState>[] = [
  {
    state: 'override_ready',
    allowedRoles: staffQualityGateOverrideRoles,
    backendRoute: 'PATCH /api/job-orders/:jobOrderId/qa/override',
    releaseEffect: 'release_allowed_by_override',
    notes: 'Only super admins can override blocked gates, and an explicit reason is required.',
  },
  {
    state: 'override_saved',
    allowedRoles: staffQualityGateOverrideRoles,
    backendRoute: 'PATCH /api/job-orders/:jobOrderId/qa/override',
    releaseEffect: 'release_allowed_by_override',
    notes: 'The backend keeps original findings and adds an override audit row.',
  },
  {
    state: 'override_not_blocked',
    allowedRoles: staffQualityGateOverrideRoles,
    backendRoute: 'PATCH /api/job-orders/:jobOrderId/qa/override',
    releaseEffect: 'no_release_change',
    notes: 'Only currently blocked gates may be manually overridden.',
  },
  {
    state: 'override_forbidden_role',
    allowedRoles: staffQualityGateOverrideRoles,
    backendRoute: 'PATCH /api/job-orders/:jobOrderId/qa/override',
    releaseEffect: 'no_release_change',
    notes: 'The override action must stay super-admin-only.',
  },
];

export const canStaffReadQualityGate = (role?: string | null): role is StaffQualityGateReviewRole =>
  staffQualityGateReviewRoles.includes(role as StaffQualityGateReviewRole);

export const canStaffOverrideQualityGate = (role?: string | null): role is StaffQualityGateOverrideRole =>
  staffQualityGateOverrideRoles.includes(role as StaffQualityGateOverrideRole);

export const canStaffRecordQualityGateVerdict = (role?: string | null): role is StaffQualityGateVerdictRole =>
  staffQualityGateVerdictRoles.includes(role as StaffQualityGateVerdictRole);

export const isQualityGateReleaseAllowed = (gate?: JobOrderQualityGateResponse | null) =>
  gate?.status === 'passed' || gate?.status === 'overridden';

export const isQualityGateReleaseBlocked = (gate?: JobOrderQualityGateResponse | null) =>
  gate?.status === 'pending_review' || gate?.status === 'blocked';

export const getQualityGateReleaseState = (
  gate?: JobOrderQualityGateResponse | null,
): QualityGateReleaseState => {
  if (!gate) {
    return 'release_unavailable';
  }

  if (gate.status === 'pending_review') {
    return 'release_pending_audit';
  }

  if (gate.status === 'blocked') {
    return 'release_blocked';
  }

  if (gate.status === 'overridden') {
    return 'release_allowed_by_override';
  }

  return 'release_allowed';
};

export const getBlockingQualityGateFindings = (gate?: JobOrderQualityGateResponse | null) =>
  Array.isArray(gate?.findings)
    ? gate.findings.filter((finding) => finding.severity === 'critical')
    : [];

export const getReviewNeededQualityGateFindings = (gate?: JobOrderQualityGateResponse | null) =>
  Array.isArray(gate?.findings)
    ? gate.findings.filter((finding) => finding.severity === 'warning')
    : [];

export const getLatestQualityGateOverride = (gate?: JobOrderQualityGateResponse | null) =>
  Array.isArray(gate?.overrides) && gate.overrides.length > 0
    ? [...gate.overrides].sort((left, right) =>
        String(right.createdAt).localeCompare(String(left.createdAt)),
      )[0]
    : null;

export const getFindingRiskContribution = (finding?: QualityGateFindingResponse | null) =>
  typeof finding?.provenance?.riskContribution === 'number'
    ? finding.provenance.riskContribution
    : null;

export const qualityGateReviewContractSources = [
  'docs/architecture/domains/main-service/quality-gates.md',
  'docs/architecture/domains/main-service/job-orders.md',
  'docs/architecture/tasks/05-client-integration/T518-quality-gates-review-release-and-override-web-flow.md',
  'docs/contracts/T116-quality-gates-foundation.md',
  'docs/contracts/T117-quality-gate1-semantic-resolution-auditor.md',
  'docs/contracts/T118-quality-gate2-discrepancy-risk-engine.md',
  'docs/contracts/T119-quality-gate-manual-override.md',
  'backend/apps/main-service/src/modules/quality-gates/controllers/quality-gates.controller.ts',
  'frontend/src/lib/qualityGateClient.js',
  'frontend/src/screens/QAAuditWorkspace.js',
] as const;
