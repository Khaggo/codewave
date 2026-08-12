import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInsuranceRequestReviewModel,
  buildAuthoritativeRequirementsChecklist,
  getInsuranceRequestDraftStorageKey,
  hasUsableStagedDocumentFile,
  hydrateInsuranceRequestDraft,
  normalizeInsuranceRequestChecklist,
  normalizeInsuranceRequestDraft,
  normalizeInsuranceRequestStageIndex,
  serializeInsuranceRequestDraft,
  shouldRetainDocumentAfterUploadFailure,
  transferInsuranceRequestDraft,
  resolveInsuranceRequestStageTransition,
  validateInsuranceIncidentDate,
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
  const restoredDraft = hydrateInsuranceRequestDraft({
    serializedDraft,
    createInitialDraft,
    now: 200,
  });

  assert.equal(JSON.parse(serializedDraft).version, 3);
  assert.equal(serializedDraft.includes('file:///registration.pdf'), false);
  assert.deepEqual(
    restoredDraft,
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
          fileUri: '',
          mimeType: '',
          notes: '',
          fileSizeLabel: '',
          requiresFileReselection: true,
        },
      ],
      restored: true,
      expired: false,
    },
  );
  assert.equal(hasUsableStagedDocumentFile(restoredDraft.stagedDocuments[0]), false);
});

test('app-private DocumentPicker cache files remain usable after a screen recreation', () => {
  const cachedFileUri =
    'file:///data/user/0/com.autocarecc.mobile/cache/DocumentPicker/registration.pdf';
  const serializedDraft = serializeInsuranceRequestDraft({
    savedAt: 100,
    draft: createInitialDraft(),
    stagedDocuments: [
      {
        documentType: 'or_cr',
        fileName: 'registration.pdf',
        fileUri: cachedFileUri,
        mimeType: 'application/pdf',
      },
    ],
  });
  const restoredDraft = hydrateInsuranceRequestDraft({
    serializedDraft,
    createInitialDraft,
    now: 200,
  });

  assert.equal(restoredDraft.stagedDocuments[0].fileUri, cachedFileUri);
  assert.equal(restoredDraft.stagedDocuments[0].requiresFileReselection, false);
  assert.equal(hasUsableStagedDocumentFile(restoredDraft.stagedDocuments[0]), true);
});

test('same-session staged documents remain uploadable while restored metadata requires reselection', () => {
  assert.equal(
    hasUsableStagedDocumentFile({
      fileName: 'registration.pdf',
      fileUri: 'file:///registration.pdf',
    }),
    true,
  );
  assert.equal(
    hasUsableStagedDocumentFile({
      fileName: 'registration.pdf',
      fileUri: 'file:///registration.pdf',
      requiresFileReselection: true,
    }),
    false,
  );
});

test('insurance request stage indexes stay within the three-stage workflow', () => {
  assert.equal(normalizeInsuranceRequestStageIndex(undefined), 0);
  assert.equal(normalizeInsuranceRequestStageIndex('1'), 1);
  assert.equal(normalizeInsuranceRequestStageIndex(2), 2);
  assert.equal(normalizeInsuranceRequestStageIndex(10), 2);
  assert.equal(normalizeInsuranceRequestStageIndex(-2), 0);
  assert.equal(normalizeInsuranceRequestStageIndex(1.5), 0);
});

test('insurance draft transfer preserves form progress and sanitizes staged file paths', async () => {
  const sourceStorageKey = 'draft:vehicle-old';
  const targetStorageKey = 'draft:vehicle-new';
  const values = new Map([
    [
      sourceStorageKey,
      serializeInsuranceRequestDraft({
        savedAt: 100,
        draft: {
          ...createInitialDraft(),
          requestStageIndex: 1,
          description: 'Resume this request after adding the vehicle.',
        },
        stagedDocuments: [
          {
            documentType: 'or_cr',
            fileName: 'registration.pdf',
            fileUri: 'file:///private/registration.pdf',
          },
        ],
      }),
    ],
  ]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
    removeItem: async (key) => values.delete(key),
  };

  const result = await transferInsuranceRequestDraft({
    storage,
    sourceStorageKey,
    targetStorageKey,
    createInitialDraft,
    now: 200,
  });
  const transferredDraft = hydrateInsuranceRequestDraft({
    serializedDraft: values.get(targetStorageKey),
    createInitialDraft,
    now: 201,
  });

  assert.equal(result.transferred, true);
  assert.equal(values.has(sourceStorageKey), false);
  assert.equal(transferredDraft.draft.requestStageIndex, 1);
  assert.equal(
    transferredDraft.draft.description,
    'Resume this request after adding the vehicle.',
  );
  assert.equal(transferredDraft.stagedDocuments[0].fileUri, '');
  assert.equal(
    transferredDraft.stagedDocuments[0].requiresFileReselection,
    true,
  );
  assert.equal(result.serializedDraft.includes('file:///private/registration.pdf'), false);
});

test('insurance draft transfer never overwrites an existing target draft', async () => {
  const sourceStorageKey = 'draft:vehicle-old';
  const targetStorageKey = 'draft:vehicle-new';
  const sourceDraft = serializeInsuranceRequestDraft({
    savedAt: 100,
    draft: {
      ...createInitialDraft(),
      description: 'Source request',
    },
  });
  const targetDraft = serializeInsuranceRequestDraft({
    savedAt: 110,
    draft: {
      ...createInitialDraft(),
      description: 'Existing target request',
    },
  });
  const values = new Map([
    [sourceStorageKey, sourceDraft],
    [targetStorageKey, targetDraft],
  ]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
    removeItem: async (key) => values.delete(key),
  };

  const result = await transferInsuranceRequestDraft({
    storage,
    sourceStorageKey,
    targetStorageKey,
    createInitialDraft,
    now: 200,
  });

  assert.equal(result.transferred, false);
  assert.equal(result.serializedDraft, targetDraft);
  assert.equal(values.get(targetStorageKey), targetDraft);
  assert.equal(values.get(sourceStorageKey), sourceDraft);
});

test('insurance draft transfer removes its source only after target persistence succeeds', async () => {
  const operations = [];
  const sourceStorageKey = 'draft:vehicle-old';
  const targetStorageKey = 'draft:vehicle-new';
  const sourceDraft = serializeInsuranceRequestDraft({
    savedAt: 100,
    draft: createInitialDraft(),
  });
  const storage = {
    getItem: async (key) => (key === sourceStorageKey ? sourceDraft : null),
    setItem: async () => {
      operations.push('set-target');
    },
    removeItem: async () => {
      operations.push('remove-source');
    },
  };

  await transferInsuranceRequestDraft({
    storage,
    sourceStorageKey,
    targetStorageKey,
    createInitialDraft,
    now: 200,
  });

  assert.deepEqual(operations, ['set-target', 'remove-source']);
});

test('insurance draft transfer keeps its source when target persistence fails', async () => {
  const sourceStorageKey = 'draft:vehicle-old';
  const targetStorageKey = 'draft:vehicle-new';
  const values = new Map([
    [
      sourceStorageKey,
      serializeInsuranceRequestDraft({
        savedAt: 100,
        draft: createInitialDraft(),
      }),
    ],
  ]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async () => {
      throw new Error('Simulated storage failure');
    },
    removeItem: async (key) => values.delete(key),
  };

  await assert.rejects(
    transferInsuranceRequestDraft({
      storage,
      sourceStorageKey,
      targetStorageKey,
      createInitialDraft,
      now: 200,
    }),
    /Simulated storage failure/,
  );
  assert.equal(values.has(sourceStorageKey), true);
});

test('legacy draft file paths are discarded during recovery', () => {
  const result = hydrateInsuranceRequestDraft({
    serializedDraft: JSON.stringify({
      version: 1,
      savedAt: 100,
      draft: createInitialDraft(),
      stagedDocuments: [
        {
          documentType: 'policy',
          fileName: 'old-policy.pdf',
          fileUri: 'file:///private/cache/old-policy.pdf',
          notes: 'Renewal copy',
        },
      ],
    }),
    createInitialDraft,
    now: 200,
  });

  assert.deepEqual(result.stagedDocuments, [
    {
      documentType: 'policy',
      fileName: 'old-policy.pdf',
      fileUri: '',
      mimeType: '',
      notes: 'Renewal copy',
      fileSizeLabel: '',
      requiresFileReselection: true,
    },
  ]);
});

test('only retryable upload failures retain pending document metadata', () => {
  assert.equal(shouldRetainDocumentAfterUploadFailure(undefined), true);
  assert.equal(shouldRetainDocumentAfterUploadFailure(0), true);
  assert.equal(shouldRetainDocumentAfterUploadFailure(401), true);
  assert.equal(shouldRetainDocumentAfterUploadFailure(503), true);
  assert.equal(shouldRetainDocumentAfterUploadFailure(400), false);
  assert.equal(shouldRetainDocumentAfterUploadFailure(403), false);
  assert.equal(shouldRetainDocumentAfterUploadFailure(404), false);
  assert.equal(shouldRetainDocumentAfterUploadFailure(409), false);
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
        documentRequirements: [
          { documentType: 'or_cr', minimumCount: 1, uploadedCount: 0, required: true },
          { documentType: 'policy', minimumCount: 1, uploadedCount: 0, required: true },
          { documentType: 'valid_id', minimumCount: 0, uploadedCount: 0, required: false },
        ],
      },
      uploadedTypes: ['or_cr'],
      documentTypeOptions: [
        { value: 'or_cr', label: 'OR/CR' },
        { value: 'policy', label: 'Current policy' },
        { value: 'valid_id', label: 'Valid ID' },
      ],
    }),
    buildAuthoritativeRequirementsChecklist({
      requirements: {
        purpose: 'renewal',
        documentRequirements: [
          { documentType: 'or_cr', minimumCount: 1, uploadedCount: 1, required: true },
          { documentType: 'policy', minimumCount: 1, uploadedCount: 0, required: true },
          { documentType: 'valid_id', minimumCount: 0, uploadedCount: 0, required: false },
        ],
      },
      documentTypeOptions: [
        { value: 'or_cr', label: 'OR/CR' },
        { value: 'policy', label: 'Current policy' },
        { value: 'valid_id', label: 'Valid ID' },
      ],
    }),
  );
  const checklist = buildAuthoritativeRequirementsChecklist({
    requirements: {
      documentRequirements: [{ documentType: 'police_report', minimumCount: 1, uploadedCount: 0, requested: true }],
    },
    documentTypeOptions: [{ value: 'police_report', label: 'Police report' }],
  });
  assert.equal(checklist.required[0].requested, true);
  assert.equal(checklist.required[0].outstandingCount, 1);
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

test('Step 2 validation normalizes null and conflicting request state without throwing', () => {
  const invalidDraft = normalizeInsuranceRequestDraft({
    purpose: 'claim',
    inquiryType: 'comprehensive',
    description: null,
    notes: null,
  });
  const safeChecklist = normalizeInsuranceRequestChecklist({
    required: null,
    supporting: [null, { type: 'photo', label: 'Damage photo', complete: false }],
    isAuthoritative: true,
  });

  assert.deepEqual(
    validateInsuranceRequestStage({
      stageIndex: 1,
      draft: invalidDraft,
      checklist: safeChecklist,
    }),
    {
      field: 'description',
      message: 'Describe what happened or what coverage help you need.',
    },
  );
  assert.equal(
    validateInsuranceRequestStage({
      stageIndex: 1,
      draft: {
        ...invalidDraft,
        description: 'Rear bumper damage',
        incidentOccurredAt: '2026-08-01T09:30:00.000Z',
      },
      checklist: safeChecklist,
    }),
    null,
  );
  assert.deepEqual(
    validateInsuranceRequestStage({
      stageIndex: 2,
      draft: { description: 'Rear bumper damage' },
      checklist: null,
    }),
    {
      field: 'documents',
      message: 'Document requirements are still loading. Try again in a moment.',
    },
  );
});

test('restored null draft fields recover as explicit safe values while preserving entered text', () => {
  const restored = normalizeInsuranceRequestDraft({
    clientRequestId: null,
    requestStageIndex: '1',
    purpose: 'claim',
    inquiryType: 'comprehensive',
    description: 'Keep this draft after an API error.',
    providerName: null,
    policyNumber: null,
  });

  assert.equal(restored.requestStageIndex, 1);
  assert.equal(restored.description, 'Keep this draft after an API error.');
  assert.equal(restored.providerName, '');
  assert.equal(restored.policyNumber, '');
});

test('valid Step 2 details advance to a resolved Step 3 review without losing draft state', () => {
  const draft = normalizeInsuranceRequestDraft({
    purpose: 'claim',
    inquiryType: 'comprehensive',
    description: 'Rear bumper damage after a low-speed collision.',
    incidentOccurredAt: '2026-08-01T09:30:00.000Z',
    notes: 'Keep this customer note.',
  });

  assert.equal(
    validateInsuranceRequestStage({
      stageIndex: 1,
      draft,
      checklist: { required: [] },
    }),
    null,
  );

  const review = buildInsuranceRequestReviewModel({
    draft,
    requestTitle: 'Comprehensive coverage',
    selectedVehicleLabel: '2022 Toyota Vios - ABC 1234',
  });

  assert.deepEqual(review, {
    title: 'Comprehensive coverage',
    selectedVehicleLabel: '2022 Toyota Vios - ABC 1234',
    inquiryTypeLabel: 'Comprehensive',
    description: 'Rear bumper damage after a low-speed collision.',
  });
  assert.equal(draft.notes, 'Keep this customer note.');
  assert.equal(normalizeInsuranceRequestStageIndex(2), 2);
});

test('Step 2 keeps invalid or missing claim date-time on the Details stage', () => {
  const baseDraft = {
    ...createInitialDraft(),
    description: 'Rear bumper damage.',
  };

  assert.deepEqual(
    resolveInsuranceRequestStageTransition({ stageIndex: 1, draft: baseDraft, checklist: {} }),
    {
      stageIndex: 1,
      error: {
        field: 'incidentOccurredAt',
        message: 'Choose the incident date and time before continuing.',
      },
    },
  );
  assert.deepEqual(
    resolveInsuranceRequestStageTransition({
      stageIndex: 1,
      draft: { ...baseDraft, incidentOccurredAt: 'not-a-date' },
      checklist: {},
    }),
    {
      stageIndex: 1,
      error: {
        field: 'incidentOccurredAt',
        message: 'Enter a valid incident date and time.',
      },
    },
  );
  assert.deepEqual(
    resolveInsuranceRequestStageTransition({
      stageIndex: 1,
      draft: { ...baseDraft, incidentOccurredAt: '2026-08-01T09:30:00.000Z' },
      checklist: {},
    }),
    { stageIndex: 2, error: null },
  );
  assert.equal(validateInsuranceIncidentDate('2027-01-01T00:00:00.000Z', Date.parse('2026-08-13T00:00:00.000Z')).field, 'incidentOccurredAt');
});
