import type { RouteContract } from '../shared';

export type InspectionType = 'intake' | 'pre_repair' | 'completion' | 'return';
export type InspectionStatus = 'pending' | 'completed' | 'needs_followup' | 'void';
export type InspectionFindingSeverity = 'info' | 'low' | 'medium' | 'high';

export interface CreateInspectionFindingRequest {
  category: string;
  label: string;
  severity?: InspectionFindingSeverity;
  notes?: string;
  isVerified?: boolean;
}

export interface CreateInspectionRequest {
  inspectionType: InspectionType;
  status?: InspectionStatus;
  bookingId?: string;
  inspectorUserId?: string;
  notes?: string;
  attachmentRefs?: string[];
  findings?: CreateInspectionFindingRequest[];
}

export const inspectionsRoutes: Record<string, RouteContract> = {
  createInspection: {
    method: 'POST',
    path: '/api/vehicles/:id/inspections',
    status: 'live',
    source: 'swagger',
  },
  listInspectionsByVehicle: {
    method: 'GET',
    path: '/api/vehicles/:id/inspections',
    status: 'live',
    source: 'swagger',
  },
};
