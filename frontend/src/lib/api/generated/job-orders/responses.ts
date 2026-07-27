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
  technicianProfileId: string;
  technicianCode?: string | null;
  technicianName?: string | null;
  selectedSpecialty?: string | null;
  technicianUserId?: string | null;
  assignedAt: string;
}

export interface JobOrderProgressEntryResponse {
  id: string;
  jobOrderId: string;
  technicianUserId?: string | null;
  recordedByUserId?: string | null;
  technicianProfileId?: string | null;
  workshopStage?: 'received' | 'diagnosis' | 'in_repair' | 'quality_check' | 'ready' | null;
  entryType: 'note' | 'work_started' | 'work_completed' | 'issue_found' | 'stage_update';
  message: string;
  completedItemIds?: string[];
  createdAt: string;
}

export interface JobOrderWorkshopStageHistoryEntryResponse {
  id: string;
  stage: 'received' | 'diagnosis' | 'in_repair' | 'quality_check' | 'ready';
  note?: string | null;
  recordedByUserId?: string | null;
  attachedPhotoIds?: string[];
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
  currencyCode: string;
  subtotalAmountCents: number;
  laborAmountCents: number;
  partsAmountCents: number;
  reservationFeeDeductionCents: number;
  totalAmountCents: number;
  amountPaidCents: number | null;
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'other' | null;
  officialReceiptReference: string;
  paymentReference: string | null;
  recordedByUserId: string | null;
  paidAt: string | null;
  summary?: string | null;
  pdfGeneratedAt?: string | null;
  pdfEmailSentAt?: string | null;
  pdfEmailError?: string | null;
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
  customerLabel?: string | null;
  vehicleLabel?: string | null;
  jobOrderReference?: string | null;
  sourceBookingReference?: string | null;
  sourceBackJobReference?: string | null;
  status: JobOrderStatus;
  currentWorkshopStage?: 'received' | 'diagnosis' | 'in_repair' | 'quality_check' | 'ready' | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: JobOrderItemResponse[];
  assignments: JobOrderAssignmentResponse[];
  progressEntries: JobOrderProgressEntryResponse[];
  workshopStageHistory: JobOrderWorkshopStageHistoryEntryResponse[];
  photos: JobOrderPhotoResponse[];
  invoiceRecord?: JobOrderInvoiceRecordResponse | null;
}
