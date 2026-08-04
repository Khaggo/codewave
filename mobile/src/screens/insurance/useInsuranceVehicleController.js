import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, listCustomerVehicles } from '../../lib/authClient';
import { createLatestRequestCoordinator } from '../../utils/latestRequestCoordinator.mjs';
import { canOpenInsuranceVehiclePicker } from './insuranceModeModel.mjs';
import {
  normalizeInsuranceOwnedVehicles,
  resolveInsuranceAccountVehicleSnapshot,
  resolveInsuranceVehicleSelection,
} from './insuranceVehicleSelectionModel.mjs';

const buildVehicleLoadErrorMessage = (error) =>
  error instanceof ApiError && error.message
    ? error.message
    : 'We could not load your owned vehicles right now.';

export default function useInsuranceVehicleController({
  accessToken,
  accountOwnedVehicles,
  hasSession,
  primaryVehicleId,
  routeVehicleId,
  userId,
}) {
  const ownerKey = String(userId ?? '');
  const normalizedAccountVehicles = useMemo(
    () => normalizeInsuranceOwnedVehicles(accountOwnedVehicles),
    [accountOwnedVehicles],
  );
  const [liveVehicleState, setLiveVehicleState] = useState(() => ({
    ownerKey,
    vehicles: normalizedAccountVehicles,
  }));
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    () =>
      resolveInsuranceVehicleSelection({
        ownedVehicles: normalizedAccountVehicles,
        primaryVehicleId,
        routeVehicleId,
      })?.id ?? null,
  );
  const [vehicleLoadState, setVehicleLoadState] = useState(
    hasSession ? 'loading' : 'idle',
  );
  const [vehicleLoadMessage, setVehicleLoadMessage] = useState('');
  const [vehicleReloadKey, setVehicleReloadKey] = useState(0);
  const [isVehiclePickerOpen, setIsVehiclePickerOpen] = useState(false);
  const requestCoordinatorRef = useRef(createLatestRequestCoordinator());
  const liveOwnedVehicles =
    liveVehicleState.ownerKey === ownerKey ? liveVehicleState.vehicles : [];
  const ownedVehicles = useMemo(
    () =>
      liveOwnedVehicles.length
        ? liveOwnedVehicles
        : normalizedAccountVehicles,
    [liveOwnedVehicles, normalizedAccountVehicles],
  );
  const selectedVehicle =
    ownedVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;
  const fallbackVehicleId =
    resolveInsuranceVehicleSelection({
      ownedVehicles,
      primaryVehicleId,
    })?.id ?? null;
  const isVehiclePickerAvailable = canOpenInsuranceVehiclePicker({
    hasSession,
    ownedVehicles,
  });

  useEffect(() => {
    const nextAccountVehicles = resolveInsuranceAccountVehicleSnapshot({
      currentOwnerKey: liveVehicleState.ownerKey,
      currentVehicles: liveVehicleState.vehicles,
      hasSession,
      nextOwnerKey: ownerKey,
      nextVehicles: normalizedAccountVehicles,
    });

    setLiveVehicleState((currentState) =>
      currentState.ownerKey === ownerKey && currentState.vehicles === nextAccountVehicles
        ? currentState
        : {
            ownerKey,
            vehicles: nextAccountVehicles,
          },
    );
    setSelectedVehicleId((currentVehicleId) =>
      resolveInsuranceVehicleSelection({
        currentVehicleId,
        ownedVehicles: nextAccountVehicles,
        primaryVehicleId,
        routeVehicleId,
      })?.id ?? null,
    );
  }, [
    hasSession,
    liveVehicleState.ownerKey,
    liveVehicleState.vehicles,
    normalizedAccountVehicles,
    ownerKey,
    primaryVehicleId,
    routeVehicleId,
  ]);

  useEffect(() => {
    if (!hasSession || !ownedVehicles.length) {
      setIsVehiclePickerOpen(false);
    }
  }, [hasSession, ownedVehicles.length]);

  useEffect(() => {
    const coordinator = requestCoordinatorRef.current;

    if (!hasSession) {
      coordinator.invalidate();
      setVehicleLoadState('idle');
      setVehicleLoadMessage('');
      return undefined;
    }

    const token = coordinator.begin(
      `${ownerKey}:${routeVehicleId ?? ''}:${vehicleReloadKey}`,
    );
    setVehicleLoadState(normalizedAccountVehicles.length ? 'refreshing' : 'loading');
    setVehicleLoadMessage('');

    listCustomerVehicles({
      userId,
      accessToken,
    })
      .then((vehicles) => {
        if (!coordinator.isCurrent(token)) {
          return;
        }

        const normalizedVehicles = normalizeInsuranceOwnedVehicles(vehicles);
        setLiveVehicleState({
          ownerKey,
          vehicles: normalizedVehicles,
        });
        setSelectedVehicleId(
          (currentVehicleId) =>
            resolveInsuranceVehicleSelection({
              currentVehicleId,
              ownedVehicles: normalizedVehicles,
              primaryVehicleId,
              routeVehicleId,
            })?.id ?? null,
        );
        setVehicleLoadState('ready');
      })
      .catch((error) => {
        if (!coordinator.isCurrent(token)) {
          return;
        }

        setVehicleLoadState('failed');
        setVehicleLoadMessage(buildVehicleLoadErrorMessage(error));
      });

    return () => {
      if (coordinator.isCurrent(token)) {
        coordinator.invalidate();
      }
    };
  }, [
    accessToken,
    hasSession,
    normalizedAccountVehicles.length,
    ownerKey,
    primaryVehicleId,
    routeVehicleId,
    userId,
    vehicleReloadKey,
  ]);

  const retryVehicleLoad = useCallback(() => {
    setVehicleReloadKey((currentKey) => currentKey + 1);
  }, []);

  const openVehiclePicker = useCallback(() => {
    if (!isVehiclePickerAvailable) {
      setIsVehiclePickerOpen(false);
      return false;
    }

    setIsVehiclePickerOpen(true);
    return true;
  }, [isVehiclePickerAvailable]);

  const closeVehiclePicker = useCallback(() => {
    setIsVehiclePickerOpen(false);
  }, []);

  return {
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
  };
}
