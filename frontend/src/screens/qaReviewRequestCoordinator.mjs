function normalizeEntityId(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isQaReviewTargetCurrent({
  detailState,
  selectedEntityId,
  qualityGate,
}) {
  const normalizedSelectedEntityId = normalizeEntityId(selectedEntityId)

  return Boolean(
    detailState?.status === 'ready'
    && detailState.entityId === normalizedSelectedEntityId
    && qualityGate?.jobOrderId === normalizedSelectedEntityId,
  )
}

export function createQaReviewRequestCoordinator(initialEntityId = '') {
  let selectedEntityId = normalizeEntityId(initialEntityId)
  let requestId = 0
  let activeController = null

  function abortActiveRequest() {
    activeController?.abort()
    activeController = null
  }

  return {
    begin(entityId) {
      const normalizedEntityId = normalizeEntityId(entityId)
      if (!normalizedEntityId) {
        throw new TypeError('A QA entity id is required before loading review details.')
      }

      abortActiveRequest()
      selectedEntityId = normalizedEntityId
      requestId += 1
      activeController = new AbortController()

      return {
        entityId: normalizedEntityId,
        requestId,
        signal: activeController.signal,
      }
    },

    isCurrent(token) {
      return Boolean(
        token
        && token.entityId === selectedEntityId
        && token.requestId === requestId
        && !token.signal?.aborted,
      )
    },

    invalidate(nextEntityId = '') {
      abortActiveRequest()
      selectedEntityId = normalizeEntityId(nextEntityId)
      requestId += 1

      return {
        entityId: selectedEntityId,
        requestId,
      }
    },

    dispose() {
      abortActiveRequest()
      selectedEntityId = ''
      requestId += 1
    },
  }
}
