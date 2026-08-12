export const INSURANCE_REQUEST_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export const INSURANCE_REQUEST_STAGES = [
  {
    key: 'reason',
    label: 'Reason & Coverage',
  },
  {
    key: 'details',
    label: 'Details',
  },
  {
    key: 'documents',
    label: 'Documents & Review',
  },
];

const trimOrEmpty = (value) => String(value ?? '').trim();

export const validateInsuranceIncidentDate = (value, now = Date.now()) => {
  const normalizedValue = trimOrEmpty(value);

  if (!normalizedValue) {
    return {
      field: 'incidentOccurredAt',
      message: 'Choose the incident date and time before continuing.',
    };
  }

  const incidentDate = new Date(normalizedValue);
  if (Number.isNaN(incidentDate.getTime())) {
    return {
      field: 'incidentOccurredAt',
      message: 'Enter a valid incident date and time.',
    };
  }

  if (incidentDate.getTime() > Number(now)) {
    return {
      field: 'incidentOccurredAt',
      message: 'Incident date and time cannot be in the future.',
    };
  }

  return null;
};

export const normalizeInsuranceRequestDraft = (draft) => {
  const source = draft && typeof draft === 'object' ? draft : {};

  return {
    ...source,
    clientRequestId: trimOrEmpty(source.clientRequestId),
    requestStageIndex: normalizeInsuranceRequestStageIndex(source.requestStageIndex),
    purpose: trimOrEmpty(source.purpose),
    inquiryType: trimOrEmpty(source.inquiryType),
    description: trimOrEmpty(source.description),
    providerName: trimOrEmpty(source.providerName),
    policyNumber: trimOrEmpty(source.policyNumber),
    incidentOccurredAt: trimOrEmpty(source.incidentOccurredAt),
    incidentLocation: trimOrEmpty(source.incidentLocation),
    notes: trimOrEmpty(source.notes),
    renewalPolicyMode: trimOrEmpty(source.renewalPolicyMode),
  };
};

export const normalizeInsuranceRequestChecklist = (checklist) => {
  const source = checklist && typeof checklist === 'object' ? checklist : {};
  const normalizeItems = (items) =>
    (Array.isArray(items) ? items : [])
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        ...item,
        type: trimOrEmpty(item.type),
        label: trimOrEmpty(item.label) || trimOrEmpty(item.type) || 'Document',
        complete: Boolean(item.complete),
      }))
      .filter((item) => item.type);

  return {
    ...source,
    required: normalizeItems(source.required),
    supporting: normalizeItems(source.supporting),
    optional: normalizeItems(source.optional),
    isAuthoritative: Boolean(source.isAuthoritative),
  };
};

export const buildInsuranceRequestReviewModel = ({
  draft,
  requestTitle,
  selectedVehicleLabel,
} = {}) => {
  const normalizedDraft = normalizeInsuranceRequestDraft(draft);
  const normalizedTitle = String(requestTitle ?? '').trim();
  const normalizedVehicleLabel = String(selectedVehicleLabel ?? '').trim();

  return {
    title: normalizedTitle || 'Insurance request',
    selectedVehicleLabel: normalizedVehicleLabel || 'Vehicle not selected',
    inquiryTypeLabel:
      normalizedDraft.inquiryType === 'ctpl' ? 'CTPL' : 'Comprehensive',
    description: normalizedDraft.description,
  };
};

const getPersistableDocumentPickerUri = (value) => {
  const normalizedUri = trimOrEmpty(value);
  const normalizedPath = normalizedUri.replaceAll('\\\\', '/');

  return normalizedUri.startsWith('file://') &&
    normalizedPath.includes('/cache/DocumentPicker/')
    ? normalizedUri
    : '';
};

export const normalizeInsuranceRequestStageIndex = (value) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(INSURANCE_REQUEST_STAGES.length - 1, numericValue));
};

export const getInsuranceRequestDraftStorageKey = ({ userId, vehicleId }) => {
  const normalizedUserId = trimOrEmpty(userId) || 'anonymous';
  const normalizedVehicleId = trimOrEmpty(vehicleId) || 'unselected';
  return `autocare:insurance-request-draft:${normalizedUserId}:${normalizedVehicleId}`;
};

export const hasUsableStagedDocumentFile = (document) =>
  Boolean(
    trimOrEmpty(document?.fileName) &&
      trimOrEmpty(document?.fileUri) &&
      !document?.requiresFileReselection,
  );

export const shouldRetainDocumentAfterUploadFailure = (status) => {
  const normalizedStatus = Number(status);

  return (
    !Number.isFinite(normalizedStatus) ||
    normalizedStatus <= 0 ||
    normalizedStatus === 401 ||
    normalizedStatus >= 500
  );
};

export const serializeInsuranceRequestDraft = ({
  draft,
  stagedDocuments = [],
  savedAt = Date.now(),
}) =>
  JSON.stringify({
    version: 3,
    savedAt,
    draft,
    stagedDocuments: stagedDocuments.map((document) => ({
      documentType: trimOrEmpty(document?.documentType),
      fileName: trimOrEmpty(document?.fileName),
      fileUri: getPersistableDocumentPickerUri(document?.fileUri),
      mimeType: trimOrEmpty(document?.mimeType),
      notes: trimOrEmpty(document?.notes),
      fileSizeLabel: trimOrEmpty(document?.fileSizeLabel),
    })),
  });

export const hydrateInsuranceRequestDraft = ({
  serializedDraft,
  createInitialDraft,
  now = Date.now(),
  ttlMs = INSURANCE_REQUEST_DRAFT_TTL_MS,
}) => {
  const fallbackDraft = createInitialDraft();

  if (!serializedDraft) {
    return {
      draft: fallbackDraft,
      stagedDocuments: [],
      restored: false,
      expired: false,
    };
  }

  try {
    const parsed = JSON.parse(serializedDraft);
    const savedAt = Number(parsed?.savedAt);

    if (
      ![1, 2, 3].includes(parsed?.version) ||
      !Number.isFinite(savedAt) ||
      savedAt <= 0 ||
      now - savedAt > ttlMs
    ) {
      return {
        draft: fallbackDraft,
        stagedDocuments: [],
        restored: false,
        expired: true,
      };
    }

    const savedDraft = parsed?.draft && typeof parsed.draft === 'object' ? parsed.draft : {};
    const stagedDocuments = Array.isArray(parsed?.stagedDocuments)
      ? parsed.stagedDocuments
          .filter(
            (document) =>
              trimOrEmpty(document?.documentType) &&
              trimOrEmpty(document?.fileName),
          )
          .map((document) => {
            const fileUri = getPersistableDocumentPickerUri(document.fileUri);

            return {
              documentType: trimOrEmpty(document.documentType),
              fileName: trimOrEmpty(document.fileName),
              fileUri,
              mimeType: trimOrEmpty(document.mimeType),
              notes: trimOrEmpty(document.notes),
              fileSizeLabel: trimOrEmpty(document.fileSizeLabel),
              requiresFileReselection: !fileUri,
            };
          })
      : [];

    return {
      draft: {
        ...fallbackDraft,
        ...savedDraft,
        clientRequestId:
          trimOrEmpty(savedDraft?.clientRequestId) || fallbackDraft.clientRequestId,
      },
      stagedDocuments,
      restored: true,
      expired: false,
    };
  } catch {
    return {
      draft: fallbackDraft,
      stagedDocuments: [],
      restored: false,
      expired: false,
    };
  }
};

export const transferInsuranceRequestDraft = async ({
  storage,
  sourceStorageKey,
  targetStorageKey,
  createInitialDraft,
  now = Date.now(),
}) => {
  if (!storage || !targetStorageKey) {
    return {
      serializedDraft: null,
      transferred: false,
    };
  }

  const targetDraft = await storage.getItem(targetStorageKey);

  if (targetDraft || !sourceStorageKey || sourceStorageKey === targetStorageKey) {
    return {
      serializedDraft: targetDraft,
      transferred: false,
    };
  }

  const sourceDraft = await storage.getItem(sourceStorageKey);
  const hydratedSource = hydrateInsuranceRequestDraft({
    serializedDraft: sourceDraft,
    createInitialDraft,
    now,
  });

  if (hydratedSource.expired) {
    await storage.removeItem(sourceStorageKey);
    return {
      serializedDraft: null,
      transferred: false,
    };
  }

  if (!hydratedSource.restored) {
    return {
      serializedDraft: null,
      transferred: false,
    };
  }

  const serializedDraft = serializeInsuranceRequestDraft({
    draft: hydratedSource.draft,
    stagedDocuments: hydratedSource.stagedDocuments,
    savedAt: now,
  });

  await storage.setItem(targetStorageKey, serializedDraft);
  await storage.removeItem(sourceStorageKey);

  return {
    serializedDraft,
    transferred: true,
  };
};

export const buildAuthoritativeRequirementsChecklist = ({
  requirements,
  uploadedTypes = [],
  documentTypeOptions = [],
}) => {
  const safeUploadedTypes = Array.isArray(uploadedTypes) ? uploadedTypes : [];
  const safeDocumentTypeOptions = Array.isArray(documentTypeOptions)
    ? documentTypeOptions
    : [];
  const uploadedCounts = safeUploadedTypes.map(trimOrEmpty).filter(Boolean).reduce((counts, type) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
  const labels = new Map(
    safeDocumentTypeOptions.map((option) => [trimOrEmpty(option?.value), trimOrEmpty(option?.label)]),
  );
  const serverRequirements = Array.isArray(requirements?.documentRequirements)
    ? requirements.documentRequirements
    : [];
  const buildItem = (requirement) => {
    const type = trimOrEmpty(requirement?.documentType);
    const minimumCount = Math.max(0, Number(requirement?.minimumCount ?? 0));
    const uploadedCount = Math.max(
      Number(requirement?.uploadedCount ?? 0),
      uploadedCounts[type] ?? 0,
    );
    const requested = Boolean(requirement?.requested);

    return {
      type,
      label: labels.get(type) || type.replaceAll('_', ' '),
      minimumCount,
      uploadedCount,
      outstandingCount: Math.max(0, minimumCount - uploadedCount),
      requested,
      conditional: Boolean(requirement?.conditional),
      complete: minimumCount === 0 || uploadedCount >= minimumCount,
    };
  };
  const legacyRequiredTypes = Array.isArray(requirements?.requiredDocumentTypes)
    ? requirements.requiredDocumentTypes
    : [];
  const legacyOptionalTypes = Array.isArray(requirements?.optionalDocumentTypes)
    ? requirements.optionalDocumentTypes
    : [];
  const legacyRequirements = [
    ...legacyRequiredTypes.map((documentType) => ({
      documentType,
      minimumCount: Number(requirements?.minimumDocumentCounts?.[documentType] ?? 1),
      required: true,
    })),
    ...legacyOptionalTypes.map((documentType) => ({ documentType, minimumCount: 0, required: false })),
  ];
  const items = (serverRequirements.length ? serverRequirements : legacyRequirements)
    .map(buildItem)
    .filter((item) => item.type);

  return {
    purpose: requirements?.purpose ?? null,
    required: items.filter((item) => item.minimumCount > 0),
    supporting: items.filter((item) => item.minimumCount === 0),
    optional: items.filter((item) => item.minimumCount === 0),
    guidance: ['Document requirements are provided by the insurance service.'],
    isAuthoritative: true,
  };
};

export const validateInsuranceRequestStage = ({
  stageIndex,
  draft,
  checklist,
}) => {
  const safeDraft = normalizeInsuranceRequestDraft(draft);
  const safeChecklist = normalizeInsuranceRequestChecklist(checklist);

  if (stageIndex === 0) {
    if (!safeDraft.purpose) {
      return {
        field: 'purpose',
        message: 'Choose what you need help with.',
      };
    }

    if (!safeDraft.inquiryType) {
      return {
        field: 'inquiryType',
        message: 'Choose a coverage type.',
      };
    }
  }

  if (stageIndex === 1 && !safeDraft.description) {
    return {
      field: 'description',
      message: 'Describe what happened or what coverage help you need.',
    };
  }

  if (stageIndex === 1 && safeDraft.purpose === 'claim') {
    return validateInsuranceIncidentDate(safeDraft.incidentOccurredAt);
  }

  if (stageIndex === 2) {
    if (!safeChecklist.isAuthoritative) {
      return {
        field: 'documents',
        message: 'Document requirements are still loading. Try again in a moment.',
      };
    }

    const missingRequired = safeChecklist.required.filter((item) => !item.complete);

    if (missingRequired.length) {
      return {
        field: 'documents',
        message: `Attach the required ${missingRequired
          .map((item) => item.label)
          .join(', ')} before submitting.`,
      };
    }
  }

  return null;
};

export const resolveInsuranceRequestStageTransition = ({
  stageIndex,
  draft,
  checklist,
}) => {
  const currentStageIndex = normalizeInsuranceRequestStageIndex(stageIndex);
  const error = validateInsuranceRequestStage({
    stageIndex: currentStageIndex,
    draft,
    checklist,
  });

  return {
    stageIndex: error
      ? currentStageIndex
      : normalizeInsuranceRequestStageIndex(currentStageIndex + 1),
    error,
  };
};
