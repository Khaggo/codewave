import {
  buildOwnedVehicleInsuranceLabel,
  canAttachCustomerInsuranceDocument,
  customerInsuranceDocumentTypeOptions,
} from '../../lib/insuranceClient.js';
import {
  buildCustomerInsuranceOverviewState,
  buildCustomerInsuranceStatusState,
  buildRequirementsChecklist,
  getCustomerInsurancePaymentSummary,
  isTerminalCustomerInquiryStatus,
} from '../insuranceModuleView.mjs';
import {
  formatMissingRequiredDocumentSummary,
  formatTimestampLabel,
  formatWorkflowLabel,
  getInsuranceProcessSteps,
  getLatestInsuranceRecord,
  getPurposeLabel,
  getRequestGuidance,
  inquiryTypeOptions,
} from '../insuranceInquiryPresentationModel.mjs';
import {
  buildAuthoritativeRequirementsChecklist,
  hasUsableStagedDocumentFile,
} from './insuranceRequestFlow.mjs';

const asArray = (value) => (Array.isArray(value) ? value : []);

export function buildInsuranceWorkspaceViewModel({
  claimStatusUpdates = [],
  draft = {},
  latestInquiry = null,
  requirementsByKey = {},
  selectedVehicle = null,
  stagedDocuments = [],
  trackingState = 'idle',
  documentTypeOptions = customerInsuranceDocumentTypeOptions,
  coverageOptions = inquiryTypeOptions,
} = {}) {
  const safeStatusUpdates = asArray(claimStatusUpdates);
  const safeStagedDocuments = asArray(stagedDocuments);
  const selectedVehicleLabel = selectedVehicle
    ? buildOwnedVehicleInsuranceLabel(selectedVehicle)
    : '';
  const latestInquiryCanAcceptDocuments =
    canAttachCustomerInsuranceDocument(latestInquiry);
  const canSubmitNewInquiry =
    !latestInquiry || isTerminalCustomerInquiryStatus(latestInquiry.status);
  const canReuseOnFileDocuments =
    Boolean(latestInquiry?.id) &&
    !isTerminalCustomerInquiryStatus(latestInquiry.status);
  const activePurpose =
    latestInquiry && !canSubmitNewInquiry
      ? latestInquiry.purpose
      : draft.purpose;
  const requestPurpose = draft.purpose;
  const requestOnFileDocuments = canReuseOnFileDocuments
    ? asArray(latestInquiry?.documents)
    : [];
  const requestOnFileDocumentsByType = new Map(
    requestOnFileDocuments.map((document) => [
      document.documentType,
      document,
    ]),
  );
  const hasOnFileRenewalPolicy = Boolean(
    requestOnFileDocumentsByType.get('policy'),
  );
  const mergedRequestDocumentTypes = new Set(
    safeStagedDocuments
      .filter(hasUsableStagedDocumentFile)
      .map((document) => document.documentType),
  );

  requestOnFileDocuments.forEach((document) => {
    if (
      requestPurpose === 'renewal' &&
      document.documentType === 'policy' &&
      draft.renewalPolicyMode === 'replace'
    ) {
      return;
    }

    mergedRequestDocumentTypes.add(document.documentType);
  });

  const requestChecklistUploadedTypes = [...mergedRequestDocumentTypes];
  const requestGuidance = getRequestGuidance({ purpose: activePurpose });
  const requestRequirementKey = `${requestPurpose}:${draft.inquiryType}`;
  const requestAuthoritativeRequirements =
    requirementsByKey[requestRequirementKey];
  const requestRequirementsChecklist = requestAuthoritativeRequirements
    ? buildAuthoritativeRequirementsChecklist({
        requirements: requestAuthoritativeRequirements,
        uploadedTypes: requestChecklistUploadedTypes,
        documentTypeOptions,
      })
    : buildRequirementsChecklist({
        purpose: requestPurpose,
        uploadedTypes: requestChecklistUploadedTypes,
      });
  const activeInquiryType =
    latestInquiry?.inquiryType ?? draft.inquiryType;
  const activeRequirementKey = `${activePurpose}:${activeInquiryType}`;
  const activeAuthoritativeRequirements =
    requirementsByKey[activeRequirementKey];
  const activeUploadedTypes = asArray(latestInquiry?.documents).map(
    (document) => document.documentType,
  );
  const requirementsChecklist = activeAuthoritativeRequirements
    ? buildAuthoritativeRequirementsChecklist({
        requirements: activeAuthoritativeRequirements,
        uploadedTypes: activeUploadedTypes,
        documentTypeOptions,
      })
    : buildRequirementsChecklist({
        purpose: activePurpose,
        status: latestInquiry?.status,
        uploadedTypes: activeUploadedTypes,
      });
  const missingRequiredDocuments = requirementsChecklist.required.filter(
    (item) => !item.complete,
  );
  const paymentSummary = getCustomerInsurancePaymentSummary({
    status: latestInquiry?.status,
    paymentStatus: latestInquiry?.paymentStatus,
    paymentDueAt: latestInquiry?.paymentDueAt,
  });
  const overviewState = buildCustomerInsuranceOverviewState({
    selectedVehicleLabel,
    latestInquiry,
    missingRequiredDocuments,
    historyCount: safeStatusUpdates.length,
  });
  const latestRecord = getLatestInsuranceRecord(safeStatusUpdates);
  const latestStatusUpdateLabel =
    latestInquiry?.statusHint ||
    latestRecord?.statusHint ||
    formatTimestampLabel(latestRecord?.updatedAt ?? latestRecord?.createdAt);
  const isTrackingStale =
    trackingState === 'tracking_load_failed' &&
    Boolean(latestInquiry?.id || safeStatusUpdates.length);
  const statusState = buildCustomerInsuranceStatusState({
    latestInquiry,
    missingRequiredDocuments,
    latestUpdateLabel: latestStatusUpdateLabel,
    isStale: isTrackingStale,
  });
  statusState.inquiryReference = latestInquiry?.inquiryReference ?? null;
  const processSteps = getInsuranceProcessSteps({
    latestInquiry,
    missingRequiredDocuments,
  });
  const currentRequestSummary = latestInquiry?.id
    ? {
        referenceLabel:
          latestInquiry.referenceLabel ??
          latestInquiry.inquiryReference ??
          'Reference unavailable',
        purposeLabel: getPurposeLabel(latestInquiry.purpose),
        inquiryTypeLabel:
          latestInquiry.inquiryTypeLabel ?? 'Insurance',
        stageLabel: formatWorkflowLabel(latestInquiry.status),
        statusHint:
          latestInquiry.statusHint ?? requestGuidance.sectionHelper,
      }
    : {
        referenceLabel: 'Reference unavailable',
        purposeLabel: getPurposeLabel(activePurpose),
        inquiryTypeLabel:
          coverageOptions.find(
            (option) => option.value === draft.inquiryType,
          )?.label ?? 'Insurance',
        stageLabel: 'Not submitted',
        statusHint: requestGuidance.sectionHelper,
      };
  const missingDocumentSummary =
    formatMissingRequiredDocumentSummary(missingRequiredDocuments);
  const shellSummaryChips = [
    {
      label: 'Purpose',
      value: currentRequestSummary.purposeLabel,
    },
    {
      label: 'Stage',
      value: currentRequestSummary.stageLabel,
    },
    {
      label: 'Docs',
      value:
        missingRequiredDocuments.length > 0
          ? missingDocumentSummary ||
            `${missingRequiredDocuments.length} missing`
          : 'Ready',
      icon:
        missingRequiredDocuments.length > 0
          ? 'alert-circle-outline'
          : 'check-circle-outline',
      emphasis: missingRequiredDocuments.length > 0,
    },
  ];
  const sortedHistoryRecords = [...safeStatusUpdates].sort((left, right) => {
    const leftTimestamp = new Date(
      left?.updatedAt ?? left?.createdAt ?? 0,
    ).getTime();
    const rightTimestamp = new Date(
      right?.updatedAt ?? right?.createdAt ?? 0,
    ).getTime();

    return rightTimestamp - leftTimestamp;
  });
  const historySummary = sortedHistoryRecords.length
    ? `${sortedHistoryRecords.length} recorded insurance update${sortedHistoryRecords.length === 1 ? '' : 's'} ${sortedHistoryRecords.length === 1 ? 'is' : 'are'} already available for this vehicle.`
    : 'Vehicle-level insurance records will appear here after staff close and record a customer-safe case.';
  const latestHistoryRecord = sortedHistoryRecords[0] ?? null;
  const historyLatestUpdateLabel =
    latestHistoryRecord?.statusHint ??
    formatTimestampLabel(
      latestHistoryRecord?.updatedAt ?? latestHistoryRecord?.createdAt,
    );
  const historyStatusState = {
    title: sortedHistoryRecords.length
      ? 'Completed records'
      : 'No history yet',
    summary: historySummary,
    latestUpdateLabel: historyLatestUpdateLabel,
    timeline: [],
  };

  return {
    activePurpose,
    canSubmitNewInquiry,
    currentRequestSummary,
    hasOnFileRenewalPolicy,
    historyStatusState,
    latestInquiryCanAcceptDocuments,
    missingRequiredDocuments,
    overviewState,
    paymentSummary,
    processSteps,
    requestGuidance,
    requestOnFileDocuments,
    requestRequirementsChecklist,
    requirementsChecklist,
    selectedVehicleLabel,
    shellSummaryChips,
    sortedHistoryRecords,
    statusState,
  };
}
