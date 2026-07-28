import type {
  BackJobFindingRecord,
  BackJobRecord,
  BookingRecord,
  BookingReservationPaymentRecord,
  BookingServiceRecord,
  BookingStatusHistoryRecord,
  InsuranceActivityRecord,
  InsuranceDocumentRecord,
  InsuranceInquiryRecord,
  JobOrderAssignmentRecord,
  JobOrderInvoiceRecord,
  JobOrderItemRecord,
  JobOrderPhotoRecord,
  JobOrderProgressEntryRecord,
  JobOrderRecord,
  NotificationDeliveryAttemptRecord,
  NotificationRecord,
  QualityGateFindingRecord,
  QualityGateOverrideRecord,
  QualityGateRecord,
  ServiceRecord,
  TimeSlotRecord,
  UserRecord,
  VehicleRecord,
} from './main-service-test-app';

export const cloneUser = (user: UserRecord | null | undefined) => {
  if (!user) return user ?? null;
  return {
    ...user,
    profile: { ...user.profile },
    addresses: user.addresses.map((address) => ({ ...address })),
  };
};

export const cloneBooking = (
  booking: BookingRecord | null | undefined,
  servicesById: Map<string, ServiceRecord>,
  timeSlotsById: Map<string, TimeSlotRecord>,
  bookingServicesList: BookingServiceRecord[],
  bookingStatusHistoryList: BookingStatusHistoryRecord[],
  reservationPaymentsByBookingId: Map<string, BookingReservationPaymentRecord>,
  user?: UserRecord | null,
  vehicle?: VehicleRecord | null,
) => {
  if (!booking) return booking ?? null;
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
    reservationPayment: reservationPaymentsByBookingId.get(booking.id)
      ? { ...reservationPaymentsByBookingId.get(booking.id)! }
      : null,
    statusHistory: bookingStatusHistoryList
      .filter((entry) => entry.bookingId === booking.id)
      .sort((left, right) => right.changedAt.getTime() - left.changedAt.getTime())
      .map((entry) => ({ ...entry })),
  };
};

export const cloneJobOrder = (
  jobOrder: JobOrderRecord | null | undefined,
  items: JobOrderItemRecord[],
  assignments: JobOrderAssignmentRecord[],
  progressEntries: JobOrderProgressEntryRecord[],
  photos: JobOrderPhotoRecord[],
  invoiceRecords: JobOrderInvoiceRecord[],
) => {
  if (!jobOrder) return jobOrder ?? null;
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

export const cloneQualityGate = (
  qualityGate: QualityGateRecord | null | undefined,
  findings: QualityGateFindingRecord[],
  overrides: QualityGateOverrideRecord[],
) => {
  if (!qualityGate) return qualityGate ?? null;
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

export const cloneBackJob = (
  backJob: BackJobRecord | null | undefined,
  findings: BackJobFindingRecord[],
) => {
  if (!backJob) return backJob ?? null;
  return {
    ...backJob,
    findings: findings
      .filter((finding) => finding.backJobId === backJob.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((finding) => ({ ...finding })),
  };
};

export const cloneInsuranceInquiry = (
  inquiry: InsuranceInquiryRecord | null | undefined,
  documents: InsuranceDocumentRecord[],
  activities: InsuranceActivityRecord[],
) => {
  if (!inquiry) return inquiry ?? null;
  return {
    ...inquiry,
    documents: documents
      .filter((document) => document.inquiryId === inquiry.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((document) => ({ ...document })),
    activities: activities
      .filter((activity) => activity.inquiryId === inquiry.id)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((activity) => ({ ...activity })),
  };
};

export const cloneNotification = (
  notification: NotificationRecord | null | undefined,
  attempts: NotificationDeliveryAttemptRecord[],
) => {
  if (!notification) return notification ?? null;
  return {
    ...notification,
    attempts: attempts
      .filter((attempt) => attempt.notificationId === notification.id)
      .sort((left, right) => right.attemptedAt.getTime() - left.attemptedAt.getTime())
      .map((attempt) => ({ ...attempt })),
  };
};
