import {
  insuranceCasePurposeEnum,
  insuranceDocumentTypeEnum,
  insuranceInquiryStatusEnum,
} from '../schemas/insurance.schema';

export type InsuranceDocumentType = (typeof insuranceDocumentTypeEnum.enumValues)[number];
export type InsuranceCasePurpose = (typeof insuranceCasePurposeEnum.enumValues)[number];
export type InsuranceInquiryStatus = (typeof insuranceInquiryStatusEnum.enumValues)[number];

type DocumentLike = {
  documentType?: string | null;
  status?: string | null;
};

type ActivityLike = {
  action?: string | null;
  documentType?: string | null;
};

const baselineMinimumCounts: Record<InsuranceCasePurpose, Partial<Record<InsuranceDocumentType, number>>> = {
  new_application: { or_cr: 1, valid_id: 1 },
  quotation: { or_cr: 1, valid_id: 1 },
  renewal: { or_cr: 1, valid_id: 1, policy: 1 },
  claim: { or_cr: 1, policy: 1, valid_id: 1, photo: 1 },
};

const conditionalDocumentTypes = new Set<InsuranceDocumentType>(['police_report']);
const nonCountableDocumentStatuses = new Set(['rejected', 'removed', 'deleted']);
const terminalStatuses = new Set<InsuranceInquiryStatus>(['closed', 'rejected', 'cancelled']);

const isDocumentType = (value: string): value is InsuranceDocumentType =>
  insuranceDocumentTypeEnum.enumValues.includes(value as InsuranceDocumentType);

export const canonicalizeInsuranceDateTime = (value?: Date | string | null) => {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const isTerminalInsuranceStatus = (status: InsuranceInquiryStatus) => terminalStatuses.has(status);

export const resolveInsuranceRequirements = ({
  purpose = 'quotation',
  documents = [],
  activities = [],
  requestedDocumentTypes = [],
}: {
  purpose?: InsuranceCasePurpose | null;
  documents?: DocumentLike[] | null;
  activities?: ActivityLike[] | null;
  requestedDocumentTypes?: string[] | null;
}) => {
  const resolvedPurpose = purpose ?? 'quotation';
  const requestedSet = new Set<InsuranceDocumentType>();

  for (const documentType of requestedDocumentTypes ?? []) {
    if (isDocumentType(documentType)) requestedSet.add(documentType);
  }
  for (const activity of activities ?? []) {
    const documentType = String(activity.documentType ?? '');
    if (activity.action === 'document_requested' && isDocumentType(documentType)) {
      requestedSet.add(documentType);
    }
  }

  const uploadedCounts = new Map<InsuranceDocumentType, number>();
  for (const document of documents ?? []) {
    const documentType = String(document.documentType ?? '');
    const status = String(document.status ?? '').toLowerCase();
    if (!isDocumentType(documentType) || nonCountableDocumentStatuses.has(status)) continue;
    uploadedCounts.set(documentType, (uploadedCounts.get(documentType) ?? 0) + 1);
  }

  const minimumCounts = baselineMinimumCounts[resolvedPurpose] ?? baselineMinimumCounts.quotation;
  const documentRequirements = insuranceDocumentTypeEnum.enumValues.map((documentType) => {
    const requested = requestedSet.has(documentType);
    const minimumCount = Math.max(minimumCounts[documentType] ?? 0, requested ? 1 : 0);
    const uploadedCount = uploadedCounts.get(documentType) ?? 0;
    return {
      documentType,
      minimumCount,
      uploadedCount,
      outstandingCount: Math.max(0, minimumCount - uploadedCount),
      required: minimumCount > 0,
      conditional: conditionalDocumentTypes.has(documentType),
      requested,
      satisfied: minimumCount === 0 || uploadedCount >= minimumCount,
    };
  });
  const requiredRequirements = documentRequirements.filter((requirement) => requirement.required);
  const complete = requiredRequirements.every((requirement) => requirement.satisfied);

  return {
    purpose: resolvedPurpose,
    complete,
    documentStatus: complete ? 'complete' as const : 'incomplete' as const,
    documentCount: [...uploadedCounts.values()].reduce((total, count) => total + count, 0),
    requiredDocumentTypes: requiredRequirements.map((requirement) => requirement.documentType),
    optionalDocumentTypes: documentRequirements
      .filter((requirement) => !requirement.required)
      .map((requirement) => requirement.documentType),
    requestedDocumentTypes: [...requestedSet],
    outstandingDocumentTypes: requiredRequirements
      .filter((requirement) => !requirement.satisfied)
      .map((requirement) => requirement.documentType),
    documentRequirements,
    minimumDocumentCounts: Object.fromEntries(
      documentRequirements.map((requirement) => [requirement.documentType, requirement.minimumCount]),
    ),
  };
};
