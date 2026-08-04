export const inquiryTypeOptions = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'ctpl', label: 'CTPL' },
];

export const purposeOptions = [
  { value: 'new_application', label: 'New' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'claim', label: 'Claim' },
  { value: 'quotation', label: 'Quotation' },
];

export const getPurposeLabel = (value) =>
  purposeOptions.find((option) => option.value === value)?.label ?? 'Request';

export const getRequestGuidance = ({ purpose = 'claim' } = {}) => {
  switch (purpose) {
    case 'new_application':
      return {
        sectionHelper: 'Start a fresh application for this vehicle.',
        processLine: 'Staff review the intake first, then prepare the estimate and insurer follow-up.',
        descriptionPlaceholder: 'Share the vehicle use, coverage need, or concern.',
        notesPlaceholder: 'Optional application detail',
        providerPlaceholder: 'Preferred insurer or broker',
        policyPlaceholder: 'Leave blank if no old policy',
      };
    case 'renewal':
      return {
        sectionHelper: 'Prepare the next renewal quote and confirm the current policy details.',
        processLine: 'Staff review the intake first, then prepare the renewal quote and follow-up updates.',
        descriptionPlaceholder: 'Share the renewal request, timing, or concern.',
        notesPlaceholder: 'Optional renewal detail',
        providerPlaceholder: 'Current insurer or broker',
        policyPlaceholder: 'Current or replacement policy number',
      };
    case 'quotation':
      return {
        sectionHelper: 'Ask for coverage pricing or a policy estimate.',
        processLine: 'Staff review the intake first, then prepare the quotation or estimate.',
        descriptionPlaceholder: 'Tell staff what coverage or pricing you need.',
        notesPlaceholder: 'Optional quotation detail',
        providerPlaceholder: 'Preferred insurer or broker',
        policyPlaceholder: 'Policy reference if available',
      };
    case 'claim':
    default:
      return {
        sectionHelper: 'Start the claim intake and capture the incident clearly.',
        processLine: 'Staff review the intake first, then prepare the estimate and insurer approval steps.',
        descriptionPlaceholder: 'Describe the incident, damage, or claim concern.',
        notesPlaceholder: 'Optional claim detail',
        providerPlaceholder: 'Insurer or broker',
        policyPlaceholder: 'Policy number',
      };
  }
};

export const buildInsuranceInquirySubject = ({
  purpose = 'claim',
  vehicleLabel = '',
} = {}) => {
  const purposeLabel = getPurposeLabel(purpose);
  const trimmedVehicleLabel = String(vehicleLabel ?? '').trim();

  return trimmedVehicleLabel
    ? `${purposeLabel} - ${trimmedVehicleLabel}`
    : `${purposeLabel} insurance request`;
};

export const formatMissingRequiredDocumentSummary = (missingRequiredDocuments = []) =>
  (Array.isArray(missingRequiredDocuments) ? missingRequiredDocuments : [])
    .map((item) => String(item?.label ?? '').trim())
    .filter(Boolean)
    .join(', ');

const buildProcessStepState = ({ active, done }) => ({
  active: Boolean(active || done),
  done: Boolean(done),
});

export const getInsuranceProcessSteps = ({
  latestInquiry = null,
  missingRequiredDocuments = [],
} = {}) => {
  const purpose = latestInquiry?.purpose ?? 'claim';
  const status = latestInquiry?.status ?? 'submitted';
  const paymentStatus = latestInquiry?.paymentStatus ?? 'not_required';
  const renewalStatus = latestInquiry?.renewalStatus ?? 'not_applicable';
  const missingCount = Array.isArray(missingRequiredDocuments)
    ? missingRequiredDocuments.length
    : 0;
  const reviewReached = [
    'under_review',
    'for_approval',
    'approved',
    'payment_pending',
    'active',
    'for_renewal',
    'closed',
  ].includes(status);
  const approvalReached = [
    'for_approval',
    'approved',
    'payment_pending',
    'active',
    'for_renewal',
    'closed',
  ].includes(status);
  const paymentRelevant =
    status === 'payment_pending' ||
    ['proof_submitted', 'verifying', 'paid', 'overdue', 'unpaid', 'awaiting_payment'].includes(
      paymentStatus,
    );
  const renewalRelevant =
    purpose === 'renewal' ||
    status === 'for_renewal' ||
    ['upcoming', 'quoted', 'awaiting_customer', 'renewed', 'expired'].includes(renewalStatus);
  const steps = [
    {
      key: 'intake',
      label: 'Inquiry received',
      ...buildProcessStepState({ active: true, done: Boolean(latestInquiry?.id) }),
    },
    {
      key: 'documents',
      label: missingCount > 0 ? 'Documents needed' : 'Documents ready',
      ...buildProcessStepState({
        active: Boolean(latestInquiry?.id),
        done: Boolean(latestInquiry?.id) && missingCount === 0,
      }),
    },
    {
      key: 'review',
      label: 'Estimate and review',
      ...buildProcessStepState({
        active: reviewReached,
        done: [
          'for_approval',
          'approved',
          'payment_pending',
          'active',
          'for_renewal',
          'closed',
        ].includes(status),
      }),
    },
    {
      key: 'approval',
      label: 'Approval',
      ...buildProcessStepState({
        active: approvalReached,
        done: ['approved', 'payment_pending', 'active', 'for_renewal', 'closed'].includes(
          status,
        ),
      }),
    },
  ];

  if (paymentRelevant) {
    steps.push({
      key: 'payment',
      label: 'Payment follow-up',
      ...buildProcessStepState({
        active: paymentRelevant,
        done: paymentStatus === 'paid',
      }),
    });
  }

  if (renewalRelevant) {
    steps.push({
      key: 'renewal',
      label: 'Renewal',
      ...buildProcessStepState({
        active: renewalRelevant,
        done: renewalStatus === 'renewed',
      }),
    });
  }

  if (status === 'active') {
    steps.push({
      key: 'active',
      label: 'Active',
      ...buildProcessStepState({ active: true, done: true }),
    });
  } else if (status === 'closed') {
    steps.push({
      key: 'closed',
      label: 'Completed',
      ...buildProcessStepState({ active: true, done: true }),
    });
  } else if (status === 'cancelled') {
    steps.push({
      key: 'cancelled',
      label: 'Cancelled',
      ...buildProcessStepState({ active: true, done: false }),
    });
  } else if (status === 'rejected') {
    steps.push({
      key: 'rejected',
      label: 'Stopped',
      ...buildProcessStepState({ active: true, done: false }),
    });
  }

  return steps;
};

export const formatTimestampLabel = (value) => {
  if (!value) {
    return '--';
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }
  return parsedDate.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatWorkflowLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || '--';

export const buildInitialDocumentUploadDraft = () => ({
  documentType: 'photo',
  fileName: '',
  fileUri: '',
  mimeType: 'application/pdf',
  notes: '',
  fileSizeLabel: null,
  webFile: null,
});

export const inferMimeType = (fileName, fallbackType = 'application/pdf') => {
  const normalizedFileName = String(fileName ?? '').trim().toLowerCase();
  if (normalizedFileName.endsWith('.pdf')) return 'application/pdf';
  if (normalizedFileName.endsWith('.png')) return 'image/png';
  if (normalizedFileName.endsWith('.webp')) return 'image/webp';
  if (normalizedFileName.endsWith('.heic')) return 'image/heic';
  if (
    normalizedFileName.endsWith('.jpg') ||
    normalizedFileName.endsWith('.jpeg')
  ) {
    return 'image/jpeg';
  }
  return String(fallbackType ?? '').trim() || 'application/pdf';
};

export const buildRenewalPrompt = (inquiry) => {
  switch (inquiry?.renewalStatus) {
    case 'upcoming':
      return {
        title: 'Renewal reminder',
        message: 'Your renewal window is coming up. Keep an eye on this request for the next quote or follow-up step.',
        tone: 'default',
      };
    case 'quoted':
      return {
        title: 'Renewal quote ready',
        message: 'A renewal quote is already being prepared or has been shared. Refresh for the latest customer-safe status.',
        tone: 'default',
      };
    case 'awaiting_customer':
      return {
        title: 'Renewal waiting on you',
        message: 'Staff are waiting for your next renewal decision or supporting documents.',
        tone: 'default',
      };
    case 'renewed':
      return {
        title: 'Renewal completed',
        message: 'This renewal is already tagged as completed.',
        tone: 'success',
      };
    case 'expired':
      return {
        title: 'Renewal overdue',
        message: 'This insurance record is past its renewal window. Contact staff if you still need coverage support.',
        tone: 'danger',
      };
    default:
      return {
        title: 'Renewal visibility',
        message: 'Renewal reminders will appear here once staff tag the request for follow-up.',
        tone: 'default',
      };
  }
};

export const getLatestInsuranceRecord = (records) =>
  (Array.isArray(records) ? records : []).reduce((currentLatest, record) => {
    const currentValue = new Date(record?.updatedAt ?? record?.createdAt ?? 0).getTime();
    const latestValue = new Date(
      currentLatest?.updatedAt ?? currentLatest?.createdAt ?? 0,
    ).getTime();
    return currentValue > latestValue ? record : currentLatest;
  }, null);

export const buildHistoryRecordTitle = (record) => {
  const statusLabel = formatWorkflowLabel(record?.status);
  return record?.inquiryTypeLabel
    ? `${record.inquiryTypeLabel} - ${statusLabel}`
    : statusLabel;
};

export const buildHistoryRecordSummary = (record) => {
  const latestUpdateLabel = formatTimestampLabel(record?.updatedAt ?? record?.createdAt);
  const summaryParts = [
    record?.statusHint,
    latestUpdateLabel !== '--' ? `Latest update: ${latestUpdateLabel}` : null,
    record?.providerName ? `Provider: ${record.providerName}` : null,
    record?.policyNumber ? `Policy no.: ${record.policyNumber}` : null,
  ].filter(Boolean);

  return summaryParts.join(' ') || 'Completed insurance record.';
};
