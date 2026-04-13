import type { RouteContract } from '../shared';

export type BackJobStatus =
  | 'reported'
  | 'inspected'
  | 'approved_for_rework'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'rejected';

export interface CreateBackJobFindingRequest {
  category: string;
  label: string;
  severity?: 'info' | 'low' | 'medium' | 'high';
  notes?: string;
  isValidated?: boolean;
}

export interface CreateBackJobRequest {
  customerUserId: string;
  vehicleId: string;
  originalJobOrderId: string;
  originalBookingId?: string;
  returnInspectionId?: string;
  complaint: string;
  reviewNotes?: string;
  findings?: CreateBackJobFindingRequest[];
}

export interface UpdateBackJobStatusRequest {
  status: BackJobStatus;
  returnInspectionId?: string;
  reviewNotes?: string;
  resolutionNotes?: string;
}

export const backJobsRoutes: Record<string, RouteContract> = {
  createBackJob: {
    method: 'POST',
    path: '/api/back-jobs',
    status: 'live',
    source: 'swagger',
    notes: 'Staff-only route for reviewed return and rework intake.',
  },
  getBackJobById: {
    method: 'GET',
    path: '/api/back-jobs/:id',
    status: 'live',
    source: 'swagger',
  },
  updateBackJobStatus: {
    method: 'PATCH',
    path: '/api/back-jobs/:id/status',
    status: 'live',
    source: 'swagger',
  },
  getVehicleBackJobs: {
    method: 'GET',
    path: '/api/vehicles/:id/back-jobs',
    status: 'live',
    source: 'swagger',
    notes: 'Customer visibility is limited to the owning vehicle.',
  },
};
