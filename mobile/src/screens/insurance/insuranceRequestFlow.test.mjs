import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAuthoritativeRequirementsChecklist,
  getInsuranceRequestDraftStorageKey,
  hydrateInsuranceRequestDraft,
  serializeInsuranceRequestDraft,
  validateInsuranceRequestStage,
} from './insuranceRequestFlow.mjs';

const createInitialDraft = () => ({
  clientRequestId: 'initial-request-id',
  purpose: 'claim',
  inquiryType: 'comprehensive',
  description: '',
});

test('insurance draft round-trips for the same customer and vehicle', () => {
  const serializedDraft = serializeInsuranceRequestDraft({
    savedAt: 100,
    draft: {
      ...createInitialDraft(),
      clientRequestId: 'stable-retry-id',
      description: 'Front bumper damage',
    },
    stagedDocuments: [
      {
        documentType: 'or_cr',
        fileName: 'registration.pdf',
        fileUri: 'file:///registration.pdf',
      },
    ],
  });

  assert.equal(
    getInsuranceRequestDraftStorageKey({
      userId: 'customer-1',
      vehicleId: 'vehicle-1',
    }),
    'autocare:insurance-request-draft:customer-1:vehicle-1',
  );
  assert.deepEqual(
    hydrateInsuranceRequestDraft({
      serializedDraft,
      createInitialDraft,
      now: 200,
    }),
    {
      draft: {
        clientRequestId: 'stable-retry-id',
        purpose: 'claim',
        inquiryType: 'comprehensive',
        description: 'Front bumper damage',
      },
      stagedDocuments: [
        {
          documentType: 'or_cr',
          fileName: 'registration.pdf',
          fileUri: 'file:///registration.pdf',
          mimeType: '',
          notes: '',
          fileSizeLabel: '',
        },
      ],
      restored: true,
      expired: false,
    },
  );
});

test('expired insurance drafts are not restored', () => {
  const serializedDraft = serializeInsuranceRequestDraft({
    savedAt: 100,
    draft: createInitialDraft(),
  });
  const result = hydrateInsuranceRequestDraft({
    serializedDraft,
    createInitialDraft,
    now: 100 + 24 * 60 * 60 * 1000 + 1,
  });

  assert.equal(result.restored, false);
  assert.equal(result.expired, true);
  assert.equal(result.draft.clientRequestId, 'initial-request-id');
});

test('server requirements remain authoritative', () => {
  assert.deepEqual(
    buildAuthoritativeRequirementsChecklist({
      requirements: {
        purpose: 'renewal',
        requiredDocumentTypes: ['or_cr', 'policy'],
        optionalDocumentTypes: ['valid_id'],
      },
      uploadedTypes: ['or_cr'],
      documentTypeOptions: [
        { value: 'or_cr', label: 'OR/CR' },
        { value: 'policy', label: 'Current policy' },
        { value: 'valid_id', label: 'Valid ID' },
      ],
    }),
    {
      purpose: 'renewal',
      required: [
        { type: 'or_cr', label: 'OR/CR', complete: true },
        { type: 'policy', label: 'Current policy', complete: false },
      ],
      supporting: [{ type: 'valid_id', label: 'Valid ID', complete: false }],
      optional: [{ type: 'valid_id', label: 'Valid ID', complete: false }],
      guidance: ['Document requirements are provided by the insurance service.'],
    },
  );
});

test('stage validation blocks only the active stage', () => {
  assert.deepEqual(
    validateInsuranceRequestStage({
      stageIndex: 1,
      draft: createInitialDraft(),
      checklist: { required: [] },
    }),
    {
      field: 'description',
      message: 'Describe what happened or what coverage help you need.',
    },
  );
  assert.equal(
    validateInsuranceRequestStage({
      stageIndex: 0,
      draft: createInitialDraft(),
      checklist: { required: [] },
    }),
    null,
  );
});
