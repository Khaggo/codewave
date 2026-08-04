import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createInitialCustomerInsuranceDraft } from '../../lib/insuranceClient';
import {
  getInsuranceRequestDraftStorageKey,
  hydrateInsuranceRequestDraft,
  serializeInsuranceRequestDraft,
  transferInsuranceRequestDraft,
} from './insuranceRequestFlow.mjs';

export default function useInsuranceRequestDraft({
  hasSession,
  resumeFromVehicleId,
  userId,
  vehicleId,
}) {
  const [draft, setDraftState] = useState(createInitialCustomerInsuranceDraft());
  const [stagedDocuments, setStagedDocumentsState] = useState([]);
  const [isDraftDirty, setIsDraftDirtyState] = useState(false);
  const [draftHydrationState, setDraftHydrationState] = useState('idle');
  const [restoredDraftStorageKey, setRestoredDraftStorageKey] = useState(null);
  const hydratedStorageKeyRef = useRef(null);
  const draftRef = useRef(draft);
  const stagedDocumentsRef = useRef(stagedDocuments);
  const isDraftDirtyRef = useRef(isDraftDirty);
  const storageKey = useMemo(
    () =>
      getInsuranceRequestDraftStorageKey({
        userId,
        vehicleId,
      }),
    [userId, vehicleId],
  );
  const resumeStorageKey = useMemo(
    () =>
      resumeFromVehicleId
        ? getInsuranceRequestDraftStorageKey({
            userId,
            vehicleId: resumeFromVehicleId,
          })
        : null,
    [resumeFromVehicleId, userId],
  );

  const setDraft = useCallback((nextDraft) => {
    const resolvedDraft =
      typeof nextDraft === 'function' ? nextDraft(draftRef.current) : nextDraft;
    draftRef.current = resolvedDraft;
    setDraftState(resolvedDraft);
  }, []);

  const setStagedDocuments = useCallback((nextDocuments) => {
    const resolvedDocuments =
      typeof nextDocuments === 'function'
        ? nextDocuments(stagedDocumentsRef.current)
        : nextDocuments;
    stagedDocumentsRef.current = resolvedDocuments;
    setStagedDocumentsState(resolvedDocuments);
  }, []);

  const setIsDraftDirty = useCallback((nextDirtyState) => {
    const resolvedDirtyState =
      typeof nextDirtyState === 'function'
        ? nextDirtyState(isDraftDirtyRef.current)
        : nextDirtyState;
    isDraftDirtyRef.current = resolvedDirtyState;
    setIsDraftDirtyState(resolvedDirtyState);
  }, []);

  useEffect(() => {
    let isMounted = true;
    hydratedStorageKeyRef.current = null;
    setRestoredDraftStorageKey(null);
    setDraftHydrationState('loading');

    if (!hasSession || !vehicleId) {
      setDraft(createInitialCustomerInsuranceDraft());
      setStagedDocuments([]);
      setIsDraftDirty(false);
      setDraftHydrationState('ready');
      return undefined;
    }

    transferInsuranceRequestDraft({
      storage: AsyncStorage,
      sourceStorageKey: resumeStorageKey,
      targetStorageKey: storageKey,
      createInitialDraft: createInitialCustomerInsuranceDraft,
    })
      .then(async ({ serializedDraft }) => {
        if (!isMounted) {
          return;
        }

        const restoredDraft = hydrateInsuranceRequestDraft({
          serializedDraft,
          createInitialDraft: createInitialCustomerInsuranceDraft,
        });
        const hasLocalEdits =
          isDraftDirtyRef.current || stagedDocumentsRef.current.length > 0;

        if (!hasLocalEdits) {
          setDraft(restoredDraft.draft);
          setStagedDocuments(restoredDraft.stagedDocuments);
          setIsDraftDirty(restoredDraft.restored);
        }
        hydratedStorageKeyRef.current = storageKey;

        if (restoredDraft.expired) {
          await AsyncStorage.removeItem(storageKey);
        } else if (restoredDraft.restored) {
          setRestoredDraftStorageKey(storageKey);
        }
        if (isMounted) {
          setDraftHydrationState('ready');
        }
      })
      .catch(() => {
        if (isMounted) {
          hydratedStorageKeyRef.current = storageKey;
          setDraftHydrationState('ready');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    hasSession,
    resumeStorageKey,
    setDraft,
    setIsDraftDirty,
    setStagedDocuments,
    storageKey,
    vehicleId,
  ]);

  const persistDraftNow = useCallback(async () => {
    const hasDraftWork =
      isDraftDirtyRef.current || stagedDocumentsRef.current.length > 0;

    if (hydratedStorageKeyRef.current !== storageKey) {
      return !hasDraftWork;
    }

    if (!hasDraftWork) {
      return true;
    }

    try {
      await AsyncStorage.setItem(
        storageKey,
        serializeInsuranceRequestDraft({
          draft: draftRef.current,
          stagedDocuments: stagedDocumentsRef.current,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }, [storageKey]);

  useEffect(() => {
    if (
      hydratedStorageKeyRef.current !== storageKey ||
      (!isDraftDirty && !stagedDocuments.length)
    ) {
      return undefined;
    }

    const saveTimer = setTimeout(() => {
      persistDraftNow();
    }, 250);

    return () => clearTimeout(saveTimer);
  }, [
    draft,
    draftHydrationState,
    isDraftDirty,
    persistDraftNow,
    stagedDocuments,
    storageKey,
  ]);

  const resetDraftContent = useCallback(() => {
    setDraft(createInitialCustomerInsuranceDraft());
  }, []);

  const clearPersistedDraft = useCallback(async () => {
    setIsDraftDirty(false);
    setRestoredDraftStorageKey(null);
    hydratedStorageKeyRef.current = null;
    await AsyncStorage.removeItem(storageKey).catch(() => {});
  }, [storageKey]);

  return {
    clearPersistedDraft,
    draft,
    draftHydrationState,
    isDraftDirty,
    persistDraftNow,
    resetDraftContent,
    restoredDraftStorageKey,
    setDraft,
    setIsDraftDirty,
    setStagedDocuments,
    stagedDocuments,
  };
}
