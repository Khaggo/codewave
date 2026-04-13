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
      createdAt: '2026-05-06T08:00:05.000Z',
    },
  ],
  overrides: [],
};

export const passedQualityGateMock: JobOrderQualityGateResponse = {
  ...blockedQualityGateMock,
  status: 'passed',
  riskScore: 0,
  blockingReason: null,
  findings: [],
  updatedAt: '2026-05-06T08:15:00.000Z',
  lastAuditCompletedAt: '2026-05-06T08:15:00.000Z',
};

export const qualityGateUnavailableErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'The job order has not entered QA yet.',
  source: 'swagger',
};
