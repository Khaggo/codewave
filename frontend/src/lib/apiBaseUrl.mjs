const LOCAL_API_HOSTS = new Set(['127.0.0.1', 'localhost'])

const normalizeBaseUrl = (value) => String(value ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

const isLocalBrowserHostname = (hostname) => LOCAL_API_HOSTS.has(String(hostname ?? '').toLowerCase())

export function deriveApiBaseUrl({ configuredBaseUrl, browserHostname } = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(configuredBaseUrl)

  try {
    const parsedBaseUrl = new URL(normalizedBaseUrl)
    const normalizedBrowserHostname = String(browserHostname ?? '').trim().toLowerCase()

    if (
      normalizedBrowserHostname &&
      !isLocalBrowserHostname(normalizedBrowserHostname) &&
      LOCAL_API_HOSTS.has(parsedBaseUrl.hostname.toLowerCase())
    ) {
      parsedBaseUrl.hostname = normalizedBrowserHostname
      return parsedBaseUrl.toString().replace(/\/$/, '')
    }

    return parsedBaseUrl.toString().replace(/\/$/, '')
  } catch {
    return normalizedBaseUrl
  }
}
