import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../lib/authClient';
import {
  createEmptyCustomerInsuranceSnapshot,
  createInsuranceInquiry,
  customerInsuranceDocumentTypeOptions,
  uploadInsuranceInquiryDocumentFile,
} from '../lib/insuranceClient';
import {
  createPickedInsuranceDocumentDraft,
} from './insuranceModuleView.mjs';
import {
  buildHistoryRecordSummary,
  buildHistoryRecordTitle,
  buildInitialDocumentUploadDraft,
  buildInsuranceInquirySubject,
  buildRenewalPrompt,
  formatMissingRequiredDocumentSummary,
  formatTimestampLabel,
  getPurposeLabel,
  inferMimeType,
  inquiryTypeOptions,
  purposeOptions,
} from './insuranceInquiryPresentationModel.mjs';
import InsuranceDocumentsPanel from './insurance/InsuranceDocumentsPanel';
import InsuranceHomePanel from './insurance/InsuranceHomePanel';
import InsuranceModeShell from './insurance/InsuranceModeShell';
import {
  buildInsuranceContentInsets,
  insuranceModeUsesPanelScroll as shouldInsuranceModeUsePanelScroll,
  resolveInsuranceModeTab,
} from './insurance/insuranceModeModel.mjs';
import {
  insuranceFonts,
  insurancePalette,
  InsuranceSectionDivider,
} from './insurance/InsurancePanelPrimitives';
import InsuranceRequestPanel from './insurance/InsuranceRequestPanel';
import InsuranceStatePanel from './insurance/InsuranceStatePanel';
import InsuranceStatusDetailPanel from './insurance/InsuranceStatusDetailPanel';
import InsuranceVehiclePicker from './insurance/InsuranceVehiclePicker';
import {
  shouldRetainDocumentAfterUploadFailure,
} from './insurance/insuranceRequestFlow.mjs';
import { buildInsuranceWorkspaceViewModel } from './insurance/insuranceWorkspaceViewModel.mjs';
import useInsuranceRequestDraft from './insurance/useInsuranceRequestDraft';
import useInsuranceRequirements from './insurance/useInsuranceRequirements';
import useInsuranceTrackingController from './insurance/useInsuranceTrackingController';
import useInsuranceVehicleController from './insurance/useInsuranceVehicleController';
import styles from './insuranceInquiryStyles';
import { colors, radius } from '../theme';

const buildCustomerErrorMessage = (error, fallbackMessage) =>
  error instanceof ApiError && error.message ? error.message : fallbackMessage;

const normalizeRouteId = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return normalizedValue.length ? normalizedValue : null;
};

export default function InsuranceInquiryScreen({ account, navigation, route }) {
  const insets = useSafeAreaInsets();
  const accessToken = account?.accessToken ?? null;
  const userId = account?.userId ?? null;
  const accountOwnedVehicles = useMemo(
    () => (Array.isArray(account?.ownedVehicles) ? account.ownedVehicles.filter(Boolean) : []),
    [account?.ownedVehicles],
  );
  const hasSession = Boolean(accessToken && userId);
  const routeVehicleId = normalizeRouteId(route?.params?.vehicleId);
  const routeInquiryId = normalizeRouteId(route?.params?.inquiryId);
  const resumeDraftFromVehicleId = normalizeRouteId(
    route?.params?.resumeDraftFromVehicleId,
  );
  const resumeInsuranceTab = route?.params?.resumeInsuranceTab
    ? resolveInsuranceModeTab(route.params.resumeInsuranceTab)
    : null;
  const {
    closeVehiclePicker,
    fallbackVehicleId,
    isVehiclePickerAvailable,
    isVehiclePickerOpen,
    openVehiclePicker,
    ownedVehicles,
    retryVehicleLoad,
    selectedVehicle,
    selectedVehicleId,
    setSelectedVehicleId,
    vehicleLoadMessage,
    vehicleLoadState,
  } = useInsuranceVehicleController({
    accessToken,
    accountOwnedVehicles,
    hasSession,
    primaryVehicleId: account?.primaryVehicleId,
    routeVehicleId,
    userId,
  });
  const initialSnapshot = useMemo(
    () =>
      createEmptyCustomerInsuranceSnapshot({
        hasSession,
        ownedVehicles,
      }),
    [hasSession, ownedVehicles],
  );
  const {
    clearPersistedDraft,
    draft,
    isDraftDirty,
    persistDraftNow,
    resetDraftContent,
    restoredDraftStorageKey,
    setDraft,
    setIsDraftDirty,
    setStagedDocuments,
    stagedDocuments,
  } = useInsuranceRequestDraft({
    hasSession,
    resumeFromVehicleId: resumeDraftFromVehicleId,
    userId,
    vehicleId: selectedVehicleId,
  });
  const [activePanel, setActivePanel] = useState(resumeInsuranceTab ?? 'home');
  const [activeInsuranceTab, setActiveInsuranceTab] = useState(
    resumeInsuranceTab ?? 'home',
  );
  const presentedVehicleIdRef = useRef(selectedVehicleId);
  const [documentDraft, setDocumentDraft] = useState(buildInitialDocumentUploadDraft());
  const [intakeState, setIntakeState] = useState(initialSnapshot.intakeState);
  const [intakeMessage, setIntakeMessage] = useState('');
  const [documentUploadState, setDocumentUploadState] = useState('document_idle');
  const [documentUploadMessage, setDocumentUploadMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const {
    adoptInquiry,
    claimStatusUpdates,
    isRefreshing,
    latestInquiry,
    prepareForVehicleChange,
    refreshTracking,
    trackingMessage,
    trackingState,
  } = useInsuranceTrackingController({
    accessToken,
    hasSession,
    initialTrackingState: initialSnapshot.trackingState,
    routeInquiryId,
    selectedVehicleId,
    userId,
  });
  const requirementsByKey = useInsuranceRequirements({
    accessToken,
    draft,
    hasSession,
    latestInquiry,
  });

  useEffect(() => {
    if (restoredDraftStorageKey) {
      setIntakeState('draft_ready');
      setIntakeMessage('Your unfinished insurance request was restored.');
    }
  }, [restoredDraftStorageKey]);

  useEffect(() => {
    const vehicleChanged = presentedVehicleIdRef.current !== selectedVehicleId;

    if (resumeInsuranceTab) {
      setActivePanel(resumeInsuranceTab);
      setActiveInsuranceTab(resumeInsuranceTab);
    } else if (vehicleChanged) {
      setActivePanel('home');
      setActiveInsuranceTab('home');
    }

    presentedVehicleIdRef.current = selectedVehicleId;
  }, [resumeInsuranceTab, selectedVehicleId]);
  const {
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
  } = useMemo(
    () =>
      buildInsuranceWorkspaceViewModel({
        claimStatusUpdates,
        draft,
        latestInquiry,
        requirementsByKey,
        selectedVehicle,
        stagedDocuments,
        trackingState,
      }),
    [
      claimStatusUpdates,
      draft,
      latestInquiry,
      requirementsByKey,
      selectedVehicle,
      stagedDocuments,
      trackingState,
    ],
  );
  const homeTitle = 'Home';
  const statusTitle = 'Status';
  const statusSubtitle = 'Track review, approval, and next action';

  useEffect(() => {
    const hasInvalidVehicleParam = route?.params?.vehicleId && !routeVehicleId;
    const hasInvalidInquiryParam = route?.params?.inquiryId && !routeInquiryId;

    if (hasInvalidVehicleParam || hasInvalidInquiryParam) {
      navigation.setParams({
        ...(hasInvalidVehicleParam ? { vehicleId: undefined } : {}),
        ...(hasInvalidInquiryParam ? { inquiryId: undefined } : {}),
      });
    }
  }, [
    navigation,
    route?.params?.inquiryId,
    route?.params?.vehicleId,
    routeInquiryId,
    routeVehicleId,
  ]);

  useEffect(() => {
    if (!hasSession) {
      setIntakeState('unauthorized_session');
      return;
    }

    if (!ownedVehicles.length) {
      if (vehicleLoadState === 'loading' || vehicleLoadState === 'refreshing') {
        return;
      }

      setSelectedVehicleId(null);
      setIntakeState('no_vehicle');
      return;
    }

    if (!selectedVehicleId || !ownedVehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId(routeVehicleId ?? fallbackVehicleId);
    }

    if (!isSubmitting && (intakeState === 'unauthorized_session' || intakeState === 'no_vehicle')) {
      setIntakeState('draft_ready');
    }
  }, [
    account?.primaryVehicleId,
    fallbackVehicleId,
    hasSession,
    intakeState,
    isSubmitting,
    ownedVehicles,
    routeVehicleId,
    selectedVehicleId,
    vehicleLoadState,
  ]);

  const resetDocumentDraftState = () => {
    setDocumentDraft(buildInitialDocumentUploadDraft());
  };

  useEffect(() => {
    if (activePanel !== 'documents') {
      return;
    }

    if (
      latestInquiry?.id &&
      latestInquiryCanAcceptDocuments &&
      documentUploadState === 'document_idle'
    ) {
      setDocumentUploadState('document_ready');
      setDocumentUploadMessage('');
    }
  }, [
    activePanel,
    documentUploadState,
    latestInquiry?.id,
    latestInquiryCanAcceptDocuments,
  ]);

  const handleDraftPatch = () => {
    setIsDraftDirty(true);
    if (hasSession && ownedVehicles.length && selectedVehicle) {
      setIntakeState('draft_ready');
      setIntakeMessage('');
    }
  };

  const handleDocumentDraftPatch = () => {
    setDocumentUploadState('document_ready');
    setDocumentUploadMessage('');
  };

  const handleOpenVehiclePicker = () => {
    openVehiclePicker();
  };

  const handleAddVehicle = async () => {
    closeVehiclePicker();
    const draftSaved = await persistDraftNow();

    if (!draftSaved) {
      setIntakeState('validation_error');
      setIntakeMessage(
        'We could not save your unfinished request. Try Add vehicle again.',
      );
      return;
    }

    navigation.navigate('VehicleLifecycleScreen', {
      openAddVehicle: true,
      returnTo: 'InsuranceInquiryScreen',
      returnInsuranceSourceVehicleId: selectedVehicleId,
      returnInsuranceTab: activeInsuranceTab,
    });
  };

  const handleSelectVehicle = (vehicleId) => {
    prepareForVehicleChange(vehicleId);
    navigation.setParams({
      vehicleId,
      resumeDraftFromVehicleId: undefined,
      resumeInsuranceTab: undefined,
    });
    setSelectedVehicleId(vehicleId);
    setIntakeMessage('');
    setDocumentUploadState('document_idle');
    setDocumentUploadMessage('');
    resetDocumentDraftState();
    setStagedDocuments([]);
    setIsDraftDirty(false);
    if (hasSession && ownedVehicles.length) {
      setIntakeState('draft_ready');
    }
  };

  const handleRemoveStagedDocument = (documentType) => {
    setStagedDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.documentType !== documentType),
    );
    setIsDraftDirty(true);
    handleDraftPatch();
  };

  const handleStageDocument = async (documentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/pdf', 'image/*'],
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset) {
        setIntakeState('validation_error');
        setIntakeMessage('We could not read the selected document. Try choosing the file again.');
        return;
      }

      const stagedDocument = createPickedInsuranceDocumentDraft({
        documentType,
        asset,
      });

      setStagedDocuments((currentDocuments) => {
        const nextDocuments = currentDocuments.filter((document) => document.documentType !== documentType);
        return [...nextDocuments, stagedDocument];
      });
      setIsDraftDirty(true);
      setIntakeState('draft_ready');
      setIntakeMessage(`${asset.name} is staged and ready to submit with this request.`);
    } catch (error) {
      setIntakeState('submit_failed');
      setIntakeMessage(
        buildCustomerErrorMessage(error, 'We could not open the document picker right now.'),
      );
    }
  };

  const pickCustomerInsuranceDocument = async () => {
    if (!latestInquiry?.id) {
      setDocumentUploadState('document_missing_inquiry');
      setDocumentUploadMessage('Submit a request first, then select a document for upload.');
      return;
    }

    if (!latestInquiryCanAcceptDocuments) {
      setDocumentUploadState('document_closed');
      setDocumentUploadMessage(
        'This inquiry is already closed or rejected, so the backend will not accept more documents.',
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/pdf', 'image/*'],
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset) {
        setDocumentUploadState('document_validation_error');
        setDocumentUploadMessage('We could not read the selected document. Try choosing the file again.');
        return;
      }

      setDocumentDraft((currentDraft) => ({
        ...currentDraft,
        ...createPickedInsuranceDocumentDraft({
          documentType: currentDraft.documentType,
          asset,
        }),
        notes: currentDraft.notes,
      }));
      setDocumentUploadState('document_ready');
      setDocumentUploadMessage(`Selected ${asset.name}. Ready to upload when you are.`);
    } catch (error) {
      setDocumentUploadState('document_failed');
      setDocumentUploadMessage(
        buildCustomerErrorMessage(error, 'We could not open the document picker right now.'),
      );
    }
  };

  const handleClearPickedDocument = () => {
    setDocumentDraft((currentDraft) => ({
      ...buildInitialDocumentUploadDraft(),
      documentType: currentDraft.documentType,
      notes: currentDraft.notes,
    }));
    setDocumentUploadState('document_ready');
    setDocumentUploadMessage('Selected file cleared. Choose another document when you are ready.');
  };

  const handleSubmitInquiry = async () => {
    if (!hasSession) {
      setIntakeState('unauthorized_session');
      setIntakeMessage('Sign in first so the app can submit an insurance inquiry.');
      return;
    }

    if (!ownedVehicles.length) {
      setIntakeState('no_vehicle');
      setIntakeMessage('Add an owned vehicle before you start an insurance inquiry.');
      return;
    }

    if (!selectedVehicle) {
      setIntakeState('invalid_vehicle');
      setIntakeMessage('Select a valid owned vehicle before submitting the inquiry.');
      return;
    }

    if (!String(draft.description ?? '').trim()) {
      setIntakeState('validation_error');
      setIntakeMessage('Tell staff what happened before the request can be submitted.');
      return;
    }

    const missingRequestDocuments = requestRequirementsChecklist.required.filter(
      (item) => !item.complete,
    );

    if (missingRequestDocuments.length) {
      const missingLabelSummary = formatMissingRequiredDocumentSummary(missingRequestDocuments);
      setIntakeState('validation_error');
      setIntakeMessage(
        missingLabelSummary
          ? `Attach these required documents before submit: ${missingLabelSummary}.`
          : 'Attach the required documents before submit.',
      );
      return;
    }

    setIsSubmitting(true);
    setIntakeState('submitting');
    setIntakeMessage('');

    try {
      const requestSubject = buildInsuranceInquirySubject({
        purpose: draft.purpose,
        vehicleLabel: selectedVehicleLabel,
      });
      const documentsQueuedForSubmit = [...stagedDocuments];
      const createdInquiry = await createInsuranceInquiry({
        userId,
        vehicleId: selectedVehicle.id,
        clientRequestId: draft.clientRequestId,
        purpose: draft.purpose,
        inquiryType: draft.inquiryType,
        subject: requestSubject,
        description: draft.description,
        providerName: draft.providerName,
        policyNumber: draft.policyNumber,
        incidentOccurredAt: draft.incidentOccurredAt,
        incidentLocation: draft.incidentLocation,
        notes: draft.notes,
        accessToken,
      });

      let latestCreatedInquiry = createdInquiry;
      const failedUploads = [];

      for (const stagedDocument of documentsQueuedForSubmit) {
        try {
          latestCreatedInquiry = await uploadInsuranceInquiryDocumentFile({
            inquiryId: createdInquiry.id,
            documentType: stagedDocument.documentType,
            file: {
              uri: String(stagedDocument.fileUri ?? '').trim(),
              name: String(stagedDocument.fileName ?? '').trim(),
              type: inferMimeType(stagedDocument.fileName, stagedDocument.mimeType),
              webFile: stagedDocument.webFile ?? null,
            },
            notes: stagedDocument.notes,
            accessToken,
          });
        } catch (error) {
          failedUploads.push({
            document: stagedDocument,
            error,
          });
        }
      }

      const adoptedCreatedInquiry = await adoptInquiry({
        inquiry: latestCreatedInquiry,
        vehicleId: selectedVehicle.id,
      });
      resetDraftContent();

      if (failedUploads.length) {
        const firstFailedDocument = failedUploads[0]?.document ?? null;
        const remainingDocuments = failedUploads.map((entry) => entry.document);
        setStagedDocuments(remainingDocuments);
        setIsDraftDirty(true);
        if (firstFailedDocument) {
          setDocumentDraft({
            documentType: firstFailedDocument.documentType,
            fileName: firstFailedDocument.fileName,
            fileUri: firstFailedDocument.fileUri,
            mimeType: firstFailedDocument.mimeType,
            notes: firstFailedDocument.notes,
            fileSizeLabel: firstFailedDocument.fileSizeLabel,
          });
        } else {
          resetDocumentDraftState();
        }
        setActiveInsuranceTab('documents');
        setActivePanel('documents');
        setDocumentUploadState('document_ready');
        setDocumentUploadMessage(
          `${failedUploads.length} staged document${
            failedUploads.length === 1 ? '' : 's'
          } still need upload. Review the pending files below and continue from Documents.`,
        );
        setIntakeState('submitted_inquiry');
        setIntakeMessage(
          `Request submitted, but ${failedUploads.length} document${
            failedUploads.length === 1 ? '' : 's'
          } still need upload before staff have the full intake package.`,
        );
        if (adoptedCreatedInquiry) {
          await refreshTracking({
            inquiryIdOverride: latestCreatedInquiry?.id ?? null,
          });
        }
        return;
      }

      setStagedDocuments([]);
      await clearPersistedDraft();
      setDocumentUploadState('document_idle');
      setDocumentUploadMessage('');
      setIntakeState('submitted_inquiry');
      setIntakeMessage(
        `Request submitted successfully with backend status ${latestCreatedInquiry?.status ?? 'submitted'}.`,
      );
      if (adoptedCreatedInquiry) {
        await refreshTracking({
          inquiryIdOverride: latestCreatedInquiry?.id ?? null,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setIntakeState('validation_error');
      } else if (error instanceof ApiError && [404, 409].includes(error.status)) {
        setIntakeState('invalid_vehicle');
      } else if (error instanceof ApiError && error.status === 401) {
        setIntakeState('unauthorized_session');
      } else {
        setIntakeState('submit_failed');
      }

      setIntakeMessage(
        buildCustomerErrorMessage(error, 'We could not submit the insurance inquiry right now.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsePendingUpload = (documentType) => {
    const stagedDocument =
      stagedDocuments.find((document) => document.documentType === documentType) ?? null;

    if (!stagedDocument) {
      return;
    }

    setDocumentDraft({
      documentType: stagedDocument.documentType,
      fileName: stagedDocument.requiresFileReselection ? '' : stagedDocument.fileName,
      fileUri: stagedDocument.requiresFileReselection ? '' : stagedDocument.fileUri,
      mimeType: stagedDocument.requiresFileReselection ? '' : stagedDocument.mimeType,
      notes: stagedDocument.notes,
      fileSizeLabel: stagedDocument.requiresFileReselection
        ? ''
        : stagedDocument.fileSizeLabel,
      webFile: stagedDocument.requiresFileReselection
        ? null
        : stagedDocument.webFile ?? null,
    });
    setDocumentUploadState('document_ready');
    setDocumentUploadMessage(
      stagedDocument.requiresFileReselection
        ? `Select ${stagedDocument.fileName} again before upload. The app restored its details but does not retain access to files after restart.`
        : `${stagedDocument.fileName} is ready to upload to this request.`,
    );
  };

  const handleDiscardPendingUpload = (documentType) => {
    const stagedDocument =
      stagedDocuments.find((document) => document.documentType === documentType) ?? null;

    setStagedDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.documentType !== documentType),
    );
    if (stagedDocuments.length <= 1) {
      void clearPersistedDraft();
    }
    setDocumentUploadState('document_ready');
    setDocumentUploadMessage(
      stagedDocument?.fileName
        ? `${stagedDocument.fileName} was removed from the staged upload list.`
        : 'Pending staged document removed.',
    );
  };

  const handleUploadPickedDocument = async () => {
    if (!hasSession) {
      setDocumentUploadState('document_unauthorized');
      setDocumentUploadMessage('Sign in first so the app can attach insurance documents.');
      return;
    }

    if (!latestInquiry?.id) {
      setDocumentUploadState('document_missing_inquiry');
      setDocumentUploadMessage('Submit or refresh a known inquiry before attaching documents.');
      return;
    }

    if (!latestInquiryCanAcceptDocuments) {
      setDocumentUploadState('document_closed');
      setDocumentUploadMessage(
        'This inquiry is already closed or rejected, so the backend will not accept more documents.',
      );
      return;
    }

    if (!String(documentDraft.fileName ?? '').trim() || !String(documentDraft.fileUri ?? '').trim()) {
      setDocumentUploadState('document_validation_error');
      setDocumentUploadMessage('Select a PDF or image document before upload.');
      return;
    }

    setIsUploadingDocument(true);
    setDocumentUploadState('document_uploading');
    setDocumentUploadMessage('');

    try {
      const updatedInquiry = await uploadInsuranceInquiryDocumentFile({
        inquiryId: latestInquiry.id,
        documentType: documentDraft.documentType,
        file: {
          uri: String(documentDraft.fileUri ?? '').trim(),
          name: String(documentDraft.fileName ?? '').trim(),
          type: inferMimeType(documentDraft.fileName, documentDraft.mimeType),
          webFile: documentDraft.webFile ?? null,
        },
        notes: documentDraft.notes,
        accessToken,
      });

      await adoptInquiry({
        inquiry: updatedInquiry,
        vehicleId: selectedVehicleId,
      });
      setDocumentUploadState('document_uploaded');
      setDocumentUploadMessage(
        `Document attached. This inquiry now has ${updatedInquiry?.documentCount ?? 0} supporting document${updatedInquiry?.documentCount === 1 ? '' : 's'}.`,
      );
      setStagedDocuments((currentDocuments) =>
        currentDocuments.filter(
          (document) => document.documentType !== documentDraft.documentType,
        ),
      );
      if (
        stagedDocuments.filter(
          (document) => document.documentType !== documentDraft.documentType,
        ).length === 0
      ) {
        await clearPersistedDraft();
      }
      resetDocumentDraftState();
    } catch (error) {
      const errorStatus = error instanceof ApiError ? error.status : null;

      if (error instanceof ApiError && error.status === 400) {
        setDocumentUploadState('document_validation_error');
      } else if (error instanceof ApiError && error.status === 401) {
        setDocumentUploadState('document_unauthorized');
      } else if (error instanceof ApiError && error.status === 403) {
        setDocumentUploadState('document_forbidden');
      } else if (error instanceof ApiError && error.status === 404) {
        setDocumentUploadState('document_missing_inquiry');
      } else if (error instanceof ApiError && error.status === 409) {
        setDocumentUploadState('document_closed');
      } else {
        setDocumentUploadState('document_failed');
      }

      if (shouldRetainDocumentAfterUploadFailure(errorStatus)) {
        setStagedDocuments((currentDocuments) => {
          const nextDocuments = currentDocuments.filter(
            (document) => document.documentType !== documentDraft.documentType,
          );

          return [
            ...nextDocuments,
            {
              ...documentDraft,
              requiresFileReselection: false,
            },
          ];
        });
        setIsDraftDirty(true);
      }

      setDocumentUploadMessage(
        buildCustomerErrorMessage(error, 'We could not attach the insurance document right now.'),
      );
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const openDocumentsPanel = ({ documentType, message = '' } = {}) => {
    if (documentType) {
      setDocumentDraft((currentDraft) => ({
        ...currentDraft,
        documentType,
      }));
    }

    if (latestInquiry?.id && latestInquiryCanAcceptDocuments) {
      setDocumentUploadState('document_ready');
      setDocumentUploadMessage(message);
    }

    setActivePanel('documents');
  };
  const handleOpenPanel = (panelKey) => {
    if (panelKey === 'documents') {
      if (latestInquiry?.id && !latestInquiryCanAcceptDocuments) {
        setDocumentUploadState('document_closed');
        setDocumentUploadMessage(
          'This inquiry is no longer accepting supporting documents, so uploads are locked for this vehicle.',
        );
        setActivePanel('documents');
        return;
      }

      openDocumentsPanel({
        documentType: missingRequiredDocuments[0]?.type,
      });
      return;
    }

    setActivePanel(panelKey);
  };
  const handleChangeInsuranceTab = (section) => {
    const nextSection = resolveInsuranceModeTab(section);

    navigation.setParams({
      resumeInsuranceTab: nextSection,
      vehicleId: selectedVehicleId ?? undefined,
    });

    if (nextSection === 'documents') {
      handleOpenPanel(nextSection);
      setActiveInsuranceTab(nextSection);
      return;
    }

    setActiveInsuranceTab(nextSection);
    setActivePanel(nextSection);
  };

  const handleOpenInsuranceHomeSection = (section) => {
    handleChangeInsuranceTab(section);
  };
  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation?.navigate?.('Menu');
  };

  const historyStatusSection = (
    <InsuranceSectionDivider title="History">
      <Text style={styles.statusSectionEyebrow}>History</Text>
      <Text style={styles.statusSectionTitle}>Recorded vehicle updates</Text>
      <Text style={styles.statusSectionSubtitle}>{historyStatusState.summary}</Text>
      {historyStatusState.latestUpdateLabel && historyStatusState.latestUpdateLabel !== '--' ? (
        <Text style={styles.statusSectionMeta}>
          Latest update: {historyStatusState.latestUpdateLabel}
        </Text>
      ) : null}

      {sortedHistoryRecords.length ? (
        <View style={styles.statusHistoryList}>
          {sortedHistoryRecords.map((record) => (
            <View
              key={`${record.status}-${record.updatedAt ?? record.createdAt ?? record.id ?? record.policyNumber ?? record.inquiryTypeLabel ?? 'history'}`}
              style={styles.statusHistoryRow}
            >
              <Text style={styles.statusHistoryLabel}>{buildHistoryRecordTitle(record)}</Text>
              <Text style={styles.statusHistorySummary}>{buildHistoryRecordSummary(record)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.statusHistoryEmpty}>
          Completed insurance records will appear here after staff close and record them.
        </Text>
      )}
    </InsuranceSectionDivider>
  );

  const insuranceModeUsesPanelScroll =
    shouldInsuranceModeUsePanelScroll(activeInsuranceTab);
  const contentInsetStyle = buildInsuranceContentInsets(insets);
  const screenContent = (
    <View
      style={[
        styles.content,
        contentInsetStyle,
        insuranceModeUsesPanelScroll && styles.fixedModeContent,
      ]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Back to mobile home"
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={20}
          color={colors.text}
        />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      {!hasSession ? (
        <InsuranceStatePanel
          icon="lock-outline"
          title="Customer session required"
          message="Sign in to create and track insurance requests."
          actionLabel="Sign in"
          onAction={() => navigation.navigate('Login')}
          tone="danger"
        />
      ) : null}

      {hasSession && vehicleLoadState === 'loading' && !ownedVehicles.length ? (
        <InsuranceStatePanel
          icon="car-clock"
          title="Loading owned vehicles"
          message="Checking your garage."
          loading
        />
      ) : null}

      {hasSession && vehicleLoadState === 'failed' && !ownedVehicles.length ? (
        <InsuranceStatePanel
          icon="alert-circle-outline"
          title="Vehicle lookup failed"
          message={vehicleLoadMessage || 'We could not load your owned vehicles right now.'}
          actionLabel="Retry"
          onAction={retryVehicleLoad}
          tone="danger"
        />
      ) : null}

      {hasSession &&
      !ownedVehicles.length &&
      vehicleLoadState !== 'loading' &&
      vehicleLoadState !== 'failed' ? (
        <InsuranceStatePanel
          icon="car-off"
          title="No owned vehicle on file"
          message="Add a vehicle, then return to this insurance request."
          actionLabel="Add vehicle"
          onAction={handleAddVehicle}
        />
      ) : null}

      {hasSession && ownedVehicles.length ? (
        <InsuranceVehiclePicker
          onAddVehicle={handleAddVehicle}
          onClose={closeVehiclePicker}
          onSelectVehicle={handleSelectVehicle}
          selectedVehicleId={selectedVehicleId}
          vehicles={ownedVehicles}
          visible={isVehiclePickerOpen}
        />
      ) : null}

      {trackingMessage ? (
        <InsuranceStatePanel
          icon={trackingState === 'tracking_not_found' ? 'file-question-outline' : 'information-outline'}
          title="Tracking update"
          message={trackingMessage}
          loading={trackingState === 'tracking_loading' || isRefreshing}
        />
      ) : null}
      <InsuranceModeShell
        activeSection={activeInsuranceTab}
        onChangeSection={handleChangeInsuranceTab}
        selectedVehicleLabel={selectedVehicleLabel}
        isVehiclePickerAvailable={
          isVehiclePickerAvailable && !isSubmitting && !isUploadingDocument
        }
        onOpenVehiclePicker={handleOpenVehiclePicker}
        summaryChips={shellSummaryChips}
      >
        {activeInsuranceTab === 'home' ? (
          <InsuranceHomePanel
            title={homeTitle}
            selectedVehicleLabel={selectedVehicleLabel}
            currentRequestSummary={currentRequestSummary}
            overviewState={overviewState}
            statusState={statusState}
            onOpenSection={handleOpenInsuranceHomeSection}
          />
        ) : null}

        {activeInsuranceTab === 'request' ? (
          <InsuranceRequestPanel
            bottomInset={insets.bottom}
            selectedVehicleLabel={selectedVehicleLabel}
            draft={draft}
            purposeOptions={purposeOptions}
            inquiryTypeOptions={inquiryTypeOptions}
            requestGuidance={requestGuidance}
            isRefreshing={isRefreshing}
            onRefresh={refreshTracking}
            onChangeDraft={(patch) => {
              setDraft((current) => ({ ...current, ...patch }))
              handleDraftPatch()
            }}
            onSubmit={handleSubmitInquiry}
            isSubmitting={isSubmitting}
            intakeState={intakeState}
            intakeMessage={intakeMessage}
            checklist={requestRequirementsChecklist}
            stagedDocuments={stagedDocuments}
            onFileDocuments={requestOnFileDocuments}
            hasOnFileRenewalPolicy={hasOnFileRenewalPolicy}
            canSubmitRequest={canSubmitNewInquiry}
            initialStageIndex={draft.requestStageIndex}
            onStageChange={(requestStageIndex) => {
              setDraft((current) => ({ ...current, requestStageIndex }));
              handleDraftPatch();
            }}
            onStageDocument={handleStageDocument}
            onRemoveStagedDocument={handleRemoveStagedDocument}
          />
        ) : null}

        {activeInsuranceTab === 'documents' ? (
          <InsuranceDocumentsPanel
            bottomInset={insets.bottom}
            checklist={requirementsChecklist}
            latestInquiry={latestInquiry}
            purposeLabel={getPurposeLabel(activePurpose)}
            isRefreshing={isRefreshing}
            onRefresh={refreshTracking}
            onChangeDocumentDraft={(patch) => {
              setDocumentDraft((current) => ({ ...current, ...patch }))
              handleDocumentDraftPatch()
            }}
            onPickDocument={pickCustomerInsuranceDocument}
            onUploadDocument={handleUploadPickedDocument}
            isUploadingDocument={isUploadingDocument}
            documentDraft={documentDraft}
            documentTypeOptions={customerInsuranceDocumentTypeOptions}
            onClearPickedDocument={handleClearPickedDocument}
            uploadMessage={documentUploadMessage}
            uploadState={documentUploadState}
            canAcceptDocuments={Boolean(latestInquiry?.id && latestInquiryCanAcceptDocuments)}
            pendingUploads={stagedDocuments}
            onUsePendingUpload={handleUsePendingUpload}
            onDiscardPendingUpload={handleDiscardPendingUpload}
            onStartRequest={() => handleChangeInsuranceTab('request')}
          />
        ) : null}

        {activeInsuranceTab === 'status' ? (
          <InsuranceStatusDetailPanel
            eyebrow="Status"
            title={statusTitle}
            subtitle={statusSubtitle}
            statusState={statusState}
            processSteps={latestInquiry?.id ? processSteps : []}
            isRefreshing={isRefreshing}
            onRefresh={refreshTracking}
            onAction={() => handleChangeInsuranceTab(statusState.ctaRouteKey)}
          >
            <InsuranceSectionDivider title="Request path">
              <Text style={styles.statusSectionMeta}>
                Reference: {currentRequestSummary.referenceLabel ?? 'Reference unavailable'}
              </Text>
              <Text style={styles.statusSectionMeta}>
                {currentRequestSummary.purposeLabel} - {currentRequestSummary.inquiryTypeLabel}
              </Text>
              <Text style={styles.statusSectionSubtitle}>{currentRequestSummary.statusHint}</Text>
            </InsuranceSectionDivider>

            {latestInquiry?.latestCustomerMessage ? (
              <InsuranceSectionDivider title="Latest staff update">
                <Text style={styles.statusSectionSubtitle}>
                  {latestInquiry.latestCustomerMessage}
                </Text>
              </InsuranceSectionDivider>
            ) : null}

            {latestInquiry?.paymentDueAt || latestInquiry?.renewalDueAt || latestInquiry?.policyExpiryAt ? (
              <InsuranceSectionDivider title="Deadlines">
                {latestInquiry?.paymentDueAt ? (
                  <Text style={styles.statusSectionMeta}>
                    Payment due: {formatTimestampLabel(latestInquiry.paymentDueAt)}
                  </Text>
                ) : null}
                {latestInquiry?.renewalDueAt ? (
                  <Text style={styles.statusSectionMeta}>
                    Renewal due: {formatTimestampLabel(latestInquiry.renewalDueAt)}
                  </Text>
                ) : null}
                {latestInquiry?.policyExpiryAt ? (
                  <Text style={styles.statusSectionMeta}>
                    Policy expiry: {formatTimestampLabel(latestInquiry.policyExpiryAt)}
                  </Text>
                ) : null}
              </InsuranceSectionDivider>
            ) : null}

            {latestInquiry?.paymentStatus && latestInquiry.paymentStatus !== 'not_required' ? (
              <InsuranceSectionDivider title="Payment">
                <Text style={styles.statusSectionSubtitle}>{paymentSummary.message}</Text>
              </InsuranceSectionDivider>
            ) : null}

            {latestInquiry?.renewalStatus && latestInquiry.renewalStatus !== 'not_applicable' ? (
              <InsuranceSectionDivider title="Renewal">
                <Text style={styles.statusSectionSubtitle}>
                  {buildRenewalPrompt(latestInquiry).message}
                </Text>
              </InsuranceSectionDivider>
            ) : null}

            {historyStatusSection}
          </InsuranceStatusDetailPanel>
        ) : null}
      </InsuranceModeShell>

      {trackingState === 'tracking_loading' && !trackingMessage ? (
        <InsuranceStatePanel
          icon="refresh"
          title="Loading insurance updates"
          message="Checking the latest request and vehicle history."
          loading
        />
      ) : null}

    </View>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        {insuranceModeUsesPanelScroll ? <View style={styles.fixedModeViewport}>{screenContent}</View> : <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshTracking}
              tintColor={colors.primary}
            />
          }
        >
          {screenContent}
        </ScrollView>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
