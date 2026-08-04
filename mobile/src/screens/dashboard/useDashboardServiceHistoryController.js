import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '../../lib/authClient'
import { listCustomerServiceHistory } from '../../lib/bookingDiscoveryClient'
import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'

const createInitialState = () => ({
  status: 'idle',
  items: [],
  errorMessage: '',
})

export default function useDashboardServiceHistoryController({ account, active }) {
  const [state, setState] = useState(createInitialState)
  const coordinatorRef = useRef(null)

  if (!coordinatorRef.current) {
    coordinatorRef.current = createLatestRequestCoordinator()
  }

  const sessionKey = `${account?.userId ?? ''}:${account?.accessToken ?? ''}`

  const reload = useCallback(async () => {
    const userId = account?.userId
    const accessToken = account?.accessToken
    const coordinator = coordinatorRef.current

    if (!userId || !accessToken) {
      coordinator.invalidate()
      setState({
        ...createInitialState(),
        status: 'unauthorized',
        errorMessage: 'Sign in again to load completed service history.',
      })
      return false
    }

    const token = coordinator.begin(sessionKey)
    setState((currentState) => ({
      ...currentState,
      status: currentState.items.length > 0 ? 'ready' : 'loading',
      errorMessage: '',
    }))

    try {
      const items = await listCustomerServiceHistory({ userId, accessToken })
      if (!coordinator.isCurrent(token)) {
        return false
      }

      setState({
        status: 'ready',
        items,
        errorMessage: '',
      })
      return true
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return false
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to load completed service history right now.'
      const unauthorized = error instanceof ApiError && [401, 403].includes(error.status)
      setState((currentState) => ({
        ...currentState,
        status: unauthorized ? 'unauthorized' : 'error',
        errorMessage: message,
      }))
      return false
    }
  }, [account?.accessToken, account?.userId, sessionKey])

  useEffect(() => {
    coordinatorRef.current.invalidate()
    setState(createInitialState())
  }, [sessionKey])

  useEffect(() => {
    if (active && state.status === 'idle') {
      void reload()
    }
  }, [active, reload, state.status])

  useEffect(
    () => () => {
      coordinatorRef.current?.invalidate()
    },
    [],
  )

  return { reload, state }
}
