import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '../../lib/authClient'
import { loadCustomerDigitalGarageSnapshot } from '../../lib/digitalGarageClient'
import {
  createEmptyCustomerVehicleLifecycleSnapshot,
  loadCustomerVehicleLifecycleSnapshot,
} from '../../lib/vehicleLifecycleClient'
import {
  buildFallbackGarageState,
  buildGarageFailureState,
  buildLifecycleFailureState,
  buildLifecycleUnavailableState,
  createInitialGarageState,
  createInitialLifecycleState,
  resolveGaragePageNavigation,
  resolveGarageVehicleId,
} from './garageWorkflowModel.mjs'
import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'

const GARAGE_PAGE_SIZE = 3

export default function useDashboardGarageController({
  account,
  garageActive,
  lifecycleActive,
}) {
  const [garageState, setGarageState] = useState(createInitialGarageState)
  const [lifecycleState, setLifecycleState] = useState(createInitialLifecycleState)
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    account?.primaryVehicleId ?? null,
  )
  const [timelineFilter, setTimelineFilter] = useState(null)
  const garageStateRef = useRef(garageState)
  const lifecycleStateRef = useRef(lifecycleState)
  const selectedVehicleIdRef = useRef(selectedVehicleId)
  const garageCoordinatorRef = useRef(null)
  const lifecycleCoordinatorRef = useRef(null)
  const garageCursorHistoryRef = useRef([null])

  if (!garageCoordinatorRef.current) {
    garageCoordinatorRef.current = createLatestRequestCoordinator()
  }
  if (!lifecycleCoordinatorRef.current) {
    lifecycleCoordinatorRef.current = createLatestRequestCoordinator()
  }

  const sessionKey = `${account?.userId ?? ''}:${account?.accessToken ?? ''}`
  const accountGarageKey = `${sessionKey}:${account?.primaryVehicleId ?? ''}`

  const commitGarageState = useCallback((nextState) => {
    const resolved =
      typeof nextState === 'function' ? nextState(garageStateRef.current) : nextState
    garageStateRef.current = resolved
    setGarageState(resolved)
  }, [])

  const commitLifecycleState = useCallback((nextState) => {
    const resolved =
      typeof nextState === 'function'
        ? nextState(lifecycleStateRef.current)
        : nextState
    lifecycleStateRef.current = resolved
    setLifecycleState(resolved)
  }, [])

  const selectVehicle = useCallback((vehicleId) => {
    const normalizedVehicleId = String(vehicleId ?? '').trim() || null
    selectedVehicleIdRef.current = normalizedVehicleId
    setSelectedVehicleId(normalizedVehicleId)
    return normalizedVehicleId
  }, [])

  const reloadGarage = useCallback(async ({
    cursor,
    pageIndex,
  } = {}) => {
    const coordinator = garageCoordinatorRef.current
    const currentPage = garageStateRef.current.page ?? {}
    const resolvedPageIndex = Number.isInteger(pageIndex)
      ? Math.max(0, pageIndex)
      : Math.max(0, Number(currentPage.currentPage) || 0)
    const resolvedCursor =
      cursor !== undefined
        ? cursor
        : garageCursorHistoryRef.current[resolvedPageIndex] ?? null
    const fallback = buildFallbackGarageState({
      vehicles: account?.ownedVehicles,
      preferredVehicleId:
        selectedVehicleIdRef.current ?? account?.primaryVehicleId,
      pageIndex: resolvedPageIndex,
      pageSize: GARAGE_PAGE_SIZE,
    })

    if (!account?.userId || !account?.accessToken) {
      coordinator.invalidate()
      commitGarageState({
        ...createInitialGarageState(),
        status: 'garage_unauthorized',
        errorMessage: 'Sign in again to load your Digital Garage.',
      })
      selectVehicle(null)
      return false
    }

    const token = coordinator.begin(
      `${sessionKey}:garage:${resolvedPageIndex}:${resolvedCursor ?? 'first'}`,
    )
    const loadingBase = garageStateRef.current.vehicles?.length
      ? garageStateRef.current
      : fallback
    commitGarageState({
      ...loadingBase,
      status: 'garage_loading',
      errorMessage: '',
    })

    try {
      const snapshot = await loadCustomerDigitalGarageSnapshot({
        userId: account.userId,
        accessToken: account.accessToken,
        preferredVehicleId:
          selectedVehicleIdRef.current ?? account.primaryVehicleId,
        cursor: resolvedCursor,
        limit: GARAGE_PAGE_SIZE,
        pageIndex: resolvedPageIndex,
      })
      if (!coordinator.isCurrent(token)) {
        return false
      }

      const nextCursorHistory = garageCursorHistoryRef.current.slice(
        0,
        resolvedPageIndex + 1,
      )
      nextCursorHistory[resolvedPageIndex] = resolvedCursor
      if (snapshot.page.hasNext && snapshot.page.nextCursor) {
        nextCursorHistory[resolvedPageIndex + 1] = snapshot.page.nextCursor
      }
      garageCursorHistoryRef.current = nextCursorHistory
      commitGarageState({
        ...snapshot,
        status: snapshot.status,
        errorMessage: '',
      })
      selectVehicle(
        resolveGarageVehicleId({
          garage: snapshot,
          currentVehicleId: selectedVehicleIdRef.current,
          preferredVehicleId: account.primaryVehicleId,
        }),
      )
      return true
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return false
      }

      commitGarageState(
        buildGarageFailureState({
          fallback: loadingBase,
          statusCode: error instanceof ApiError ? error.status : null,
          message:
            error instanceof Error && error.message
              ? error.message
              : 'We could not load your owned vehicles right now.',
        }),
      )
      selectVehicle(
        resolveGarageVehicleId({
          garage: loadingBase,
          currentVehicleId: selectedVehicleIdRef.current,
          preferredVehicleId: account.primaryVehicleId,
        }),
      )
      return false
    }
  }, [
    account?.accessToken,
    account?.ownedVehicles,
    account?.primaryVehicleId,
    account?.userId,
    commitGarageState,
    selectVehicle,
    sessionKey,
  ])

  const previousGaragePage = useCallback(() => {
    const request = resolveGaragePageNavigation({
      direction: 'previous',
      status: garageStateRef.current.status,
      page: garageStateRef.current.page,
      cursorHistory: garageCursorHistoryRef.current,
    })
    if (!request) {
      return Promise.resolve(false)
    }

    return reloadGarage(request)
  }, [reloadGarage])

  const nextGaragePage = useCallback(() => {
    const page = garageStateRef.current.page ?? {}
    const request = resolveGaragePageNavigation({
      direction: 'next',
      status: garageStateRef.current.status,
      page,
      cursorHistory: garageCursorHistoryRef.current,
    })
    if (!request) {
      return Promise.resolve(false)
    }

    garageCursorHistoryRef.current[request.pageIndex] = request.cursor
    return reloadGarage(request)
  }, [reloadGarage])

  const reloadLifecycle = useCallback(
    async (requestedVehicleId = selectedVehicleIdRef.current) => {
      const coordinator = lifecycleCoordinatorRef.current
      const vehicleId = String(requestedVehicleId ?? '').trim() || null

      if (!account?.accessToken || !vehicleId) {
        coordinator.invalidate()
        commitLifecycleState(
          buildLifecycleUnavailableState({
            hasSession: Boolean(account?.accessToken),
            vehicleId,
          }),
        )
        return false
      }

      const token = coordinator.begin(`${sessionKey}:lifecycle:${vehicleId}`)
      const preserveCurrent =
        lifecycleStateRef.current.entityId === vehicleId &&
        lifecycleStateRef.current.status !== 'idle'
      commitLifecycleState({
        ...(preserveCurrent
          ? lifecycleStateRef.current
          : createEmptyCustomerVehicleLifecycleSnapshot()),
        entityId: vehicleId,
        status: 'timeline_loading',
        errorMessage: '',
      })

      try {
        const snapshot = await loadCustomerVehicleLifecycleSnapshot({
          vehicleId,
          accessToken: account.accessToken,
        })
        if (!coordinator.isCurrent(token)) {
          return false
        }

        commitLifecycleState({
          entityId: vehicleId,
          status: snapshot.timelineState,
          errorMessage: '',
          ...snapshot,
        })
        return true
      } catch (error) {
        if (!coordinator.isCurrent(token)) {
          return false
        }

        commitLifecycleState(
          buildLifecycleFailureState({ error, vehicleId }),
        )
        return false
      }
    },
    [account?.accessToken, commitLifecycleState, sessionKey],
  )

  const refreshGarage = useCallback(() => reloadGarage(), [reloadGarage])

  const refreshAll = useCallback(async () => {
    setTimelineFilter(null)
    await reloadGarage()
    if (lifecycleActive) {
      await reloadLifecycle(selectedVehicleIdRef.current)
    }
  }, [lifecycleActive, reloadGarage, reloadLifecycle])

  useEffect(() => {
    garageCoordinatorRef.current.invalidate()
    lifecycleCoordinatorRef.current.invalidate()
    garageCursorHistoryRef.current = [null]
    commitGarageState(createInitialGarageState())
    commitLifecycleState(createInitialLifecycleState())
    selectVehicle(account?.primaryVehicleId ?? null)
    setTimelineFilter(null)
  }, [
    account?.primaryVehicleId,
    accountGarageKey,
    commitGarageState,
    commitLifecycleState,
    selectVehicle,
  ])

  useEffect(() => {
    if (garageActive && garageState.status === 'idle') {
      void reloadGarage()
    }
  }, [garageActive, garageState.status, reloadGarage])

  useEffect(() => {
    if (lifecycleActive) {
      void reloadLifecycle(selectedVehicleId)
    }
  }, [lifecycleActive, reloadLifecycle, selectedVehicleId])

  useEffect(
    () => () => {
      garageCoordinatorRef.current.invalidate()
      lifecycleCoordinatorRef.current.invalidate()
    },
    [],
  )

  const vehicleSummaries = garageState.vehicleSummaries ?? []
  const selectedVehicle =
    garageState.vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
    garageState.vehicles[0] ??
    null
  const selectedVehicleSummary =
    vehicleSummaries.find((vehicle) => vehicle.id === selectedVehicle?.id) ?? null

  return {
    garageState,
    lifecycleState,
    nextGaragePage,
    previousGaragePage,
    refreshAll,
    refreshGarage,
    selectVehicle,
    selectedVehicle,
    selectedVehicleId,
    selectedVehicleSummary,
    setTimelineFilter,
    timelineFilter,
    vehicleSummaries,
  }
}
