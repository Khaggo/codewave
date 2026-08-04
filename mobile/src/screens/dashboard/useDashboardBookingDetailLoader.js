import { useCallback, useEffect, useRef } from 'react'

import { ApiError } from '../../lib/authClient'
import { getBookingById } from '../../lib/bookingDiscoveryClient'
import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'

export default function useDashboardBookingDetailLoader({
  accessToken,
  sessionKey,
  selectedBookingIdRef,
  commitDetailState,
  commitHistoryState,
}) {
  const coordinatorRef = useRef(null)

  if (!coordinatorRef.current) {
    coordinatorRef.current = createLatestRequestCoordinator()
  }

  const invalidate = useCallback(() => {
    coordinatorRef.current.invalidate()
  }, [])

  const load = useCallback(
    async (bookingId, options = {}) => {
      const normalizedBookingId = String(bookingId ?? '').trim()
      const coordinator = coordinatorRef.current

      if (!normalizedBookingId) {
        coordinator.invalidate()
        return false
      }
      if (!accessToken) {
        coordinator.invalidate()
        commitDetailState({
          status: 'unauthorized',
          booking: options.seedBooking ?? null,
          errorMessage: 'Sign in again to load booking detail.',
        })
        return false
      }

      const seedBooking =
        options.seedBooking?.id === normalizedBookingId ? options.seedBooking : null
      const token = coordinator.begin(`${sessionKey}:${normalizedBookingId}`)
      commitDetailState((currentState) => ({
        status:
          currentState.booking?.id === normalizedBookingId &&
          currentState.status === 'ready' &&
          !options.force
            ? 'ready'
            : 'loading',
        booking:
          seedBooking ||
          (currentState.booking?.id === normalizedBookingId
            ? currentState.booking
            : null),
        errorMessage: '',
      }))

      try {
        const booking = await getBookingById({
          bookingId: normalizedBookingId,
          accessToken,
        })
        if (
          !coordinator.isCurrent(token) ||
          selectedBookingIdRef.current !== normalizedBookingId
        ) {
          return false
        }

        commitDetailState({
          status: 'ready',
          booking,
          errorMessage: '',
        })
        commitHistoryState((currentState) => ({
          ...currentState,
          bookings: currentState.bookings.map((currentBooking) =>
            currentBooking.id === booking.id ? booking : currentBooking,
          ),
        }))
        return true
      } catch (error) {
        if (
          !coordinator.isCurrent(token) ||
          selectedBookingIdRef.current !== normalizedBookingId
        ) {
          return false
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Unable to load booking detail right now.'
        const unauthorized = error instanceof ApiError && [401, 403].includes(error.status)
        commitDetailState({
          status: unauthorized ? 'unauthorized' : 'error',
          booking: seedBooking,
          errorMessage: message,
        })
        return false
      }
    },
    [
      accessToken,
      commitDetailState,
      commitHistoryState,
      selectedBookingIdRef,
      sessionKey,
    ],
  )

  useEffect(() => {
    coordinatorRef.current.invalidate()
  }, [sessionKey])

  useEffect(
    () => () => {
      coordinatorRef.current?.invalidate()
    },
    [],
  )

  return { invalidate, load }
}
