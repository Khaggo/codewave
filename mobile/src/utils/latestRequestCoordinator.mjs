export function createLatestRequestCoordinator() {
  let currentToken = null
  let nextRequestId = 0

  const abortCurrent = () => {
    currentToken?.abortController?.abort()
  }

  return {
    begin(sessionKey) {
      abortCurrent()
      const abortController =
        typeof AbortController === 'function' ? new AbortController() : null
      const token = {
        sessionKey: String(sessionKey ?? ''),
        requestId: ++nextRequestId,
        signal: abortController?.signal,
        abortController,
      }
      currentToken = token
      return token
    },

    isCurrent(token) {
      return Boolean(
        token &&
          currentToken &&
          token.sessionKey === currentToken.sessionKey &&
          token.requestId === currentToken.requestId,
      )
    },

    invalidate() {
      abortCurrent()
      nextRequestId += 1
      currentToken = null
    },

    dispose() {
      abortCurrent()
      currentToken = null
    },
  }
}
