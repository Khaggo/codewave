export const createAccessoryAdminMutationCoordinator = () => {
  let activeToken = null
  let nextId = 0

  return {
    begin(key) {
      if (activeToken) return null
      activeToken = { id: ++nextId, key }
      return activeToken
    },
    isCurrent(token) {
      return Boolean(token && activeToken?.id === token.id)
    },
    finish(token) {
      if (token && activeToken?.id === token.id) activeToken = null
    },
    invalidate() {
      activeToken = null
    },
  }
}
