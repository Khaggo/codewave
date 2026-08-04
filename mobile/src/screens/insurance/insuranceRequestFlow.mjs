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
  const uploaded = new Set(uploadedTypes.map(trimOrEmpty).filter(Boolean));
  const labels = new Map(
    documentTypeOptions.map((option) => [trimOrEmpty(option?.value), trimOrEmpty(option?.label)]),
  );
  const buildItems = (types) =>
    [...new Set((Array.isArray(types) ? types : []).map(trimOrEmpty).filter(Boolean))].map(
      (type) => ({
        type,
        label: labels.get(type) || type.replaceAll('_', ' '),
        complete: uploaded.has(type),
      }),
    );

  return {
    purpose: requirements?.purpose ?? null,
    required: buildItems(requirements?.requiredDocumentTypes),
    supporting: buildItems(requirements?.optionalDocumentTypes),
    optional: buildItems(requirements?.optionalDocumentTypes),
    guidance: ['Document requirements are provided by the insurance service.'],
  };
};

export const validateInsuranceRequestStage = ({
  stageIndex,
  draft,
  checklist,
}) => {
  if (stageIndex === 0) {
    if (!trimOrEmpty(draft?.purpose)) {
      return {
        field: 'purpose',
        message: 'Choose what you need help with.',
      };
    }

    if (!trimOrEmpty(draft?.inquiryType)) {
      return {
        field: 'inquiryType',
        message: 'Choose a coverage type.',
      };
    }
  }

  if (stageIndex === 1 && !trimOrEmpty(draft?.description)) {
    return {
      field: 'description',
      message: 'Describe what happened or what coverage help you need.',
    };
  }

  if (stageIndex === 2) {
    const missingRequired = (checklist?.required ?? []).filter((item) => !item.complete);

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
