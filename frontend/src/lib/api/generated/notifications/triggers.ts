export type NotificationTriggerName =
  | 'booking.reminder_requested'
  | 'insurance.inquiry_status_changed'
  | 'back_job.status_changed'
  | 'job_order.service_follow_up_requested'
  | 'order.invoice_issued'
  | 'invoice.payment_recorded';

export interface BookingReminderRequestedTrigger {
  name: 'booking.reminder_requested';
  sourceDomain: 'main-service.bookings';
  payload: {
    bookingId: string;
    userId: string;
    scheduledFor: string;
    appointmentStartsAt: string;
  };
}

export interface InsuranceInquiryStatusChangedTrigger {
  name: 'insurance.inquiry_status_changed';
  sourceDomain: 'main-service.insurance';
  payload: {
    inquiryId: string;
    userId: string;
    status:
      | 'submitted'
      | 'under_review'
      | 'needs_documents'
      | 'approved_for_record'
      | 'rejected'
      | 'closed';
    subject: string;
  };
}

export interface BackJobStatusChangedTrigger {
  name: 'back_job.status_changed';
  sourceDomain: 'main-service.back-jobs';
  payload: {
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
  };
}

export interface JobOrderServiceFollowUpRequestedTrigger {
  name: 'job_order.service_follow_up_requested';
  sourceDomain: 'main-service.job-orders';
  payload: {
    jobOrderId: string;
    userId: string;
    scheduledFor: string;
    serviceLabel?: string | null;
  };
}

export interface NotificationTriggerPlanAction {
  kind:
    | 'enqueue_notification'
    | 'schedule_reminder'
    | 'cancel_notifications'
    | 'cancel_reminder_rules';
  customerVisible: boolean;
}

export interface NotificationTriggerPlan {
  triggerName: NotificationTriggerName;
  sourceDomain:
    | 'main-service.bookings'
    | 'main-service.insurance'
    | 'main-service.back-jobs'
    | 'main-service.job-orders'
    | 'ecommerce.orders'
    | 'ecommerce.invoice-payments';
  dedupePolicy: 'stable-source-dedupe-v1';
  retryPolicy: 'bullmq-deliver-notification-v1';
  actions: NotificationTriggerPlanAction[];
}
