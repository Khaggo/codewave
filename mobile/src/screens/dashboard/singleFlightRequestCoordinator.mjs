export function createSingleFlightRequestCoordinator() {
  let activeToken = null
  let nextRequestId = 0
  const isCurrent = (token) =>
    Boolean(
      token &&
        activeToken &&
        token.sessionKey === activeToken.sessionKey &&
        token.requestId === activeToken.requestId,
    )

  return {
    begin(sessionKey) {
      if (activeToken) {
        return null
      }

      activeToken = {
        sessionKey: String(sessionKey ?? ''),
        requestId: ++nextRequestId,
      }
      return activeToken
    },

    complete(token) {
      if (!isCurrent(token)) {
        return false
      }

      activeToken = null
      return true
    },

    invalidate() {
      nextRequestId += 1
      activeToken = null
    },

    isBusy() {
      return Boolean(activeToken)
    },

    isCurrent,
  }
}
