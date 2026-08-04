import { isTerminalCustomerInquiryStatus } from '../insuranceModuleView.mjs';

export const REMEMBERED_INSURANCE_INQUIRY_STORAGE_KEY =
  'codewave:insurance:remembered-inquiries';

const normalizeId = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return normalizedValue || null;
};

export const buildInsuranceTrackingStorageKey = (userId) => {
  const normalizedUserId = normalizeId(userId);
  return normalizedUserId
    ? `${REMEMBERED_INSURANCE_INQUIRY_STORAGE_KEY}:${normalizedUserId}`
    : REMEMBERED_INSURANCE_INQUIRY_STORAGE_KEY;
};

export const parseRememberedInsuranceInquiryMappings = (serializedValue) => {
  if (!serializedValue) {
    return {};
  }

  try {
    const parsedValue =
      typeof serializedValue === 'string' ? JSON.parse(serializedValue) : serializedValue;

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue)
        .map(([vehicleId, inquiryId]) => [normalizeId(vehicleId), normalizeId(inquiryId)])
        .filter(([vehicleId, inquiryId]) => vehicleId && inquiryId),
    );
  } catch {
    return {};
  }
};

export const serializeRememberedInsuranceInquiryMappings = (mappings) =>
  JSON.stringify(parseRememberedInsuranceInquiryMappings(mappings));

export const getRememberedInsuranceInquiryId = (mappings, vehicleId) => {
  const normalizedVehicleId = normalizeId(vehicleId);
  return normalizedVehicleId
    ? normalizeId(parseRememberedInsuranceInquiryMappings(mappings)[normalizedVehicleId])
    : null;
};

export const updateRememberedInsuranceInquiryMappings = ({
  inquiry,
  mappings,
  vehicleId,
}) => {
  const normalizedMappings = parseRememberedInsuranceInquiryMappings(mappings);
  const normalizedVehicleId = normalizeId(vehicleId);

  if (!normalizedVehicleId) {
    return normalizedMappings;
  }

  const nextMappings = { ...normalizedMappings };
  const inquiryId = normalizeId(inquiry?.id);

  if (inquiryId && !isTerminalCustomerInquiryStatus(inquiry?.status)) {
    nextMappings[normalizedVehicleId] = inquiryId;
  } else {
    delete nextMappings[normalizedVehicleId];
  }

  return nextMappings;
};

export const selectRecoveredInsuranceInquiry = ({
  inquiries,
  knownInquiryId,
}) => {
  const normalizedInquiries = Array.isArray(inquiries) ? inquiries.filter(Boolean) : [];
  const normalizedKnownInquiryId = normalizeId(knownInquiryId);

  return (
    normalizedInquiries.find((inquiry) => inquiry.id === normalizedKnownInquiryId) ??
    normalizedInquiries.find(
      (inquiry) => !isTerminalCustomerInquiryStatus(inquiry?.status),
    ) ??
    normalizedInquiries[0] ??
    null
  );
};

export const shouldDiscardRememberedInsuranceInquiry = (status) =>
  status === 400 || status === 404;
