export function getVisibleAnalyticsTabs(tabs) {
  return tabs.filter((item) => item.key !== 'summaryReview')
}

export function buildPartialErrorMessage(entries) {
  return entries.map(([key, message]) => `${key}: ${message}`).join(' ')
}
