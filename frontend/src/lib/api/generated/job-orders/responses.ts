import type { JobOrderStatus } from './requests';

export interface JobOrderItemResponse {
  id: string;
  jobOrderId: string;
  name: string;
  description?: string | null;
  estimatedHours?: number | null;
  isCompleted: boolean;
}

export interface JobOrderAssignmentResponse {
  id: string;
  jobOrderId: string;
  technicianUserId: string;
  assignedAt: string;
}

export interface JobOrderProgressEntryResponse {
  id: string;
  jobOrderId: string;
  technicianUserId: string;
  entryType: 'note' | 'work_started' | 'work_completed' | 'issue_found';
  message: string;
  completedItemIds?: string[];
  createdAt: string;
}

export interface JobOrderPhotoResponse {
  id: string;
  jobOrderId: string;
  takenByUserId: string;
  fileName: string;
  fileUrl: string;
  caption?: string | null;
  createdAt: string;
}

export interface JobOrderInvoiceRecordResponse {
  id: string;
  jobOrderId: string;
  invoiceReference: string;
  sourceType: 'booking' | 'back_job';
  sourceId: string;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  finalizedByUserId: string;
  paymentStatus: 'pending_payment' | 'paid';
  amountPaidCents: number | null;
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'other' | null;
  paymentReference: string | null;
  recordedByUserId: string | null;
  paidAt: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobOrderResponse {
  id: string;
  sourceType: 'booking' | 'back_job';
  sourceId: string;
  jobType: 'normal' | 'back_job';
  parentJobOrderId?: string | null;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  status: JobOrderStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: JobOrderItemResponse[];
  assignments: JobOrderAssignmentResponse[];
  progressEntries: JobOrderProgressEntryResponse[];
  photos: JobOrderPhotoResponse[];
  invoiceRecord?: JobOrderInvoiceRecordResponse | null;
}
