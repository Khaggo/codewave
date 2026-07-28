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

export const getInsuranceRequestDraftStorageKey = ({ userId, vehicleId }) => {
  const normalizedUserId = trimOrEmpty(userId) || 'anonymous';
  const normalizedVehicleId = trimOrEmpty(vehicleId) || 'unselected';
  return `autocare:insurance-request-draft:${normalizedUserId}:${normalizedVehicleId}`;
};

export const serializeInsuranceRequestDraft = ({
  draft,
  stagedDocuments = [],
  savedAt = Date.now(),
}) =>
  JSON.stringify({
    version: 1,
    savedAt,
    draft,
    stagedDocuments: stagedDocuments.map((document) => ({
      documentType: trimOrEmpty(document?.documentType),
      fileName: trimOrEmpty(document?.fileName),
      fileUri: trimOrEmpty(document?.fileUri),
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
      parsed?.version !== 1 ||
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
      ? parsed.stagedDocuments.filter(
          (document) =>
            trimOrEmpty(document?.documentType) &&
            trimOrEmpty(document?.fileName) &&
            trimOrEmpty(document?.fileUri),
        )
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
