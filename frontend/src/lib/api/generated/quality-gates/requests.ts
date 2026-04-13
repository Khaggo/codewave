import type { RouteContract } from '../shared';

export type QualityGateStatus = 'pending' | 'passed' | 'blocked' | 'overridden';
export type QualityGateFindingGate = 'foundation' | 'gate_1' | 'gate_2';
export type QualityGateFindingSeverity = 'info' | 'warning' | 'critical';

export interface OverrideQualityGateRequest {
  reason: string;
}

export const qualityGateRoutes: Record<string, RouteContract> = {
  getJobOrderQualityGate: {
    method: 'GET',
    path: '/api/job-orders/:jobOrderId/qa',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Returns the current QA gate state and findings for the job order.',
  },
  overrideJobOrderQualityGate: {
    method: 'PATCH',
    path: '/api/job-orders/:jobOrderId/qa/override',
    status: 'planned',
    source: 'task',
    notes: 'Planned for T119. Manual override remains a later slice.',
  },
};
