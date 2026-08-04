export const getNotificationStatusLabel = (item = {}) => {
  if (item.requiresAction) {
    return item.unread ? 'Action needed' : 'Still pending'
  }

  return item.unread ? 'New update' : 'Viewed'
}

export const getRewardOfferState = (item = {}) => {
  const progress = Number.isFinite(Number(item.progress)) ? Number(item.progress) : 0
  const target = Number.isFinite(Number(item.target)) ? Number(item.target) : 0
  const progressRatio = target > 0 ? Math.min(Math.max(progress / target, 0), 1) : 0
  const isButtonDisabled = !item.available || Boolean(item.loading)

  return {
    progressRatio,
    isButtonDisabled,
    buttonLabel: item.loading
      ? 'Claiming...'
      : item.buttonLabel ?? (item.available ? 'Claim' : 'Locked'),
  }
}

export const getTimelineToneKeys = (item = {}) => ({
  status: item.statusTone === 'verified' ? 'success' : 'default',
  type:
    item.typeTone === 'summary'
      ? 'summary'
      : item.typeTone === 'verified'
        ? 'verified'
        : 'administrative',
})

export const getLifecycleSummaryTone = (state) => {
  if (state === 'reviewed_summary_visible') return 'visible'
  if (state === 'pending_summary_hidden') return 'pending'
  return 'hidden'
}

