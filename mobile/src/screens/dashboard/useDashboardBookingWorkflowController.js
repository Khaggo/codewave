import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '../../lib/authClient'
import {
  getBookingAvailability,
  loadBookingDiscoverySnapshot,
  toBookingDateString,
} from '../../lib/bookingDiscoveryClient'
import {
  BOOKING_AVAILABILITY_PAGE_DAYS,
  BOOKING_SERVICE_PAGE_SIZE,
  addDaysToDate,
  buildBookingAvailabilityWindow,
  clampDateKeyToRange,
  getBookingAvailabilityDayByDate,
  getInitialBookingAvailabilityWindow,
  parseDateOnly,
} from './bookingAvailabilityModel.mjs'
import { toggleBookingServiceId } from './bookingSelectionModel.mjs'
import {
  areBookingDraftsEqual,
  createInitialBookingDiscoveryState,
  createInitialBookingDraft,
  normalizeBookingDraft,
} from './bookingWorkflowModel.mjs'
import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'
import useDashboardBookingSubmissionController from './useDashboardBookingSubmissionController'

const getRequestError = (error, fallbackMessage) => ({
  isUnauthorized: error instanceof ApiError && [401, 403].includes(error.status),
  message:
    error instanceof Error && error.message ? error.message : fallbackMessage,
})

export default function useDashboardBookingWorkflowController({
  account,
  active,
  buildCheckoutReturnUrls,
  onBookingCreated,
  onBookingSubmitted,
}) {
  const [discovery, setDiscovery] = useState(createInitialBookingDiscoveryState)
  const [draft, setDraft] = useState(createInitialBookingDraft)
  const discoveryRef = useRef(discovery)
  const draftRef = useRef(draft)
  const requestCoordinatorRef = useRef(null)

  if (!requestCoordinatorRef.current) {
    requestCoordinatorRef.current = createLatestRequestCoordinator()
  }

  const sessionKey = `${account?.userId ?? ''}:${account?.accessToken ?? ''}`

  const commitDiscovery = useCallback((nextState) => {
    const resolved =
      typeof nextState === 'function' ? nextState(discoveryRef.current) : nextState
    discoveryRef.current = resolved
    setDiscovery(resolved)
  }, [])

  const commitDraft = useCallback((nextState) => {
    const resolved =
      typeof nextState === 'function' ? nextState(draftRef.current) : nextState
    draftRef.current = resolved
    setDraft(resolved)
  }, [])

  const getCurrentAvailabilityWindow = useCallback(() => {
    const availability = discoveryRef.current.availability
    const vehicleId = draftRef.current.vehicleId

    return availability.startDate && availability.endDate
      ? {
          startDate: availability.startDate,
          endDate: availability.endDate,
          vehicleId,
        }
      : {
          ...getInitialBookingAvailabilityWindow(),
          vehicleId,
        }
  }, [])

  const loadAvailabilityWindow = useCallback(
    async (
      windowQuery,
      { selectedDateKey = null } = {},
    ) => {
      const coordinator = requestCoordinatorRef.current
      const vehicleId = draftRef.current.vehicleId
      const token = coordinator.begin(`${sessionKey}:availability:${vehicleId ?? ''}`)

      commitDiscovery((currentState) => ({
        ...currentState,
        availability: {
          ...currentState.availability,
          status: 'loading',
          errorMessage: '',
        },
      }))

      try {
        const availability = await getBookingAvailability({
          ...windowQuery,
          vehicleId,
          accessToken: account?.accessToken,
        })
        if (!coordinator.isCurrent(token)) {
          return false
        }

        commitDiscovery((currentState) => ({
          ...currentState,
          status: 'ready',
          errorMessage: '',
          availability: {
            status: 'ready',
            errorMessage: '',
            ...availability,
          },
        }))

        if (selectedDateKey) {
          commitDraft((currentDraft) => ({
            ...currentDraft,
            dateKey: clampDateKeyToRange(
              selectedDateKey,
              availability.minBookableDate,
              availability.maxBookableDate,
            ),
          }))
        }
        return true
      } catch (error) {
        if (!coordinator.isCurrent(token)) {
          return false
        }

        const { isUnauthorized, message } = getRequestError(
          error,
          'Unable to refresh live booking availability right now.',
        )
        commitDiscovery((currentState) => ({
          ...currentState,
          ...(isUnauthorized
            ? { status: 'unauthorized', errorMessage: message }
            : {}),
          availability: {
            ...currentState.availability,
            status: isUnauthorized ? 'unauthorized' : 'error',
            errorMessage: message,
          },
        }))
        return false
      }
    },
    [
      account?.accessToken,
      commitDiscovery,
      commitDraft,
      sessionKey,
    ],
  )

  const {
    clearFeedback: clearCreateFeedback,
    isBusy: isSubmissionBusy,
    state: createState,
    submit,
  } = useDashboardBookingSubmissionController({
    account,
    sessionKey,
    discoveryRef,
    draftRef,
    commitDraft,
    buildCheckoutReturnUrls,
    getCurrentAvailabilityWindow,
    loadAvailabilityWindow,
    onBookingCreated,
    onBookingSubmitted,
  })

  const reloadDiscovery = useCallback(async () => {
    const coordinator = requestCoordinatorRef.current
    const token = coordinator.begin(`${sessionKey}:discovery`)

    if (!account?.userId || !account?.accessToken) {
      commitDiscovery((currentState) => ({
        ...currentState,
        status: 'unauthorized',
        errorMessage: 'Sign in again to load booking options.',
        availability: {
          ...currentState.availability,
          status: 'unauthorized',
          errorMessage: 'Sign in again to load booking options.',
        },
      }))
      return false
    }

    commitDiscovery((currentState) => ({
      ...currentState,
      status: 'loading',
      availability:
        currentState.availability.status === 'ready'
          ? {
              ...currentState.availability,
              status: 'loading',
              errorMessage: '',
            }
          : currentState.availability,
      errorMessage: '',
    }))

    try {
      const snapshot = await loadBookingDiscoverySnapshot({
        userId: account.userId,
        accessToken: account.accessToken,
        availabilityWindow: getCurrentAvailabilityWindow(),
      })
      if (!coordinator.isCurrent(token)) {
        return false
      }

      commitDiscovery({
        status: 'ready',
        services: snapshot.services,
        timeSlots: snapshot.timeSlots,
        vehicles: snapshot.vehicles,
        availability: {
          status: 'ready',
          errorMessage: '',
          ...snapshot.availability,
        },
        errorMessage: '',
      })
      return true
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return false
      }

      const { isUnauthorized, message } = getRequestError(
        error,
        'Unable to load booking discovery right now.',
      )
      commitDiscovery((currentState) => ({
        ...currentState,
        status: isUnauthorized ? 'unauthorized' : 'error',
        errorMessage: message,
        availability: {
          ...currentState.availability,
          status: isUnauthorized ? 'unauthorized' : 'error',
          errorMessage: message,
        },
      }))
      return false
    }
  }, [
    account?.accessToken,
    account?.userId,
    commitDiscovery,
    getCurrentAvailabilityWindow,
    sessionKey,
  ])

  useEffect(() => {
    requestCoordinatorRef.current.invalidate()
    commitDiscovery(createInitialBookingDiscoveryState())
    commitDraft(createInitialBookingDraft())
  }, [commitDiscovery, commitDraft, sessionKey])

  useEffect(() => {
    if (active && discovery.status === 'idle') {
      void reloadDiscovery()
    }
  }, [active, discovery.status, reloadDiscovery])

  useEffect(() => {
    const normalizedDraft = normalizeBookingDraft({
      draft,
      discovery,
      servicePageSize: BOOKING_SERVICE_PAGE_SIZE,
    })
    if (!areBookingDraftsEqual(draft, normalizedDraft)) {
      commitDraft(normalizedDraft)
    }
  }, [commitDraft, discovery, draft])

  useEffect(() => {
    if (
      !active ||
      discovery.status !== 'ready' ||
      discovery.availability.status !== 'ready' ||
      !draft.vehicleId ||
      discovery.availability.vehicleId === draft.vehicleId
    ) {
      return
    }

    void loadAvailabilityWindow(getCurrentAvailabilityWindow(), {
      selectedDateKey: draft.dateKey,
    })
  }, [
    active,
    discovery.availability.status,
    discovery.availability.vehicleId,
    discovery.status,
    draft.dateKey,
    draft.vehicleId,
    getCurrentAvailabilityWindow,
    loadAvailabilityWindow,
  ])

  useEffect(
    () => () => {
      requestCoordinatorRef.current.invalidate()
    },
    [],
  )

  const updateDraft = useCallback(
    (patch) => {
      if (isSubmissionBusy()) {
        return false
      }
      commitDraft((currentDraft) => ({ ...currentDraft, ...patch }))
      clearCreateFeedback()
      return true
    },
    [clearCreateFeedback, commitDraft, isSubmissionBusy],
  )

  const toggleService = useCallback(
    (serviceId) => {
      if (!serviceId || isSubmissionBusy()) {
        return false
      }
      commitDraft((currentDraft) => ({
        ...currentDraft,
        serviceIds: toggleBookingServiceId(currentDraft.serviceIds, serviceId),
      }))
      clearCreateFeedback()
      return true
    },
    [clearCreateFeedback, commitDraft, isSubmissionBusy],
  )

  const shiftAvailabilityWindow = useCallback(
    async (direction) => {
      if (discoveryRef.current.availability.status === 'loading') {
        return false
      }
      const currentWindow = getCurrentAvailabilityWindow()
      const parsedAnchor =
        direction === 'next'
          ? addDaysToDate(currentWindow.endDate, 1) ??
            parseDateOnly(currentWindow.endDate)
          : addDaysToDate(
              currentWindow.startDate,
              -BOOKING_AVAILABILITY_PAGE_DAYS,
            ) ?? parseDateOnly(currentWindow.startDate)
      const nextWindow = buildBookingAvailabilityWindow({
        anchorDateKey: toBookingDateString(parsedAnchor),
        minimumDateKey: discoveryRef.current.availability.minBookableDate,
        maximumDateKey: discoveryRef.current.availability.maxBookableDate,
      })
      return loadAvailabilityWindow(nextWindow)
    },
    [getCurrentAvailabilityWindow, loadAvailabilityWindow],
  )

  const changeDate = useCallback(
    async (nextDate) => {
      if (isSubmissionBusy()) {
        return false
      }
      const nextDateKey = toBookingDateString(nextDate)
      if (!nextDateKey) {
        return false
      }
      clearCreateFeedback()
      if (
        getBookingAvailabilityDayByDate(
          discoveryRef.current.availability,
          nextDateKey,
        )
      ) {
        commitDraft((currentDraft) => ({
          ...currentDraft,
          dateKey: nextDateKey,
        }))
        return true
      }
      const nextWindow = buildBookingAvailabilityWindow({
        anchorDateKey: nextDateKey,
        minimumDateKey: discoveryRef.current.availability.minBookableDate,
        maximumDateKey: discoveryRef.current.availability.maxBookableDate,
      })
      return loadAvailabilityWindow(nextWindow, { selectedDateKey: nextDateKey })
    },
    [clearCreateFeedback, commitDraft, isSubmissionBusy, loadAvailabilityWindow],
  )

  return {
    changeDate,
    createState,
    discovery,
    draft,
    nextServicePage: () =>
      updateDraft({
        servicePage: Math.min(
          Math.max(
            0,
            Math.ceil(discoveryRef.current.services.length / BOOKING_SERVICE_PAGE_SIZE) -
              1,
          ),
          draftRef.current.servicePage + 1,
        ),
      }),
    previousServicePage: () =>
      updateDraft({
        servicePage: Math.max(0, draftRef.current.servicePage - 1),
      }),
    refreshAvailability: () =>
      loadAvailabilityWindow(getCurrentAvailabilityWindow()),
    refreshDiscovery: reloadDiscovery,
    selectDate: (dateKey) => updateDraft({ dateKey }),
    selectTime: (timeKey) => updateDraft({ timeKey }),
    selectVehicle: (vehicleId) => updateDraft({ vehicleId }),
    setNotes: (notes) => updateDraft({ notes }),
    shiftAvailabilityWindow,
    submit,
    toggleService,
  }
}
