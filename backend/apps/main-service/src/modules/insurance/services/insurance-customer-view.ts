import { BadRequestException } from '@nestjs/common';

import { InsuranceRequirementsQueryDto } from '../dto/insurance-requirements.dto';
import { ListMyInsuranceInquiriesQueryDto } from '../dto/list-my-insurance-inquiries-query.dto';
import { InsuranceRepository } from '../repositories/insurance.repository';
import { insuranceDocumentTypeEnum } from '../schemas/insurance.schema';

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

const requiredDocumentTypesByPurpose: Record<string, string[]> = {
  renewal: ['or_cr', 'policy'],
  new_application: ['or_cr'],
  claim: ['or_cr'],
  quotation: ['or_cr'],
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
    documents?: Array<{ documentType?: string | null }> | null;
  },
>(inquiry: T): T => {
  if (inquiry?.documentStatus !== 'incomplete') {
    return inquiry;
  }

  const requiredDocumentTypes =
    requiredDocumentTypesByPurpose[String(inquiry?.purpose ?? 'quotation')]
    ?? requiredDocumentTypesByPurpose.quotation;
  const uploadedDocumentTypes = new Set(
    (Array.isArray(inquiry?.documents) ? inquiry.documents : [])
      .map((document) => document?.documentType)
      .filter(Boolean),
  );

  return requiredDocumentTypes.every((documentType) => uploadedDocumentTypes.has(documentType))
    ? { ...inquiry, documentStatus: 'complete' }
    : inquiry;
};

export const presentInquiryForActor = <
  T extends {
    customerDisplayName?: string;
    vehicleLabel?: string;
    documents?: Array<Record<string, unknown>>;
    activities?: Array<Record<string, unknown>>;
  },
>(inquiry: T, actor: InsuranceActor): T | CustomerInquiryProjection<T> => {
  if (actor.role !== 'customer') {
    return inquiry;
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
    ? documents.map(({ inquiryId: _inquiryId, uploadedByUserId: _uploader, ...document }) => document)
    : [];
  const customerActivities = Array.isArray(activities)
    ? activities
        .filter((activity) =>
          activity.action === 'document_uploaded'
          || Boolean(String(activity.customerMessage ?? '').trim()))
        .map(({ id: _id, actorUserId: _actor, notes: _notes, updatedAt: _updated, ...activity }) =>
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

export const getInsuranceRequirements = (query: InsuranceRequirementsQueryDto) => {
  const requiredDocumentTypes = requiredDocumentTypesByPurpose[query.purpose] ?? [];
  const requiredSet = new Set(requiredDocumentTypes);
  return {
    purpose: query.purpose,
    ...(query.inquiryType ? { inquiryType: query.inquiryType } : {}),
    requiredDocumentTypes,
    optionalDocumentTypes: insuranceDocumentTypeEnum.enumValues.filter(
      (documentType) => !requiredSet.has(documentType),
    ),
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
