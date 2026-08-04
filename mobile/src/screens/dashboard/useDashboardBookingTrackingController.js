import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Linking } from 'react-native'

import { ApiError } from '../../lib/authClient'
import {
  getBookingReservationPayment,
  listCustomerBookings,
  retryBookingReservationPayment,
} from '../../lib/bookingDiscoveryClient'
import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'
import { createSingleFlightRequestCoordinator } from './singleFlightRequestCoordinator.mjs'
import useDashboardBookingDetailLoader from './useDashboardBookingDetailLoader'

const createInitialHistoryState = () => ({
  status: 'idle',
  bookings: [],
  errorMessage: '',
})

const createInitialDetailState = () => ({
  status: 'idle',
  booking: null,
  errorMessage: '',
})

const createInitialPaymentState = () => ({
  status: 'idle',
  errorMessage: '',
})

export default function useDashboardBookingTrackingController({
  account,
  historyActive,
  trackingActive,
  buildCheckoutReturnUrls,
}) {
  const [historyState, setHistoryState] = useState(createInitialHistoryState)
  const [detailState, setDetailState] = useState(createInitialDetailState)
  const [paymentState, setPaymentState] = useState(createInitialPaymentState)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const historyStateRef = useRef(historyState)
  const detailStateRef = useRef(detailState)
  const selectedBookingIdRef = useRef(selectedBookingId)
  const historyCoordinatorRef = useRef(null)
  const paymentCoordinatorRef = useRef(null)
  const checkoutReturnUrlsRef = useRef(buildCheckoutReturnUrls)

  checkoutReturnUrlsRef.current = buildCheckoutReturnUrls

  if (!historyCoordinatorRef.current) {
    historyCoordinatorRef.current = createLatestRequestCoordinator()
  }
  if (!paymentCoordinatorRef.current) {
    paymentCoordinatorRef.current = createSingleFlightRequestCoordinator()
  }

  const sessionKey = `${account?.userId ?? ''}:${account?.accessToken ?? ''}`

  const commitHistoryState = useCallback((nextState) => {
    const resolved =
      typeof nextState === 'function' ? nextState(historyStateRef.current) : nextState
    historyStateRef.current = resolved
    setHistoryState(resolved)
  }, [])

  const commitDetailState = useCallback((nextState) => {
    const resolved =
      typeof nextState === 'function' ? nextState(detailStateRef.current) : nextState
    detailStateRef.current = resolved
    setDetailState(resolved)
  }, [])

  const { invalidate: invalidateDetail, load: loadDetail } =
    useDashboardBookingDetailLoader({
      accessToken: account?.accessToken,
      sessionKey,
      selectedBookingIdRef,
      commitDetailState,
      commitHistoryState,
    })

  const selectBookingId = useCallback(
    (bookingId, options = {}) => {
      const normalizedBookingId = String(bookingId ?? '').trim() || null
      const changed = selectedBookingIdRef.current !== normalizedBookingId

      if (changed) {
        invalidateDetail()
        paymentCoordinatorRef.current.invalidate()
      }

      selectedBookingIdRef.current = normalizedBookingId
      setSelectedBookingId(normalizedBookingId)
      setPaymentState(createInitialPaymentState())

      if (!normalizedBookingId) {
        commitDetailState(createInitialDetailState())
        return null
      }

      const seedBooking =
        options.seedBooking?.id === normalizedBookingId
          ? options.seedBooking
          : historyStateRef.current.bookings.find(
              (booking) => booking.id === normalizedBookingId,
            ) ?? null
      if (changed || options.seedBooking) {
        commitDetailState({
          status: seedBooking ? 'ready' : 'idle',
          booking: seedBooking,
          errorMessage: '',
        })
      }

      return normalizedBookingId
    },
    [commitDetailState, invalidateDetail],
  )

  const applyHistory = useCallback(
    (bookings) => {
      const safeBookings = Array.isArray(bookings) ? bookings : []
      const currentBookingId = selectedBookingIdRef.current
      const nextSelectedBookingId = safeBookings.some(
        (booking) => booking.id === currentBookingId,
      )
        ? currentBookingId
        : safeBookings[0]?.id ?? null

      commitHistoryState({
        status: 'ready',
        bookings: safeBookings,
        errorMessage: '',
      })

      if (nextSelectedBookingId !== currentBookingId) {
        selectBookingId(nextSelectedBookingId, {
          seedBooking:
            safeBookings.find((booking) => booking.id === nextSelectedBookingId) ?? null,
        })
      }
    },
    [commitHistoryState, selectBookingId],
  )

  const reloadHistory = useCallback(async () => {
    const userId = account?.userId
    const accessToken = account?.accessToken
    const coordinator = historyCoordinatorRef.current

    if (!userId || !accessToken) {
      coordinator.invalidate()
      commitHistoryState({
        ...createInitialHistoryState(),
        status: 'unauthorized',
        errorMessage: 'Sign in again to load booking history.',
      })
      return false
    }

    const token = coordinator.begin(sessionKey)
    commitHistoryState((currentState) => ({
      ...currentState,
      status: currentState.bookings.length > 0 ? 'ready' : 'loading',
      errorMessage: '',
    }))

    try {
      const bookings = await listCustomerBookings({ userId, accessToken })
      if (!coordinator.isCurrent(token)) {
        return false
      }

      applyHistory(bookings)
      return true
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return false
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to load booking history right now.'
      const unauthorized = error instanceof ApiError && [401, 403].includes(error.status)
      commitHistoryState((currentState) => ({
        ...currentState,
        status: unauthorized ? 'unauthorized' : 'error',
        errorMessage: message,
      }))
      return false
    }
  }, [
    account?.accessToken,
    account?.userId,
    applyHistory,
    commitHistoryState,
    sessionKey,
  ])

  const upsertBooking = useCallback(
    (booking, options = {}) => {
      if (!booking?.id) {
        return
      }

      historyCoordinatorRef.current.invalidate()
      commitHistoryState((currentState) => ({
        status: 'ready',
        errorMessage: '',
        bookings: [
          booking,
          ...currentState.bookings.filter(
            (currentBooking) => currentBooking.id !== booking.id,
          ),
        ],
      }))

      if (options.select ?? true) {
        selectBookingId(booking.id, { seedBooking: booking })
      }
    },
    [commitHistoryState, selectBookingId],
  )

  const applyReservationPayment = useCallback(
    (bookingId, reservationPayment) => {
      if (!bookingId || !reservationPayment) {
        return
      }

      commitDetailState((currentState) =>
        currentState.booking?.id === bookingId
          ? {
              ...currentState,
              booking: {
                ...currentState.booking,
                reservationPayment,
              },
            }
          : currentState,
      )
      commitHistoryState((currentState) => ({
        ...currentState,
        bookings: currentState.bookings.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                reservationPayment,
              }
            : booking,
        ),
      }))
    },
    [commitDetailState, commitHistoryState],
  )

  const runPayment = useCallback(
    async ({ request, fallbackMessage, alertTitle, requireCheckoutUrl }) => {
      const bookingId =
        detailStateRef.current.booking?.id ?? selectedBookingIdRef.current
      const accessToken = account?.accessToken
      if (!bookingId || !accessToken) {
        return false
      }

      const coordinator = paymentCoordinatorRef.current
      const token = coordinator.begin(`${sessionKey}:${bookingId}`)
      if (!token) {
        return false
      }

      invalidateDetail()
      setPaymentState({ status: 'loading', errorMessage: '' })

      try {
        const reservationPayment = await request({ bookingId, accessToken })
        if (
          !coordinator.isCurrent(token) ||
          selectedBookingIdRef.current !== bookingId
        ) {
          return false
        }

        applyReservationPayment(bookingId, reservationPayment)
        setPaymentState({ status: 'ready', errorMessage: '' })

        if (reservationPayment?.providerCheckoutUrl) {
          await Linking.openURL(reservationPayment.providerCheckoutUrl)
          return true
        }
        if (!requireCheckoutUrl) {
          return true
        }

        throw new Error(
          reservationPayment?.status === 'paid'
            ? 'This reservation fee is already marked as paid.'
            : 'No live payment checkout URL is available for this booking yet.',
        )
      } catch (error) {
        if (
          !coordinator.isCurrent(token) ||
          selectedBookingIdRef.current !== bookingId
        ) {
          return false
        }

        const message = error instanceof Error ? error.message : fallbackMessage
        setPaymentState({ status: 'error', errorMessage: message })
        Alert.alert(alertTitle, message)
        return false
      } finally {
        coordinator.complete(token)
      }
    },
    [
      account?.accessToken,
      applyReservationPayment,
      invalidateDetail,
      sessionKey,
    ],
  )

  const openReservationPayment = useCallback(
    () =>
      runPayment({
        alertTitle: 'Reservation Payment Unavailable',
        fallbackMessage: 'We could not open reservation payment right now.',
        requireCheckoutUrl: true,
        request: ({ bookingId, accessToken }) =>
          getBookingReservationPayment({ bookingId, accessToken }),
      }),
    [runPayment],
  )

  const retryReservationPayment = useCallback(
    () =>
      runPayment({
        alertTitle: 'Reservation Payment Refresh Failed',
        fallbackMessage: 'We could not refresh reservation payment right now.',
        requireCheckoutUrl: false,
        request: ({ bookingId, accessToken }) => {
          const returnUrls = checkoutReturnUrlsRef.current?.('booking', bookingId) ?? {}
          return retryBookingReservationPayment({
            bookingId,
            accessToken,
            checkoutSuccessUrl: returnUrls.successUrl,
            checkoutCancelUrl: returnUrls.cancelUrl,
          })
        },
      }),
    [runPayment],
  )

  const refresh = useCallback(async () => {
    const historyLoaded = await reloadHistory()
    const bookingId = selectedBookingIdRef.current
    if (!historyLoaded || !trackingActive || !bookingId) {
      return historyLoaded
    }

    const seedBooking =
      historyStateRef.current.bookings.find((booking) => booking.id === bookingId) ??
      null
    return loadDetail(bookingId, { force: true, seedBooking })
  }, [loadDetail, reloadHistory, trackingActive])

  useEffect(() => {
    historyCoordinatorRef.current.invalidate()
    invalidateDetail()
    paymentCoordinatorRef.current.invalidate()
    historyStateRef.current = createInitialHistoryState()
    detailStateRef.current = createInitialDetailState()
    selectedBookingIdRef.current = null
    setHistoryState(historyStateRef.current)
    setDetailState(detailStateRef.current)
    setPaymentState(createInitialPaymentState())
    setSelectedBookingId(null)
  }, [invalidateDetail, sessionKey])

  useEffect(() => {
    if (historyActive && historyState.status === 'idle') {
      void reloadHistory()
    }
  }, [historyActive, historyState.status, reloadHistory])

  useEffect(() => {
    if (!trackingActive) {
      return
    }
    if (!selectedBookingId) {
      invalidateDetail()
      commitDetailState(createInitialDetailState())
      setPaymentState(createInitialPaymentState())
      return
    }
    if (
      detailState.booking?.id === selectedBookingId &&
      detailState.status === 'ready'
    ) {
      return
    }

    const seedBooking =
      historyState.bookings.find((booking) => booking.id === selectedBookingId) ?? null
    void loadDetail(selectedBookingId, { seedBooking })
  }, [
    commitDetailState,
    detailState.booking?.id,
    detailState.status,
    historyState.bookings,
    invalidateDetail,
    loadDetail,
    selectedBookingId,
    trackingActive,
  ])

  useEffect(
    () => () => {
      historyCoordinatorRef.current?.invalidate()
      invalidateDetail()
      paymentCoordinatorRef.current?.invalidate()
    },
    [invalidateDetail],
  )

  return {
    detailState,
    historyState,
    openReservationPayment,
    paymentState,
    refresh,
    reloadHistory,
    retryReservationPayment,
    selectBookingId,
    selectedBookingId,
    upsertBooking,
  }
}
