export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
  requestId?: string;
};

export type KeysetPage<TItem, TCursor extends string = string> = {
  items: TItem[];
  nextCursor: TCursor | null;
  hasMore: boolean;
};

export type StaffQueueType = 'job_order' | 'qa_audit';

export type StaffClaimLease = {
  claimId: string;
  queueType: StaffQueueType;
  recordId: string;
  ownerUserId: string;
  claimedAt: string;
  leaseExpiresAt: string;
  heartbeatAt: string | null;
};

export type WorkshopHandoffResult = {
  jobOrderId: string;
  reference: string;
  created: boolean;
};
