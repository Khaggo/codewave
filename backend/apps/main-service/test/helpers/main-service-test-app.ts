import { randomUUID } from 'crypto';

import { INestApplication, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { LoyaltyAccrualPlannerService } from '@shared/events/loyalty-accrual-planner.service';
import { HealthController } from '../../src/health.controller';
import { AnalyticsController } from '../../src/modules/analytics/controllers/analytics.controller';
import { AnalyticsRepository } from '../../src/modules/analytics/repositories/analytics.repository';
import { AnalyticsService } from '../../src/modules/analytics/services/analytics.service';
import { AuthController } from '../../src/modules/auth/controllers/auth.controller';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { AuthRepository } from '../../src/modules/auth/repositories/auth.repository';
import { AuthService } from '../../src/modules/auth/services/auth.service';
import { GoogleIdentityService } from '../../src/modules/auth/services/google-identity.service';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { BackJobsController } from '../../src/modules/back-jobs/controllers/back-jobs.controller';
import { CreateBackJobDto } from '../../src/modules/back-jobs/dto/create-back-job.dto';
import { UpdateBackJobStatusDto } from '../../src/modules/back-jobs/dto/update-back-job-status.dto';
import { BackJobsRepository } from '../../src/modules/back-jobs/repositories/back-jobs.repository';
import {
  backJobFindingSeverityEnum,
  backJobStatusEnum,
} from '../../src/modules/back-jobs/schemas/back-jobs.schema';
import { BackJobsService } from '../../src/modules/back-jobs/services/back-jobs.service';
import { BookingsController } from '../../src/modules/bookings/controllers/bookings.controller';
import { CreateBookingDto } from '../../src/modules/bookings/dto/create-booking.dto';
import { RescheduleBookingDto } from '../../src/modules/bookings/dto/reschedule-booking.dto';
import { BOOKINGS_CLOCK } from '../../src/modules/bookings/bookings.constants';
import { UpdateBookingStatusDto } from '../../src/modules/bookings/dto/update-booking-status.dto';
import { BookingsRepository } from '../../src/modules/bookings/repositories/bookings.repository';
import { bookingStatusEnum } from '../../src/modules/bookings/schemas/bookings.schema';
import { BookingsService } from '../../src/modules/bookings/services/bookings.service';
import { ChatbotController } from '../../src/modules/chatbot/controllers/chatbot.controller';
import { ChatbotRepository } from '../../src/modules/chatbot/repositories/chatbot.repository';
import { ChatbotService } from '../../src/modules/chatbot/services/chatbot.service';
import { InsuranceController } from '../../src/modules/insurance/controllers/insurance.controller';
import { AddInsuranceDocumentDto } from '../../src/modules/insurance/dto/add-insurance-document.dto';
import { CreateInsuranceInquiryDto } from '../../src/modules/insurance/dto/create-insurance-inquiry.dto';
import { UpdateInsuranceInquiryStatusDto } from '../../src/modules/insurance/dto/update-insurance-inquiry-status.dto';
import { InsuranceRepository } from '../../src/modules/insurance/repositories/insurance.repository';
import {
  insuranceDocumentTypeEnum,
  insuranceInquiryStatusEnum,
  insuranceInquiryTypeEnum,
} from '../../src/modules/insurance/schemas/insurance.schema';
import { InsuranceService } from '../../src/modules/insurance/services/insurance.service';
import { InspectionsController } from '../../src/modules/inspections/controllers/inspections.controller';
import { CreateInspectionDto } from '../../src/modules/inspections/dto/create-inspection.dto';
import { InspectionsRepository } from '../../src/modules/inspections/repositories/inspections.repository';
import {
  inspectionFindingSeverityEnum,
  inspectionStatusEnum,
  inspectionTypeEnum,
} from '../../src/modules/inspections/schemas/inspections.schema';
import { InspectionsService } from '../../src/modules/inspections/services/inspections.service';
import { JobOrdersController } from '../../src/modules/job-orders/controllers/job-orders.controller';
import { AddJobOrderPhotoDto } from '../../src/modules/job-orders/dto/add-job-order-photo.dto';
import { AddJobOrderProgressDto } from '../../src/modules/job-orders/dto/add-job-order-progress.dto';
import { CreateJobOrderDto } from '../../src/modules/job-orders/dto/create-job-order.dto';
import { FinalizeJobOrderDto } from '../../src/modules/job-orders/dto/finalize-job-order.dto';
import { RecordJobOrderInvoicePaymentDto } from '../../src/modules/job-orders/dto/record-job-order-invoice-payment.dto';
import { UpdateJobOrderStatusDto } from '../../src/modules/job-orders/dto/update-job-order-status.dto';
import { JobOrdersRepository } from '../../src/modules/job-orders/repositories/job-orders.repository';
import {
  jobOrderInvoicePaymentMethodEnum,
  jobOrderInvoicePaymentStatusEnum,
  jobOrderProgressEntryTypeEnum,
  jobOrderSourceTypeEnum,
  jobOrderStatusEnum,
  jobOrderTypeEnum,
} from '../../src/modules/job-orders/schemas/job-orders.schema';
import { JobOrdersService } from '../../src/modules/job-orders/services/job-orders.service';
import { LoyaltyController } from '../../src/modules/loyalty/controllers/loyalty.controller';
import { CreateEarningRuleDto } from '../../src/modules/loyalty/dto/create-earning-rule.dto';
import { CreateRewardDto } from '../../src/modules/loyalty/dto/create-reward.dto';
import { RedeemRewardDto } from '../../src/modules/loyalty/dto/redeem-reward.dto';
import { UpdateEarningRuleDto } from '../../src/modules/loyalty/dto/update-earning-rule.dto';
import { UpdateEarningRuleStatusDto } from '../../src/modules/loyalty/dto/update-earning-rule-status.dto';
import { UpdateRewardDto } from '../../src/modules/loyalty/dto/update-reward.dto';
import { UpdateRewardStatusDto } from '../../src/modules/loyalty/dto/update-reward-status.dto';
import { LoyaltyRepository } from '../../src/modules/loyalty/repositories/loyalty.repository';
import {
  earningRuleAccrualSourceEnum,
  earningRuleAuditActionEnum,
  earningRuleFormulaTypeEnum,
  earningRuleStatusEnum,
  loyaltySourceTypeEnum,
  loyaltyTransactionTypeEnum,
  LoyaltyEarningRuleSnapshot,
  rewardCatalogAuditActionEnum,
  RewardCatalogSnapshot,
  rewardStatusEnum,
  rewardTypeEnum,
} from '../../src/modules/loyalty/schemas/loyalty.schema';
import { LoyaltyService } from '../../src/modules/loyalty/services/loyalty.service';
import { NotificationsController } from '../../src/modules/notifications/controllers/notifications.controller';
import { UpdateNotificationPreferencesDto } from '../../src/modules/notifications/dto/update-notification-preferences.dto';
import { NOTIFICATIONS_QUEUE_NAME } from '../../src/modules/notifications/notifications.constants';
import { NotificationsRepository } from '../../src/modules/notifications/repositories/notifications.repository';
import {
  notificationAttemptStatusEnum,
  notificationCategoryEnum,
  notificationChannelEnum,
  notificationSourceTypeEnum,
  notificationStatusEnum,
  reminderRuleStatusEnum,
} from '../../src/modules/notifications/schemas/notifications.schema';
import { NotificationTriggerPlannerService } from '../../src/modules/notifications/services/notification-trigger-planner.service';
import { NotificationsService } from '../../src/modules/notifications/services/notifications.service';
import { SmtpMailService } from '../../src/modules/notifications/services/smtp-mail.service';
import { AiWorkerProcessor } from '../../src/modules/ai-worker/ai-worker.processor';
import { QualityGatesController } from '../../src/modules/quality-gates/controllers/quality-gates.controller';
import { QualityGatesRepository } from '../../src/modules/quality-gates/repositories/quality-gates.repository';
import {
  QualityGateFindingProvenance,
  qualityGateFindingGateEnum,
  qualityGateFindingSeverityEnum,
  qualityGateStatusEnum,
} from '../../src/modules/quality-gates/schemas/quality-gates.schema';
import { QualityGateDiscrepancyEngineService } from '../../src/modules/quality-gates/services/quality-gate-discrepancy-engine.service';
import { QualityGateSemanticAuditorService } from '../../src/modules/quality-gates/services/quality-gate-semantic-auditor.service';
import { QualityGatesService } from '../../src/modules/quality-gates/services/quality-gates.service';
import { VehicleLifecycleController } from '../../src/modules/vehicle-lifecycle/controllers/vehicle-lifecycle.controller';
import { AppendVehicleTimelineEventDto } from '../../src/modules/vehicle-lifecycle/dto/append-vehicle-timeline-event.dto';
import { VehicleLifecycleRepository } from '../../src/modules/vehicle-lifecycle/repositories/vehicle-lifecycle.repository';
import {
  vehicleLifecycleSummaryStatusEnum,
  VehicleLifecycleSummaryProvenance,
  vehicleTimelineEventCategoryEnum,
  vehicleTimelineSourceTypeEnum,
} from '../../src/modules/vehicle-lifecycle/schemas/vehicle-lifecycle.schema';
import { VehicleLifecycleService } from '../../src/modules/vehicle-lifecycle/services/vehicle-lifecycle.service';
import { VehicleLifecycleSummaryProviderService } from '../../src/modules/vehicle-lifecycle/services/vehicle-lifecycle-summary-provider.service';
import { UsersController } from '../../src/modules/users/controllers/users.controller';
import { CreateUserDto } from '../../src/modules/users/dto/create-user.dto';
import { UpdateAddressDto } from '../../src/modules/users/dto/update-address.dto';
import { UpdateUserDto } from '../../src/modules/users/dto/update-user.dto';
import { UpsertAddressDto } from '../../src/modules/users/dto/upsert-address.dto';
import { UsersRepository } from '../../src/modules/users/repositories/users.repository';
import { UsersService } from '../../src/modules/users/services/users.service';
import { VehiclesController } from '../../src/modules/vehicles/controllers/vehicles.controller';
import { CreateVehicleDto } from '../../src/modules/vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../../src/modules/vehicles/dto/update-vehicle.dto';
import { VehiclesRepository } from '../../src/modules/vehicles/repositories/vehicles.repository';
import { VehiclesService } from '../../src/modules/vehicles/services/vehicles.service';
import {
  AI_WORKER_QUEUE_NAME,
  GENERATE_VEHICLE_LIFECYCLE_SUMMARY_JOB_NAME,
  RUN_QUALITY_GATE_AUDIT_JOB_NAME,
} from '../../../../shared/queue/ai-worker.constants';
import { AiWorkerJobMetadata } from '../../../../shared/queue/ai-worker.types';
import { setupSwagger } from '../../src/swagger';

type UserRole = 'customer' | 'technician' | 'service_adviser' | 'super_admin';

type UserProfileRecord = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  birthday: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AddressRecord = {
  id: string;
  userId: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type UserRecord = {
  id: string;
  email: string;
  deletedEmail?: string | null;
  role: UserRole;
  staffCode: string | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profile: UserProfileRecord;
  addresses: AddressRecord[];
};

type AuthAccountRecord = {
  id: string;
  userId: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AuthGoogleIdentityRecord = {
  id: string;
  userId: string;
  providerUserId: string;
  email: string;
  createdAt: Date;
};

type AuthOtpChallengeRecord = {
  id: string;
  userId: string;
  purpose: 'customer_signup' | 'staff_activation';
  email: string;
  otpHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: Date;
};

type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type VehicleRecord = {
  id: string;
  userId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  vin: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
type UpdateBookingStatusCommand = UpdateBookingStatusDto & {
  changedByUserId?: string | null;
};
type RescheduleBookingCommand = RescheduleBookingDto & {
  changedByUserId?: string | null;
};

type ServiceRecord = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TimeSlotRecord = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BookingRecord = {
  id: string;
  userId: string;
  vehicleId: string;
  timeSlotId: string;
  scheduledDate: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingServiceRecord = {
  id: string;
  bookingId: string;
  serviceId: string;
  createdAt: Date;
};

type BookingStatusHistoryRecord = {
  id: string;
  bookingId: string;
  previousStatus: BookingStatus | null;
  nextStatus: BookingStatus;
  reason: string | null;
  changedByUserId: string | null;
  changedAt: Date;
};

type InspectionType = (typeof inspectionTypeEnum.enumValues)[number];
type InspectionStatus = (typeof inspectionStatusEnum.enumValues)[number];
type InspectionFindingSeverity = (typeof inspectionFindingSeverityEnum.enumValues)[number];

type InspectionRecord = {
  id: string;
  vehicleId: string;
  bookingId: string | null;
  inspectionType: InspectionType;
  status: InspectionStatus;
  inspectorUserId: string | null;
  notes: string | null;
  attachmentRefs: string[];
  createdAt: Date;
  updatedAt: Date;
};

type InspectionFindingRecord = {
  id: string;
  inspectionId: string;
  category: string;
  label: string;
  severity: InspectionFindingSeverity;
  notes: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type VehicleTimelineEventCategory = (typeof vehicleTimelineEventCategoryEnum.enumValues)[number];
type VehicleTimelineSourceType = (typeof vehicleTimelineSourceTypeEnum.enumValues)[number];

type VehicleTimelineEventRecord = {
  id: string;
  vehicleId: string;
  eventType: string;
  eventCategory: VehicleTimelineEventCategory;
  sourceType: VehicleTimelineSourceType;
  sourceId: string;
  occurredAt: Date;
  verified: boolean;
  inspectionId: string | null;
  actorUserId: string | null;
  notes: string | null;
  dedupeKey: string;
  createdAt: Date;
  updatedAt: Date;
};

type JobOrderSourceType = (typeof jobOrderSourceTypeEnum.enumValues)[number];
type JobOrderType = (typeof jobOrderTypeEnum.enumValues)[number];
type JobOrderStatus = (typeof jobOrderStatusEnum.enumValues)[number];
type JobOrderProgressEntryType = (typeof jobOrderProgressEntryTypeEnum.enumValues)[number];
type JobOrderInvoicePaymentStatus = (typeof jobOrderInvoicePaymentStatusEnum.enumValues)[number];
type JobOrderInvoicePaymentMethod = (typeof jobOrderInvoicePaymentMethodEnum.enumValues)[number];

type JobOrderRecord = {
  id: string;
  sourceType: JobOrderSourceType;
  sourceId: string;
  jobType: JobOrderType;
  parentJobOrderId: string | null;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  status: JobOrderStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type JobOrderItemRecord = {
  id: string;
  jobOrderId: string;
  name: string;
  description: string | null;
  estimatedHours: number | null;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type JobOrderAssignmentRecord = {
  id: string;
  jobOrderId: string;
  technicianUserId: string;
  assignedAt: Date;
};

type JobOrderProgressEntryRecord = {
  id: string;
  jobOrderId: string;
  technicianUserId: string;
  entryType: JobOrderProgressEntryType;
  message: string;
  completedItemIds: string[];
  createdAt: Date;
};

type JobOrderPhotoRecord = {
  id: string;
  jobOrderId: string;
  takenByUserId: string;
  fileName: string;
  fileUrl: string;
  caption: string | null;
  createdAt: Date;
};

type JobOrderInvoiceRecord = {
  id: string;
  jobOrderId: string;
  invoiceReference: string;
  sourceType: JobOrderSourceType;
  sourceId: string;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  finalizedByUserId: string;
  paymentStatus: JobOrderInvoicePaymentStatus;
  amountPaidCents: number | null;
  paymentMethod: JobOrderInvoicePaymentMethod | null;
  paymentReference: string | null;
  paidAt: Date | null;
  recordedByUserId: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StaffAdminAuditAction = 'staff_account_provisioned' | 'staff_account_status_changed';

type StaffAdminAuditLogRecord = {
  id: string;
  action: StaffAdminAuditAction;
  actorUserId: string | null;
  actorRole: 'super_admin';
  targetUserId: string | null;
  targetRole: Exclude<UserRole, 'customer'>;
  targetEmail: string;
  targetStaffCode: string | null;
  previousIsActive: boolean | null;
  nextIsActive: boolean | null;
  reason: string | null;
  createdAt: Date;
};

type VehicleLifecycleSummaryStatus = (typeof vehicleLifecycleSummaryStatusEnum.enumValues)[number];

type VehicleLifecycleSummaryRecord = {
  id: string;
  vehicleId: string;
  requestedByUserId: string;
  summaryText: string;
  status: VehicleLifecycleSummaryStatus;
  generationJob: AiWorkerJobMetadata | null;
  customerVisible: boolean;
  customerVisibleAt: Date | null;
  reviewNotes: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  provenance: VehicleLifecycleSummaryProvenance;
  createdAt: Date;
  updatedAt: Date;
};

type QualityGateStatus = (typeof qualityGateStatusEnum.enumValues)[number];
type QualityGateFindingGate = (typeof qualityGateFindingGateEnum.enumValues)[number];
type QualityGateFindingSeverity = (typeof qualityGateFindingSeverityEnum.enumValues)[number];

type QualityGateRecord = {
  id: string;
  jobOrderId: string;
  status: QualityGateStatus;
  riskScore: number;
  blockingReason: string | null;
  auditJob: AiWorkerJobMetadata | null;
  lastAuditRequestedAt: Date;
  lastAuditCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type QualityGateFindingRecord = {
  id: string;
  qualityGateId: string;
  gate: QualityGateFindingGate;
  severity: QualityGateFindingSeverity;
  code: string;
  message: string;
  provenance: QualityGateFindingProvenance | null;
  createdAt: Date;
};

type QualityGateOverrideRecord = {
  id: string;
  qualityGateId: string;
  actorUserId: string;
  actorRole: UserRole;
  reason: string;
  createdAt: Date;
};

type AnalyticsSnapshotType =
  | 'dashboard'
  | 'operations'
  | 'back_jobs'
  | 'loyalty'
  | 'invoice_aging'
  | 'audit_trail';
type AnalyticsRefreshJobStatus = 'processing' | 'completed' | 'failed';
type AnalyticsRefreshTriggerSource = 'bootstrap_read' | 'manual_refresh' | 'integration_refresh';

type AnalyticsRefreshJobRecord = {
  id: string;
  snapshotTypes: AnalyticsSnapshotType[];
  triggerSource: AnalyticsRefreshTriggerSource;
  requestedByUserId: string | null;
  status: AnalyticsRefreshJobStatus;
  sourceCounts: Record<string, number>;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AnalyticsSnapshotRecord = {
  id: string;
  snapshotType: AnalyticsSnapshotType;
  version: string;
  payload: Record<string, unknown>;
  sourceCounts: Record<string, number>;
  refreshJobId: string | null;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type LoyaltyTransactionType = (typeof loyaltyTransactionTypeEnum.enumValues)[number];
type LoyaltySourceType = (typeof loyaltySourceTypeEnum.enumValues)[number];
type RewardStatus = (typeof rewardStatusEnum.enumValues)[number];
type RewardType = (typeof rewardTypeEnum.enumValues)[number];
type EarningRuleStatus = (typeof earningRuleStatusEnum.enumValues)[number];
type EarningRuleFormulaType = (typeof earningRuleFormulaTypeEnum.enumValues)[number];
type EarningRuleAccrualSource = (typeof earningRuleAccrualSourceEnum.enumValues)[number];
type RewardCatalogAuditAction = (typeof rewardCatalogAuditActionEnum.enumValues)[number];
type EarningRuleAuditAction = (typeof earningRuleAuditActionEnum.enumValues)[number];

type LoyaltyAccountRecord = {
  id: string;
  userId: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  lastAccruedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type LoyaltyTransactionRecord = {
  id: string;
  loyaltyAccountId: string;
  transactionType: LoyaltyTransactionType;
  sourceType: LoyaltySourceType;
  sourceReference: string;
  idempotencyKey: string | null;
  policyKey: string | null;
  pointsDelta: number;
  resultingBalance: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

type RewardRecord = {
  id: string;
  name: string;
  description: string | null;
  fulfillmentNote: string | null;
  rewardType: RewardType;
  pointsCost: number;
  discountPercent: number | null;
  status: RewardStatus;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RewardCatalogAuditRecord = {
  id: string;
  rewardId: string;
  actorUserId: string;
  action: RewardCatalogAuditAction;
  reason: string | null;
  snapshot: RewardCatalogSnapshot;
  createdAt: Date;
};

type EarningRuleRecord = {
  id: string;
  name: string;
  description: string | null;
  accrualSource: EarningRuleAccrualSource;
  formulaType: EarningRuleFormulaType;
  flatPoints: number | null;
  amountStepCents: number | null;
  pointsPerStep: number | null;
  minimumAmountCents: number | null;
  eligibleServiceTypes: string[];
  eligibleServiceCategories: string[];
  eligibleProductIds: string[];
  eligibleProductCategoryIds: string[];
  promoLabel: string | null;
  manualBenefitNote: string | null;
  activeFrom: Date | null;
  activeUntil: Date | null;
  status: EarningRuleStatus;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EarningRuleAuditRecord = {
  id: string;
  earningRuleId: string;
  actorUserId: string;
  action: EarningRuleAuditAction;
  reason: string | null;
  snapshot: LoyaltyEarningRuleSnapshot;
  createdAt: Date;
};

type RewardRedemptionRecord = {
  id: string;
  loyaltyAccountId: string;
  rewardId: string;
  transactionId: string;
  redeemedByUserId: string;
  rewardNameSnapshot: string;
  pointsCostSnapshot: number;
  note: string | null;
  createdAt: Date;
};

type BackJobStatus = (typeof backJobStatusEnum.enumValues)[number];
type BackJobFindingSeverity = (typeof backJobFindingSeverityEnum.enumValues)[number];

type BackJobRecord = {
  id: string;
  customerUserId: string;
  vehicleId: string;
  originalBookingId: string | null;
  originalJobOrderId: string;
  returnInspectionId: string | null;
  reworkJobOrderId: string | null;
  complaint: string;
  status: BackJobStatus;
  reviewNotes: string | null;
  resolutionNotes: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type BackJobFindingRecord = {
  id: string;
  backJobId: string;
  category: string;
  label: string;
  severity: BackJobFindingSeverity;
  notes: string | null;
  isValidated: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type InsuranceInquiryType = (typeof insuranceInquiryTypeEnum.enumValues)[number];
type InsuranceInquiryStatus = (typeof insuranceInquiryStatusEnum.enumValues)[number];
type InsuranceDocumentType = (typeof insuranceDocumentTypeEnum.enumValues)[number];

type InsuranceInquiryRecord = {
  id: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  subject: string;
  description: string;
  providerName: string | null;
  policyNumber: string | null;
  notes: string | null;
  status: InsuranceInquiryStatus;
  reviewNotes: string | null;
  createdByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type InsuranceDocumentRecord = {
  id: string;
  inquiryId: string;
  fileName: string;
  fileUrl: string;
  documentType: InsuranceDocumentType;
  notes: string | null;
  uploadedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type InsuranceRecordRecord = {
  id: string;
  inquiryId: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  providerName: string | null;
  policyNumber: string | null;
  status: InsuranceInquiryStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ChatbotIntentType = 'faq' | 'lookup';
type ChatbotIntentVisibility = 'all' | 'staff_only';
type ChatbotLookupType = 'booking_status' | 'insurance_status';
type ChatbotConversationResponseType = 'answer' | 'lookup' | 'escalation';
type ChatbotEscalationStatus = 'open' | 'reviewed';

type ChatbotLookupPayloadRecord = {
  lookupType: ChatbotLookupType;
  referenceId: string | null;
  status: string | null;
  message: string;
};

type ChatbotIntentRecord = {
  id: string;
  intentKey: string;
  label: string;
  description: string;
  intentType: ChatbotIntentType;
  responseTemplate: string;
  lookupType: ChatbotLookupType | null;
  visibility: ChatbotIntentVisibility;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ChatbotRuleRecord = {
  id: string;
  ruleKey: string;
  intentId: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ChatbotEscalationRecord = {
  id: string;
  userId: string;
  intentId: string | null;
  prompt: string;
  reason: string;
  status: ChatbotEscalationStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ChatbotConversationRecord = {
  id: string;
  userId: string;
  intentId: string | null;
  prompt: string;
  responseType: ChatbotConversationResponseType;
  responseText: string;
  lookupPayload: ChatbotLookupPayloadRecord | null;
  escalationId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];
type NotificationCategory = (typeof notificationCategoryEnum.enumValues)[number];
type NotificationStatus = (typeof notificationStatusEnum.enumValues)[number];
type NotificationSourceType = (typeof notificationSourceTypeEnum.enumValues)[number];
type ReminderRuleStatus = (typeof reminderRuleStatusEnum.enumValues)[number];
type NotificationAttemptStatus = (typeof notificationAttemptStatusEnum.enumValues)[number];

type NotificationPreferenceRecord = {
  id: string;
  userId: string;
  emailEnabled: boolean;
  bookingRemindersEnabled: boolean;
  insuranceUpdatesEnabled: boolean;
  invoiceRemindersEnabled: boolean;
  serviceFollowUpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type NotificationRecord = {
  id: string;
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  sourceType: NotificationSourceType;
  sourceId: string;
  title: string;
  message: string;
  status: NotificationStatus;
  dedupeKey: string;
  scheduledFor: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReminderRuleRecord = {
  id: string;
  userId: string;
  reminderType: NotificationCategory;
  channel: NotificationChannel;
  sourceType: NotificationSourceType;
  sourceId: string;
  scheduledFor: Date;
  status: ReminderRuleStatus;
  dedupeKey: string;
  createdAt: Date;
  updatedAt: Date;
};

type NotificationDeliveryAttemptRecord = {
  id: string;
  notificationId: string;
  attemptNumber: number;
  status: NotificationAttemptStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  attemptedAt: Date;
};

const cloneUser = (user: UserRecord | null | undefined) => {
  if (!user) {
    return user ?? null;
  }

  return {
    ...user,
    profile: { ...user.profile },
    addresses: user.addresses.map((address) => ({ ...address })),
  };
};

const cloneBooking = (
  booking: BookingRecord | null | undefined,
  servicesById: Map<string, ServiceRecord>,
  timeSlotsById: Map<string, TimeSlotRecord>,
  bookingServicesList: BookingServiceRecord[],
  bookingStatusHistoryList: BookingStatusHistoryRecord[],
  user?: UserRecord | null,
  vehicle?: VehicleRecord | null,
) => {
  if (!booking) {
    return booking ?? null;
  }

  return {
    ...booking,
    user: cloneUser(user),
    vehicle: vehicle ? { ...vehicle } : null,
    timeSlot: { ...timeSlotsById.get(booking.timeSlotId)! },
    requestedServices: bookingServicesList
      .filter((entry) => entry.bookingId === booking.id)
      .map((entry) => ({
        ...entry,
        service: { ...servicesById.get(entry.serviceId)! },
      })),
    statusHistory: bookingStatusHistoryList
      .filter((entry) => entry.bookingId === booking.id)
      .sort((left, right) => right.changedAt.getTime() - left.changedAt.getTime())
      .map((entry) => ({ ...entry })),
  };
};

const cloneJobOrder = (
  jobOrder: JobOrderRecord | null | undefined,
  items: JobOrderItemRecord[],
  assignments: JobOrderAssignmentRecord[],
  progressEntries: JobOrderProgressEntryRecord[],
  photos: JobOrderPhotoRecord[],
  invoiceRecords: JobOrderInvoiceRecord[],
) => {
  if (!jobOrder) {
    return jobOrder ?? null;
  }

  return {
    ...jobOrder,
    items: items
      .filter((item) => item.jobOrderId === jobOrder.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => ({ ...item })),
    assignments: assignments
      .filter((assignment) => assignment.jobOrderId === jobOrder.id)
      .sort((left, right) => left.assignedAt.getTime() - right.assignedAt.getTime())
      .map((assignment) => ({ ...assignment })),
    progressEntries: progressEntries
      .filter((entry) => entry.jobOrderId === jobOrder.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((entry) => ({ ...entry })),
    photos: photos
      .filter((photo) => photo.jobOrderId === jobOrder.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((photo) => ({ ...photo })),
    invoiceRecord:
      invoiceRecords
        .filter((record) => record.jobOrderId === jobOrder.id)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((record) => ({ ...record }))[0] ?? null,
  };
};

const cloneQualityGate = (
  qualityGate: QualityGateRecord | null | undefined,
  findings: QualityGateFindingRecord[],
  overrides: QualityGateOverrideRecord[],
) => {
  if (!qualityGate) {
    return qualityGate ?? null;
  }

  return {
    ...qualityGate,
    auditJob: qualityGate.auditJob ? { ...qualityGate.auditJob } : null,
    findings: findings
      .filter((finding) => finding.qualityGateId === qualityGate.id)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((finding) => ({ ...finding, provenance: finding.provenance ? { ...finding.provenance } : null })),
    overrides: overrides
      .filter((override) => override.qualityGateId === qualityGate.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((override) => ({ ...override })),
  };
};

const cloneBackJob = (
  backJob: BackJobRecord | null | undefined,
  findings: BackJobFindingRecord[],
) => {
  if (!backJob) {
    return backJob ?? null;
  }

  return {
    ...backJob,
    findings: findings
      .filter((finding) => finding.backJobId === backJob.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((finding) => ({ ...finding })),
  };
};

const cloneInsuranceInquiry = (
  inquiry: InsuranceInquiryRecord | null | undefined,
  documents: InsuranceDocumentRecord[],
) => {
  if (!inquiry) {
    return inquiry ?? null;
  }

  return {
    ...inquiry,
    documents: documents
      .filter((document) => document.inquiryId === inquiry.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((document) => ({ ...document })),
  };
};

const cloneNotification = (
  notification: NotificationRecord | null | undefined,
  attempts: NotificationDeliveryAttemptRecord[],
) => {
  if (!notification) {
    return notification ?? null;
  }

  return {
    ...notification,
    attempts: attempts
      .filter((attempt) => attempt.notificationId === notification.id)
      .sort((left, right) => right.attemptedAt.getTime() - left.attemptedAt.getTime())
      .map((attempt) => ({ ...attempt })),
  };
};

class InMemoryUsersRepository {
  private readonly users = new Map<string, UserRecord>();

  peekById(id: string) {
    return this.users.get(id) ?? null;
  }

  async create(createUserDto: CreateUserDto & { role?: UserRole; staffCode?: string }) {
    const now = new Date();
    const userId = randomUUID();

    const user: UserRecord = {
      id: userId,
      email: createUserDto.email,
      role: (createUserDto.role ?? 'customer') as UserRole,
      staffCode: createUserDto.staffCode ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      profile: {
        id: randomUUID(),
        userId,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone ?? null,
        birthday: null,
        createdAt: now,
        updatedAt: now,
      },
      addresses: [],
    };

    this.users.set(userId, user);
    return cloneUser(user);
  }

  async findById(id: string) {
    return cloneUser(this.users.get(id));
  }

  async findByEmail(email: string) {
    const user = Array.from(this.users.values()).find((entry) => entry.email === email);
    return cloneUser(user);
  }

  async findByStaffCode(staffCode: string) {
    const user = Array.from(this.users.values()).find((entry) => entry.staffCode === staffCode);
    return cloneUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.updatedAt = new Date();

    user.profile = {
      ...user.profile,
      firstName: updateUserDto.firstName ?? user.profile.firstName,
      lastName: updateUserDto.lastName ?? user.profile.lastName,
      phone: updateUserDto.phone ?? user.profile.phone,
      birthday: updateUserDto.birthday ?? user.profile.birthday,
      updatedAt: new Date(),
    };

    this.users.set(id, user);
    return cloneUser(user);
  }

  async updateActivationStatus(id: string, isActive: boolean) {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = isActive;
    user.updatedAt = new Date();
    this.users.set(id, user);
    return cloneUser(user);
  }

  async addAddress(userId: string, payload: UpsertAddressDto) {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (payload.isDefault) {
      user.addresses = user.addresses.map((address) => ({
        ...address,
        isDefault: false,
        updatedAt: new Date(),
      }));
    }

    const now = new Date();
    const address: AddressRecord = {
      id: randomUUID(),
      userId,
      label: payload.label ?? null,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2 ?? null,
      city: payload.city,
      province: payload.province,
      postalCode: payload.postalCode ?? null,
      isDefault: payload.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    user.addresses.unshift(address);
    this.users.set(userId, user);
    return { ...address };
  }

  async updateAddress(userId: string, addressId: string, payload: UpdateAddressDto) {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException('Address not found');
    }

    const addressIndex = user.addresses.findIndex((address) => address.id === addressId);
    if (addressIndex === -1) {
      throw new NotFoundException('Address not found');
    }

    if (payload.isDefault) {
      user.addresses = user.addresses.map((address) => ({
        ...address,
        isDefault: false,
        updatedAt: new Date(),
      }));
    }

    const currentAddress = user.addresses[addressIndex];
    const updatedAddress: AddressRecord = {
      ...currentAddress,
      ...payload,
      label: payload.label ?? currentAddress.label,
      addressLine1: payload.addressLine1 ?? currentAddress.addressLine1,
      addressLine2: payload.addressLine2 ?? currentAddress.addressLine2,
      city: payload.city ?? currentAddress.city,
      province: payload.province ?? currentAddress.province,
      postalCode: payload.postalCode ?? currentAddress.postalCode,
      isDefault: payload.isDefault ?? currentAddress.isDefault,
      updatedAt: new Date(),
    };

    user.addresses[addressIndex] = updatedAddress;
    this.users.set(userId, user);
    return { ...updatedAddress };
  }
}

class InMemoryAuthRepository {
  private readonly accounts = new Map<string, AuthAccountRecord>();
  private readonly googleIdentities = new Map<string, AuthGoogleIdentityRecord>();
  private readonly otpChallenges = new Map<string, AuthOtpChallengeRecord>();
  private readonly refreshTokens: RefreshTokenRecord[] = [];
  private readonly staffAdminAuditLogs: StaffAdminAuditLogRecord[] = [];
  private readonly loginAuditLogs: Array<{
    userId?: string;
    email: string;
    ipAddress?: string;
    wasSuccessful: boolean;
  }> = [];

  constructor(private readonly usersRepository: InMemoryUsersRepository) {}

  async createAccount(userId: string, passwordHash: string) {
    const now = new Date();
    const account: AuthAccountRecord = {
      id: randomUUID(),
      userId,
      passwordHash,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.accounts.set(userId, account);
    return { ...account };
  }

  async findAccountByUserId(userId: string) {
    const account = this.accounts.get(userId);
    return account ? { ...account } : null;
  }

  async updateAccountStatus(userId: string, isActive: boolean) {
    const account = this.accounts.get(userId);
    if (!account) {
      return null;
    }

    account.isActive = isActive;
    account.updatedAt = new Date();
    this.accounts.set(userId, account);
    return { ...account };
  }

  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    const now = new Date();
    this.refreshTokens.forEach((token) => {
      if (token.userId === userId && token.revokedAt === null) {
        token.revokedAt = now;
        token.updatedAt = now;
      }
    });

    const token: RefreshTokenRecord = {
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.refreshTokens.push(token);
    return { ...token };
  }

  async findLatestActiveRefreshToken(userId: string) {
    const token = [...this.refreshTokens]
      .filter((entry) => entry.userId === userId && entry.revokedAt === null)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

    return token ? { ...token } : null;
  }

  async revokeActiveRefreshTokens(userId: string) {
    const now = new Date();
    this.refreshTokens.forEach((token) => {
      if (token.userId === userId && token.revokedAt === null) {
        token.revokedAt = now;
        token.updatedAt = now;
      }
    });
  }

  async logLoginAttempt(payload: {
    userId?: string;
    email: string;
    ipAddress?: string;
    wasSuccessful: boolean;
  }) {
    this.loginAuditLogs.push(payload);
  }

  async findGoogleIdentityByProviderUserId(providerUserId: string) {
    const identity = Array.from(this.googleIdentities.values()).find(
      (entry) => entry.providerUserId === providerUserId,
    );
    return identity ? { ...identity } : null;
  }

  async findGoogleIdentityByEmail(email: string) {
    const identity = Array.from(this.googleIdentities.values()).find(
      (entry) => entry.email === email,
    );
    return identity ? { ...identity } : null;
  }

  async createGoogleIdentity(payload: { userId: string; providerUserId: string; email: string }) {
    const record: AuthGoogleIdentityRecord = {
      id: randomUUID(),
      userId: payload.userId,
      providerUserId: payload.providerUserId,
      email: payload.email,
      createdAt: new Date(),
    };

    this.googleIdentities.set(record.id, record);
    return { ...record };
  }

  async createOtpChallenge(payload: {
    userId: string;
    purpose: 'customer_signup' | 'staff_activation';
    email: string;
    otpHash: string;
    expiresAt: Date;
  }) {
    const record: AuthOtpChallengeRecord = {
      id: randomUUID(),
      userId: payload.userId,
      purpose: payload.purpose,
      email: payload.email,
      otpHash: payload.otpHash,
      expiresAt: payload.expiresAt,
      consumedAt: null,
      attempts: 0,
      createdAt: new Date(),
    };

    this.otpChallenges.set(record.id, record);
    return { ...record };
  }

  async findOtpChallengeById(id: string) {
    const record = this.otpChallenges.get(id);
    return record ? { ...record } : null;
  }

  async incrementOtpAttempts(id: string, attempts: number) {
    const record = this.otpChallenges.get(id);
    if (!record) {
      return null;
    }

    const updatedRecord: AuthOtpChallengeRecord = {
      ...record,
      attempts,
    };

    this.otpChallenges.set(id, updatedRecord);
    return { ...updatedRecord };
  }

  async consumeOtpChallenge(id: string) {
    const record = this.otpChallenges.get(id);
    if (!record) {
      return null;
    }

    const updatedRecord: AuthOtpChallengeRecord = {
      ...record,
      consumedAt: new Date(),
    };

    this.otpChallenges.set(id, updatedRecord);
    return { ...updatedRecord };
  }

  async createStaffAdminAuditLog(payload: {
    action: StaffAdminAuditAction;
    actorUserId: string;
    actorRole: 'super_admin';
    targetUserId: string;
    targetRole: Exclude<UserRole, 'customer'>;
    targetEmail: string;
    targetStaffCode?: string | null;
    previousIsActive?: boolean | null;
    nextIsActive?: boolean | null;
    reason?: string | null;
  }) {
    const record: StaffAdminAuditLogRecord = {
      id: randomUUID(),
      action: payload.action,
      actorUserId: payload.actorUserId,
      actorRole: payload.actorRole,
      targetUserId: payload.targetUserId,
      targetRole: payload.targetRole,
      targetEmail: payload.targetEmail,
      targetStaffCode: payload.targetStaffCode ?? null,
      previousIsActive: payload.previousIsActive ?? null,
      nextIsActive: payload.nextIsActive ?? null,
      reason: payload.reason ?? null,
      createdAt: new Date(),
    };

    this.staffAdminAuditLogs.push(record);
    return { ...record };
  }

  async listStaffAdminAuditLogsForAnalytics() {
    return [...this.staffAdminAuditLogs]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((auditLog) => ({ ...auditLog }));
  }

  async softDeleteUserAccount(payload: { userId: string; email: string }) {
    const user = this.usersRepository.peekById(payload.userId);
    if (user) {
      const archivedAt = new Date();
      user.email = `deleted+${payload.userId}@autocare.local`;
      user.deletedEmail = payload.email;
      user.deletedAt = archivedAt;
      user.isActive = false;
      user.updatedAt = archivedAt;
    }

    await this.updateAccountStatus(payload.userId, false);
    await this.revokeActiveRefreshTokens(payload.userId);

    Array.from(this.googleIdentities.entries()).forEach(([id, identity]) => {
      if (identity.userId === payload.userId) {
        this.googleIdentities.delete(id);
      }
    });
  }
}

class InMemoryVehiclesRepository {
  private readonly vehicles = new Map<string, VehicleRecord>();

  peekById(id: string) {
    return this.vehicles.get(id) ?? null;
  }

  async create(createVehicleDto: CreateVehicleDto) {
    const now = new Date();
    const vehicle: VehicleRecord = {
      id: randomUUID(),
      userId: createVehicleDto.userId,
      plateNumber: createVehicleDto.plateNumber,
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      year: createVehicleDto.year,
      color: createVehicleDto.color ?? null,
      vin: createVehicleDto.vin ?? null,
      notes: createVehicleDto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.vehicles.set(vehicle.id, vehicle);
    return { ...vehicle };
  }

  async findById(id: string) {
    const vehicle = this.vehicles.get(id);
    return vehicle ? { ...vehicle } : null;
  }

  async findByPlateNumber(plateNumber: string) {
    const vehicle = Array.from(this.vehicles.values()).find((entry) => entry.plateNumber === plateNumber);
    return vehicle ? { ...vehicle } : null;
  }

  async findByUserId(userId: string) {
    return Array.from(this.vehicles.values())
      .filter((vehicle) => vehicle.userId === userId)
      .map((vehicle) => ({ ...vehicle }));
  }

  async findOwnedByUser(vehicleId: string, userId: string) {
    const vehicle = Array.from(this.vehicles.values()).find(
      (entry) => entry.id === vehicleId && entry.userId === userId,
    );

    return vehicle ? { ...vehicle } : null;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const updatedVehicle: VehicleRecord = {
      ...vehicle,
      ...updateVehicleDto,
      updatedAt: new Date(),
    };

    this.vehicles.set(id, updatedVehicle);
    return { ...updatedVehicle };
  }
}

class InMemoryBookingsRepository {
  constructor(
    private readonly usersRepository: InMemoryUsersRepository,
    private readonly vehiclesRepository: InMemoryVehiclesRepository,
  ) {
    const now = new Date();

    const serviceOne: ServiceRecord = {
      id: randomUUID(),
      categoryId: null,
      name: 'Oil Change',
      description: 'Replace oil and inspect basic consumables.',
      durationMinutes: 45,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const serviceTwo: ServiceRecord = {
      id: randomUUID(),
      categoryId: null,
      name: 'Brake Inspection',
      description: 'Inspect brake pads, discs, and fluid condition.',
      durationMinutes: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const slotOne: TimeSlotRecord = {
      id: randomUUID(),
      label: 'Morning Slot',
      startTime: '09:00',
      endTime: '10:00',
      capacity: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const slotTwo: TimeSlotRecord = {
      id: randomUUID(),
      label: 'Afternoon Slot',
      startTime: '14:00',
      endTime: '15:00',
      capacity: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.services.set(serviceOne.id, serviceOne);
    this.services.set(serviceTwo.id, serviceTwo);
    this.timeSlots.set(slotOne.id, slotOne);
    this.timeSlots.set(slotTwo.id, slotTwo);
  }

  private readonly services = new Map<string, ServiceRecord>();
  private readonly timeSlots = new Map<string, TimeSlotRecord>();
  private readonly bookings = new Map<string, BookingRecord>();
  private readonly bookingServices: BookingServiceRecord[] = [];
  private readonly bookingStatusHistory: BookingStatusHistoryRecord[] = [];

  async listServices() {
    return Array.from(this.services.values())
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((service) => ({ ...service }));
  }

  async listTimeSlots() {
    return Array.from(this.timeSlots.values())
      .sort((left, right) => left.startTime.localeCompare(right.startTime))
      .map((slot) => ({ ...slot }));
  }

  async findServiceIds(serviceIds: string[]) {
    return serviceIds
      .map((id) => this.services.get(id))
      .filter((service): service is ServiceRecord => Boolean(service && service.isActive))
      .map((service) => ({ id: service.id }));
  }

  async findTimeSlotById(id: string) {
    const slot = this.timeSlots.get(id);
    return slot ? { ...slot } : null;
  }

  async createTimeSlot(payload: {
    label: string;
    startTime: string;
    endTime: string;
    capacity: number;
    isActive?: boolean;
  }) {
    const now = new Date();
    const timeSlot: TimeSlotRecord = {
      id: randomUUID(),
      label: payload.label.trim(),
      startTime: payload.startTime,
      endTime: payload.endTime,
      capacity: payload.capacity,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.timeSlots.set(timeSlot.id, timeSlot);
    return { ...timeSlot };
  }

  async updateTimeSlot(
    id: string,
    payload: {
      label?: string;
      startTime?: string;
      endTime?: string;
      capacity?: number;
      isActive?: boolean;
    },
  ) {
    const slot = this.timeSlots.get(id);
    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }

    const updatedTimeSlot: TimeSlotRecord = {
      ...slot,
      ...(payload.label !== undefined ? { label: payload.label.trim() } : {}),
      ...(payload.startTime !== undefined ? { startTime: payload.startTime } : {}),
      ...(payload.endTime !== undefined ? { endTime: payload.endTime } : {}),
      ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      updatedAt: new Date(),
    };

    this.timeSlots.set(id, updatedTimeSlot);
    return { ...updatedTimeSlot };
  }

  async countActiveBookingsForSlot(timeSlotId: string, scheduledDate: string, excludeBookingId?: string) {
    return Array.from(this.bookings.values()).filter((booking) => {
      const isActiveStatus = ['pending', 'confirmed', 'rescheduled'].includes(booking.status);
      const isExcluded = excludeBookingId ? booking.id === excludeBookingId : false;

      return (
        !isExcluded &&
        isActiveStatus &&
        booking.timeSlotId === timeSlotId &&
        booking.scheduledDate === scheduledDate
      );
    }).length;
  }

  async findByScheduledDateRange(
    startDate: string,
    endDate: string,
    options?: {
      timeSlotId?: string;
      statuses?: BookingStatus[];
    },
  ) {
    return Array.from(this.bookings.values())
      .filter((booking) => {
        const matchesWindow = booking.scheduledDate >= startDate && booking.scheduledDate <= endDate;
        const matchesSlot = options?.timeSlotId ? booking.timeSlotId === options.timeSlotId : true;
        const matchesStatus = options?.statuses?.length
          ? options.statuses.includes(booking.status)
          : true;

        return matchesWindow && matchesSlot && matchesStatus;
      })
      .sort((left, right) => {
        if (left.scheduledDate !== right.scheduledDate) {
          return left.scheduledDate.localeCompare(right.scheduledDate);
        }

        return left.createdAt.getTime() - right.createdAt.getTime();
      })
      .map((booking) => ({
        id: booking.id,
        timeSlotId: booking.timeSlotId,
        scheduledDate: booking.scheduledDate,
        status: booking.status,
      }));
  }

  async create(createBookingDto: CreateBookingDto) {
    const now = new Date();
    const booking: BookingRecord = {
      id: randomUUID(),
      userId: createBookingDto.userId,
      vehicleId: createBookingDto.vehicleId,
      timeSlotId: createBookingDto.timeSlotId,
      scheduledDate: createBookingDto.scheduledDate,
      status: 'pending',
      notes: createBookingDto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.bookings.set(booking.id, booking);
    createBookingDto.serviceIds.forEach((serviceId) => {
      this.bookingServices.push({
        id: randomUUID(),
        bookingId: booking.id,
        serviceId,
        createdAt: now,
      });
    });

    this.bookingStatusHistory.push({
      id: randomUUID(),
      bookingId: booking.id,
      previousStatus: null,
      nextStatus: 'pending',
      reason: 'Booking created',
      changedByUserId: createBookingDto.userId,
      changedAt: now,
    });

    return this.findById(booking.id);
  }

  async findById(id: string) {
    const booking = this.bookings.get(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return cloneBooking(
      booking,
      this.services,
      this.timeSlots,
      this.bookingServices,
      this.bookingStatusHistory,
      this.usersRepository.peekById(booking.userId),
      this.vehiclesRepository.peekById(booking.vehicleId),
    );
  }

  async findOptionalById(id: string) {
    const booking = this.bookings.get(id);
    return cloneBooking(
      booking,
      this.services,
      this.timeSlots,
      this.bookingServices,
      this.bookingStatusHistory,
      booking ? this.usersRepository.peekById(booking.userId) : null,
      booking ? this.vehiclesRepository.peekById(booking.vehicleId) : null,
    );
  }

  async findByUserId(userId: string) {
    return Array.from(this.bookings.values())
      .filter((booking) => booking.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((booking) =>
        cloneBooking(
          booking,
          this.services,
          this.timeSlots,
          this.bookingServices,
          this.bookingStatusHistory,
          this.usersRepository.peekById(booking.userId),
          this.vehiclesRepository.peekById(booking.vehicleId),
        ),
      );
  }

  async findByVehicleId(vehicleId: string) {
    return Array.from(this.bookings.values())
      .filter((booking) => booking.vehicleId === vehicleId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((booking) =>
        cloneBooking(
          booking,
          this.services,
          this.timeSlots,
          this.bookingServices,
          this.bookingStatusHistory,
          this.usersRepository.peekById(booking.userId),
          this.vehiclesRepository.peekById(booking.vehicleId),
        ),
      );
  }

  async listForAnalytics() {
    return Array.from(this.bookings.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((booking) =>
        cloneBooking(
          booking,
          this.services,
          this.timeSlots,
          this.bookingServices,
          this.bookingStatusHistory,
          this.usersRepository.peekById(booking.userId),
          this.vehiclesRepository.peekById(booking.vehicleId),
        ),
      );
  }

  async findByScheduledDate(
    scheduledDate: string,
    options?: {
      timeSlotId?: string;
      statuses?: BookingStatus[];
    },
  ) {
    return Array.from(this.bookings.values())
      .filter((booking) => {
        const matchesDate = booking.scheduledDate === scheduledDate;
        const matchesSlot = options?.timeSlotId ? booking.timeSlotId === options.timeSlotId : true;
        const matchesStatus = options?.statuses?.length
          ? options.statuses.includes(booking.status)
          : true;

        return matchesDate && matchesSlot && matchesStatus;
      })
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((booking) =>
        cloneBooking(
          booking,
          this.services,
          this.timeSlots,
          this.bookingServices,
          this.bookingStatusHistory,
          this.usersRepository.peekById(booking.userId),
          this.vehiclesRepository.peekById(booking.vehicleId),
        ),
      );
  }

  async updateStatus(id: string, payload: UpdateBookingStatusCommand) {
    const booking = this.bookings.get(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updatedBooking: BookingRecord = {
      ...booking,
      status: payload.status,
      updatedAt: new Date(),
    };

    this.bookings.set(id, updatedBooking);
    this.bookingStatusHistory.push({
      id: randomUUID(),
      bookingId: id,
      previousStatus: booking.status,
      nextStatus: payload.status,
      reason: payload.reason ?? null,
      changedByUserId: payload.changedByUserId ?? null,
      changedAt: new Date(),
    });

    return this.findById(id);
  }

  async reschedule(id: string, payload: RescheduleBookingCommand) {
    const booking = this.bookings.get(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updatedBooking: BookingRecord = {
      ...booking,
      timeSlotId: payload.timeSlotId,
      scheduledDate: payload.scheduledDate,
      status: 'rescheduled',
      updatedAt: new Date(),
    };

    this.bookings.set(id, updatedBooking);
    this.bookingStatusHistory.push({
      id: randomUUID(),
      bookingId: id,
      previousStatus: booking.status,
      nextStatus: 'rescheduled',
      reason: payload.reason ?? null,
      changedByUserId: payload.changedByUserId ?? null,
      changedAt: new Date(),
    });

    return this.findById(id);
  }
}

class InMemoryJobOrdersRepository {
  private readonly jobOrders = new Map<string, JobOrderRecord>();
  private readonly items: JobOrderItemRecord[] = [];
  private readonly assignments: JobOrderAssignmentRecord[] = [];
  private readonly progressEntries: JobOrderProgressEntryRecord[] = [];
  private readonly photos: JobOrderPhotoRecord[] = [];
  private readonly invoiceRecords: JobOrderInvoiceRecord[] = [];

  async create(
    payload: Pick<
      CreateJobOrderDto,
      'sourceType' | 'sourceId' | 'customerUserId' | 'vehicleId' | 'serviceAdviserUserId' | 'serviceAdviserCode' | 'notes'
    > & {
      status: 'draft' | 'assigned';
      jobType: 'normal' | 'back_job';
      parentJobOrderId?: string | null;
      items: CreateJobOrderDto['items'];
      assignedTechnicianIds?: string[];
    },
  ) {
    const now = new Date();
    const jobOrder: JobOrderRecord = {
      id: randomUUID(),
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      jobType: payload.jobType,
      parentJobOrderId: payload.parentJobOrderId ?? null,
      customerUserId: payload.customerUserId,
      vehicleId: payload.vehicleId,
      serviceAdviserUserId: payload.serviceAdviserUserId,
      serviceAdviserCode: payload.serviceAdviserCode,
      status: payload.status,
      notes: payload.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.jobOrders.set(jobOrder.id, jobOrder);

    payload.items.forEach((item, index) => {
      this.items.push({
        id: randomUUID(),
        jobOrderId: jobOrder.id,
        name: item.name,
        description: item.description ?? null,
        estimatedHours: item.estimatedHours ?? null,
        isCompleted: false,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      });
    });

    payload.assignedTechnicianIds?.forEach((technicianUserId) => {
      this.assignments.push({
        id: randomUUID(),
        jobOrderId: jobOrder.id,
        technicianUserId,
        assignedAt: now,
      });
    });

    return this.findById(jobOrder.id);
  }

  async findById(id: string) {
    const jobOrder = this.jobOrders.get(id);
    if (!jobOrder) {
      throw new NotFoundException('Job order not found');
    }

    return cloneJobOrder(jobOrder, this.items, this.assignments, this.progressEntries, this.photos, this.invoiceRecords);
  }

  async findOptionalById(id: string) {
    return cloneJobOrder(
      this.jobOrders.get(id),
      this.items,
      this.assignments,
      this.progressEntries,
      this.photos,
      this.invoiceRecords,
    );
  }

  async findByVehicleId(vehicleId: string) {
    return Array.from(this.jobOrders.values())
      .filter((jobOrder) => jobOrder.vehicleId === vehicleId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((jobOrder) =>
        cloneJobOrder(jobOrder, this.items, this.assignments, this.progressEntries, this.photos, this.invoiceRecords),
      );
  }

  async listForAnalytics() {
    return Array.from(this.jobOrders.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((jobOrder) =>
        cloneJobOrder(jobOrder, this.items, this.assignments, this.progressEntries, this.photos, this.invoiceRecords),
      );
  }

  async hasBookingSource(sourceId: string) {
    return Array.from(this.jobOrders.values()).some(
      (jobOrder) => jobOrder.sourceType === 'booking' && jobOrder.sourceId === sourceId,
    );
  }

  async hasBackJobSource(sourceId: string) {
    return Array.from(this.jobOrders.values()).some(
      (jobOrder) => jobOrder.sourceType === 'back_job' && jobOrder.sourceId === sourceId,
    );
  }

  async updateStatus(id: string, payload: UpdateJobOrderStatusDto) {
    const jobOrder = this.jobOrders.get(id);
    if (!jobOrder) {
      throw new NotFoundException('Job order not found');
    }

    const updatedJobOrder: JobOrderRecord = {
      ...jobOrder,
      status: payload.status,
      updatedAt: new Date(),
    };

    this.jobOrders.set(id, updatedJobOrder);
    return this.findById(id);
  }

  async addProgressEntry(id: string, payload: AddJobOrderProgressDto, technicianUserId: string) {
    const jobOrder = this.jobOrders.get(id);
    if (!jobOrder) {
      throw new NotFoundException('Job order not found');
    }

    if (payload.completedItemIds?.length) {
      payload.completedItemIds.forEach((itemId) => {
        const index = this.items.findIndex((item) => item.jobOrderId === id && item.id === itemId);
        if (index >= 0) {
          this.items[index] = {
            ...this.items[index],
            isCompleted: true,
            updatedAt: new Date(),
          };
        }
      });
    }

    this.progressEntries.push({
      id: randomUUID(),
      jobOrderId: id,
      technicianUserId,
      entryType: payload.entryType,
      message: payload.message,
      completedItemIds: payload.completedItemIds ?? [],
      createdAt: new Date(),
    });

    return this.findById(id);
  }

  async addPhoto(id: string, payload: AddJobOrderPhotoDto, takenByUserId: string) {
    const jobOrder = this.jobOrders.get(id);
    if (!jobOrder) {
      throw new NotFoundException('Job order not found');
    }

    this.photos.push({
      id: randomUUID(),
      jobOrderId: id,
      takenByUserId,
      fileName: payload.fileName,
      fileUrl: payload.fileUrl,
      caption: payload.caption ?? null,
      createdAt: new Date(),
    });

    return this.findById(id);
  }

  async finalize(
    id: string,
    payload: FinalizeJobOrderDto & {
      finalizedByUserId: string;
      invoiceReference: string;
    },
  ) {
    const jobOrder = this.jobOrders.get(id);
    if (!jobOrder) {
      throw new NotFoundException('Job order not found');
    }

    const now = new Date();
    this.invoiceRecords.push({
      id: randomUUID(),
      jobOrderId: id,
      invoiceReference: payload.invoiceReference,
      sourceType: jobOrder.sourceType,
      sourceId: jobOrder.sourceId,
      customerUserId: jobOrder.customerUserId,
      vehicleId: jobOrder.vehicleId,
      serviceAdviserUserId: jobOrder.serviceAdviserUserId,
      serviceAdviserCode: jobOrder.serviceAdviserCode,
      finalizedByUserId: payload.finalizedByUserId,
      paymentStatus: 'pending_payment',
      amountPaidCents: null,
      paymentMethod: null,
      paymentReference: null,
      paidAt: null,
      recordedByUserId: null,
      summary: payload.summary ?? null,
      createdAt: now,
      updatedAt: now,
    });

    this.jobOrders.set(id, {
      ...jobOrder,
      status: 'finalized',
      updatedAt: now,
    });

    return this.findById(id);
  }

  async recordInvoicePayment(
    id: string,
    payload: RecordJobOrderInvoicePaymentDto & {
      receivedAt: Date;
      recordedByUserId: string;
    },
  ) {
    const invoiceRecord = this.invoiceRecords.find((record) => record.jobOrderId === id);
    if (!invoiceRecord) {
      throw new NotFoundException('Job order invoice record not found');
    }

    invoiceRecord.paymentStatus = 'paid';
    invoiceRecord.amountPaidCents = payload.amountPaidCents;
    invoiceRecord.paymentMethod = payload.paymentMethod;
    invoiceRecord.paymentReference = payload.reference ?? null;
    invoiceRecord.paidAt = payload.receivedAt;
    invoiceRecord.recordedByUserId = payload.recordedByUserId;
    invoiceRecord.updatedAt = new Date();

    return this.findById(id);
  }
}

class InMemoryQualityGatesRepository {
  private readonly qualityGates = new Map<string, QualityGateRecord>();
  private readonly findings: QualityGateFindingRecord[] = [];
  private readonly overrides: QualityGateOverrideRecord[] = [];

  async findByJobOrderId(jobOrderId: string) {
    const gate = Array.from(this.qualityGates.values()).find((entry) => entry.jobOrderId === jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    return cloneQualityGate(gate, this.findings, this.overrides);
  }

  async findOptionalByJobOrderId(jobOrderId: string) {
    const gate = Array.from(this.qualityGates.values()).find((entry) => entry.jobOrderId === jobOrderId);
    return cloneQualityGate(gate, this.findings, this.overrides);
  }

  async findByJobOrderIds(jobOrderIds: string[]) {
    const jobOrderIdSet = new Set(jobOrderIds);

    return Array.from(this.qualityGates.values())
      .filter((gate) => jobOrderIdSet.has(gate.jobOrderId))
      .sort((left, right) => left.lastAuditRequestedAt.getTime() - right.lastAuditRequestedAt.getTime())
      .map((gate) => cloneQualityGate(gate, this.findings, this.overrides));
  }

  async upsertPending(jobOrderId: string, auditJob: AiWorkerJobMetadata) {
    const existing = Array.from(this.qualityGates.values()).find((entry) => entry.jobOrderId === jobOrderId);
    const now = new Date();

    if (existing) {
      const updatedGate: QualityGateRecord = {
        ...existing,
        status: 'pending',
        riskScore: 0,
        blockingReason: null,
        auditJob: { ...auditJob },
        lastAuditRequestedAt: now,
        lastAuditCompletedAt: null,
        updatedAt: now,
      };

      this.qualityGates.set(existing.id, updatedGate);
      for (let index = this.findings.length - 1; index >= 0; index -= 1) {
        if (this.findings[index].qualityGateId === existing.id) {
          this.findings.splice(index, 1);
        }
      }

      return this.findByJobOrderId(jobOrderId);
    }

    const createdGate: QualityGateRecord = {
      id: randomUUID(),
      jobOrderId,
      status: 'pending',
      riskScore: 0,
      blockingReason: null,
      auditJob: { ...auditJob },
      lastAuditRequestedAt: now,
      lastAuditCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.qualityGates.set(createdGate.id, createdGate);
    return this.findByJobOrderId(jobOrderId);
  }

  async updateAuditJob(
    jobOrderId: string,
    auditJob: AiWorkerJobMetadata,
    options?: {
      blockingReason?: string | null;
      lastAuditCompletedAt?: Date | null;
    },
  ) {
    const gate = Array.from(this.qualityGates.values()).find((entry) => entry.jobOrderId === jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    this.qualityGates.set(gate.id, {
      ...gate,
      auditJob: { ...auditJob },
      blockingReason: options?.blockingReason ?? gate.blockingReason,
      lastAuditCompletedAt: options?.lastAuditCompletedAt ?? gate.lastAuditCompletedAt,
      updatedAt: new Date(),
    });

    return this.findByJobOrderId(jobOrderId);
  }

  async completeAudit(
    jobOrderId: string,
    payload: {
      status: QualityGateStatus;
      riskScore: number;
      blockingReason?: string | null;
      auditJob: AiWorkerJobMetadata;
      findings: Array<{
        gate: QualityGateFindingGate;
        severity: QualityGateFindingSeverity;
        code: string;
        message: string;
        provenance?: QualityGateFindingProvenance | null;
      }>;
    },
  ) {
    const gate = Array.from(this.qualityGates.values()).find((entry) => entry.jobOrderId === jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    const now = new Date();
    this.qualityGates.set(gate.id, {
      ...gate,
      status: payload.status,
      riskScore: payload.riskScore,
      blockingReason: payload.blockingReason ?? null,
      auditJob: { ...payload.auditJob },
      lastAuditCompletedAt: now,
      updatedAt: now,
    });

    for (let index = this.findings.length - 1; index >= 0; index -= 1) {
      if (this.findings[index].qualityGateId === gate.id) {
        this.findings.splice(index, 1);
      }
    }

    payload.findings.forEach((finding) => {
      this.findings.push({
        id: randomUUID(),
        qualityGateId: gate.id,
        gate: finding.gate,
        severity: finding.severity,
        code: finding.code,
        message: finding.message,
        provenance: finding.provenance ?? null,
        createdAt: now,
      });
    });

    return this.findByJobOrderId(jobOrderId);
  }

  async createOverride(
    jobOrderId: string,
    payload: {
      actorUserId: string;
      actorRole: 'technician' | 'service_adviser' | 'super_admin';
      reason: string;
    },
  ) {
    const gate = Array.from(this.qualityGates.values()).find((entry) => entry.jobOrderId === jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    const now = new Date();
    this.overrides.push({
      id: randomUUID(),
      qualityGateId: gate.id,
      actorUserId: payload.actorUserId,
      actorRole: payload.actorRole,
      reason: payload.reason,
      createdAt: now,
    });

    this.qualityGates.set(gate.id, {
      ...gate,
      status: 'overridden',
      updatedAt: now,
    });

    return this.findByJobOrderId(jobOrderId);
  }

  async listOverridesForAnalytics() {
    return [...this.overrides]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((override) => {
        const gate = this.qualityGates.get(override.qualityGateId);
        if (!gate) {
          throw new NotFoundException('Quality gate not found');
        }

        return {
          ...override,
          qualityGate: { ...gate },
        };
      });
  }
}

class InMemoryBackJobsRepository {
  private readonly backJobs = new Map<string, BackJobRecord>();
  private readonly findings: BackJobFindingRecord[] = [];

  async create(payload: CreateBackJobDto & { createdByUserId: string }) {
    const now = new Date();
    const backJob: BackJobRecord = {
      id: randomUUID(),
      customerUserId: payload.customerUserId,
      vehicleId: payload.vehicleId,
      originalBookingId: payload.originalBookingId ?? null,
      originalJobOrderId: payload.originalJobOrderId,
      returnInspectionId: payload.returnInspectionId ?? null,
      reworkJobOrderId: null,
      complaint: payload.complaint,
      status: 'reported',
      reviewNotes: payload.reviewNotes ?? null,
      resolutionNotes: null,
      createdByUserId: payload.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.backJobs.set(backJob.id, backJob);

    payload.findings?.forEach((finding) => {
      this.findings.push({
        id: randomUUID(),
        backJobId: backJob.id,
        category: finding.category,
        label: finding.label,
        severity: finding.severity ?? 'info',
        notes: finding.notes ?? null,
        isValidated: finding.isValidated ?? false,
        createdAt: now,
        updatedAt: now,
      });
    });

    return this.findById(backJob.id);
  }

  async findById(id: string) {
    const backJob = this.backJobs.get(id);
    if (!backJob) {
      throw new NotFoundException('Back job not found');
    }

    return cloneBackJob(backJob, this.findings);
  }

  async findOptionalById(id: string) {
    return cloneBackJob(this.backJobs.get(id), this.findings);
  }

  async findByVehicleId(vehicleId: string) {
    return Array.from(this.backJobs.values())
      .filter((backJob) => backJob.vehicleId === vehicleId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((backJob) => cloneBackJob(backJob, this.findings));
  }

  async listForAnalytics() {
    return Array.from(this.backJobs.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((backJob) => cloneBackJob(backJob, this.findings));
  }

  async updateStatus(id: string, payload: UpdateBackJobStatusDto) {
    const backJob = this.backJobs.get(id);
    if (!backJob) {
      throw new NotFoundException('Back job not found');
    }

    this.backJobs.set(id, {
      ...backJob,
      status: payload.status,
      returnInspectionId: payload.returnInspectionId ?? backJob.returnInspectionId,
      reviewNotes: payload.reviewNotes ?? backJob.reviewNotes,
      resolutionNotes: payload.resolutionNotes ?? backJob.resolutionNotes,
      updatedAt: new Date(),
    });

    return this.findById(id);
  }

  async linkReworkJobOrder(id: string, reworkJobOrderId: string) {
    const backJob = this.backJobs.get(id);
    if (!backJob) {
      throw new NotFoundException('Back job not found');
    }

    this.backJobs.set(id, {
      ...backJob,
      reworkJobOrderId,
      status: 'in_progress',
      updatedAt: new Date(),
    });

    return this.findById(id);
  }
}

class InMemoryInspectionsRepository {
  private readonly inspections = new Map<string, InspectionRecord>();
  private readonly findings: InspectionFindingRecord[] = [];

  async create(vehicleId: string, payload: CreateInspectionDto) {
    const now = new Date();
    const inspection: InspectionRecord = {
      id: randomUUID(),
      vehicleId,
      bookingId: payload.bookingId ?? null,
      inspectionType: payload.inspectionType,
      status: payload.status ?? 'completed',
      inspectorUserId: payload.inspectorUserId ?? null,
      notes: payload.notes ?? null,
      attachmentRefs: payload.attachmentRefs ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.inspections.set(inspection.id, inspection);

    payload.findings?.forEach((finding) => {
      this.findings.push({
        id: randomUUID(),
        inspectionId: inspection.id,
        category: finding.category,
        label: finding.label,
        severity: finding.severity ?? 'info',
        notes: finding.notes ?? null,
        isVerified: finding.isVerified ?? false,
        createdAt: now,
        updatedAt: now,
      });
    });

    return this.findById(inspection.id);
  }

  async findById(id: string) {
    const inspection = this.inspections.get(id);
    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    return {
      ...inspection,
      findings: this.findings
        .filter((finding) => finding.inspectionId === inspection.id)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((finding) => ({ ...finding })),
    };
  }

  async findByVehicleId(vehicleId: string) {
    return Array.from(this.inspections.values())
      .filter((inspection) => inspection.vehicleId === vehicleId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((inspection) => ({
        ...inspection,
        findings: this.findings
          .filter((finding) => finding.inspectionId === inspection.id)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .map((finding) => ({ ...finding })),
      }));
  }
}

class InMemoryVehicleLifecycleRepository {
  private readonly events = new Map<string, VehicleTimelineEventRecord>();
  private readonly summaries = new Map<string, VehicleLifecycleSummaryRecord>();

  async replaceForVehicle(vehicleId: string, payload: AppendVehicleTimelineEventDto[]) {
    Array.from(this.events.values())
      .filter((event) => event.vehicleId === vehicleId)
      .forEach((event) => {
        this.events.delete(event.id);
      });

    payload.forEach((event) => {
      const now = new Date();
      const record: VehicleTimelineEventRecord = {
        id: randomUUID(),
        vehicleId: event.vehicleId,
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        occurredAt: new Date(event.occurredAt),
        verified: event.verified,
        inspectionId: event.inspectionId ?? null,
        actorUserId: event.actorUserId ?? null,
        notes: event.notes ?? null,
        dedupeKey: event.dedupeKey,
        createdAt: now,
        updatedAt: now,
      };

      this.events.set(record.id, record);
    });

    return this.findByVehicleId(vehicleId);
  }

  async create(event: AppendVehicleTimelineEventDto) {
    const now = new Date();
    const record: VehicleTimelineEventRecord = {
      id: randomUUID(),
      vehicleId: event.vehicleId,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      occurredAt: new Date(event.occurredAt),
      verified: event.verified,
      inspectionId: event.inspectionId ?? null,
      actorUserId: event.actorUserId ?? null,
      notes: event.notes ?? null,
      dedupeKey: event.dedupeKey,
      createdAt: now,
      updatedAt: now,
    };

    this.events.set(record.id, record);
    return { ...record };
  }

  async findByVehicleId(vehicleId: string) {
    return Array.from(this.events.values())
      .filter((event) => event.vehicleId === vehicleId)
      .sort((left, right) => {
        const occurredAtDiff = left.occurredAt.getTime() - right.occurredAt.getTime();
        if (occurredAtDiff !== 0) {
          return occurredAtDiff;
        }

        return left.dedupeKey.localeCompare(right.dedupeKey);
      })
      .map((event) => ({ ...event }));
  }

  async createSummary(payload: {
    vehicleId: string;
    requestedByUserId: string;
    summaryText: string;
    status?: VehicleLifecycleSummaryStatus;
    generationJob: AiWorkerJobMetadata;
    provenance: VehicleLifecycleSummaryProvenance;
  }) {
    const now = new Date();
    const record: VehicleLifecycleSummaryRecord = {
      id: randomUUID(),
      vehicleId: payload.vehicleId,
      requestedByUserId: payload.requestedByUserId,
      summaryText: payload.summaryText,
      status: payload.status ?? 'queued',
      generationJob: { ...payload.generationJob },
      customerVisible: false,
      customerVisibleAt: null,
      reviewNotes: null,
      reviewedByUserId: null,
      reviewedAt: null,
      provenance: { ...payload.provenance, evidenceRefs: [...payload.provenance.evidenceRefs] },
      createdAt: now,
      updatedAt: now,
    };

    this.summaries.set(record.id, record);
    return this.findSummaryById(record.id);
  }

  async findSummaryById(summaryId: string) {
    const summary = this.summaries.get(summaryId);
    if (!summary) {
      throw new NotFoundException('Vehicle lifecycle summary not found');
    }

    return {
      ...summary,
      generationJob: summary.generationJob ? { ...summary.generationJob } : null,
      provenance: {
        ...summary.provenance,
        evidenceRefs: [...summary.provenance.evidenceRefs],
      },
    };
  }

  async listSummariesByVehicleId(vehicleId: string) {
    return Array.from(this.summaries.values())
      .filter((summary) => summary.vehicleId === vehicleId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((summary) => ({
        ...summary,
        generationJob: summary.generationJob ? { ...summary.generationJob } : null,
        provenance: {
          ...summary.provenance,
          evidenceRefs: [...summary.provenance.evidenceRefs],
        },
      }));
  }

  async updateSummaryGenerationJob(
    summaryId: string,
    generationJob: AiWorkerJobMetadata,
    status?: VehicleLifecycleSummaryStatus,
  ) {
    const summary = this.summaries.get(summaryId);
    if (!summary) {
      throw new NotFoundException('Vehicle lifecycle summary not found');
    }

    this.summaries.set(summaryId, {
      ...summary,
      generationJob: { ...generationJob },
      status: status ?? summary.status,
      updatedAt: new Date(),
    });

    return this.findSummaryById(summaryId);
  }

  async completeSummaryGeneration(
    summaryId: string,
    payload: {
      summaryText: string;
      provenance: VehicleLifecycleSummaryProvenance;
      generationJob: AiWorkerJobMetadata;
    },
  ) {
    const summary = this.summaries.get(summaryId);
    if (!summary) {
      throw new NotFoundException('Vehicle lifecycle summary not found');
    }

    this.summaries.set(summaryId, {
      ...summary,
      summaryText: payload.summaryText,
      status: 'pending_review',
      generationJob: { ...payload.generationJob },
      provenance: { ...payload.provenance, evidenceRefs: [...payload.provenance.evidenceRefs] },
      updatedAt: new Date(),
    });

    return this.findSummaryById(summaryId);
  }

  async failSummaryGeneration(
    summaryId: string,
    payload: {
      summaryText: string;
      generationJob: AiWorkerJobMetadata;
    },
  ) {
    const summary = this.summaries.get(summaryId);
    if (!summary) {
      throw new NotFoundException('Vehicle lifecycle summary not found');
    }

    this.summaries.set(summaryId, {
      ...summary,
      summaryText: payload.summaryText,
      status: 'generation_failed',
      generationJob: { ...payload.generationJob },
      updatedAt: new Date(),
    });

    return this.findSummaryById(summaryId);
  }

  async reviewSummary(
    summaryId: string,
    payload: {
      status: Extract<VehicleLifecycleSummaryStatus, 'approved' | 'rejected'>;
      reviewNotes?: string | null;
      reviewedByUserId: string;
      reviewedAt: Date;
      customerVisible: boolean;
      customerVisibleAt?: Date | null;
    },
  ) {
    const summary = this.summaries.get(summaryId);
    if (!summary) {
      throw new NotFoundException('Vehicle lifecycle summary not found');
    }

    const updatedSummary: VehicleLifecycleSummaryRecord = {
      ...summary,
      status: payload.status,
      reviewNotes: payload.reviewNotes ?? null,
      reviewedByUserId: payload.reviewedByUserId,
      reviewedAt: payload.reviewedAt,
      customerVisible: payload.customerVisible,
      customerVisibleAt: payload.customerVisibleAt ?? null,
      updatedAt: new Date(),
    };

    this.summaries.set(summaryId, updatedSummary);
    return this.findSummaryById(summaryId);
  }
}

class InMemoryInsuranceRepository {
  private readonly inquiries = new Map<string, InsuranceInquiryRecord>();
  private readonly documents: InsuranceDocumentRecord[] = [];
  private readonly records = new Map<string, InsuranceRecordRecord>();

  async create(payload: CreateInsuranceInquiryDto & { createdByUserId: string }) {
    const now = new Date();
    const inquiry: InsuranceInquiryRecord = {
      id: randomUUID(),
      userId: payload.userId,
      vehicleId: payload.vehicleId,
      inquiryType: payload.inquiryType,
      subject: payload.subject,
      description: payload.description,
      providerName: payload.providerName ?? null,
      policyNumber: payload.policyNumber ?? null,
      notes: payload.notes ?? null,
      status: 'submitted',
      reviewNotes: null,
      createdByUserId: payload.createdByUserId,
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.inquiries.set(inquiry.id, inquiry);
    return this.findById(inquiry.id);
  }

  async findById(id: string) {
    const inquiry = this.inquiries.get(id);
    if (!inquiry) {
      throw new NotFoundException('Insurance inquiry not found');
    }

    return cloneInsuranceInquiry(inquiry, this.documents);
  }

  async updateStatus(
    id: string,
    payload: UpdateInsuranceInquiryStatusDto & { reviewedByUserId: string; reviewedAt: Date },
  ) {
    const inquiry = this.inquiries.get(id);
    if (!inquiry) {
      throw new NotFoundException('Insurance inquiry not found');
    }

    const updatedInquiry: InsuranceInquiryRecord = {
      ...inquiry,
      status: payload.status,
      reviewNotes: payload.reviewNotes ?? null,
      reviewedByUserId: payload.reviewedByUserId,
      reviewedAt: payload.reviewedAt,
      updatedAt: new Date(),
    };

    this.inquiries.set(id, updatedInquiry);
    return this.findById(id);
  }

  async addDocument(id: string, payload: AddInsuranceDocumentDto, uploadedByUserId: string) {
    const inquiry = this.inquiries.get(id);
    if (!inquiry) {
      throw new NotFoundException('Insurance inquiry not found');
    }

    this.documents.push({
      id: randomUUID(),
      inquiryId: id,
      fileName: payload.fileName,
      fileUrl: payload.fileUrl,
      documentType: payload.documentType,
      notes: payload.notes ?? null,
      uploadedByUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.findById(id);
  }

  async findByUserId(userId: string) {
    return Array.from(this.inquiries.values())
      .filter((inquiry) => inquiry.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((inquiry) => cloneInsuranceInquiry(inquiry, this.documents));
  }

  async upsertRecordFromInquiry(payload: {
    inquiryId: string;
    userId: string;
    vehicleId: string;
    inquiryType: InsuranceInquiryType;
    providerName?: string | null;
    policyNumber?: string | null;
    status: InsuranceInquiryStatus;
  }) {
    const existingRecord = Array.from(this.records.values()).find((record) => record.inquiryId === payload.inquiryId);
    const now = new Date();

    if (existingRecord) {
      const updatedRecord: InsuranceRecordRecord = {
        ...existingRecord,
        providerName: payload.providerName ?? null,
        policyNumber: payload.policyNumber ?? null,
        status: payload.status,
        updatedAt: now,
      };

      this.records.set(existingRecord.id, updatedRecord);
      return { ...updatedRecord };
    }

    const record: InsuranceRecordRecord = {
      id: randomUUID(),
      inquiryId: payload.inquiryId,
      userId: payload.userId,
      vehicleId: payload.vehicleId,
      inquiryType: payload.inquiryType,
      providerName: payload.providerName ?? null,
      policyNumber: payload.policyNumber ?? null,
      status: payload.status,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    return { ...record };
  }

  async findRecordsByVehicleId(vehicleId: string) {
    return Array.from(this.records.values())
      .filter((record) => record.vehicleId === vehicleId)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((record) => ({ ...record }));
  }

  async listForAnalytics() {
    return Array.from(this.inquiries.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((inquiry) => cloneInsuranceInquiry(inquiry, this.documents));
  }
}

const defaultChatbotIntentCatalog = [
  {
    intentKey: 'booking.how_to_book',
    label: 'How to book a service',
    description: 'Explains the minimum information required to create a booking.',
    intentType: 'faq' as const,
    responseTemplate:
      'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
    lookupType: null,
    visibility: 'all' as const,
    keywords: ['book service', 'booking', 'appointment', 'schedule service'],
    priority: 300,
  },
  {
    intentKey: 'booking.latest_status',
    label: 'Latest booking status',
    description: 'Looks up the most recent booking attached to the signed-in user.',
    intentType: 'lookup' as const,
    responseTemplate: 'Here is the latest booking status I found for your account.',
    lookupType: 'booking_status' as const,
    visibility: 'all' as const,
    keywords: ['booking status', 'appointment status', 'my booking', 'latest booking'],
    priority: 280,
  },
  {
    intentKey: 'insurance.required_documents',
    label: 'Insurance inquiry requirements',
    description: 'Explains the deterministic insurance inquiry input and supporting files.',
    intentType: 'faq' as const,
    responseTemplate:
      'Start with the customer and vehicle reference, inquiry type, subject, description, and any supporting files you already have. A service adviser can request additional documents during review.',
    lookupType: null,
    visibility: 'all' as const,
    keywords: [
      'insurance documents',
      'insurance document',
      'required documents',
      'claim documents',
      'documents do i need',
      'insurance requirements',
    ],
    priority: 260,
  },
  {
    intentKey: 'insurance.latest_status',
    label: 'Latest insurance inquiry status',
    description: 'Looks up the most recent insurance inquiry attached to the signed-in user.',
    intentType: 'lookup' as const,
    responseTemplate: 'Here is the latest insurance inquiry status I found for your account.',
    lookupType: 'insurance_status' as const,
    visibility: 'all' as const,
    keywords: ['insurance status', 'claim status', 'my insurance', 'inquiry status'],
    priority: 240,
  },
  {
    intentKey: 'workshop.support_window',
    label: 'Workshop support window',
    description:
      'Explains that the chatbot is always available for FAQ routing while staff follow-up is asynchronous.',
    intentType: 'faq' as const,
    responseTemplate:
      'I can answer booking and insurance FAQs any time. If your concern needs manual review or is outside the approved rules, I will open an escalation for a service adviser follow-up.',
    lookupType: null,
    visibility: 'all' as const,
    keywords: ['business hours', 'support hours', 'open today', 'workshop hours'],
    priority: 200,
  },
] as const;

class InMemoryChatbotRepository {
  private readonly intents = new Map<string, ChatbotIntentRecord>();
  private readonly rules = new Map<string, ChatbotRuleRecord>();
  private readonly escalations = new Map<string, ChatbotEscalationRecord>();
  private readonly conversations = new Map<string, ChatbotConversationRecord>();

  constructor() {
    this.seedDefaults();
  }

  async listActiveRules() {
    return Array.from(this.rules.values())
      .filter((rule) => rule.isActive)
      .sort((left, right) => right.priority - left.priority)
      .map((rule) => ({
        ...rule,
        keywords: [...rule.keywords],
        intent: this.cloneIntent(this.intents.get(rule.intentId) as ChatbotIntentRecord),
      }));
  }

  async listActiveIntents() {
    return Array.from(this.intents.values())
      .filter((intent) => intent.isActive)
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((intent) => ({
        ...this.cloneIntent(intent),
        rules: Array.from(this.rules.values())
          .filter((rule) => rule.intentId === intent.id && rule.isActive)
          .sort((left, right) => right.priority - left.priority)
          .map((rule) => ({ ...rule, keywords: [...rule.keywords] })),
      }));
  }

  async findConversationById(id: string) {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new NotFoundException('Chatbot conversation not found');
    }

    return this.cloneConversation(conversation);
  }

  async createEscalation(payload: {
    userId: string;
    intentId?: string | null;
    prompt: string;
    reason: string;
  }) {
    const now = new Date();
    const escalation: ChatbotEscalationRecord = {
      id: randomUUID(),
      userId: payload.userId,
      intentId: payload.intentId ?? null,
      prompt: payload.prompt,
      reason: payload.reason,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    this.escalations.set(escalation.id, escalation);
    return this.cloneEscalation(escalation);
  }

  async createConversation(payload: {
    userId: string;
    intentId?: string | null;
    prompt: string;
    responseType: ChatbotConversationResponseType;
    responseText: string;
    lookupPayload?: ChatbotLookupPayloadRecord | null;
    escalationId?: string | null;
  }) {
    const now = new Date();
    const conversation: ChatbotConversationRecord = {
      id: randomUUID(),
      userId: payload.userId,
      intentId: payload.intentId ?? null,
      prompt: payload.prompt,
      responseType: payload.responseType,
      responseText: payload.responseText,
      lookupPayload: payload.lookupPayload ?? null,
      escalationId: payload.escalationId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversation.id, conversation);
    return this.cloneConversation(conversation);
  }

  private seedDefaults() {
    const now = new Date();

    for (const intent of defaultChatbotIntentCatalog) {
      const intentRecord: ChatbotIntentRecord = {
        id: randomUUID(),
        intentKey: intent.intentKey,
        label: intent.label,
        description: intent.description,
        intentType: intent.intentType,
        responseTemplate: intent.responseTemplate,
        lookupType: intent.lookupType,
        visibility: intent.visibility,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      this.intents.set(intentRecord.id, intentRecord);

      const ruleRecord: ChatbotRuleRecord = {
        id: randomUUID(),
        ruleKey: `${intent.intentKey}.keywords`,
        intentId: intentRecord.id,
        keywords: [...intent.keywords],
        priority: intent.priority,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      this.rules.set(ruleRecord.id, ruleRecord);
    }
  }

  private cloneIntent(intent: ChatbotIntentRecord) {
    return {
      ...intent,
      lookupType: intent.lookupType ?? null,
    };
  }

  private cloneEscalation(escalation: ChatbotEscalationRecord) {
    return {
      ...escalation,
      intent: escalation.intentId ? this.cloneIntent(this.intents.get(escalation.intentId) as ChatbotIntentRecord) : null,
    };
  }

  private cloneConversation(conversation: ChatbotConversationRecord) {
    return {
      ...conversation,
      lookupPayload: conversation.lookupPayload ? { ...conversation.lookupPayload } : null,
      intent: conversation.intentId
        ? this.cloneIntent(this.intents.get(conversation.intentId) as ChatbotIntentRecord)
        : null,
      escalation: conversation.escalationId
        ? this.cloneEscalation(this.escalations.get(conversation.escalationId) as ChatbotEscalationRecord)
        : null,
    };
  }
}

class InMemoryLoyaltyRepository {
  private readonly accounts = new Map<string, LoyaltyAccountRecord>();
  private readonly transactions = new Map<string, LoyaltyTransactionRecord>();
  private readonly rewards = new Map<string, RewardRecord>();
  private readonly rewardAudits = new Map<string, RewardCatalogAuditRecord>();
  private readonly earningRules = new Map<string, EarningRuleRecord>();
  private readonly earningRuleAudits = new Map<string, EarningRuleAuditRecord>();
  private readonly redemptions = new Map<string, RewardRedemptionRecord>();

  async findAccountById(accountId: string) {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new NotFoundException('Loyalty account not found');
    }

    return { ...account };
  }

  async findAccountByUserId(userId: string) {
    const account = Array.from(this.accounts.values()).find((entry) => entry.userId === userId);
    return account ? { ...account } : null;
  }

  async getOrCreateAccount(userId: string) {
    const existingAccount = await this.findAccountByUserId(userId);
    if (existingAccount) {
      return existingAccount;
    }

    const now = new Date();
    const account: LoyaltyAccountRecord = {
      id: randomUUID(),
      userId,
      pointsBalance: 0,
      lifetimePointsEarned: 0,
      lifetimePointsRedeemed: 0,
      lastAccruedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.accounts.set(account.id, account);
    return { ...account };
  }

  async listTransactionsByUserId(userId: string) {
    const account = await this.getOrCreateAccount(userId);
    return Array.from(this.transactions.values())
      .filter((entry) => entry.loyaltyAccountId === account.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((entry) => ({ ...entry, metadata: { ...entry.metadata } }));
  }

  async listAccountsForAnalytics() {
    return Array.from(this.accounts.values())
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((account) => ({ ...account }));
  }

  async listTransactionsForAnalytics() {
    return Array.from(this.transactions.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((entry) => ({ ...entry, metadata: { ...entry.metadata } }));
  }

  async listRewardRedemptionsForAnalytics() {
    return Array.from(this.redemptions.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((redemption) => ({ ...redemption }));
  }

  async listRewards(options?: { includeInactive?: boolean }) {
    return Array.from(this.rewards.values())
      .filter((reward) => (options?.includeInactive ? true : reward.status === 'active'))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((reward) => this.cloneReward(reward));
  }

  async listEarningRules(options?: { includeInactive?: boolean }) {
    return Array.from(this.earningRules.values())
      .filter((rule) => (options?.includeInactive ? true : rule.status === 'active'))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((rule) => this.cloneEarningRule(rule));
  }

  async listActiveEarningRules(at = new Date()) {
    return Array.from(this.earningRules.values())
      .filter((rule) => {
        if (rule.status !== 'active') {
          return false;
        }

        if (rule.activeFrom && rule.activeFrom.getTime() > at.getTime()) {
          return false;
        }

        if (rule.activeUntil && rule.activeUntil.getTime() < at.getTime()) {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((rule) => this.cloneEarningRule(rule));
  }

  async findRewardById(id: string) {
    const reward = this.rewards.get(id);
    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    return this.cloneReward(reward);
  }

  async findEarningRuleById(id: string) {
    const earningRule = this.earningRules.get(id);
    if (!earningRule) {
      throw new NotFoundException('Earning rule not found');
    }

    return this.cloneEarningRule(earningRule);
  }

  async createReward(payload: CreateRewardDto & { actorUserId: string }) {
    const now = new Date();
    const reward: RewardRecord = {
      id: randomUUID(),
      name: payload.name,
      description: payload.description ?? null,
      fulfillmentNote: payload.fulfillmentNote ?? null,
      rewardType: payload.rewardType,
      pointsCost: payload.pointsCost,
      discountPercent: payload.discountPercent ?? null,
      status: payload.status ?? 'active',
      createdByUserId: payload.actorUserId,
      updatedByUserId: payload.actorUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.rewards.set(reward.id, reward);
    await this.insertRewardAudit({
      rewardId: reward.id,
      actorUserId: payload.actorUserId,
      action: 'created',
      reason: payload.reason ?? null,
      snapshot: this.toRewardSnapshot(reward),
    });

    return this.cloneReward(reward);
  }

  async createEarningRule(payload: CreateEarningRuleDto & { actorUserId: string }) {
    const now = new Date();
    const earningRule: EarningRuleRecord = {
      id: randomUUID(),
      name: payload.name,
      description: payload.description ?? null,
      accrualSource: payload.accrualSource,
      formulaType: payload.formulaType,
      flatPoints: payload.flatPoints ?? null,
      amountStepCents: payload.amountStepCents ?? null,
      pointsPerStep: payload.pointsPerStep ?? null,
      minimumAmountCents: payload.minimumAmountCents ?? null,
      eligibleServiceTypes: [...(payload.eligibleServiceTypes ?? [])],
      eligibleServiceCategories: [...(payload.eligibleServiceCategories ?? [])],
      eligibleProductIds: [...(payload.eligibleProductIds ?? [])],
      eligibleProductCategoryIds: [...(payload.eligibleProductCategoryIds ?? [])],
      promoLabel: payload.promoLabel ?? null,
      manualBenefitNote: payload.manualBenefitNote ?? null,
      activeFrom: payload.activeFrom ? new Date(payload.activeFrom) : null,
      activeUntil: payload.activeUntil ? new Date(payload.activeUntil) : null,
      status: payload.status ?? 'inactive',
      createdByUserId: payload.actorUserId,
      updatedByUserId: payload.actorUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.earningRules.set(earningRule.id, earningRule);
    await this.insertEarningRuleAudit({
      earningRuleId: earningRule.id,
      actorUserId: payload.actorUserId,
      action: 'created',
      reason: payload.reason ?? null,
      snapshot: this.toEarningRuleSnapshot(earningRule),
    });

    return this.cloneEarningRule(earningRule);
  }

  async updateReward(id: string, payload: UpdateRewardDto & { actorUserId: string }) {
    const existingReward = this.rewards.get(id);
    if (!existingReward) {
      throw new NotFoundException('Reward not found');
    }

    const updatedReward: RewardRecord = {
      ...existingReward,
      name: payload.name ?? existingReward.name,
      description: payload.description ?? existingReward.description,
      fulfillmentNote:
        payload.fulfillmentNote !== undefined
          ? payload.fulfillmentNote
          : existingReward.fulfillmentNote,
      rewardType: payload.rewardType ?? existingReward.rewardType,
      pointsCost: payload.pointsCost ?? existingReward.pointsCost,
      discountPercent:
        payload.discountPercent !== undefined
          ? payload.discountPercent
          : existingReward.discountPercent,
      updatedByUserId: payload.actorUserId,
      updatedAt: new Date(),
    };

    this.rewards.set(updatedReward.id, updatedReward);
    await this.insertRewardAudit({
      rewardId: updatedReward.id,
      actorUserId: payload.actorUserId,
      action: 'updated',
      reason: payload.reason ?? null,
      snapshot: this.toRewardSnapshot(updatedReward),
    });

    return this.cloneReward(updatedReward);
  }

  async updateEarningRule(id: string, payload: UpdateEarningRuleDto & { actorUserId: string }) {
    const existingRule = this.earningRules.get(id);
    if (!existingRule) {
      throw new NotFoundException('Earning rule not found');
    }

    const updatedRule: EarningRuleRecord = {
      ...existingRule,
      name: payload.name ?? existingRule.name,
      description:
        payload.description !== undefined ? payload.description : existingRule.description,
      accrualSource: payload.accrualSource ?? existingRule.accrualSource,
      formulaType: payload.formulaType ?? existingRule.formulaType,
      flatPoints: payload.flatPoints !== undefined ? payload.flatPoints : existingRule.flatPoints,
      amountStepCents:
        payload.amountStepCents !== undefined ? payload.amountStepCents : existingRule.amountStepCents,
      pointsPerStep:
        payload.pointsPerStep !== undefined ? payload.pointsPerStep : existingRule.pointsPerStep,
      minimumAmountCents:
        payload.minimumAmountCents !== undefined
          ? payload.minimumAmountCents
          : existingRule.minimumAmountCents,
      eligibleServiceTypes:
        payload.eligibleServiceTypes !== undefined
          ? [...payload.eligibleServiceTypes]
          : [...existingRule.eligibleServiceTypes],
      eligibleServiceCategories:
        payload.eligibleServiceCategories !== undefined
          ? [...payload.eligibleServiceCategories]
          : [...existingRule.eligibleServiceCategories],
      eligibleProductIds:
        payload.eligibleProductIds !== undefined
          ? [...payload.eligibleProductIds]
          : [...existingRule.eligibleProductIds],
      eligibleProductCategoryIds:
        payload.eligibleProductCategoryIds !== undefined
          ? [...payload.eligibleProductCategoryIds]
          : [...existingRule.eligibleProductCategoryIds],
      promoLabel: payload.promoLabel !== undefined ? payload.promoLabel : existingRule.promoLabel,
      manualBenefitNote:
        payload.manualBenefitNote !== undefined
          ? payload.manualBenefitNote
          : existingRule.manualBenefitNote,
      activeFrom:
        payload.activeFrom !== undefined
          ? payload.activeFrom
            ? new Date(payload.activeFrom)
            : null
          : existingRule.activeFrom,
      activeUntil:
        payload.activeUntil !== undefined
          ? payload.activeUntil
            ? new Date(payload.activeUntil)
            : null
          : existingRule.activeUntil,
      updatedByUserId: payload.actorUserId,
      updatedAt: new Date(),
    };

    this.earningRules.set(updatedRule.id, updatedRule);
    await this.insertEarningRuleAudit({
      earningRuleId: updatedRule.id,
      actorUserId: payload.actorUserId,
      action: 'updated',
      reason: payload.reason ?? null,
      snapshot: this.toEarningRuleSnapshot(updatedRule),
    });

    return this.cloneEarningRule(updatedRule);
  }

  async updateRewardStatus(id: string, payload: UpdateRewardStatusDto & { actorUserId: string }) {
    const existingReward = this.rewards.get(id);
    if (!existingReward) {
      throw new NotFoundException('Reward not found');
    }

    const updatedReward: RewardRecord = {
      ...existingReward,
      status: payload.status,
      updatedByUserId: payload.actorUserId,
      updatedAt: new Date(),
    };

    this.rewards.set(updatedReward.id, updatedReward);
    await this.insertRewardAudit({
      rewardId: updatedReward.id,
      actorUserId: payload.actorUserId,
      action: payload.status === 'active' ? 'activated' : 'deactivated',
      reason: payload.reason,
      snapshot: this.toRewardSnapshot(updatedReward),
    });

    return this.cloneReward(updatedReward);
  }

  async updateEarningRuleStatus(
    id: string,
    payload: UpdateEarningRuleStatusDto & { actorUserId: string },
  ) {
    const existingRule = this.earningRules.get(id);
    if (!existingRule) {
      throw new NotFoundException('Earning rule not found');
    }

    const updatedRule: EarningRuleRecord = {
      ...existingRule,
      status: payload.status,
      updatedByUserId: payload.actorUserId,
      updatedAt: new Date(),
    };

    this.earningRules.set(updatedRule.id, updatedRule);
    await this.insertEarningRuleAudit({
      earningRuleId: updatedRule.id,
      actorUserId: payload.actorUserId,
      action: payload.status === 'active' ? 'activated' : 'deactivated',
      reason: payload.reason ?? null,
      snapshot: this.toEarningRuleSnapshot(updatedRule),
    });

    return this.cloneEarningRule(updatedRule);
  }

  async applyAccrual(payload: {
    plan: {
      loyaltyUserId: string;
      accrualKind: LoyaltySourceType;
      sourceReference: string;
      idempotencyKey: string;
      policyKey: string;
      triggerName: string;
      sourceDomain: string;
      duplicateStrategy: string;
      reversalStrategy: string;
      pointsInput: Record<string, unknown>;
    };
    pointsAwarded: number;
    occurredAt?: Date;
    metadata?: Record<string, unknown>;
  }) {
    const account = await this.getOrCreateAccount(payload.plan.loyaltyUserId);
    const existingTransaction = Array.from(this.transactions.values()).find(
      (entry) => entry.idempotencyKey === payload.plan.idempotencyKey,
    );

    if (existingTransaction) {
      return {
        account,
        transaction: { ...existingTransaction, metadata: { ...existingTransaction.metadata } },
        wasDuplicate: true,
      };
    }

    const nextBalance = account.pointsBalance + payload.pointsAwarded;
    const updatedAccount: LoyaltyAccountRecord = {
      ...account,
      pointsBalance: nextBalance,
      lifetimePointsEarned: account.lifetimePointsEarned + payload.pointsAwarded,
      lastAccruedAt: payload.occurredAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.accounts.set(updatedAccount.id, updatedAccount);

    const transaction: LoyaltyTransactionRecord = {
      id: randomUUID(),
      loyaltyAccountId: updatedAccount.id,
      transactionType: 'accrual',
      sourceType: payload.plan.accrualKind,
      sourceReference: payload.plan.sourceReference,
      idempotencyKey: payload.plan.idempotencyKey,
      policyKey: payload.plan.policyKey,
      pointsDelta: payload.pointsAwarded,
      resultingBalance: nextBalance,
      metadata: {
        triggerName: payload.plan.triggerName,
        sourceDomain: payload.plan.sourceDomain,
        duplicateStrategy: payload.plan.duplicateStrategy,
        reversalStrategy: payload.plan.reversalStrategy,
        pointsInput: payload.plan.pointsInput,
        ...(payload.metadata ?? {}),
      },
      createdAt: payload.occurredAt ?? new Date(),
    };
    this.transactions.set(transaction.id, transaction);

    return {
      account: { ...updatedAccount },
      transaction: { ...transaction, metadata: { ...transaction.metadata } },
      wasDuplicate: false,
    };
  }

  async createRedemption(payload: {
    userId: string;
    rewardId: string;
    redeemedByUserId: string;
    note?: string | null;
  }) {
    const account = await this.getOrCreateAccount(payload.userId);
    const reward = await this.findRewardById(payload.rewardId);
    const nextBalance = account.pointsBalance - reward.pointsCost;
    const updatedAccount: LoyaltyAccountRecord = {
      ...account,
      pointsBalance: nextBalance,
      lifetimePointsRedeemed: account.lifetimePointsRedeemed + reward.pointsCost,
      updatedAt: new Date(),
    };
    this.accounts.set(updatedAccount.id, updatedAccount);

    const transaction: LoyaltyTransactionRecord = {
      id: randomUUID(),
      loyaltyAccountId: updatedAccount.id,
      transactionType: 'redemption',
      sourceType: 'reward_redemption',
      sourceReference: reward.id,
      idempotencyKey: null,
      policyKey: 'loyalty.reward_redemption.v1',
      pointsDelta: reward.pointsCost * -1,
      resultingBalance: nextBalance,
      metadata: {
        rewardNameSnapshot: reward.name,
        redeemedByUserId: payload.redeemedByUserId,
        note: payload.note ?? null,
      },
      createdAt: new Date(),
    };
    this.transactions.set(transaction.id, transaction);

    const redemption: RewardRedemptionRecord = {
      id: randomUUID(),
      loyaltyAccountId: updatedAccount.id,
      rewardId: reward.id,
      transactionId: transaction.id,
      redeemedByUserId: payload.redeemedByUserId,
      rewardNameSnapshot: reward.name,
      pointsCostSnapshot: reward.pointsCost,
      note: payload.note ?? null,
      createdAt: new Date(),
    };
    this.redemptions.set(redemption.id, redemption);

    return {
      ...redemption,
      transaction: { ...transaction, metadata: { ...transaction.metadata } },
    };
  }

  async findRedemptionById(id: string) {
    const redemption = this.redemptions.get(id);
    if (!redemption) {
      throw new NotFoundException('Reward redemption not found');
    }

    const transaction = this.transactions.get(redemption.transactionId);
    if (!transaction) {
      throw new NotFoundException('Loyalty transaction not found');
    }

    return {
      ...redemption,
      transaction: { ...transaction, metadata: { ...transaction.metadata } },
    };
  }

  private async insertRewardAudit(payload: {
    rewardId: string;
    actorUserId: string;
    action: RewardCatalogAuditAction;
    reason?: string | null;
    snapshot: RewardCatalogSnapshot;
  }) {
    const audit: RewardCatalogAuditRecord = {
      id: randomUUID(),
      rewardId: payload.rewardId,
      actorUserId: payload.actorUserId,
      action: payload.action,
      reason: payload.reason ?? null,
      snapshot: payload.snapshot,
      createdAt: new Date(),
    };
    this.rewardAudits.set(audit.id, audit);
    return { ...audit, snapshot: { ...audit.snapshot } };
  }

  private async insertEarningRuleAudit(payload: {
    earningRuleId: string;
    actorUserId: string;
    action: EarningRuleAuditAction;
    reason?: string | null;
    snapshot: LoyaltyEarningRuleSnapshot;
  }) {
    const audit: EarningRuleAuditRecord = {
      id: randomUUID(),
      earningRuleId: payload.earningRuleId,
      actorUserId: payload.actorUserId,
      action: payload.action,
      reason: payload.reason ?? null,
      snapshot: payload.snapshot,
      createdAt: new Date(),
    };
    this.earningRuleAudits.set(audit.id, audit);
    return { ...audit, snapshot: { ...audit.snapshot } };
  }

  private cloneReward(reward: RewardRecord) {
    const audits = Array.from(this.rewardAudits.values())
      .filter((audit) => audit.rewardId === reward.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((audit) => ({ ...audit, snapshot: { ...audit.snapshot } }));

    return {
      ...reward,
      audits,
    };
  }

  private cloneEarningRule(rule: EarningRuleRecord) {
    const audits = Array.from(this.earningRuleAudits.values())
      .filter((audit) => audit.earningRuleId === rule.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((audit) => ({ ...audit, snapshot: { ...audit.snapshot } }));

    return {
      ...rule,
      eligibleServiceTypes: [...rule.eligibleServiceTypes],
      eligibleServiceCategories: [...rule.eligibleServiceCategories],
      eligibleProductIds: [...rule.eligibleProductIds],
      eligibleProductCategoryIds: [...rule.eligibleProductCategoryIds],
      audits,
    };
  }

  private toRewardSnapshot(reward: RewardRecord): RewardCatalogSnapshot {
    return {
      name: reward.name,
      description: reward.description ?? null,
      fulfillmentNote: reward.fulfillmentNote ?? null,
      rewardType: reward.rewardType,
      pointsCost: reward.pointsCost,
      discountPercent: reward.discountPercent ?? null,
      status: reward.status,
    };
  }

  private toEarningRuleSnapshot(rule: EarningRuleRecord): LoyaltyEarningRuleSnapshot {
    return {
      name: rule.name,
      description: rule.description ?? null,
      accrualSource: rule.accrualSource,
      formulaType: rule.formulaType,
      flatPoints: rule.flatPoints ?? null,
      amountStepCents: rule.amountStepCents ?? null,
      pointsPerStep: rule.pointsPerStep ?? null,
      minimumAmountCents: rule.minimumAmountCents ?? null,
      eligibleServiceTypes: [...rule.eligibleServiceTypes],
      eligibleServiceCategories: [...rule.eligibleServiceCategories],
      eligibleProductIds: [...rule.eligibleProductIds],
      eligibleProductCategoryIds: [...rule.eligibleProductCategoryIds],
      promoLabel: rule.promoLabel ?? null,
      manualBenefitNote: rule.manualBenefitNote ?? null,
      activeFrom: rule.activeFrom ? rule.activeFrom.toISOString() : null,
      activeUntil: rule.activeUntil ? rule.activeUntil.toISOString() : null,
      status: rule.status,
    };
  }
}

class InMemoryAnalyticsRepository {
  private readonly refreshJobs = new Map<string, AnalyticsRefreshJobRecord>();
  private readonly snapshots = new Map<AnalyticsSnapshotType, AnalyticsSnapshotRecord>();

  async findSnapshotByType(snapshotType: AnalyticsSnapshotType) {
    const snapshot = this.snapshots.get(snapshotType);
    if (!snapshot) {
      return null;
    }

    return {
      ...snapshot,
      payload: { ...snapshot.payload },
      sourceCounts: { ...snapshot.sourceCounts },
      refreshJob: snapshot.refreshJobId ? this.refreshJobs.get(snapshot.refreshJobId) ?? null : null,
    };
  }

  async createRefreshJob(payload: {
    snapshotTypes: AnalyticsSnapshotType[];
    triggerSource: AnalyticsRefreshTriggerSource;
    requestedByUserId?: string | null;
    status?: AnalyticsRefreshJobStatus;
  }) {
    const now = new Date();
    const refreshJob: AnalyticsRefreshJobRecord = {
      id: randomUUID(),
      snapshotTypes: [...payload.snapshotTypes],
      triggerSource: payload.triggerSource,
      requestedByUserId: payload.requestedByUserId ?? null,
      status: payload.status ?? 'processing',
      sourceCounts: {},
      errorMessage: null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.refreshJobs.set(refreshJob.id, refreshJob);
    return { ...refreshJob, snapshotTypes: [...refreshJob.snapshotTypes], sourceCounts: {} };
  }

  async markRefreshJobCompleted(id: string, sourceCounts: Record<string, number>) {
    const refreshJob = this.refreshJobs.get(id);
    if (!refreshJob) {
      throw new NotFoundException('Analytics refresh job not found');
    }

    const updatedRefreshJob: AnalyticsRefreshJobRecord = {
      ...refreshJob,
      status: 'completed',
      sourceCounts: { ...sourceCounts },
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    this.refreshJobs.set(id, updatedRefreshJob);
    return { ...updatedRefreshJob, snapshotTypes: [...updatedRefreshJob.snapshotTypes], sourceCounts: { ...updatedRefreshJob.sourceCounts } };
  }

  async markRefreshJobFailed(id: string, errorMessage: string) {
    const refreshJob = this.refreshJobs.get(id);
    if (!refreshJob) {
      throw new NotFoundException('Analytics refresh job not found');
    }

    const updatedRefreshJob: AnalyticsRefreshJobRecord = {
      ...refreshJob,
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    this.refreshJobs.set(id, updatedRefreshJob);
    return {
      ...updatedRefreshJob,
      snapshotTypes: [...updatedRefreshJob.snapshotTypes],
      sourceCounts: { ...updatedRefreshJob.sourceCounts },
    };
  }

  async upsertSnapshot(payload: {
    snapshotType: AnalyticsSnapshotType;
    payload: Record<string, unknown>;
    sourceCounts: Record<string, number>;
    refreshJobId: string;
    version?: string;
  }) {
    const existingSnapshot = this.snapshots.get(payload.snapshotType);
    const now = new Date();
    const snapshot: AnalyticsSnapshotRecord = {
      id: existingSnapshot?.id ?? randomUUID(),
      snapshotType: payload.snapshotType,
      version: payload.version ?? 'v1',
      payload: { ...payload.payload },
      sourceCounts: { ...payload.sourceCounts },
      refreshJobId: payload.refreshJobId,
      generatedAt: now,
      createdAt: existingSnapshot?.createdAt ?? now,
      updatedAt: now,
    };
    this.snapshots.set(payload.snapshotType, snapshot);

    return {
      ...snapshot,
      payload: { ...snapshot.payload },
      sourceCounts: { ...snapshot.sourceCounts },
    };
  }

  async listRefreshJobs(limit = 10) {
    return Array.from(this.refreshJobs.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit)
      .map((refreshJob) => ({
        ...refreshJob,
        snapshotTypes: [...refreshJob.snapshotTypes],
        sourceCounts: { ...refreshJob.sourceCounts },
      }));
  }
}

class InMemoryNotificationsQueue {
  readonly jobs: Array<{
    name: string;
    payload: Record<string, unknown>;
    options?: Record<string, unknown>;
  }> = [];

  async add(name: string, payload: Record<string, unknown>, options?: Record<string, unknown>) {
    this.jobs.push({ name, payload, options });
    return {
      name,
      data: payload,
      opts: options,
    };
  }
}

class InMemoryAiWorkerQueue {
  readonly jobs: Array<{
    name: string;
    payload: Record<string, unknown>;
    options?: Record<string, unknown>;
  }> = [];
  private processor?: (job: {
    id: string;
    name: string;
    data: Record<string, unknown>;
    opts: Record<string, unknown>;
    attemptsMade: number;
    queueName: string;
  }) => Promise<unknown>;

  registerProcessor(
    processor: (job: {
      id: string;
      name: string;
      data: Record<string, unknown>;
      opts: Record<string, unknown>;
      attemptsMade: number;
      queueName: string;
    }) => Promise<unknown>,
  ) {
    this.processor = processor;
  }

  async add(name: string, payload: Record<string, unknown>, options?: Record<string, unknown>) {
    this.jobs.push({ name, payload, options });
    const job = {
      id: String(options?.jobId ?? randomUUID()),
      name,
      data: payload,
      opts: options ?? {},
      attemptsMade: 0,
      queueName: AI_WORKER_QUEUE_NAME,
    };

    if (this.processor) {
      await this.processor(job);
    }

    return {
      name,
      data: payload,
      opts: options,
    };
  }
}

class InMemoryNotificationsRepository {
  private readonly preferences = new Map<string, NotificationPreferenceRecord>();
  private readonly notifications = new Map<string, NotificationRecord>();
  private readonly reminderRules = new Map<string, ReminderRuleRecord>();
  private readonly attempts: NotificationDeliveryAttemptRecord[] = [];

  async findPreferencesByUserId(userId: string) {
    const preference = Array.from(this.preferences.values()).find((entry) => entry.userId === userId);
    return preference ? { ...preference } : null;
  }

  async createDefaultPreferences(userId: string) {
    const now = new Date();
    const preference: NotificationPreferenceRecord = {
      id: randomUUID(),
      userId,
      emailEnabled: true,
      bookingRemindersEnabled: true,
      insuranceUpdatesEnabled: true,
      invoiceRemindersEnabled: true,
      serviceFollowUpEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.preferences.set(preference.id, preference);
    return { ...preference };
  }

  async getOrCreatePreferences(userId: string) {
    const existingPreference = await this.findPreferencesByUserId(userId);
    if (existingPreference) {
      return existingPreference;
    }

    return this.createDefaultPreferences(userId);
  }

  async updatePreferences(userId: string, payload: UpdateNotificationPreferencesDto) {
    const existingPreference = await this.getOrCreatePreferences(userId);
    const updatedPreference: NotificationPreferenceRecord = {
      ...existingPreference,
      emailEnabled: payload.emailEnabled ?? existingPreference.emailEnabled,
      bookingRemindersEnabled:
        payload.bookingRemindersEnabled ?? existingPreference.bookingRemindersEnabled,
      insuranceUpdatesEnabled:
        payload.insuranceUpdatesEnabled ?? existingPreference.insuranceUpdatesEnabled,
      invoiceRemindersEnabled:
        payload.invoiceRemindersEnabled ?? existingPreference.invoiceRemindersEnabled,
      serviceFollowUpEnabled:
        payload.serviceFollowUpEnabled ?? existingPreference.serviceFollowUpEnabled,
      updatedAt: new Date(),
    };

    this.preferences.set(updatedPreference.id, updatedPreference);
    return { ...updatedPreference };
  }

  async findNotificationById(id: string) {
    const notification = this.notifications.get(id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return cloneNotification(notification, this.attempts);
  }

  async listNotificationsByUserId(userId: string) {
    return Array.from(this.notifications.values())
      .filter((notification) => notification.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((notification) => cloneNotification(notification, this.attempts));
  }

  async findNotificationByDedupeKey(dedupeKey: string) {
    const notification = Array.from(this.notifications.values()).find(
      (entry) => entry.dedupeKey === dedupeKey,
    );
    return cloneNotification(notification, this.attempts);
  }

  async createNotification(payload: {
    userId: string;
    category: NotificationCategory;
    channel: NotificationChannel;
    sourceType: NotificationSourceType;
    sourceId: string;
    title: string;
    message: string;
    status: NotificationStatus;
    dedupeKey: string;
    scheduledFor?: Date | null;
    deliveredAt?: Date | null;
  }) {
    const now = new Date();
    const notification: NotificationRecord = {
      id: randomUUID(),
      userId: payload.userId,
      category: payload.category,
      channel: payload.channel,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      title: payload.title,
      message: payload.message,
      status: payload.status,
      dedupeKey: payload.dedupeKey,
      scheduledFor: payload.scheduledFor ?? null,
      deliveredAt: payload.deliveredAt ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.notifications.set(notification.id, notification);
    return this.findNotificationById(notification.id);
  }

  async createDeliveryAttempt(payload: {
    notificationId: string;
    attemptNumber: number;
    status: NotificationAttemptStatus;
    providerMessageId?: string | null;
    errorMessage?: string | null;
  }) {
    const attempt: NotificationDeliveryAttemptRecord = {
      id: randomUUID(),
      notificationId: payload.notificationId,
      attemptNumber: payload.attemptNumber,
      status: payload.status,
      providerMessageId: payload.providerMessageId ?? null,
      errorMessage: payload.errorMessage ?? null,
      attemptedAt: new Date(),
    };

    this.attempts.push(attempt);
    return { ...attempt };
  }

  async findReminderRuleByDedupeKey(dedupeKey: string) {
    const reminderRule = Array.from(this.reminderRules.values()).find(
      (entry) => entry.dedupeKey === dedupeKey,
    );
    return reminderRule ? { ...reminderRule } : null;
  }

  async listReminderRulesForAnalytics(reminderType?: NotificationCategory) {
    return Array.from(this.reminderRules.values())
      .filter((reminderRule) => (reminderType ? reminderRule.reminderType === reminderType : true))
      .sort((left, right) => right.scheduledFor.getTime() - left.scheduledFor.getTime())
      .map((reminderRule) => ({ ...reminderRule }));
  }

  async createReminderRule(payload: {
    userId: string;
    reminderType: NotificationCategory;
    channel: NotificationChannel;
    sourceType: NotificationSourceType;
    sourceId: string;
    scheduledFor: Date;
    status?: ReminderRuleStatus;
    dedupeKey: string;
  }) {
    const now = new Date();
    const reminderRule: ReminderRuleRecord = {
      id: randomUUID(),
      userId: payload.userId,
      reminderType: payload.reminderType,
      channel: payload.channel,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      scheduledFor: payload.scheduledFor,
      status: payload.status ?? 'scheduled',
      dedupeKey: payload.dedupeKey,
      createdAt: now,
      updatedAt: now,
    };

    this.reminderRules.set(reminderRule.id, reminderRule);
    return { ...reminderRule };
  }

  async cancelNotificationsBySource(payload: {
    sourceType: NotificationSourceType;
    sourceId: string;
    category?: NotificationCategory;
  }) {
    const notifications = Array.from(this.notifications.values()).filter((notification) => {
      if (notification.sourceType !== payload.sourceType || notification.sourceId !== payload.sourceId) {
        return false;
      }

      return payload.category ? notification.category === payload.category : true;
    });

    const cancelled: NotificationRecord[] = [];

    for (const notification of notifications) {
      if (['sent', 'cancelled'].includes(notification.status)) {
        continue;
      }

      const updatedNotification: NotificationRecord = {
        ...notification,
        status: 'cancelled',
        updatedAt: new Date(),
      };
      this.notifications.set(updatedNotification.id, updatedNotification);
      cancelled.push(updatedNotification);
    }

    return cancelled.map((notification) => cloneNotification(notification, this.attempts));
  }

  async cancelReminderRulesBySource(payload: {
    sourceType: NotificationSourceType;
    sourceId: string;
    reminderType?: NotificationCategory;
  }) {
    const cancelled: ReminderRuleRecord[] = [];

    for (const reminderRule of this.reminderRules.values()) {
      if (reminderRule.sourceType !== payload.sourceType || reminderRule.sourceId !== payload.sourceId) {
        continue;
      }

      if (payload.reminderType && reminderRule.reminderType !== payload.reminderType) {
        continue;
      }

      if (reminderRule.status === 'cancelled') {
        continue;
      }

      const updatedReminderRule: ReminderRuleRecord = {
        ...reminderRule,
        status: 'cancelled',
        updatedAt: new Date(),
      };
      this.reminderRules.set(updatedReminderRule.id, updatedReminderRule);
      cancelled.push(updatedReminderRule);
    }

    return cancelled.map((reminderRule) => ({ ...reminderRule }));
  }
}

class FakeGoogleIdentityService {
  async verifyIdToken(googleIdToken: string) {
    const [prefix, email, subject, firstName, lastName] = googleIdToken.split(':');
    if (prefix !== 'google-id-token' || !email || !subject || !firstName || !lastName) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    return {
      email: email.trim().toLowerCase(),
      subject,
      firstName,
      lastName,
    };
  }
}

class FakeSmtpMailService {
  readonly sentMessages: Array<{
    to: string;
    subject: string;
    text: string;
  }> = [];

  async sendMail(payload: { to: string; subject: string; text: string }) {
    this.sentMessages.push(payload);
    return {
      messageId: randomUUID(),
    };
  }
}

export async function createMainServiceTestApp(): Promise<{
  app: INestApplication;
  seedAuthUser: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
    staffCode?: string;
    isActive?: boolean;
  }) => Promise<{ id: string; email: string; role: UserRole; staffCode: string | null }>;
}> {
  const configValues: Record<string, string> = {
    'jwt.accessSecret': 'test-access-secret',
    'jwt.refreshSecret': 'test-refresh-secret',
    'jwt.accessExpiresIn': '15m',
    'jwt.refreshExpiresIn': '7d',
  };
  const bookingClock = {
    now: () => new Date('2026-04-01T00:00:00.000Z'),
  };

  const usersRepository = new InMemoryUsersRepository();
  const authRepository = new InMemoryAuthRepository(usersRepository);
  const vehiclesRepository = new InMemoryVehiclesRepository();
  const bookingsRepository = new InMemoryBookingsRepository(usersRepository, vehiclesRepository);
  const jobOrdersRepository = new InMemoryJobOrdersRepository();
  const backJobsRepository = new InMemoryBackJobsRepository();
  const insuranceRepository = new InMemoryInsuranceRepository();
  const chatbotRepository = new InMemoryChatbotRepository();
  const loyaltyRepository = new InMemoryLoyaltyRepository();
  const analyticsRepository = new InMemoryAnalyticsRepository();
  const notificationsRepository = new InMemoryNotificationsRepository();
  const notificationsQueue = new InMemoryNotificationsQueue();
  const qualityGatesRepository = new InMemoryQualityGatesRepository();
  const aiWorkerQueue = new InMemoryAiWorkerQueue();
  const googleIdentityService = new FakeGoogleIdentityService();
  const smtpMailService = new FakeSmtpMailService();
  const inspectionsRepository = new InMemoryInspectionsRepository();
  const vehicleLifecycleRepository = new InMemoryVehicleLifecycleRepository();

  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
    controllers: [
      HealthController,
      AnalyticsController,
      AuthController,
      UsersController,
      VehiclesController,
      BookingsController,
      ChatbotController,
      BackJobsController,
      InsuranceController,
      LoyaltyController,
      NotificationsController,
      JobOrdersController,
      QualityGatesController,
      InspectionsController,
      VehicleLifecycleController,
    ],
    providers: [
      AnalyticsService,
      AuthService,
      JwtStrategy,
      JwtAuthGuard,
      RolesGuard,
      UsersService,
      VehiclesService,
      BookingsService,
      ChatbotService,
      BackJobsService,
      InsuranceService,
      LoyaltyService,
      NotificationsService,
      JobOrdersService,
      QualityGateDiscrepancyEngineService,
      QualityGateSemanticAuditorService,
      QualityGatesService,
      InspectionsService,
      VehicleLifecycleSummaryProviderService,
      VehicleLifecycleService,
      AiWorkerProcessor,
      AutocareEventBusService,
      LoyaltyAccrualPlannerService,
      { provide: GoogleIdentityService, useValue: googleIdentityService },
      { provide: SmtpMailService, useValue: smtpMailService },
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: (key: string) => {
            const value = configValues[key];
            if (!value) {
              throw new Error(`Missing config value for ${key}`);
            }

            return value;
          },
          get: (key: string, fallback?: string) => configValues[key] ?? fallback,
        },
      },
      { provide: UsersRepository, useValue: usersRepository },
      { provide: AuthRepository, useValue: authRepository },
      { provide: VehiclesRepository, useValue: vehiclesRepository },
      { provide: BookingsRepository, useValue: bookingsRepository },
      { provide: BOOKINGS_CLOCK, useValue: bookingClock },
      { provide: JobOrdersRepository, useValue: jobOrdersRepository },
      { provide: BackJobsRepository, useValue: backJobsRepository },
      { provide: InsuranceRepository, useValue: insuranceRepository },
      { provide: ChatbotRepository, useValue: chatbotRepository },
      { provide: LoyaltyRepository, useValue: loyaltyRepository },
      { provide: AnalyticsRepository, useValue: analyticsRepository },
      { provide: NotificationsRepository, useValue: notificationsRepository },
      NotificationTriggerPlannerService,
      { provide: QualityGatesRepository, useValue: qualityGatesRepository },
      { provide: InspectionsRepository, useValue: inspectionsRepository },
      { provide: VehicleLifecycleRepository, useValue: vehicleLifecycleRepository },
      { provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME), useValue: notificationsQueue },
      { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: aiWorkerQueue },
    ],
  }).compile();

  aiWorkerQueue.registerProcessor(async (job) => {
    const processor = moduleRef.get(AiWorkerProcessor);
    await processor.process(job as never);
  });

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  setupSwagger(app);
  await app.init();

  return {
    app,
    seedAuthUser: async (payload) => {
      const user = await usersRepository.create({
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        role: payload.role ?? 'customer',
        staffCode: payload.staffCode,
      });
      if (!user) {
        throw new Error('Failed to seed auth user');
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);
      await authRepository.createAccount(user.id, passwordHash);

      if (payload.isActive === false) {
        await usersRepository.updateActivationStatus(user.id, false);
        await authRepository.updateAccountStatus(user.id, false);
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        staffCode: user.staffCode,
      };
    },
  };
}
