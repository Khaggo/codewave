import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInsuranceWorkspaceViewModel } from './insuranceWorkspaceViewModel.mjs';

const claimDraft = {
  purpose: 'claim',
  inquiryType: 'comprehensive',
  renewalPolicyMode: 'reuse',
};

const selectedVehicle = {
  id: 'vehicle-1',
  displayName: '2024 Toyota Vios',
  plateNumber: 'ABC1234',
};

test('insurance workspace model builds a first-request summary from authoritative requirements', () => {
  const result = buildInsuranceWorkspaceViewModel({
    draft: claimDraft,
    selectedVehicle,
    requirementsByKey: {
      'claim:comprehensive': {
        purpose: 'claim',
        requiredDocumentTypes: ['or_cr', 'valid_id'],
        optionalDocumentTypes: ['photo'],
      },
    },
    stagedDocuments: [
      {
        documentType: 'or_cr',
        fileName: 'registration.pdf',
        fileUri: 'file:///registration.pdf',
      },
    ],
  });

  assert.equal(result.canSubmitNewInquiry, true);
  assert.match(result.selectedVehicleLabel, /2024 Toyota Vios/);
  assert.match(result.selectedVehicleLabel, /ABC1234/);
  assert.equal(result.currentRequestSummary.stageLabel, 'Not submitted');
  assert.deepEqual(
    result.requestRequirementsChecklist.required.map((item) => ({
      type: item.type,
      complete: item.complete,
    })),
    [
      { type: 'or_cr', complete: true },
      { type: 'valid_id', complete: false },
    ],
  );
  assert.equal(result.shellSummaryChips[2].emphasis, true);
  assert.match(result.shellSummaryChips[2].value, /Valid ID/i);
});

test('insurance workspace model uses active inquiry documents and blocks duplicate submission', () => {
  const latestInquiry = {
    id: 'inquiry-1',
    purpose: 'renewal',
    inquiryType: 'comprehensive',
    inquiryTypeLabel: 'Comprehensive',
    status: 'under_review',
    statusHint: 'Staff review is active.',
    documents: [
      {
        id: 'document-1',
        documentType: 'or_cr',
        fileName: 'registration.pdf',
      },
      {
        id: 'document-2',
        documentType: 'policy',
        fileName: 'policy.pdf',
      },
    ],
  };
  const result = buildInsuranceWorkspaceViewModel({
    draft: claimDraft,
    latestInquiry,
    requirementsByKey: {
      'renewal:comprehensive': {
        purpose: 'renewal',
        requiredDocumentTypes: ['or_cr', 'policy'],
        optionalDocumentTypes: [],
      },
    },
  });

  assert.equal(result.activePurpose, 'renewal');
  assert.equal(result.canSubmitNewInquiry, false);
  assert.equal(result.latestInquiryCanAcceptDocuments, true);
  assert.equal(result.currentRequestSummary.stageLabel, 'Under Review');
  assert.equal(result.requestOnFileDocuments.length, 2);
  assert.equal(result.missingRequiredDocuments.length, 0);
  assert.equal(result.shellSummaryChips[2].value, 'Ready');
});

test('insurance workspace model orders customer history newest first and marks stale tracking', () => {
  const result = buildInsuranceWorkspaceViewModel({
    draft: claimDraft,
    latestInquiry: {
      id: 'inquiry-1',
      purpose: 'claim',
      inquiryType: 'comprehensive',
      status: 'under_review',
      documents: [],
    },
    claimStatusUpdates: [
      {
        id: 'older',
        statusHint: 'Older update',
        updatedAt: '2026-07-20T08:00:00.000Z',
      },
      {
        id: 'newer',
        statusHint: 'Newest update',
        updatedAt: '2026-07-21T08:00:00.000Z',
      },
    ],
    trackingState: 'tracking_load_failed',
  });

  assert.deepEqual(
    result.sortedHistoryRecords.map((record) => record.id),
    ['newer', 'older'],
  );
  assert.equal(result.historyStatusState.latestUpdateLabel, 'Newest update');
  assert.match(result.statusState.summary, /last synced/i);
});
