export const splitRefs = (value) =>
  String(value ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

export const getInspectionMessageTone = (state) => {
  if (
    state === 'capture_saved_verified' ||
    state === 'capture_saved_mixed' ||
    state === 'capture_saved_unverified' ||
    state === 'history_loaded'
  ) {
    return 'success'
  }

  if (state === 'history_empty') {
    return 'warning'
  }

  if (state === 'history_loading') {
    return 'info'
  }

  return 'danger'
}
