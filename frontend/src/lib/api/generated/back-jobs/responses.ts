import type { BackJobStatus } from './requests';

export interface BackJobFindingResponse {
  id: string;
  backJobId: string;
  category: string;
  label: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  notes?: string | null;
  isValidated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackJobResponse {
  id: string;
  customerUserId: string;
  vehicleId: string;
  originalBookingId?: string | null;
  originalJobOrderId: string;
  returnInspectionId?: string | null;
  reworkJobOrderId?: string | null;
  complaint: string;
  status: BackJobStatus;
  reviewNotes?: string | null;
  resolutionNotes?: string | null;
  createdByUserId: string;
  findings: BackJobFindingResponse[];
  createdAt: string;
  updatedAt: string;
}
