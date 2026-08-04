import { useCallback, useEffect, useRef, useState } from 'react'

import {
  listJobOrderWorkbenchCalendar,
  listJobOrderWorkbenchSummaries,
} from '@/lib/jobOrderWorkbenchClient'
import {
  createIdleJobOrderQueueIndexState,
  createLoadingJobOrderQueueIndexState,
  settleJobOrderQueueIndexState,
} from './jobOrderQueueIndexState.mjs'
import { createJobOrderQueueRequestCoordinator } from './jobOrderQueueRequestCoordinator.mjs'

export default function useJobOrderQueueIndex({
  accessToken,
  canUseWorkbench,
  selectedMonth,
  workbenchScope,
}) {
  const coordinatorRef = useRef(null)
  if (!coordinatorRef.current) {
    coordinatorRef.current = createJobOrderQueueRequestCoordinator()
  }

  const [state, setState] = useState(createIdleJobOrderQueueIndexState)

  const refresh = useCallback(async () => {
    const coordinator = coordinatorRef.current
    const token = coordinator.begin()

    if (!accessToken || !canUseWorkbench) {
      setState(createIdleJobOrderQueueIndexState())
      return
    }

    setState((current) => createLoadingJobOrderQueueIndexState(current))

    const [summariesResult, calendarResult] = await Promise.allSettled([
      listJobOrderWorkbenchSummaries({
        accessToken,
        month: selectedMonth,
        scope: workbenchScope,
        limit: 50,
        signal: token.signal,
      }),
      listJobOrderWorkbenchCalendar({
        accessToken,
        month: selectedMonth,
        scope: workbenchScope,
        signal: token.signal,
      }),
    ])

    if (!coordinator.isCurrent(token)) {
      return
    }

    setState(settleJobOrderQueueIndexState({
      summariesResult,
      calendarResult,
    }))
  }, [accessToken, canUseWorkbench, selectedMonth, workbenchScope])

  useEffect(() => {
    void refresh()

    return () => coordinatorRef.current?.dispose()
  }, [refresh])

  return {
    jobOrderSummaryState: state.summary,
    jobOrderCalendarState: state.calendar,
    refreshJobOrderQueueIndex: refresh,
  }
}
