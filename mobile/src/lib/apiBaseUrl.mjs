const LOCAL_API_BASE_URLS = {
  android: 'http://10.0.2.2:3000',
  default: 'http://127.0.0.1:3000',
}
const PRODUCTION_API_BASE_URL = 'https://api.autocare-cc.com'

export const normalizeApiBaseUrl = (value) => {
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue) {
    return ''
  }

  try {
    const parsedUrl = new URL(normalizedValue)
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      return ''
    }
  } catch {
    return ''
  }

  return normalizedValue.replace(/\/+$/, '')
}

const getLocalApiBaseUrl = (platform) =>
  LOCAL_API_BASE_URLS[platform] ?? LOCAL_API_BASE_URLS.default

export const deriveApiBaseUrlFromSourceScript = ({
  isDev,
  platform,
  sourceScriptUrl,
}) => {
  if (!isDev) {
    return ''
  }

  const scriptUrl = String(sourceScriptUrl ?? '').trim()
  if (!scriptUrl) {
    return ''
  }

  try {
    const parsedScriptUrl = new URL(scriptUrl)
    const hostname = String(parsedScriptUrl.hostname ?? '').trim()
    if (!hostname) {
      return ''
    }

    if (platform === 'android' && ['localhost', '127.0.0.1'].includes(hostname)) {
      return getLocalApiBaseUrl(platform)
    }

    const protocol = parsedScriptUrl.protocol === 'https:' ? 'https:' : 'http:'
    return normalizeApiBaseUrl(`${protocol}//${hostname}:3000`)
  } catch {
    return ''
  }
}

export const buildApiBaseUrlCandidates = ({
  isDev,
  platform,
  configuredApiBaseUrl,
  sourceScriptUrl,
}) => {
  const runtimeDerivedApiBaseUrl = deriveApiBaseUrlFromSourceScript({
    isDev,
    platform,
    sourceScriptUrl,
  })
  const normalizedConfiguredApiBaseUrl = normalizeApiBaseUrl(configuredApiBaseUrl)
  const localFallbackApiBaseUrl = isDev ? getLocalApiBaseUrl(platform) : ''
  const candidates = isDev
    ? [runtimeDerivedApiBaseUrl, normalizedConfiguredApiBaseUrl, localFallbackApiBaseUrl]
    : [normalizedConfiguredApiBaseUrl || PRODUCTION_API_BASE_URL]

  return Array.from(new Set(candidates.filter(Boolean)))
}

