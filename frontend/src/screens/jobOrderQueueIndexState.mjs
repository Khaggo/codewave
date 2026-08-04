export function createIdleJobOrderQueueIndexState() {
  return {
    summary: {
      status: 'idle',
      items: [],
      message: '',
    },
    calendar: {
      status: 'idle',
      jobOrderDates: [],
      bookingQueueDates: [],
      message: '',
    },
  }
}

export function createLoadingJobOrderQueueIndexState(current) {
  return {
    summary: {
      ...current.summary,
      status: 'loading',
      message: '',
    },
    calendar: {
      ...current.calendar,
      status: 'loading',
      message: '',
    },
  }
}

export function settleJobOrderQueueIndexState({
  summariesResult,
  calendarResult,
}) {
  const summary = summariesResult.status === 'fulfilled'
    ? {
        status: 'success',
        items: summariesResult.value,
        message: summariesResult.value.length
          ? ''
          : 'No job orders are mapped to this month yet.',
      }
    : {
        status: 'error',
        items: [],
        message:
          summariesResult.reason?.message ||
          'Job-order date indicators could not be loaded.',
      }

  const calendar = calendarResult.status === 'fulfilled'
    ? {
        status: 'success',
        jobOrderDates: calendarResult.value.jobOrderDates,
        bookingQueueDates: calendarResult.value.bookingQueueDates,
        message:
          calendarResult.value.jobOrderDates.length ||
          calendarResult.value.bookingQueueDates.length
            ? ''
            : 'No job-order or booking-handoff dates are mapped to this month yet.',
      }
    : {
        status: 'error',
        jobOrderDates: [],
        bookingQueueDates: [],
        message:
          calendarResult.reason?.message ||
          'Workbench date markers could not be loaded.',
      }

  return { summary, calendar }
}
