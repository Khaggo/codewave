export const notificationTriggerNames = [
  'booking.reminder_requested',
  'insurance.inquiry_status_changed',
  'back_job.status_changed',
  'job_order.service_follow_up_requested',
] as const;

export type NotificationTriggerName = (typeof notificationTriggerNames)[number];
export type NotificationTriggerSourceDomain =
  | 'main-service.bookings'
  | 'main-service.insurance'
  | 'main-service.back-jobs'
  | 'main-service.job-orders';

export interface BookingReminderRequestedTriggerPayload {
  bookingId: string;
  userId: string;
  scheduledFor: string;
  appointmentStartsAt: string;
}

export type InsuranceInquiryNotificationStatus =
  | 'submitted'
  | 'needs_documents'
  | 'under_review'
  | 'for_approval'
  | 'approved'
  | 'payment_pending'
  | 'active'
  | 'for_renewal'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export type InsuranceInquiryPaymentStatus =
  | 'not_required'
  | 'unpaid'
  | 'proof_submitted'
  | 'verifying'
  | 'paid'
  | 'overdue';

export type InsuranceInquiryRenewalStatus =
  | 'not_applicable'
  | 'upcoming'
  | 'quote_preparing'
  | 'quoted'
  | 'awaiting_customer'
  | 'renewed'
  | 'expired'
  | 'cancelled';

export type InsuranceCustomerReminderState =
  | 'needs_documents'
  | 'payment_pending'
  | 'payment_overdue'
  | 'for_renewal'
  | 'renewal_awaiting_customer';

export interface InsuranceInquiryStatusChangedTriggerPayload {
  inquiryId: string;
  userId: string;
  status: InsuranceInquiryNotificationStatus;
  paymentStatus: InsuranceInquiryPaymentStatus;
  renewalStatus: InsuranceInquiryRenewalStatus;
  customerReminderState: InsuranceCustomerReminderState;
  transitionedAt: string;
  subject: string;
}

export interface BackJobStatusChangedTriggerPayload {
  backJobId: string;
  customerUserId: string;
  status:
    | 'reported'
    | 'inspected'
    | 'approved_for_rework'
    | 'in_progress'
    | 'resolved'
    | 'closed'
    | 'rejected';
}

export interface JobOrderServiceFollowUpRequestedTriggerPayload {
  jobOrderId: string;
  userId: string;
  scheduledFor: string;
  serviceLabel?: string | null;
}

export interface NotificationTriggerPayloadByName {
  'booking.reminder_requested': BookingReminderRequestedTriggerPayload;
  'insurance.inquiry_status_changed': InsuranceInquiryStatusChangedTriggerPayload;
  'back_job.status_changed': BackJobStatusChangedTriggerPayload;
  'job_order.service_follow_up_requested': JobOrderServiceFollowUpRequestedTriggerPayload;
}

export interface NotificationTriggerEnvelope<
  TName extends NotificationTriggerName = NotificationTriggerName,
  TPayload extends NotificationTriggerPayloadByName[TName] = NotificationTriggerPayloadByName[TName],
> {
  name: TName;
  version: 1;
  sourceDomain: NotificationTriggerSourceDomain;
  payload: TPayload;
}

export type AnyNotificationTriggerEnvelope = {
  [TName in NotificationTriggerName]: NotificationTriggerEnvelope<TName>;
}[NotificationTriggerName];

export function createNotificationTrigger<TName extends NotificationTriggerName>(
  name: TName,
  sourceDomain: NotificationTriggerSourceDomain,
  payload: NotificationTriggerPayloadByName[TName],
): NotificationTriggerEnvelope<TName> {
  return {
    name,
    version: 1,
    sourceDomain,
    payload,
  };
}

export function isNotificationTriggerEnvelope(value: unknown): value is AnyNotificationTriggerEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AnyNotificationTriggerEnvelope>;

  return (
    typeof candidate.name === 'string' &&
    notificationTriggerNames.includes(candidate.name as NotificationTriggerName) &&
    typeof candidate.version === 'number' &&
    candidate.version === 1 &&
    typeof candidate.sourceDomain === 'string' &&
    [
      'main-service.bookings',
      'main-service.insurance',
      'main-service.back-jobs',
      'main-service.job-orders',
    ].includes(candidate.sourceDomain) &&
    candidate.payload !== null &&
    typeof candidate.payload === 'object'
  );
}
