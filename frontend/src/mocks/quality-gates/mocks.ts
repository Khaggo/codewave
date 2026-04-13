import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type { JobOrderQualityGateResponse } from '../../lib/api/generated/quality-gates/responses';

export const blockedQualityGateMock: JobOrderQualityGateResponse = {
  id: 'b1dc8594-ea6d-4e29-b5d5-0bfd46a08869',
  jobOrderId: '9d6e8b65-3935-4f19-a198-5d79ca51bb76',
  status: 'blocked',
  riskScore: 85,
  blockingReason: 'Quality gate found blocking issues that must be resolved before release.',
  lastAuditRequestedAt: '2026-05-06T08:00:00.000Z',
  lastAuditCompletedAt: '2026-05-06T08:00:05.000Z',
  createdAt: '2026-05-06T08:00:00.000Z',
  updatedAt: '2026-05-06T08:00:05.000Z',
  findings: [
    {
      id: 'd6ed6e6f-a5d3-4709-98a0-c6fd58fb9ed4',
      qualityGateId: 'b1dc8594-ea6d-4e29-b5d5-0bfd46a08869',
      gate: 'foundation',
      severity: 'critical',
      code: 'incomplete_work_items',
      message: 'All job-order items must be completed before release can continue.',
      provenance: null,
      createdAt: '2026-05-06T08:00:05.000Z',
    },
  ],
  overrides: [],
};

export const passedQualityGateMock: JobOrderQualityGateResponse = {
  ...blockedQualityGateMock,
  status: 'passed',
  riskScore: 10,
  blockingReason: null,
  findings: [
    {
      id: '4dd6b489-3e6a-4658-86a3-d71d8f06aa39',
      qualityGateId: 'b1dc8594-ea6d-4e29-b5d5-0bfd46a08869',
      gate: 'gate_1',
      severity: 'info',
      code: 'semantic_resolution_supported',
      message: 'Gate 1 found enough concern-to-work overlap to support the repair narrative for staff review.',
      provenance: {
        provider: 'local-rule-auditor',
        model: 'token-overlap-v1',
        promptVersion: 'quality-gates.gate1.v1',
        sourceType: 'booking',
        ruleId: 'gate_1.semantic_resolution_supported',
        recommendation: 'supported',
        confidence: 'medium',
        concernSummary: 'Engine rattling noise during cold start. Engine Diagnostics.',
        completedWorkSummary: 'Resolved engine rattling noise and completed cold-start drive belt inspection.',
        matchedKeywords: ['engine', 'rattl', 'cold'],
        coverageRatio: 0.5,
        evidenceRefs: [],
        evidenceSummary: 'Gate 1 compares booking or back-job concern text against the completed-work narrative.',
        riskContribution: 10,
      },
      createdAt: '2026-05-06T08:15:00.000Z',
    },
  ],
  updatedAt: '2026-05-06T08:15:00.000Z',
  lastAuditCompletedAt: '2026-05-06T08:15:00.000Z',
};

export const semanticReviewQualityGateMock: JobOrderQualityGateResponse = {
  ...passedQualityGateMock,
  status: 'passed',
  riskScore: 35,
  findings: [
    {
      id: 'a5ff77df-6274-49db-9bca-f2102e725868',
      qualityGateId: 'b1dc8594-ea6d-4e29-b5d5-0bfd46a08869',
      gate: 'gate_1',
      severity: 'warning',
      code: 'semantic_resolution_review_needed',
      message: 'Gate 1 found weak overlap between the recorded concern and the completed-work evidence, so staff review is recommended.',
      provenance: {
        provider: 'local-rule-auditor',
        model: 'token-overlap-v1',
        promptVersion: 'quality-gates.gate1.v1',
        sourceType: 'booking',
        ruleId: 'gate_1.semantic_resolution_review_needed',
        recommendation: 'review_needed',
        confidence: 'medium',
        concernSummary: 'Intermittent brake squeal while turning left.',
        completedWorkSummary: 'Completed tire rotation and alignment work with no direct brake narrative.',
        matchedKeywords: [],
        coverageRatio: 0,
        evidenceRefs: [],
        evidenceSummary: 'Gate 1 compares booking or back-job concern text against the completed-work narrative.',
        riskContribution: 35,
      },
      createdAt: '2026-05-06T08:12:00.000Z',
    },
  ],
};

export const discrepancyBlockedQualityGateMock: JobOrderQualityGateResponse = {
  ...blockedQualityGateMock,
  status: 'blocked',
  riskScore: 75,
  blockingReason: 'Gate 2 found verified high-severity inspection evidence "Brake fluid leak at front line" that is not clearly resolved by the completed-work record.',
  findings: [
    {
      id: '1a5ea692-baf2-4f93-a72d-663396d457ab',
      qualityGateId: 'b1dc8594-ea6d-4e29-b5d5-0bfd46a08869',
      gate: 'gate_2',
      severity: 'critical',
      code: 'verified_high_severity_unresolved',
      message: 'Gate 2 found verified high-severity inspection evidence "Brake fluid leak at front line" that is not clearly resolved by the completed-work record.',
      provenance: {
        provider: 'local-rule-engine',
        model: 'evidence-discrepancy-v1',
        promptVersion: 'quality-gates.gate2.v1',
        sourceType: 'booking',
        ruleId: 'gate_2.verified_high_severity_unresolved',
        recommendation: 'review_needed',
        confidence: 'high',
        concernSummary: '',
        completedWorkSummary: '',
        matchedKeywords: [],
        coverageRatio: 0,
        evidenceRefs: [
          'inspection:7fe69980-fd7f-4d2a-b8e8-4c9cf1b39c31',
          'inspection-finding:cfd5a18d-2b2a-4fcf-a030-52ef2a9099a4',
        ],
        evidenceSummary: 'Inspection 7fe69980-fd7f-4d2a-b8e8-4c9cf1b39c31 contains the verified finding "Brake fluid leak at front line" with weak overlap to the completed work narrative.',
        riskContribution: 75,
      },
      createdAt: '2026-05-06T08:18:00.000Z',
    },
  ],
};

export const overriddenQualityGateMock: JobOrderQualityGateResponse = {
  ...discrepancyBlockedQualityGateMock,
  status: 'overridden',
  overrides: [
    {
      id: 'fe5174ce-fbcb-45b4-a5ef-0a80ac221c83',
      qualityGateId: 'b1dc8594-ea6d-4e29-b5d5-0bfd46a08869',
      actorUserId: '0d8975b4-2d95-4df3-8a03-88495599725e',
      actorRole: 'super_admin',
      reason: 'Supervisor approved release after reviewing the unresolved completion inspection.',
      createdAt: '2026-05-06T08:21:00.000Z',
    },
  ],
  updatedAt: '2026-05-06T08:21:00.000Z',
};

export const qualityGateUnavailableErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'The job order has not entered QA yet.',
  source: 'swagger',
};
