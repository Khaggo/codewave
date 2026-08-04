import { useCallback, useEffect, useRef, useState } from 'react';

import { loadCustomerDigitalGarageSnapshot } from '../lib/digitalGarageClient';
import {
  buildCustomerTimelineEventPresentation,
  createEmptyCustomerVehicleLifecycleSnapshot,
  getCustomerGarageSummary,
  listCustomerVehicleTimelinePage,
  loadCustomerVehicleLifecycleSnapshot,
} from '../lib/vehicleLifecycleClient';
import { createLatestRequestCoordinator } from '../utils/latestRequestCoordinator.mjs';
import { GARAGE_PAGE_SIZE } from './garagePaginationModel.mjs';
import {
  buildGarageWorkspacePageModel,
  createGarageWorkspaceInitialState,
  getGarageLoadErrorMessage,
  getNextGaragePageRequest,
  getPreviousGaragePageRequest,
  mergeGarageTimelinePage,
  normalizeGarageWorkspacePage,
  resolveGarageWorkspaceVehicleId,
} from './garageWorkspaceModel.mjs';

const createEmptySnapshot = () => createEmptyCustomerVehicleLifecycleSnapshot();

export default function useGarageWorkspaceController({
  account,
  onSelectedVehicleChange,
  refreshSignal,
  routeVehicleId,
}) {
  const initialState = createGarageWorkspaceInitialState({
    account,
    routeVehicleId,
    pageSize: GARAGE_PAGE_SIZE,
  });
  const initialVehicleId = initialState.selectedVehicleId;
  const initialVehicles = initialState.vehicles;
  const initialGaragePage = initialState.page;
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicleId);
  const [garagePage, setGaragePage] = useState(initialGaragePage);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState(createEmptySnapshot);
  const [garageSummary, setGarageSummary] = useState(null);
  const [activeSourceType, setActiveSourceType] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [ownedVehicleCount, setOwnedVehicleCount] = useState(
    initialGaragePage.total,
  );
  const selectedVehicleIdRef = useRef(initialVehicleId);
  const vehiclesRef = useRef(initialVehicles);
  const garagePageRef = useRef(initialGaragePage);
  const activeSourceTypeRef = useRef(null);
  const vehicleSearchRef = useRef('');
  const selectedVehicleChangeRef = useRef(onSelectedVehicleChange);
  const vehicleListCoordinatorRef = useRef(null);
  const vehicleDetailCoordinatorRef = useRef(null);
  const garageCursorHistoryRef = useRef([null]);
  const refreshSignalRef = useRef(refreshSignal);

  if (!vehicleListCoordinatorRef.current) {
    vehicleListCoordinatorRef.current = createLatestRequestCoordinator();
  }
  if (!vehicleDetailCoordinatorRef.current) {
    vehicleDetailCoordinatorRef.current = createLatestRequestCoordinator();
  }

  useEffect(() => {
    selectedVehicleChangeRef.current = onSelectedVehicleChange;
  }, [onSelectedVehicleChange]);

  const commitVehicles = useCallback((nextVehicles) => {
    const resolvedVehicles =
      typeof nextVehicles === 'function'
        ? nextVehicles(vehiclesRef.current)
        : nextVehicles;
    vehiclesRef.current = Array.isArray(resolvedVehicles) ? resolvedVehicles : [];
    setVehicles(vehiclesRef.current);
    return vehiclesRef.current;
  }, []);

  const commitGaragePage = useCallback((nextPage) => {
    garagePageRef.current = normalizeGarageWorkspacePage(
      nextPage,
      GARAGE_PAGE_SIZE,
    );
    setGaragePage(garagePageRef.current);
    return garagePageRef.current;
  }, []);

  const commitSelectedVehicleId = useCallback((vehicleId) => {
    const normalizedVehicleId = String(vehicleId ?? '').trim() || null;
    selectedVehicleIdRef.current = normalizedVehicleId;
    setSelectedVehicleId(normalizedVehicleId);
    selectedVehicleChangeRef.current?.(normalizedVehicleId);
    return normalizedVehicleId;
  }, []);

  const commitActiveSourceType = useCallback((sourceType) => {
    const normalizedSourceType = String(sourceType ?? '').trim() || null;
    activeSourceTypeRef.current = normalizedSourceType;
    setActiveSourceType(normalizedSourceType);
    return normalizedSourceType;
  }, []);

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
    vehicles[0] ??
    null;
  const garagePageModel = buildGarageWorkspacePageModel({
    vehicles,
    page: garagePage,
  });

  useEffect(() => {
    if (!selectedVehicleId && selectedVehicle?.id) {
      commitSelectedVehicleId(selectedVehicle.id);
    }
  }, [commitSelectedVehicleId, selectedVehicle?.id, selectedVehicleId]);

  const loadSelectedVehicle = useCallback(
    async (vehicleId, requestedSourceType = activeSourceTypeRef.current) => {
      const coordinator = vehicleDetailCoordinatorRef.current;
      if (!vehicleId || !account?.accessToken) {
        coordinator.invalidate();
        setSnapshot(createEmptySnapshot());
        setGarageSummary(null);
        setStatus('empty');
        return false;
      }

      const sourceType = String(requestedSourceType ?? '').trim() || null;
      const token = coordinator.begin(
        `${account?.userId ?? 'customer'}:${vehicleId}:${sourceType ?? 'all'}`,
      );
      setIsLoadingMore(false);
      setStatus('loading');
      setErrorMessage('');

      try {
        const [nextSnapshot, nextGarageSummary] = await Promise.all([
          loadCustomerVehicleLifecycleSnapshot({
            vehicleId,
            sourceType,
            accessToken: account.accessToken,
          }),
          getCustomerGarageSummary({
            vehicleId,
            accessToken: account.accessToken,
          }),
        ]);

        if (!coordinator.isCurrent(token)) {
          return false;
        }

        setSnapshot(nextSnapshot);
        setGarageSummary(nextGarageSummary);
        setStatus('ready');
        return true;
      } catch (error) {
        if (!coordinator.isCurrent(token)) {
          return false;
        }

        setSnapshot(createEmptySnapshot());
        setGarageSummary(null);
        setStatus('error');
        setErrorMessage(
          getGarageLoadErrorMessage(
            error,
            'We could not load Garage details right now.',
          ),
        );
        return false;
      }
    },
    [account?.accessToken, account?.userId],
  );

  const loadLifecycle = useCallback(async ({
    cursor,
    pageIndex,
    preferredVehicleId,
    search,
  } = {}) => {
    const accessToken = account?.accessToken;
    const userId = account?.userId;
    const coordinator = vehicleListCoordinatorRef.current;
    const resolvedPageIndex = Number.isInteger(pageIndex)
      ? Math.max(0, pageIndex)
      : garagePageRef.current.currentPage;
    const resolvedCursor =
      cursor !== undefined
        ? cursor
        : garageCursorHistoryRef.current[resolvedPageIndex] ?? null;
    const resolvedSearch =
      search !== undefined
        ? String(search ?? '').trim()
        : vehicleSearchRef.current;

    if (!accessToken || !userId) {
      coordinator.invalidate();
      vehicleDetailCoordinatorRef.current.invalidate();
      setStatus('error');
      setErrorMessage('Sign in again before loading your vehicle lifecycle.');
      return false;
    }

    const token = coordinator.begin(
      `${userId}:${resolvedSearch || 'all'}:${resolvedPageIndex}:${resolvedCursor ?? 'first'}`,
    );
    vehicleDetailCoordinatorRef.current.invalidate();
    setStatus('loading');
    setErrorMessage('');

    try {
      const garageSnapshot = await loadCustomerDigitalGarageSnapshot({
        userId,
        accessToken,
        preferredVehicleId:
          preferredVehicleId ??
          routeVehicleId ??
          selectedVehicleIdRef.current ??
          account?.primaryVehicleId,
        cursor: resolvedCursor,
        limit: GARAGE_PAGE_SIZE,
        pageIndex: resolvedPageIndex,
        search: resolvedSearch,
      });
      if (!coordinator.isCurrent(token)) {
        return false;
      }

      const nextCursorHistory = garageCursorHistoryRef.current.slice(
        0,
        resolvedPageIndex + 1,
      );
      nextCursorHistory[resolvedPageIndex] = resolvedCursor;
      if (garageSnapshot.page.hasNext && garageSnapshot.page.nextCursor) {
        nextCursorHistory[resolvedPageIndex + 1] =
          garageSnapshot.page.nextCursor;
      }
      garageCursorHistoryRef.current = nextCursorHistory;

      const nextVehicles = garageSnapshot.vehicles;
      if (!resolvedSearch) {
        setOwnedVehicleCount(garageSnapshot.page.total);
      }
      const nextSelectedVehicleId = resolveGarageWorkspaceVehicleId({
        routeVehicleId: preferredVehicleId ?? routeVehicleId,
        currentVehicleId: selectedVehicleIdRef.current,
        primaryVehicleId: account?.primaryVehicleId,
        vehicles: nextVehicles,
      });
      const nextSelectedVehicle =
        nextVehicles.find((vehicle) => vehicle.id === nextSelectedVehicleId) ??
        nextVehicles[0] ??
        null;

      commitVehicles(nextVehicles);
      commitGaragePage(garageSnapshot.page);
      commitSelectedVehicleId(nextSelectedVehicle?.id ?? null);

      if (!nextSelectedVehicle?.id) {
        setSnapshot(createEmptySnapshot());
        setGarageSummary(null);
        setStatus(resolvedSearch ? 'search_empty' : 'empty');
        return true;
      }

      return loadSelectedVehicle(
        nextSelectedVehicle.id,
        activeSourceTypeRef.current,
      );
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return false;
      }

      setSnapshot(createEmptySnapshot());
      setGarageSummary(null);
      setStatus('error');
      setErrorMessage(
        getGarageLoadErrorMessage(
          error,
          'We could not load lifecycle history right now.',
        ),
      );
      return false;
    }
  }, [
    account?.accessToken,
    account?.primaryVehicleId,
    account?.userId,
    commitGaragePage,
    commitSelectedVehicleId,
    commitVehicles,
    loadSelectedVehicle,
    routeVehicleId,
  ]);

  useEffect(() => {
    void loadLifecycle();
  }, [loadLifecycle]);

  useEffect(() => {
    if (Object.is(refreshSignalRef.current, refreshSignal)) {
      return;
    }

    refreshSignalRef.current = refreshSignal;
    void loadLifecycle();
  }, [loadLifecycle, refreshSignal]);

  useEffect(
    () => () => {
      vehicleListCoordinatorRef.current?.dispose();
      vehicleDetailCoordinatorRef.current?.dispose();
    },
    [],
  );

  const previousVehiclePage = useCallback(() => {
    const request = getPreviousGaragePageRequest(
      garagePageRef.current,
      garageCursorHistoryRef.current,
    );
    return request ? loadLifecycle(request) : Promise.resolve(false);
  }, [loadLifecycle]);

  const nextVehiclePage = useCallback(() => {
    const request = getNextGaragePageRequest(garagePageRef.current);
    if (!request) return Promise.resolve(false);
    garageCursorHistoryRef.current[request.pageIndex] = request.cursor;
    return loadLifecycle(request);
  }, [loadLifecycle]);

  const searchVehicles = useCallback(
    (search) => {
      const normalizedSearch = String(search ?? '').trim();
      vehicleSearchRef.current = normalizedSearch;
      setVehicleSearch(normalizedSearch);
      garageCursorHistoryRef.current = [null];
      vehicleListCoordinatorRef.current.invalidate();
      vehicleDetailCoordinatorRef.current.invalidate();
      commitSelectedVehicleId(null);
      setSnapshot(createEmptySnapshot());
      setGarageSummary(null);

      return loadLifecycle({
        cursor: null,
        pageIndex: 0,
        preferredVehicleId: null,
        search: normalizedSearch,
      });
    },
    [commitSelectedVehicleId, loadLifecycle],
  );

  const selectVehicle = useCallback(
    async (vehicleId) => {
      vehicleListCoordinatorRef.current.invalidate();
      commitSelectedVehicleId(vehicleId);
      commitActiveSourceType(null);
      return loadSelectedVehicle(vehicleId, null);
    },
    [commitActiveSourceType, commitSelectedVehicleId, loadSelectedVehicle],
  );

  const changeSource = useCallback(
    async (sourceType) => {
      vehicleListCoordinatorRef.current.invalidate();
      const nextSourceType = commitActiveSourceType(sourceType);
      return loadSelectedVehicle(
        selectedVehicleIdRef.current,
        nextSourceType,
      );
    },
    [commitActiveSourceType, loadSelectedVehicle],
  );

  const loadMore = useCallback(async () => {
    const currentVehicleId = selectedVehicleIdRef.current;
    const currentSnapshot = snapshot;
    if (
      !currentVehicleId ||
      !currentSnapshot.page?.hasNext ||
      !currentSnapshot.page?.nextCursor ||
      isLoadingMore
    ) {
      return false;
    }

    setIsLoadingMore(true);
    setErrorMessage('');
    const coordinator = vehicleDetailCoordinatorRef.current;
    const token = coordinator.begin(
      `${account?.userId ?? 'customer'}:${currentVehicleId}:${
        activeSourceTypeRef.current ?? 'all'
      }:${currentSnapshot.page.nextCursor}`,
    );

    try {
      const nextPage = await listCustomerVehicleTimelinePage({
        vehicleId: currentVehicleId,
        cursor: currentSnapshot.page.nextCursor,
        sourceType: activeSourceTypeRef.current,
        limit: 20,
        accessToken: account?.accessToken,
      });
      if (!coordinator.isCurrent(token)) {
        return false;
      }

      const nextEvents = nextPage.items.map(
        buildCustomerTimelineEventPresentation,
      );
      setSnapshot((currentState) =>
        mergeGarageTimelinePage({
          snapshot: currentState,
          nextEvents,
          page: nextPage.page,
        }),
      );
      return true;
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return false;
      }

      setErrorMessage(
        getGarageLoadErrorMessage(
          error,
          'We could not load more Garage updates.',
        ),
      );
      return false;
    } finally {
      if (coordinator.isCurrent(token)) {
        setIsLoadingMore(false);
      }
    }
  }, [account?.accessToken, account?.userId, isLoadingMore, snapshot]);

  const addCreatedVehicle = useCallback(
    async (createdVehicle) => {
      if (!createdVehicle?.id) {
        return false;
      }

      vehicleListCoordinatorRef.current.invalidate();
      vehicleDetailCoordinatorRef.current.invalidate();
      commitActiveSourceType(null);
      vehicleSearchRef.current = '';
      setVehicleSearch('');
      garageCursorHistoryRef.current = [null];
      return loadLifecycle({
        cursor: null,
        pageIndex: 0,
        preferredVehicleId: createdVehicle.id,
        search: '',
      });
    },
    [commitActiveSourceType, loadLifecycle],
  );

  return {
    activeSourceType,
    addCreatedVehicle,
    canGoNext: Boolean(
      status !== 'loading' && garagePage.hasNext && garagePage.nextCursor,
    ),
    canGoPrevious: status !== 'loading' && garagePage.currentPage > 0,
    changeSource,
    errorMessage,
    garagePageModel,
    garageSummary,
    isLoadingMore,
    loadLifecycle,
    loadMore,
    nextVehiclePage,
    ownedVehicleCount,
    paginatedVehicles: garagePageModel.visibleVehicles,
    previousVehiclePage,
    searchVehicles,
    selectedVehicle,
    selectVehicle,
    snapshot,
    status,
    totalVehiclePages: garagePageModel.totalPages,
    vehiclePage: garagePageModel.currentPage,
    vehicleSearch,
    vehicles,
  };
}
