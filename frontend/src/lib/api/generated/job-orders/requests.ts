import type { RouteContract } from '../shared';

export type JobOrderStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'ready_for_qa'
  | 'blocked'
  | 'finalized'
  | 'cancelled';

export interface CreateJobOrderItemRequest {
  name: string;
  description?: string;
  estimatedHours?: number;
}

export interface CreateJobOrderRequest {
  sourceType: 'booking' | 'back_job';
  sourceId: string;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  notes?: string;
  items: CreateJobOrderItemRequest[];
  assignedTechnicianIds?: string[];
}

export interface UpdateJobOrderStatusRequest {
  status: JobOrderStatus;
  reason?: string;
}

export interface AddJobOrderProgressRequest {
  entryType: 'note' | 'work_started' | 'work_completed' | 'issue_found';
  message: string;
  completedItemIds?: string[];
}

export interface AddJobOrderPhotoRequest {
  fileName: string;
  fileUrl: string;
  caption?: string;
}

export interface FinalizeJobOrderRequest {
  summary?: string;
}

export const jobOrdersRoutes: Record<string, RouteContract> = {
  createJobOrder: {
    method: 'POST',
    path: '/api/job-orders',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Supports both confirmed bookings and approved back-job intake.',
  },
  getJobOrderById: {
    method: 'GET',
    path: '/api/job-orders/:id',
    status: 'live',
    source: 'swagger',
  },
  updateJobOrderStatus: {
    method: 'PATCH',
    path: '/api/job-orders/:id/status',
    status: 'live',
    source: 'swagger',
  },
  addJobOrderProgress: {
    method: 'POST',
    path: '/api/job-orders/:id/progress',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Authenticated actor owns the progress entry.',
  },
  addJobOrderPhoto: {
    method: 'POST',
    path: '/api/job-orders/:id/photos',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Authenticated staff actor owns the photo evidence.',
  },
  finalizeJobOrder: {
    method: 'POST',
    path: '/api/job-orders/:id/finalize',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Authenticated adviser or super admin owns invoice-ready generation.',
  },
};
