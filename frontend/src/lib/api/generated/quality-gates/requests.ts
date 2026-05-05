import type { RouteContract } from '../shared';

export type QualityGateStatus = 'pending_review' | 'passed' | 'blocked' | 'overridden';
export type QualityGateFindingGate = 'foundation' | 'gate_1' | 'gate_2';
export type QualityGateFindingSeverity = 'info' | 'warning' | 'critical';

export interface OverrideQualityGateRequest {
  reason: string;
}

export interface RecordQualityGateVerdictRequest {
  verdict: 'passed' | 'blocked';
  note?: string;
}

export const qualityGateRoutes: Record<string, RouteContract> = {
  getJobOrderQualityGate: {
    method: 'GET',
    path: '/api/job-orders/:jobOrderId/qa',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Returns the current QA gate state, findings, and worker metadata while the shared AI audit job is queued, processing, completed, or failed.',
  },
  overrideJobOrderQualityGate: {
    method: 'PATCH',
    path: '/api/job-orders/:jobOrderId/qa/override',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Only super admins can approve a documented manual QA override.',
  },
  recordJobOrderQualityGateVerdict: {
    method: 'PATCH',
    path: '/api/job-orders/:jobOrderId/qa/verdict',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Head technicians record the final pass or block verdict after reviewing the pre-check summary and physical evidence.',
  },
};
