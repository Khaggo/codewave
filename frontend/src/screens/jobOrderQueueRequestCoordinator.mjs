export function createJobOrderQueueRequestCoordinator() {
  let activeToken = null
  let requestId = 0

  const abortActive = () => {
    activeToken?.controller.abort()
  }

  return {
    begin() {
      abortActive()
      requestId += 1
      activeToken = {
        requestId,
        controller: new AbortController(),
      }

      return {
        requestId,
        signal: activeToken.controller.signal,
      }
    },

    isCurrent(token) {
      return Boolean(
        activeToken &&
        token &&
        activeToken.requestId === token.requestId &&
        !token.signal.aborted,
      )
    },

    dispose() {
      abortActive()
      activeToken = null
      requestId += 1
    },
  }
}
