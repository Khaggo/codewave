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
  createdAt: string;
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
