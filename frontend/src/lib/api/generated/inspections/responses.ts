import type {
  InspectionFindingSeverity,
  InspectionStatus,
  InspectionType,
} from './requests';

export interface InspectionFindingResponse {
  id: string;
  inspectionId: string;
  category: string;
  label: string;
  severity: InspectionFindingSeverity;
  notes?: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionResponse {
  id: string;
  vehicleId: string;
  bookingId?: string | null;
  inspectionType: InspectionType;
  status: InspectionStatus;
  inspectorUserId?: string | null;
  notes?: string | null;
  attachmentRefs: string[];
  findings?: InspectionFindingResponse[];
  createdAt: string;
  updatedAt: string;
}
