import { BadRequestException } from '@nestjs/common';

import { InsuranceRequirementsQueryDto } from '../dto/insurance-requirements.dto';
import { ListMyInsuranceInquiriesQueryDto } from '../dto/list-my-insurance-inquiries-query.dto';
import { InsuranceRepository } from '../repositories/insurance.repository';
import { resolveInsuranceRequirements } from './insurance-workflow-policy';

type InsuranceActor = {
  userId: string;
  role: string;
};

type CustomerHiddenInquiryField =
  | 'userId'
  | 'clientRequestId'
  | 'reviewNotes'
  | 'assignedStaffId'
  | 'customerDisplayName'
  | 'vehicleLabel'
  | 'createdByUserId'
  | 'reviewedByUserId'
  | 'reviewedAt'
  | 'documents'
  | 'activities';

type CustomerInquiryProjection<T> = Omit<T, CustomerHiddenInquiryField> & {
  documents: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
};

const encodeCursor = (createdAt: Date | string, id: string) =>
  Buffer.from(JSON.stringify({
    v: 1,
    createdAt: new Date(createdAt).toISOString(),
    id,
  }), 'utf8').toString('base64url');

const decodeCursor = (cursor?: string) => {
  if (!cursor) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      v?: unknown;
      createdAt?: unknown;
      id?: unknown;
    };
    const createdAt = new Date(String(parsed.createdAt ?? ''));
    if (
      parsed.v !== 1
      || Number.isNaN(createdAt.getTime())
      || typeof parsed.id !== 'string'
      || !parsed.id
    ) {
      throw new Error('Invalid cursor');
    }
    return { createdAt, id: parsed.id };
  } catch {
    throw new BadRequestException('Insurance inquiry cursor is invalid or expired');
  }
};

export const normalizeInquiryDocumentStatus = <
  T extends {
    purpose?: string | null;
    documentStatus?: string | null;
    documents?: Array<{ documentType?: string | null; status?: string | null }> | null;
    activities?: Array<{ action?: string | null; documentType?: string | null }> | null;
  },
>(inquiry: T): T & {
  documentCount: number;
  documentRequirements: ReturnType<typeof resolveInsuranceRequirements>['documentRequirements'];
  requestedDocumentTypes: ReturnType<typeof resolveInsuranceRequirements>['requestedDocumentTypes'];
  outstandingDocumentTypes: ReturnType<typeof resolveInsuranceRequirements>['outstandingDocumentTypes'];
} => {
  const requirements = resolveInsuranceRequirements({
    purpose: inquiry?.purpose as Parameters<typeof resolveInsuranceRequirements>[0]['purpose'],
    documents: inquiry?.documents,
    activities: inquiry?.activities,
  });

  return {
    ...inquiry,
    documentStatus: requirements.documentStatus,
    documentCount: requirements.documentCount,
    documentRequirements: requirements.documentRequirements,
    requestedDocumentTypes: requirements.requestedDocumentTypes,
    outstandingDocumentTypes: requirements.outstandingDocumentTypes,
  } as T & {
    documentCount: number;
    documentRequirements: ReturnType<typeof resolveInsuranceRequirements>['documentRequirements'];
    requestedDocumentTypes: ReturnType<typeof resolveInsuranceRequirements>['requestedDocumentTypes'];
    outstandingDocumentTypes: ReturnType<typeof resolveInsuranceRequirements>['outstandingDocumentTypes'];
  };
};

export const presentInquiryForActor = <
  T extends {
    customerDisplayName?: string;
    vehicleLabel?: string;
    documents?: Array<Record<string, unknown>>;
    activities?: Array<Record<string, unknown>>;
  },
>(inquiry: T, actor: InsuranceActor): T | CustomerInquiryProjection<T> => {
  const sanitizeDocument = (document: Record<string, unknown>, customer: boolean) => {
    const safeMetadata = {
      fileName: String(document.fileName ?? '').trim(),
      documentType: document.documentType ?? 'other',
      notes: document.notes ?? null,
      createdAt: document.createdAt ?? null,
      updatedAt: document.updatedAt ?? null,
    };
    if (customer) return safeMetadata;
    const documentId = String(document.id ?? '').trim();
    return {
      ...safeMetadata,
      downloadRoute: documentId
        ? `/api/insurance/documents/${encodeURIComponent(documentId)}/file`
        : null,
    };
  };

  if (actor.role !== 'customer') {
    return {
      ...inquiry,
      documents: Array.isArray(inquiry.documents)
        ? inquiry.documents.map((document) => sanitizeDocument(document, false))
        : [],
    } as T;
  }

  const {
    userId: _userId,
    clientRequestId: _clientRequestId,
    reviewNotes: _reviewNotes,
    assignedStaffId: _assignedStaffId,
    customerDisplayName: _customerDisplayName,
    vehicleLabel: _vehicleLabel,
    createdByUserId: _createdByUserId,
    reviewedByUserId: _reviewedByUserId,
    reviewedAt: _reviewedAt,
    documents,
    activities,
    ...customerInquiry
  } = inquiry as T & Record<string, unknown>;

  const customerDocuments = Array.isArray(documents)
    ? documents.map((document) => sanitizeDocument(document, true))
    : [];
  const customerActivities = Array.isArray(activities)
    ? activities
        .filter((activity) =>
          activity.action === 'document_uploaded'
          || Boolean(String(activity.customerMessage ?? '').trim()))
        .map(({ id: _id, inquiryId: _inquiryId, actorUserId: _actor, notes: _notes, updatedAt: _updated, ...activity }) =>
          activity)
    : [];

  return {
    ...customerInquiry,
    documents: customerDocuments,
    activities: customerActivities,
  } as CustomerInquiryProjection<T>;
};

export const presentInsuranceRecordsForActor = <
  T extends { id: unknown; inquiryId: unknown; userId: unknown; vehicleId: unknown },
>(records: T[], actor: InsuranceActor) => {
  if (actor.role !== 'customer') {
    return records;
  }
  return records.map(({ id: _id, inquiryId: _inquiry, userId: _user, vehicleId: _vehicle, ...record }) =>
    record);
};

export const getInsuranceRequirements = (
  query: InsuranceRequirementsQueryDto,
  requestedDocumentTypes: string[] = [],
  documents: Array<{ documentType?: string | null; status?: string | null }> = [],
) => {
  const requirements = resolveInsuranceRequirements({
    purpose: query.purpose,
    documents,
    requestedDocumentTypes,
  });
  return {
    purpose: query.purpose,
    ...(query.inquiryType ? { inquiryType: query.inquiryType } : {}),
    requiredDocumentTypes: requirements.requiredDocumentTypes,
    optionalDocumentTypes: requirements.optionalDocumentTypes,
    requestedDocumentTypes: requirements.requestedDocumentTypes,
    outstandingDocumentTypes: requirements.outstandingDocumentTypes,
    documentRequirements: requirements.documentRequirements,
    minimumDocumentCounts: requirements.minimumDocumentCounts,
  };
};

export const listCustomerInsuranceInquiries = async (
  repository: InsuranceRepository,
  query: ListMyInsuranceInquiriesQueryDto,
  actor: InsuranceActor,
) => {
  const limit = query.limit ?? 20;
  const page = await repository.listForCustomer({
    userId: actor.userId,
    vehicleId: query.vehicleId,
    status: query.status,
    cursor: decodeCursor(query.cursor),
    limit,
  });
  const lastItem = page.items[page.items.length - 1];

  return {
    items: page.items.map((inquiry) =>
      presentInquiryForActor(normalizeInquiryDocumentStatus(inquiry), actor)),
    page: {
      limit,
      hasNext: page.hasNext,
      nextCursor: page.hasNext && lastItem
        ? encodeCursor(lastItem.createdAt, lastItem.id)
        : null,
    },
  };
};
