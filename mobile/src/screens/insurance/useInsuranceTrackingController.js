import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../lib/authClient.js';
import {
  getCustomerInsuranceTrackingState,
  getInsuranceInquiryById,
  listMyInsuranceInquiries,
  listVehicleInsuranceRecords,
} from '../../lib/insuranceClient.js';
import { createLatestRequestCoordinator } from '../../utils/latestRequestCoordinator.mjs';
import {
  doesCustomerInsuranceInquiryMatchVehicle,
  getVehicleScopedCustomerInquiryId,
  isTerminalCustomerInquiryStatus,
} from '../insuranceModuleView.mjs';
import {
  buildInsuranceTrackingStorageKey,
  getRememberedInsuranceInquiryId,
  parseRememberedInsuranceInquiryMappings,
  selectRecoveredInsuranceInquiry,
  serializeRememberedInsuranceInquiryMappings,
  shouldDiscardRememberedInsuranceInquiry,
  updateRememberedInsuranceInquiryMappings,
} from './insuranceTrackingModel.mjs';

const normalizeId = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return normalizedValue || null;
};

const buildTrackingSessionKey = (userId, vehicleId) =>
  `${normalizeId(userId) ?? ''}:${normalizeId(vehicleId) ?? ''}`;

const getTrackingErrorMessage = (error) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return error.message || 'We could not load insurance tracking updates right now.';
  }

  return 'We could not load insurance tracking updates right now.';
};

export default function useInsuranceTrackingController({
  accessToken,
  hasSession,
  initialTrackingState = 'tracking_empty',
  routeInquiryId,
  selectedVehicleId,
  userId,
}) {
  const [trackingState, setTrackingState] = useState(initialTrackingState);
  const [trackingMessage, setTrackingMessage] = useState('');
  const [latestInquiry, setLatestInquiry] = useState(null);
  const [latestInquiryId, setLatestInquiryIdState] = useState(
    normalizeId(routeInquiryId),
  );
  const [claimStatusUpdates, setClaimStatusUpdatesState] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasHydratedRememberedInquiryMappings, setHasHydratedMappings] =
    useState(false);

  const coordinatorRef = useRef(createLatestRequestCoordinator());
  const persistenceQueueRef = useRef(Promise.resolve());
  const rememberedMappingsRef = useRef({});
  const selectedVehicleIdRef = useRef(normalizeId(selectedVehicleId));
  const routeInquiryIdRef = useRef(normalizeId(routeInquiryId));
  const latestInquiryIdRef = useRef(normalizeId(routeInquiryId));
  const latestInquiryVehicleIdRef = useRef(null);
  const claimStatusUpdatesRef = useRef([]);
  const trackingContextKeyRef = useRef('');
  const storageKey = buildInsuranceTrackingStorageKey(userId);

  selectedVehicleIdRef.current = normalizeId(selectedVehicleId);
  routeInquiryIdRef.current = normalizeId(routeInquiryId);

  const commitLatestInquiryId = useCallback((inquiryId) => {
    const normalizedInquiryId = normalizeId(inquiryId);
    latestInquiryIdRef.current = normalizedInquiryId;
    setLatestInquiryIdState(normalizedInquiryId);
  }, []);

  const commitClaimStatusUpdates = useCallback((records) => {
    const normalizedRecords = Array.isArray(records) ? records.filter(Boolean) : [];
    claimStatusUpdatesRef.current = normalizedRecords;
    setClaimStatusUpdatesState(normalizedRecords);
  }, []);

  const persistRememberedMappings = useCallback(() => {
    persistenceQueueRef.current = persistenceQueueRef.current
      .catch(() => {})
      .then(async () => {
        await AsyncStorage.setItem(
          storageKey,
          serializeRememberedInsuranceInquiryMappings(rememberedMappingsRef.current),
        );
      })
      .catch(() => {});

    return persistenceQueueRef.current;
  }, [storageKey]);

  const syncRememberedInquiry = useCallback(
    async (vehicleId, inquiry) => {
      rememberedMappingsRef.current = updateRememberedInsuranceInquiryMappings({
        inquiry,
        mappings: rememberedMappingsRef.current,
        vehicleId,
      });
      await persistRememberedMappings();
    },
    [persistRememberedMappings],
  );

  const getKnownInquiryId = useCallback(({ inquiryIdOverride } = {}) => {
    const vehicleId = selectedVehicleIdRef.current;
    return getVehicleScopedCustomerInquiryId({
      selectedVehicleId: vehicleId,
      routeInquiryId: normalizeId(inquiryIdOverride) ?? routeInquiryIdRef.current,
      latestInquiryId: latestInquiryIdRef.current,
      latestInquiryVehicleId: latestInquiryVehicleIdRef.current,
      rememberedInquiryId: getRememberedInsuranceInquiryId(
        rememberedMappingsRef.current,
        vehicleId,
      ),
    });
  }, []);

  const prepareForVehicleChange = useCallback(
    (vehicleId) => {
      const normalizedVehicleId = normalizeId(vehicleId);
      coordinatorRef.current.invalidate();
      const rememberedInquiryId = getRememberedInsuranceInquiryId(
        rememberedMappingsRef.current,
        normalizedVehicleId,
      );

      latestInquiryVehicleIdRef.current = rememberedInquiryId
        ? normalizedVehicleId
        : null;
      commitLatestInquiryId(rememberedInquiryId);
      setLatestInquiry(null);
      commitClaimStatusUpdates([]);
      setTrackingMessage('');
      setTrackingState(
        hasSession && normalizedVehicleId
          ? 'tracking_loading'
          : hasSession
            ? 'tracking_empty'
            : 'tracking_unauthorized_session',
      );
      setIsRefreshing(false);
    },
    [commitClaimStatusUpdates, commitLatestInquiryId, hasSession],
  );

  const adoptInquiry = useCallback(
    async ({ inquiry, vehicleId }) => {
      const normalizedVehicleId = normalizeId(vehicleId);
      const currentVehicleId = selectedVehicleIdRef.current;

      if (
        !normalizedVehicleId ||
        normalizedVehicleId !== currentVehicleId ||
        (inquiry?.vehicleId &&
          !doesCustomerInsuranceInquiryMatchVehicle({
            inquiry,
            vehicleId: normalizedVehicleId,
          }))
      ) {
        return false;
      }

      coordinatorRef.current.invalidate();
      latestInquiryVehicleIdRef.current = inquiry?.vehicleId ?? normalizedVehicleId;
      setLatestInquiry(inquiry ?? null);
      commitLatestInquiryId(
        inquiry?.id && !isTerminalCustomerInquiryStatus(inquiry.status)
          ? inquiry.id
          : null,
      );
      setTrackingState(
        getCustomerInsuranceTrackingState({
          latestInquiry: inquiry ?? null,
          claimStatusUpdates: claimStatusUpdatesRef.current,
        }),
      );
      setTrackingMessage('');
      setIsRefreshing(false);
      await syncRememberedInquiry(normalizedVehicleId, inquiry ?? null);
      return true;
    },
    [commitLatestInquiryId, syncRememberedInquiry],
  );

  const refreshTracking = useCallback(
    async ({ inquiryIdOverride } = {}) => {
      const vehicleId = selectedVehicleIdRef.current;

      if (!hasSession) {
        setTrackingState('tracking_unauthorized_session');
        setTrackingMessage('Sign in first so the app can load your insurance updates.');
        return false;
      }

      if (!vehicleId) {
        setTrackingState('tracking_empty');
        setTrackingMessage('Select an owned vehicle before loading insurance updates.');
        return false;
      }

      if (!hasHydratedRememberedInquiryMappings && !normalizeId(inquiryIdOverride)) {
        return false;
      }

      const knownInquiryId = getKnownInquiryId({ inquiryIdOverride });
      const token = coordinatorRef.current.begin(
        buildTrackingSessionKey(userId, vehicleId),
      );

      setIsRefreshing(true);
      setTrackingState('tracking_loading');
      setTrackingMessage('');

      try {
        const [recoveredInquiries, nextRecords] = await Promise.all([
          listMyInsuranceInquiries({
            vehicleId,
            limit: 50,
            accessToken,
            signal: token.signal,
          }),
          listVehicleInsuranceRecords({
            vehicleId,
            accessToken,
            signal: token.signal,
          }),
        ]);

        if (!coordinatorRef.current.isCurrent(token)) {
          return false;
        }

        let nextInquiry = selectRecoveredInsuranceInquiry({
          inquiries: recoveredInquiries.items,
          knownInquiryId,
        });
        let inquiryNotFound = false;

        if (knownInquiryId && nextInquiry?.id !== knownInquiryId) {
          const recoveredFallbackInquiry = nextInquiry;

          try {
            nextInquiry = await getInsuranceInquiryById({
              inquiryId: knownInquiryId,
              accessToken,
              signal: token.signal,
            });

            if (
              !doesCustomerInsuranceInquiryMatchVehicle({
                inquiry: nextInquiry,
                vehicleId,
              })
            ) {
              inquiryNotFound = true;
              nextInquiry = recoveredFallbackInquiry;
            }
          } catch (error) {
            if (shouldDiscardRememberedInsuranceInquiry(error?.status)) {
              inquiryNotFound = true;
              nextInquiry = recoveredFallbackInquiry;
            } else {
              throw error;
            }
          }
        }

        if (
          !coordinatorRef.current.isCurrent(token) ||
          selectedVehicleIdRef.current !== vehicleId
        ) {
          return false;
        }

        await syncRememberedInquiry(vehicleId, nextInquiry ?? null);

        if (!coordinatorRef.current.isCurrent(token)) {
          return false;
        }

        latestInquiryVehicleIdRef.current = nextInquiry?.vehicleId ?? null;
        setLatestInquiry(nextInquiry ?? null);
        commitClaimStatusUpdates(nextRecords);
        commitLatestInquiryId(
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
            ? 'The previous request is no longer available. New insurance records for this vehicle will appear here.'
            : '',
        );
        return true;
      } catch (error) {
        if (
          error?.name === 'AbortError' ||
          !coordinatorRef.current.isCurrent(token)
        ) {
          return false;
        }

        setTrackingState('tracking_load_failed');
        setTrackingMessage(getTrackingErrorMessage(error));
        return false;
      } finally {
        if (coordinatorRef.current.isCurrent(token)) {
          setIsRefreshing(false);
        }
      }
    },
    [
      accessToken,
      commitClaimStatusUpdates,
      commitLatestInquiryId,
      getKnownInquiryId,
      hasHydratedRememberedInquiryMappings,
      hasSession,
      syncRememberedInquiry,
      userId,
    ],
  );

  useEffect(() => {
    let isCurrent = true;
    coordinatorRef.current.invalidate();
    rememberedMappingsRef.current = {};
    setHasHydratedMappings(false);

    AsyncStorage.getItem(storageKey)
      .then((serializedMappings) => {
        if (!isCurrent) {
          return;
        }

        rememberedMappingsRef.current =
          parseRememberedInsuranceInquiryMappings(serializedMappings);
        setHasHydratedMappings(true);
      })
      .catch(() => {
        if (isCurrent) {
          rememberedMappingsRef.current = {};
          setHasHydratedMappings(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [storageKey]);

  useEffect(() => {
    const vehicleId = normalizeId(selectedVehicleId);
    const trackingContextKey = [
      buildTrackingSessionKey(userId, vehicleId),
      normalizeId(routeInquiryId) ?? '',
    ].join(':');

    if (trackingContextKeyRef.current !== trackingContextKey) {
      trackingContextKeyRef.current = trackingContextKey;
      prepareForVehicleChange(vehicleId);
    }

    const rememberedInquiryId = hasHydratedRememberedInquiryMappings
      ? getRememberedInsuranceInquiryId(rememberedMappingsRef.current, vehicleId)
      : null;
    const nextInquiryId = normalizeId(routeInquiryId) ?? rememberedInquiryId;

    latestInquiryVehicleIdRef.current = nextInquiryId ? vehicleId : null;
    commitLatestInquiryId(nextInquiryId);

    if (!hasSession) {
      setTrackingState('tracking_unauthorized_session');
    } else if (!vehicleId) {
      setTrackingState('tracking_empty');
    }
  }, [
    commitLatestInquiryId,
    hasHydratedRememberedInquiryMappings,
    hasSession,
    prepareForVehicleChange,
    routeInquiryId,
    selectedVehicleId,
    userId,
  ]);

  useEffect(() => {
    if (
      !hasSession ||
      !selectedVehicleId ||
      !hasHydratedRememberedInquiryMappings
    ) {
      return;
    }

    void refreshTracking();
  }, [
    accessToken,
    hasHydratedRememberedInquiryMappings,
    hasSession,
    refreshTracking,
    routeInquiryId,
    selectedVehicleId,
    userId,
  ]);

  useEffect(
    () => () => {
      coordinatorRef.current.dispose();
    },
    [],
  );

  return {
    adoptInquiry,
    claimStatusUpdates,
    isRefreshing,
    latestInquiry,
    prepareForVehicleChange,
    refreshTracking,
    trackingMessage,
    trackingState,
  };
}
