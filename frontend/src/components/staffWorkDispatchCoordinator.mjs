export function createStaffWorkDispatchCoordinator() {
  let requestId = 0
  let activeToken = null

  return {
    begin() {
      if (activeToken) return null
      activeToken = Object.freeze({ requestId: ++requestId })
      return activeToken
    },
    isCurrent(token) {
      return Boolean(token && activeToken?.requestId === token.requestId)
    },
    finish(token) {
      if (!token || activeToken?.requestId !== token.requestId) return false
      activeToken = null
      return true
    },
    invalidate() {
      requestId += 1
      activeToken = null
    },
    isPending() {
      return Boolean(activeToken)
    },
  }
}
