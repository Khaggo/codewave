import { ApiError } from './authClient.js';

const INSURANCE_REMINDER_FILTER_FIELDS = [
  'purpose',
  'status',
  'paymentStatus',
  'renewalStatus',
];
const INSURANCE_BROADCAST_FILTER_FIELDS = [
  'purpose',
  'status',
  'paymentStatus',
  'renewalStatus',
];
const INSURANCE_BROADCAST_TARGET_MODES = [
  'selected_cases',
  'filtered_results',
];

const normalizeMeaningfulFilters = (filters, supportedFields) =>
  supportedFields.reduce((result, field) => {
    const rawValue = String(filters?.[field] ?? '').trim();

    if (rawValue && rawValue !== 'all') {
      result[field] = rawValue;
    }

    return result;
  }, {});

const normalizeSelectedIds = (selectedIds = []) =>
  [
    ...new Set(
      selectedIds
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  ];

export const buildInsuranceReminderRequestBody = ({
  reminderType,
  targetMode,
  selectedIds = [],
  filters = {},
} = {}) => {
  const normalizedReminderType = String(reminderType ?? '').trim();
  const normalizedTargetMode = String(targetMode ?? '').trim();

  if (!normalizedReminderType || !normalizedTargetMode) {
    throw new ApiError(
      'Reminder type and target mode are required before sending reminders.',
      400,
      { path: '/api/insurance/reminders/send' },
    );
  }

  if (normalizedTargetMode === 'filtered_results') {
    const normalizedFilters = normalizeMeaningfulFilters(
      filters,
      INSURANCE_REMINDER_FILTER_FIELDS,
    );

    if (!Object.keys(normalizedFilters).length) {
      throw new ApiError(
        'Choose at least one server-side insurance filter before sending filtered reminders.',
        400,
        { path: '/api/insurance/reminders/send' },
      );
    }

    return {
      reminderType: normalizedReminderType,
      targetMode: normalizedTargetMode,
      filters: normalizedFilters,
    };
  }

  const normalizedSelectedIds = normalizeSelectedIds(selectedIds);

  if (!normalizedSelectedIds.length) {
    throw new ApiError(
      'Select at least one insurance case before sending reminders.',
      400,
      { path: '/api/insurance/reminders/send' },
    );
  }

  if (
    normalizedTargetMode === 'single_case' &&
    normalizedSelectedIds.length !== 1
  ) {
    throw new ApiError(
      'Single-case reminders require exactly one selected insurance case.',
      400,
      { path: '/api/insurance/reminders/send' },
    );
  }

  return {
    reminderType: normalizedReminderType,
    targetMode: normalizedTargetMode,
    selectedIds: normalizedSelectedIds,
  };
};

export const buildInsuranceBroadcastRequestBody = ({
  targetMode,
  selectedIds = [],
  filters = {},
  title,
  message,
} = {}) => {
  const normalizedTargetMode = String(targetMode ?? '').trim();
  const normalizedTitle = String(title ?? '').trim();
  const normalizedMessage = String(message ?? '').trim();

  if (!normalizedTitle || !normalizedMessage || !normalizedTargetMode) {
    throw new ApiError(
      'Title, message, and target mode are required before sending broadcasts.',
      400,
      { path: '/api/insurance/broadcasts/send' },
    );
  }

  if (!INSURANCE_BROADCAST_TARGET_MODES.includes(normalizedTargetMode)) {
    throw new ApiError(
      'Broadcast target mode must be selected_cases or filtered_results.',
      400,
      { path: '/api/insurance/broadcasts/send' },
    );
  }

  if (normalizedTargetMode === 'filtered_results') {
    const normalizedFilters = normalizeMeaningfulFilters(
      filters,
      INSURANCE_BROADCAST_FILTER_FIELDS,
    );

    if (!Object.keys(normalizedFilters).length) {
      throw new ApiError(
        'Choose at least one server-side insurance filter before sending filtered broadcasts.',
        400,
        { path: '/api/insurance/broadcasts/send' },
      );
    }

    return {
      targetMode: normalizedTargetMode,
      filters: normalizedFilters,
      title: normalizedTitle,
      message: normalizedMessage,
    };
  }

  const normalizedSelectedIds = normalizeSelectedIds(selectedIds);

  if (!normalizedSelectedIds.length) {
    throw new ApiError(
      'Select at least one insurance case before sending broadcasts.',
      400,
      { path: '/api/insurance/broadcasts/send' },
    );
  }

  return {
    targetMode: normalizedTargetMode,
    selectedIds: normalizedSelectedIds,
    title: normalizedTitle,
    message: normalizedMessage,
  };
};
