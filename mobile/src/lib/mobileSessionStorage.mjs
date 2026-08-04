export const MOBILE_SESSION_STORAGE_KEY = '@autocare/mobile-session-v1'

export function serializeMobileSessionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null
  }

  const hasPersistableState = Object.values(snapshot).some(Boolean)
  return hasPersistableState ? JSON.stringify(snapshot) : null
}

export function parseMobileSessionSnapshot(serializedSnapshot) {
  if (!serializedSnapshot || typeof serializedSnapshot !== 'string') {
    return null
  }

  try {
    const parsedSnapshot = JSON.parse(serializedSnapshot)
    return parsedSnapshot && typeof parsedSnapshot === 'object'
      ? parsedSnapshot
      : null
  } catch {
    return null
  }
}
