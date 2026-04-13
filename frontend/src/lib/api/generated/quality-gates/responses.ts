import type {
  QualityGateFindingGate,
  QualityGateFindingSeverity,
  QualityGateStatus,
} from './requests';

export interface QualityGateFindingResponse {
  id: string;
  qualityGateId: string;
  gate: QualityGateFindingGate;
  severity: QualityGateFindingSeverity;
  code: string;
  message: string;
  provenance?: QualityGateFindingProvenance | null;
  createdAt: string;
}

export interface QualityGateFindingProvenance {
  provider: string;
  model: string;
  promptVersion: string;
  sourceType: 'booking' | 'back_job';
  ruleId?: string;
  recommendation: 'supported' | 'review_needed' | 'insufficient_context';
  confidence: 'high' | 'medium' | 'low';
  concernSummary: string;
  completedWorkSummary: string;
  matchedKeywords: string[];
  coverageRatio: number;
  evidenceRefs?: string[];
  evidenceSummary?: string;
  riskContribution?: number;
}

export interface QualityGateOverrideResponse {
  id: string;
  qualityGateId: string;
  actorUserId: string;
  actorRole: 'customer' | 'technician' | 'service_adviser' | 'super_admin';
  reason: string;
  createdAt: string;
}

export interface JobOrderQualityGateResponse {
  id: string;
  jobOrderId: string;
  status: QualityGateStatus;
  riskScore: number;
  blockingReason?: string | null;
  lastAuditRequestedAt: string;
  lastAuditCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  findings: QualityGateFindingResponse[];
  overrides: QualityGateOverrideResponse[];
}
