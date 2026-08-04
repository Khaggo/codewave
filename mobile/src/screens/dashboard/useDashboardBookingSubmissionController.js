import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '../../lib/authClient'
import { createCustomerBooking } from '../../lib/bookingDiscoveryClient'
import {
  createInitialBookingCreateState,
  getBookingSubmissionErrorState,
  getBookingSubmissionSuccessState,
  resolveBookingSubmission,
} from './bookingWorkflowModel.mjs'
import { createSingleFlightRequestCoordinator } from './singleFlightRequestCoordinator.mjs'

export default function useDashboardBookingSubmissionController({
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
}) {
  const [state, setState] = useState(createInitialBookingCreateState)
  const stateRef = useRef(state)
  const coordinatorRef = useRef(null)
  const checkoutReturnUrlsRef = useRef(buildCheckoutReturnUrls)
  const loadAvailabilityWindowRef = useRef(loadAvailabilityWindow)
  const getCurrentAvailabilityWindowRef = useRef(getCurrentAvailabilityWindow)
  const onBookingCreatedRef = useRef(onBookingCreated)
  const onBookingSubmittedRef = useRef(onBookingSubmitted)

  if (!coordinatorRef.current) {
    coordinatorRef.current = createSingleFlightRequestCoordinator()
  }

  checkoutReturnUrlsRef.current = buildCheckoutReturnUrls
  loadAvailabilityWindowRef.current = loadAvailabilityWindow
  getCurrentAvailabilityWindowRef.current = getCurrentAvailabilityWindow
  onBookingCreatedRef.current = onBookingCreated
  onBookingSubmittedRef.current = onBookingSubmitted

  const commitState = useCallback((nextState) => {
    const resolved =
      typeof nextState === 'function' ? nextState(stateRef.current) : nextState
    stateRef.current = resolved
    setState(resolved)
  }, [])

  useEffect(() => {
    coordinatorRef.current.invalidate()
    commitState(createInitialBookingCreateState())
  }, [commitState, sessionKey])

  useEffect(
    () => () => {
      coordinatorRef.current.invalidate()
    },
    [],
  )

  const isBusy = useCallback(() => coordinatorRef.current.isBusy(), [])

  const clearFeedback = useCallback(() => {
    if (!coordinatorRef.current.isBusy()) {
      commitState(createInitialBookingCreateState())
    }
  }, [commitState])

  const submit = useCallback(async () => {
    const coordinator = coordinatorRef.current
    const token = coordinator.begin(sessionKey)
    if (!token) {
      return false
    }

    const resolved = resolveBookingSubmission({
      account,
      discovery: discoveryRef.current,
      draft: draftRef.current,
    })
    if (!resolved.valid) {
      commitState(resolved.state)
      coordinator.complete(token)
      return false
    }

    commitState({
      status: 'submitting',
      message:
        'Sending your booking request now. Duplicate taps are locked while this is in progress.',
      booking: null,
    })

    try {
      const returnUrls = checkoutReturnUrlsRef.current?.('booking') ?? {}
      const booking = await createCustomerBooking({
        userId: account.userId,
        vehicleId: resolved.selectedVehicle.id,
        timeSlotId: resolved.selectedTimeSlot.id,
        scheduledDate: resolved.scheduledDate,
        serviceIds: resolved.selectedServices.map((service) => service.id),
        notes: resolved.notes,
        accessToken: account.accessToken,
        checkoutSuccessUrl: returnUrls.successUrl,
        checkoutCancelUrl: returnUrls.cancelUrl,
      })
      if (!coordinator.isCurrent(token)) {
        return false
      }

      commitState(getBookingSubmissionSuccessState(booking))
      commitDraft((currentDraft) => ({ ...currentDraft, notes: '' }))
      onBookingCreatedRef.current?.(booking)
      onBookingSubmittedRef.current?.(booking)
      return true
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return false
      }

      const statusCode = error instanceof ApiError ? error.status : null
      commitState(
        getBookingSubmissionErrorState({
          statusCode,
          fallbackMessage:
            error instanceof Error && error.message
              ? error.message
              : 'Unable to submit booking right now.',
        }),
      )
      if (statusCode === 409) {
        const refreshed = await loadAvailabilityWindowRef.current(
          getCurrentAvailabilityWindowRef.current(),
        )
        if (coordinator.isCurrent(token)) {
          commitState((currentState) =>
            currentState.status === 'conflict'
              ? {
                  ...currentState,
                  message: refreshed
                    ? 'That slot is no longer available. Live availability has been refreshed below.'
                    : 'That slot is no longer available, and live availability could not be refreshed automatically. Use refresh and retry.',
                }
              : currentState,
          )
        }
      }
      return false
    } finally {
      coordinator.complete(token)
    }
  }, [account, commitDraft, commitState, discoveryRef, draftRef, sessionKey])

  return {
    clearFeedback,
    isBusy,
    state,
    submit,
  }
}
