import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ApiError, listCustomerVehicles } from '../lib/authClient';
import {
  buildOwnedVehicleInsuranceLabel,
  createEmptyCustomerInsuranceSnapshot,
  canAttachCustomerInsuranceDocument,
  createInitialCustomerInsuranceDraft,
  createInsuranceInquiry,
  customerInsuranceDocumentTypeOptions,
  getInsuranceInquiryById,
  getCustomerInsuranceTrackingState,
  listVehicleInsuranceRecords,
  uploadInsuranceInquiryDocumentFile,
} from '../lib/insuranceClient';
import {
  REMEMBERED_INSURANCE_INQUIRY_STORAGE_KEY,
  buildCustomerInsuranceActionCards,
  buildCustomerInsuranceEntryState,
  buildCustomerInsuranceHeroState,
  buildCustomerInsuranceOverviewState,
  buildCustomerInsuranceStatusState,
  buildRequirementsChecklist,
  clearRememberedInquiryForVehicle,
  createPickedInsuranceDocumentDraft,
  doesCustomerInsuranceInquiryMatchVehicle,
  getCustomerInsurancePaymentSummary,
  getVehicleScopedCustomerInquiryId,
  getRememberedInquiryForVehicle,
  hydrateRememberedInquiryMappings,
  isTerminalCustomerInquiryStatus,
  rememberInquiryForVehicle,
  serializeRememberedInquiryMappings,
  shouldDeferCustomerInsuranceTrackingRefresh,
} from './insuranceModuleView.mjs';
import InsuranceDocumentsPanel from './insurance/InsuranceDocumentsPanel';
import InsuranceEntryPanel from './insurance/InsuranceEntryPanel';
import InsuranceHomePanel from './insurance/InsuranceHomePanel';
import InsuranceModeShell from './insurance/InsuranceModeShell';
import { InsuranceSectionCard } from './insurance/InsurancePanelPrimitives';
import InsuranceRequestPanel from './insurance/InsuranceRequestPanel';
import InsuranceStatusDetailPanel from './insurance/InsuranceStatusDetailPanel';
import { colors, radius } from '../theme';

const inquiryTypeOptions = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'ctpl', label: 'CTPL' },
];

const formatTimestampLabel = (value) => {
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

const buildCustomerErrorMessage = (error, fallbackMessage) =>
  error instanceof ApiError && error.message ? error.message : fallbackMessage;

const normalizeRouteId = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return normalizedValue.length ? normalizedValue : null;
};

const formatWorkflowLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || '--';

const buildInitialDocumentUploadDraft = () => ({
  documentType: 'photo',
  fileName: '',
  fileUri: '',
  mimeType: 'application/pdf',
  notes: '',
  fileSizeLabel: null,
});

const inferMimeType = (fileName, fallbackType = 'application/pdf') => {
  const normalizedFileName = String(fileName ?? '').trim().toLowerCase();

  if (normalizedFileName.endsWith('.pdf')) {
    return 'application/pdf';
  }

  if (normalizedFileName.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedFileName.endsWith('.webp')) {
    return 'image/webp';
  }

  if (normalizedFileName.endsWith('.heic')) {
    return 'image/heic';
  }

  if (normalizedFileName.endsWith('.jpg') || normalizedFileName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  return String(fallbackType ?? '').trim() || 'application/pdf';
};

const buildRenewalPrompt = (inquiry) => {
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

const getLatestInsuranceRecord = (records) =>
  (Array.isArray(records) ? records : []).reduce((currentLatest, record) => {
    const currentValue = new Date(record?.updatedAt ?? record?.createdAt ?? 0).getTime();
    const latestValue = new Date(
      currentLatest?.updatedAt ?? currentLatest?.createdAt ?? 0,
    ).getTime();

    return currentValue > latestValue ? record : currentLatest;
  }, null);

const buildHistoryRecordTitle = (record) => {
  const statusLabel = formatWorkflowLabel(record?.status);

  return record?.inquiryTypeLabel
    ? `${record.inquiryTypeLabel} - ${statusLabel}`
    : statusLabel;
};

const buildHistoryRecordSummary = (record) => {
  const latestUpdateLabel = formatTimestampLabel(record?.updatedAt ?? record?.createdAt);
  const summaryParts = [
    record?.statusHint,
    latestUpdateLabel !== '--' ? `Latest update: ${latestUpdateLabel}` : null,
    record?.providerName ? `Provider: ${record.providerName}` : null,
    record?.policyNumber ? `Policy no.: ${record.policyNumber}` : null,
  ].filter(Boolean);

  return summaryParts.join(' ') || 'Completed insurance record.';
};

function InsuranceStatePanel({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'default',
  loading = false,
}) {
  return (
    <View
      style={[
        styles.statePanel,
        tone === 'danger' && styles.statePanelDanger,
        tone === 'warning' && styles.statePanelWarning,
        tone === 'success' && styles.statePanelSuccess,
      ]}
    >
      <View style={styles.statePanelHeader}>
        <View style={styles.statePanelIconWrap}>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.statePanelCopy}>
          <Text style={styles.statePanelTitle}>{title}</Text>
          <Text style={styles.statePanelText}>{message}</Text>
        </View>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.statePanelButton} onPress={onAction} activeOpacity={0.88}>
          <Text style={styles.statePanelButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function InsuranceInquiryScreen({ account, navigation, route }) {
  const accessToken = account?.accessToken ?? null;
  const userId = account?.userId ?? null;
  const accountOwnedVehicles = useMemo(
    () => (Array.isArray(account?.ownedVehicles) ? account.ownedVehicles.filter(Boolean) : []),
    [account?.ownedVehicles],
  );
  const hasSession = Boolean(accessToken && userId);
  const [liveOwnedVehicles, setLiveOwnedVehicles] = useState(accountOwnedVehicles);
  const [vehicleLoadState, setVehicleLoadState] = useState(hasSession ? 'loading' : 'idle');
  const [vehicleLoadMessage, setVehicleLoadMessage] = useState('');
  const [vehicleReloadKey, setVehicleReloadKey] = useState(0);
  const ownedVehicles = useMemo(
    () => (liveOwnedVehicles.length ? liveOwnedVehicles : accountOwnedVehicles),
    [accountOwnedVehicles, liveOwnedVehicles],
  );
  const initialSnapshot = useMemo(
    () =>
      createEmptyCustomerInsuranceSnapshot({
        hasSession,
        ownedVehicles,
      }),
    [hasSession, ownedVehicles],
  );
  const routeVehicleId = normalizeRouteId(route?.params?.vehicleId);
  const routeInquiryId = normalizeRouteId(route?.params?.inquiryId);
  const fallbackVehicleId =
    normalizeRouteId(account?.primaryVehicleId) ?? normalizeRouteId(ownedVehicles[0]?.id);
  const initialVehicleId = routeVehicleId ?? fallbackVehicleId;
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicleId);
  const [activePanel, setActivePanel] = useState('home');
  const [isInInsuranceMode, setIsInInsuranceMode] = useState(false);
  const [activeModeSection, setActiveModeSection] = useState('overview');
  const [draft, setDraft] = useState(createInitialCustomerInsuranceDraft());
  const [documentDraft, setDocumentDraft] = useState(buildInitialDocumentUploadDraft());
  const [intakeState, setIntakeState] = useState(initialSnapshot.intakeState);
  const [intakeMessage, setIntakeMessage] = useState('');
  const [documentUploadState, setDocumentUploadState] = useState('document_idle');
  const [documentUploadMessage, setDocumentUploadMessage] = useState('');
  const [trackingState, setTrackingState] = useState(initialSnapshot.trackingState);
  const [trackingMessage, setTrackingMessage] = useState('');
  const [latestInquiry, setLatestInquiry] = useState(null);
  const [latestInquiryId, setLatestInquiryId] = useState(
    routeInquiryId ?? getRememberedInquiryForVehicle(initialVehicleId),
  );
  const [claimStatusUpdates, setClaimStatusUpdates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasHydratedRememberedInquiryMappings, setHasHydratedRememberedInquiryMappings] =
    useState(false);
  const latestInquiryVehicleIdRef = useRef(routeVehicleId ?? initialVehicleId ?? null);
  const rememberedInquiryLookupByVehicleRef = useRef({
    vehicleId: null,
    inquiryId: routeInquiryId ?? undefined,
  });

  const openInsuranceMode = (section = 'overview') => {
    setIsInInsuranceMode(true);
    setActiveModeSection(section);
  };

  const closeInsuranceMode = () => {
    setActivePanel('home');
    setIsInInsuranceMode(false);
    setActiveModeSection('overview');
  };

  useEffect(() => {
    setActivePanel('home');
    setIsInInsuranceMode(false);
    setActiveModeSection('overview');
  }, [selectedVehicleId]);

  const selectedVehicle =
    ownedVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;
  const selectedVehicleLabel = selectedVehicle
    ? buildOwnedVehicleInsuranceLabel(selectedVehicle)
    : '';
  const latestInquiryCanAcceptDocuments = canAttachCustomerInsuranceDocument(latestInquiry);
  const requirementsChecklist = useMemo(
    () =>
      buildRequirementsChecklist({
        status: latestInquiry?.status,
        uploadedTypes: latestInquiry?.documents?.map((document) => document.documentType) ?? [],
      }),
    [latestInquiry],
  );
  const missingRequiredDocuments = useMemo(
    () => requirementsChecklist.required.filter((item) => !item.complete),
    [requirementsChecklist],
  );
  const paymentSummary = useMemo(
    () =>
      getCustomerInsurancePaymentSummary({
        status: latestInquiry?.status,
        paymentStatus: latestInquiry?.paymentStatus,
        paymentDueAt: latestInquiry?.paymentDueAt,
      }),
    [latestInquiry?.paymentDueAt, latestInquiry?.paymentStatus, latestInquiry?.status],
  );
  const renewalSummary = useMemo(() => buildRenewalPrompt(latestInquiry), [latestInquiry]);
  const entryState = useMemo(
    () =>
      buildCustomerInsuranceEntryState({
        selectedVehicleLabel,
        latestInquiry,
        reminderCount: claimStatusUpdates.length,
      }),
    [claimStatusUpdates.length, latestInquiry, selectedVehicleLabel],
  );
  const overviewState = useMemo(
    () =>
      buildCustomerInsuranceOverviewState({
        selectedVehicleLabel,
        latestInquiry,
        missingRequiredDocuments,
        historyCount: claimStatusUpdates.length,
    }),
    [claimStatusUpdates.length, latestInquiry, missingRequiredDocuments, selectedVehicleLabel],
  );
  const latestStatusUpdateLabel = useMemo(() => {
    if (latestInquiry?.statusHint) {
      return latestInquiry.statusHint;
    }

    const latestRecord = getLatestInsuranceRecord(claimStatusUpdates);

    if (latestRecord?.statusHint) {
      return latestRecord.statusHint;
    }

    return formatTimestampLabel(latestRecord?.updatedAt ?? latestRecord?.createdAt);
  }, [claimStatusUpdates, latestInquiry?.statusHint]);
  const statusState = useMemo(
    () =>
      buildCustomerInsuranceStatusState({
        latestInquiry,
        missingRequiredDocuments,
        latestUpdateLabel: latestStatusUpdateLabel,
      }),
    [latestInquiry, latestStatusUpdateLabel, missingRequiredDocuments],
  );
  const sortedHistoryRecords = useMemo(() => {
    return [...claimStatusUpdates].sort((left, right) => {
      const leftTimestamp = new Date(left?.updatedAt ?? left?.createdAt ?? 0).getTime();
      const rightTimestamp = new Date(right?.updatedAt ?? right?.createdAt ?? 0).getTime();

      return rightTimestamp - leftTimestamp;
    });
  }, [claimStatusUpdates]);
  const historySummary = sortedHistoryRecords.length
    ? `${sortedHistoryRecords.length} recorded insurance update${sortedHistoryRecords.length === 1 ? '' : 's'} ${sortedHistoryRecords.length === 1 ? 'is' : 'are'} already available for this vehicle.`
    : 'Vehicle-level insurance records will appear here after staff close and record a customer-safe case.';
  const latestHistoryRecord = sortedHistoryRecords[0] ?? null;
  const historyLatestUpdateLabel =
    latestHistoryRecord?.statusHint ??
    formatTimestampLabel(latestHistoryRecord?.updatedAt ?? latestHistoryRecord?.createdAt);
  const historyStatusState = useMemo(
    () => ({
      title: sortedHistoryRecords.length ? 'Completed records' : 'No history yet',
      summary: historySummary,
      latestUpdateLabel: historyLatestUpdateLabel,
      timeline: [],
    }),
    [historyLatestUpdateLabel, historySummary, sortedHistoryRecords.length],
  );
  const heroState = useMemo(
    () =>
      buildCustomerInsuranceHeroState({
        selectedVehicleLabel,
        latestInquiry,
        missingRequiredDocuments,
        claimStatusUpdateCount: claimStatusUpdates.length,
      }),
    [
      claimStatusUpdates.length,
      latestInquiry,
      missingRequiredDocuments,
      selectedVehicleLabel,
    ],
  );
  const actionCards = useMemo(
    () =>
      buildCustomerInsuranceActionCards({
        latestInquiry,
        requirementsChecklist,
        claimStatusUpdateCount: claimStatusUpdates.length,
        paymentSummary,
        renewalSummary,
      }),
    [
      claimStatusUpdates.length,
      latestInquiry,
      paymentSummary,
      requirementsChecklist,
      renewalSummary,
    ],
  );
  const getSettledRememberedInquiryIdForSelectedVehicle = () => {
    if (!selectedVehicleId) {
      return undefined;
    }

    return rememberedInquiryLookupByVehicleRef.current.vehicleId === selectedVehicleId
      ? rememberedInquiryLookupByVehicleRef.current.inquiryId
      : undefined;
  };
  const getVehicleScopedLatestInquiryId = ({
    inquiryIdOverride = null,
    vehicleIdOverride = selectedVehicleId,
  } = {}) =>
    String(inquiryIdOverride ?? '').trim() ||
    getVehicleScopedCustomerInquiryId({
      selectedVehicleId: vehicleIdOverride,
      routeInquiryId,
      latestInquiryId,
      latestInquiryVehicleId: latestInquiryVehicleIdRef.current,
      rememberedInquiryId:
        rememberedInquiryLookupByVehicleRef.current.vehicleId === vehicleIdOverride
          ? rememberedInquiryLookupByVehicleRef.current.inquiryId
          : undefined,
    });

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
    if (accountOwnedVehicles.length) {
      setLiveOwnedVehicles(accountOwnedVehicles);
    }
  }, [accountOwnedVehicles]);

  useEffect(() => {
    let isMounted = true;

    setHasHydratedRememberedInquiryMappings(false);

    loadPersistedRememberedInquiryMappings().then(() => {
      if (!isMounted) {
        return;
      }

      if (!routeInquiryId) {
        const resumedInquiryId = getRememberedInquiryForVehicle(
          routeVehicleId ?? selectedVehicleId ?? fallbackVehicleId,
        );

        if (resumedInquiryId) {
          latestInquiryVehicleIdRef.current = routeVehicleId ?? selectedVehicleId ?? fallbackVehicleId;
          setLatestInquiryId((currentInquiryId) => currentInquiryId ?? resumedInquiryId);
        }
      }

      setHasHydratedRememberedInquiryMappings(true);
    });

    return () => {
      isMounted = false;
    };
  }, [fallbackVehicleId, routeInquiryId, routeVehicleId]);

  useEffect(() => {
    if (!routeVehicleId) {
      return;
    }

    const rememberedInquiryId = hasHydratedRememberedInquiryMappings
      ? getRememberedInquiryForVehicle(routeVehicleId)
      : null;
    rememberedInquiryLookupByVehicleRef.current = {
      vehicleId: routeVehicleId,
      inquiryId: routeInquiryId ?? (hasHydratedRememberedInquiryMappings ? rememberedInquiryId : undefined),
    };
    setSelectedVehicleId(routeVehicleId);
    latestInquiryVehicleIdRef.current = routeVehicleId;
    setLatestInquiryId(
      routeInquiryId ?? (hasHydratedRememberedInquiryMappings ? rememberedInquiryId : null),
    );
  }, [hasHydratedRememberedInquiryMappings, routeInquiryId, routeVehicleId]);

  useEffect(() => {
    if (!selectedVehicleId) {
      rememberedInquiryLookupByVehicleRef.current = {
        vehicleId: null,
        inquiryId: undefined,
      };
      latestInquiryVehicleIdRef.current = null;
      setLatestInquiry(null);
      setLatestInquiryId(null);
      return;
    }

    if (!routeInquiryId) {
      if (!hasHydratedRememberedInquiryMappings) {
        rememberedInquiryLookupByVehicleRef.current = {
          vehicleId: selectedVehicleId,
          inquiryId: undefined,
        };
        return;
      }

      const rememberedInquiryId = getRememberedInquiryForVehicle(selectedVehicleId);
      rememberedInquiryLookupByVehicleRef.current = {
        vehicleId: selectedVehicleId,
        inquiryId: rememberedInquiryId ?? null,
      };
      if (
        !doesCustomerInsuranceInquiryMatchVehicle({
          inquiry: latestInquiry,
          vehicleId: selectedVehicleId,
        })
      ) {
        setLatestInquiry(null);
      }
      latestInquiryVehicleIdRef.current = rememberedInquiryId ? selectedVehicleId : null;
      setLatestInquiryId(rememberedInquiryId ?? null);
    }
  }, [
    hasHydratedRememberedInquiryMappings,
    latestInquiry,
    routeInquiryId,
    selectedVehicleId,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (!hasSession) {
      setVehicleLoadState('idle');
      setVehicleLoadMessage('');
      return undefined;
    }

    setVehicleLoadState(accountOwnedVehicles.length ? 'refreshing' : 'loading');
    setVehicleLoadMessage('');

    listCustomerVehicles({ userId, accessToken })
      .then((vehicles) => {
        if (!isMounted) {
          return;
        }

        const preferredVehicleId =
          routeVehicleId ??
          normalizeRouteId(account?.primaryVehicleId) ??
          normalizeRouteId(vehicles[0]?.id);
        const nextSelectedVehicle =
          vehicles.find((vehicle) => vehicle.id === preferredVehicleId) ?? vehicles[0] ?? null;

        setLiveOwnedVehicles(vehicles);
        setSelectedVehicleId(nextSelectedVehicle?.id ?? null);
        setVehicleLoadState('ready');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setVehicleLoadState('failed');
        setVehicleLoadMessage(
          buildCustomerErrorMessage(error, 'We could not load your owned vehicles right now.'),
        );
      });

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    account?.primaryVehicleId,
    accountOwnedVehicles.length,
    hasSession,
    routeVehicleId,
    userId,
    vehicleReloadKey,
  ]);

  useEffect(() => {
    if (!hasSession) {
      setIntakeState('unauthorized_session');
      setTrackingState('tracking_unauthorized_session');
      return;
    }

    if (!ownedVehicles.length) {
      if (vehicleLoadState === 'loading' || vehicleLoadState === 'refreshing') {
        return;
      }

      setSelectedVehicleId(null);
      setLatestInquiry(null);
      setClaimStatusUpdates([]);
      setIntakeState('no_vehicle');
      setTrackingState('tracking_empty');
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

  const resetDraftState = () => {
    setDraft(createInitialCustomerInsuranceDraft());
  };

  const resetDocumentDraftState = () => {
    setDocumentDraft(buildInitialDocumentUploadDraft());
  };

  const loadPersistedRememberedInquiryMappings = async () => {
    try {
      const serializedMappings = await AsyncStorage.getItem(
        REMEMBERED_INSURANCE_INQUIRY_STORAGE_KEY,
      );
      hydrateRememberedInquiryMappings(serializedMappings);
    } catch {
      // Ignore resume-cache failures and keep the screen functional.
    }
  };

  const persistRememberedInquiryMappings = async () => {
    try {
      await AsyncStorage.setItem(
        REMEMBERED_INSURANCE_INQUIRY_STORAGE_KEY,
        serializeRememberedInquiryMappings(),
      );
    } catch {
      // Ignore persistence failures so resume storage never blocks the customer flow.
    }
  };

  const syncRememberedInquiry = async (vehicleId, inquiry) => {
    if (!vehicleId) {
      return;
    }

    if (inquiry?.id && !isTerminalCustomerInquiryStatus(inquiry.status)) {
      rememberInquiryForVehicle({
        vehicleId,
        inquiryId: inquiry.id,
      });
      await persistRememberedInquiryMappings();
      return;
    }

    clearRememberedInquiryForVehicle(vehicleId);
    await persistRememberedInquiryMappings();
  };

  const refreshTracking = async ({ inquiryIdOverride } = {}) => {
    if (!hasSession) {
      setTrackingState('tracking_unauthorized_session');
      setTrackingMessage('Sign in first so the app can load your claim-status updates.');
      return;
    }

    if (!selectedVehicleId) {
      setTrackingState('tracking_empty');
      setTrackingMessage('Select an owned vehicle before loading insurance tracking updates.');
      return;
    }

    const knownInquiryId = getVehicleScopedLatestInquiryId({
      inquiryIdOverride,
    });

    if (
      shouldDeferCustomerInsuranceTrackingRefresh({
        hasHydratedRememberedInquiryMappings,
        knownInquiryId,
        settledRememberedInquiryIdForSelectedVehicle:
          getSettledRememberedInquiryIdForSelectedVehicle(),
      })
    ) {
      return;
    }

    setIsRefreshing(true);
    setTrackingState('tracking_loading');
    setTrackingMessage('');

    try {
      let nextInquiry = latestInquiry;
      let inquiryNotFound = false;

      if (knownInquiryId) {
        try {
          nextInquiry = await getInsuranceInquiryById({
            inquiryId: knownInquiryId,
            accessToken,
          });
          if (
            !doesCustomerInsuranceInquiryMatchVehicle({
              inquiry: nextInquiry,
              vehicleId: selectedVehicleId,
            })
          ) {
            inquiryNotFound = true;
            nextInquiry = null;
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            inquiryNotFound = true;
            nextInquiry = null;
          } else {
            throw error;
          }
        }
      }

      const nextRecords = await listVehicleInsuranceRecords({
        vehicleId: selectedVehicleId,
        accessToken,
      });

      await syncRememberedInquiry(selectedVehicleId, nextInquiry ?? null);
      latestInquiryVehicleIdRef.current = nextInquiry?.vehicleId ?? null;
      setLatestInquiry(nextInquiry ?? null);
      setClaimStatusUpdates(nextRecords);
      setLatestInquiryId(
        nextInquiry?.id && !isTerminalCustomerInquiryStatus(nextInquiry.status)
          ? nextInquiry.id
          : null,
      );
      setTrackingState(
        inquiryNotFound && !nextRecords.length
          ? 'tracking_not_found'
          : getCustomerInsuranceTrackingState({
              latestInquiry: nextInquiry ?? null,
              claimStatusUpdates: nextRecords,
            }),
      );
      setTrackingMessage(
        inquiryNotFound && !nextRecords.length
          ? 'The known inquiry could not be found anymore, but you can still track vehicle insurance records here when they exist.'
          : '',
      );
    } catch (error) {
      setTrackingState('tracking_load_failed');
      setTrackingMessage(
        buildCustomerErrorMessage(
          error,
          'We could not load insurance tracking updates right now.',
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasSession || !selectedVehicleId) {
      return;
    }

    if (
      shouldDeferCustomerInsuranceTrackingRefresh({
        hasHydratedRememberedInquiryMappings,
        knownInquiryId: getVehicleScopedLatestInquiryId(),
        settledRememberedInquiryIdForSelectedVehicle:
          getSettledRememberedInquiryIdForSelectedVehicle(),
      })
    ) {
      return;
    }

    refreshTracking();
    // The screen should refresh when the selected vehicle changes or the session becomes valid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasHydratedRememberedInquiryMappings,
    hasSession,
    latestInquiryId,
    selectedVehicleId,
  ]);

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
    if (hasSession && ownedVehicles.length && selectedVehicle) {
      setIntakeState('draft_ready');
      setIntakeMessage('');
    }
  };

  const handleDocumentDraftPatch = () => {
    setDocumentUploadState('document_ready');
    setDocumentUploadMessage('');
  };

  const handleSelectVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setTrackingMessage('');
    latestInquiryVehicleIdRef.current = vehicleId;
    setLatestInquiry(null);
    setLatestInquiryId(getRememberedInquiryForVehicle(vehicleId));
    setClaimStatusUpdates([]);
    setIntakeMessage('');
    setDocumentUploadState('document_idle');
    setDocumentUploadMessage('');
    resetDocumentDraftState();
    if (hasSession && ownedVehicles.length) {
      setIntakeState('draft_ready');
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

    if (!String(draft.subject ?? '').trim() || !String(draft.description ?? '').trim()) {
      setIntakeState('validation_error');
      setIntakeMessage('Subject and description are required before the inquiry can be submitted.');
      return;
    }

    setIsSubmitting(true);
    setIntakeState('submitting');
    setIntakeMessage('');

    try {
      const createdInquiry = await createInsuranceInquiry({
        userId,
        vehicleId: selectedVehicle.id,
        inquiryType: draft.inquiryType,
        subject: draft.subject,
        description: draft.description,
        providerName: draft.providerName,
        policyNumber: draft.policyNumber,
        notes: draft.notes,
        accessToken,
      });

      setLatestInquiry(createdInquiry);
      latestInquiryVehicleIdRef.current = createdInquiry?.vehicleId ?? selectedVehicle.id;
      setLatestInquiryId(createdInquiry?.id ?? null);
      await syncRememberedInquiry(selectedVehicle.id, createdInquiry);
      setIntakeState('submitted_inquiry');
      setIntakeMessage(
        `Inquiry submitted successfully with backend status ${createdInquiry?.status ?? 'submitted'}.`,
      );
      resetDraftState();
      await refreshTracking({
        inquiryIdOverride: createdInquiry?.id ?? null,
      });
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
        },
        notes: documentDraft.notes,
        accessToken,
      });

      setLatestInquiry(updatedInquiry);
      latestInquiryVehicleIdRef.current = updatedInquiry?.vehicleId ?? selectedVehicleId;
      setLatestInquiryId(updatedInquiry?.id ?? null);
      await syncRememberedInquiry(selectedVehicleId, updatedInquiry);
      setTrackingState(
        getCustomerInsuranceTrackingState({
          latestInquiry: updatedInquiry,
          claimStatusUpdates,
        }),
      );
      setDocumentUploadState('document_uploaded');
      setDocumentUploadMessage(
        `Document attached. This inquiry now has ${updatedInquiry?.documentCount ?? 0} supporting document${updatedInquiry?.documentCount === 1 ? '' : 's'}.`,
      );
      resetDocumentDraftState();
    } catch (error) {
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
  const handleChangeModeSection = (section) => {
    setActiveModeSection(section);

    if (section === 'overview') {
      setActivePanel('home');
      return;
    }

    if (section === 'documents') {
      handleOpenPanel(section);
      return;
    }

    setActivePanel(section);
  };

  const heroSubtitle = hasSession
    ? 'Start a request quickly, upload the right documents, and follow review, payment, and renewal prompts without exposing staff-only workflow details.'
    : 'Sign in as a customer to start an insurance request and see customer-safe review, payment, and renewal updates.';
  const insuranceModeUsesPanelScroll = isInInsuranceMode &&
    (
      activeModeSection === 'request' ||
      activeModeSection === 'documents' ||
      activeModeSection === 'status' ||
      activeModeSection === 'history'
    );
  const screenContent = (
    <View style={[styles.content, insuranceModeUsesPanelScroll && styles.fixedModeContent]}>
          <View style={styles.heroCard}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.88}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.eyebrow}>CUSTOMER INSURANCE</Text>
            <Text style={styles.title}>Insurance home</Text>
            <Text style={styles.subtitle}>{heroSubtitle}</Text>
            <View style={styles.routePill}>
              <Text style={styles.routePillText}>Live routes: create inquiry, upload document file, get inquiry by id, vehicle insurance records</Text>
            </View>
          </View>

          {!hasSession ? (
            <InsuranceStatePanel
              icon="lock-outline"
              title="Customer session required"
              message="This mobile flow only works for a signed-in customer account because insurance creation and tracking are bearer-token protected."
              actionLabel="Sign in"
              onAction={() => navigation.navigate('Login')}
              tone="danger"
            />
          ) : null}

          {hasSession && vehicleLoadState === 'loading' && !ownedVehicles.length ? (
            <InsuranceStatePanel
              icon="car-clock"
              title="Loading owned vehicles"
              message="Checking your live garage before insurance intake starts."
              loading
            />
          ) : null}

          {hasSession && vehicleLoadState === 'failed' && !ownedVehicles.length ? (
            <InsuranceStatePanel
              icon="alert-circle-outline"
              title="Vehicle lookup failed"
              message={vehicleLoadMessage || 'We could not load your owned vehicles right now.'}
              actionLabel="Retry"
              onAction={() => setVehicleReloadKey((currentKey) => currentKey + 1)}
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
              message="Insurance intake can only start from a customer-owned vehicle. Complete vehicle onboarding first, then come back here."
              tone="danger"
            />
          ) : null}

          {hasSession && ownedVehicles.length ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Select vehicle</Text>
                  <Text style={styles.sectionSubtitle}>
                    Vehicle ownership is the backend gate for insurance intake.
                  </Text>
                </View>
              </View>

              <View style={styles.vehicleList}>
                {ownedVehicles.map((vehicle) => {
                  const isSelected = vehicle.id === selectedVehicleId;

                  return (
                    <TouchableOpacity
                      key={vehicle.id}
                      style={[styles.selectionChip, isSelected && styles.selectionChipSelected]}
                      onPress={() => handleSelectVehicle(vehicle.id)}
                      activeOpacity={0.88}
                    >
                      <Text
                        style={[
                          styles.selectionChipText,
                          isSelected && styles.selectionChipTextSelected,
                        ]}
                      >
                        {buildOwnedVehicleInsuranceLabel(vehicle)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View
            style={[
              styles.sectionCard,
              insuranceModeUsesPanelScroll && styles.fixedModeWorkspaceCard,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Insurance workspace</Text>
                <Text style={styles.sectionSubtitle}>
                  Open one focused destination at a time for request, documents, payment, renewal, or status review.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => refreshTracking()}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
                <Text style={styles.secondaryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {trackingMessage ? (
              <InsuranceStatePanel
                icon={trackingState === 'tracking_not_found' ? 'file-question-outline' : 'information-outline'}
                title={
                  trackingState === 'tracking_not_found'
                    ? 'Known inquiry missing'
                    : 'Tracking update'
                }
                message={trackingMessage}
                loading={trackingState === 'tracking_loading' || isRefreshing}
              />
            ) : null}
            {!isInInsuranceMode ? (
              <InsuranceEntryPanel
                entryState={entryState}
                onEnterMode={() => openInsuranceMode('overview')}
              />
            ) : (
              <InsuranceModeShell
                activeSection={activeModeSection}
                onChangeSection={handleChangeModeSection}
                onExitMode={closeInsuranceMode}
                style={insuranceModeUsesPanelScroll ? styles.fixedModeShell : null}
              >
                {activeModeSection === 'overview' ? (
                  <InsuranceHomePanel
                    overviewState={overviewState}
                    onOpenSection={handleChangeModeSection}
                  />
                ) : null}

                {activeModeSection === 'request' ? (
                  <InsuranceRequestPanel
                    selectedVehicleLabel={selectedVehicleLabel}
                    draft={draft}
                    inquiryTypeOptions={inquiryTypeOptions}
                    onChangeDraft={(patch) => {
                      setDraft((current) => ({ ...current, ...patch }))
                      handleDraftPatch()
                    }}
                    onSubmit={handleSubmitInquiry}
                    isSubmitting={isSubmitting}
                    intakeState={intakeState}
                    intakeMessage={intakeMessage}
                  />
                ) : null}

                {activeModeSection === 'documents' ? (
                  <InsuranceDocumentsPanel
                    checklist={requirementsChecklist}
                    latestInquiry={latestInquiry}
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
                  />
                ) : null}

                {activeModeSection === 'status' ? (
                  <InsuranceStatusDetailPanel
                    eyebrow="Status"
                    title="Current request status"
                    subtitle="Review the current blocker, latest update, and next action in one place."
                    statusState={statusState}
                    footerLabel={statusState.ctaLabel}
                    footerScrollTarget={statusState.ctaRouteKey === 'status' ? 'end' : null}
                    onFooterPress={statusState.ctaRouteKey === 'documents' ? () => handleChangeModeSection('documents') : null}
                  >
                    {latestInquiry?.paymentStatus && latestInquiry.paymentStatus !== 'not_required' ? (
                      <InsuranceSectionCard
                        title="Payment"
                        helper={paymentSummary.message}
                      />
                    ) : null}

                    {latestInquiry?.renewalStatus && latestInquiry.renewalStatus !== 'not_applicable' ? (
                      <InsuranceSectionCard
                        title="Renewal"
                        helper={buildRenewalPrompt(latestInquiry).message}
                      />
                    ) : null}
                  </InsuranceStatusDetailPanel>
                ) : null}

                {activeModeSection === 'history' ? (
                  <InsuranceStatusDetailPanel
                    eyebrow="History"
                    title="Recorded vehicle updates"
                    subtitle="Completed customer-safe insurance records for this vehicle."
                    statusState={historyStatusState}
                  >
                    {sortedHistoryRecords.length ? (
                      sortedHistoryRecords.map((record) => (
                        <InsuranceSectionCard
                          key={`${record.status}-${record.updatedAt ?? record.createdAt ?? record.id ?? record.policyNumber ?? record.inquiryTypeLabel ?? 'history'}`}
                          title={buildHistoryRecordTitle(record)}
                          helper={buildHistoryRecordSummary(record)}
                        />
                      ))
                    ) : (
                      <InsuranceSectionCard
                        title="No completed records yet"
                        helper="Completed insurance records will appear here after staff close and record them."
                      />
                    )}
                  </InsuranceStatusDetailPanel>
                ) : null}
              </InsuranceModeShell>
            )}

            {trackingState === 'tracking_loading' && !trackingMessage ? (
              <InsuranceStatePanel
                icon="refresh"
                title="Loading insurance updates"
                message="We’re checking the latest inquiry state and any vehicle-level insurance history already recorded for tracking."
                loading
              />
            ) : null}

        </View>
      </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        {insuranceModeUsesPanelScroll ? <View style={styles.fixedModeViewport}>{screenContent}</View> : <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {screenContent}
        </ScrollView>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        overflowX: 'hidden',
      },
    }),
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedModeViewport: {
    flex: 1,
  },
  fixedModeContent: {
    flex: 1,
    minHeight: 0,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 22,
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    marginBottom: 16,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  routePill: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  routePillText: {
    color: colors.labelText,
    fontSize: 12,
    lineHeight: 18,
  },
  homeFocusWrap: {
    marginBottom: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 20,
    marginBottom: 18,
  },
  fixedModeWorkspaceCard: {
    flex: 1,
    minHeight: 0,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 520,
  },
  vehicleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  selectionChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  selectionChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  selectionChipTextSelected: {
    color: colors.primary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  typeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  typeChipTextSelected: {
    color: colors.primary,
  },
  fieldLabel: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  multilineInput: {
    minHeight: 102,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  secondaryActionButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  fixedModeShell: {
    flex: 1,
    minHeight: 0,
  },
  homeCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  homeCard: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 150,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 14,
    minHeight: 148,
  },
  homeCardEmphasized: {
    borderColor: colors.primaryGlow,
    backgroundColor: '#1C1A20',
  },
  homeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  homeCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  homeCardText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  homeCardActionRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  homeCardActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  documentSection: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    marginBottom: 14,
  },
  documentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  documentSectionCopy: {
    flex: 1,
  },
  documentSectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  documentSectionText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  documentCountBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCountText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  documentList: {
    gap: 10,
    marginBottom: 14,
  },
  documentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: 14,
  },
  documentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  documentCardCopy: {
    flex: 1,
  },
  documentCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  documentCardText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyDocumentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: 16,
    marginBottom: 14,
  },
  emptyDocumentTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyDocumentText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 19,
  },
  documentUploadForm: {
    marginTop: 2,
  },
  selectedDocumentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: 14,
    marginBottom: 14,
  },
  selectedDocumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedDocumentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDocumentCopy: {
    flex: 1,
  },
  selectedDocumentTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  selectedDocumentMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  selectedDocumentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  checklistHeading: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  checklistGroup: {
    gap: 8,
    marginBottom: 14,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistIconWrapComplete: {
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
  },
  checklistRowText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  checklistRowTextComplete: {
    color: colors.primary,
    fontWeight: '700',
  },
  checklistHelperText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  documentTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  documentTypeChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  documentTypeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  documentTypeChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  documentTypeChipTextSelected: {
    color: colors.primary,
  },
  statePanel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    marginBottom: 14,
  },
  statePanelDanger: {
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  statePanelWarning: {
    borderColor: 'rgba(234, 179, 8, 0.35)',
  },
  statePanelSuccess: {
    borderColor: 'rgba(63, 215, 143, 0.35)',
  },
  statePanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statePanelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statePanelCopy: {
    flex: 1,
  },
  statePanelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  statePanelText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  statePanelButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statePanelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  timelineStepList: {
    gap: 10,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 2,
  },
  timelineStepRail: {
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineStepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timelineStepDotDone: {
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primary,
  },
  timelineStepDotCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  timelineStepCopy: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: 12,
  },
  timelineStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  timelineStepTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  timelineStepText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  timelineStepMeta: {
    color: colors.labelText,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  timelineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    marginBottom: 14,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  timelineCardCopy: {
    flex: 1,
  },
  timelineCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  timelineCardSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  statusBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  detailRow: {
    marginTop: 8,
  },
  detailRowLabel: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailRowValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
