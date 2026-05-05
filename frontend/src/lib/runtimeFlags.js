const normalized = (value) => (typeof value === 'string' ? value.trim() : '')

export function isEcommerceEnabled() {
  const explicitBaseUrl = normalized(process.env.NEXT_PUBLIC_ECOMMERCE_API_BASE_URL)
  const mainApiBaseUrl = normalized(process.env.NEXT_PUBLIC_API_BASE_URL)

  return explicitBaseUrl.length > 0 || mainApiBaseUrl.length > 0
}

export function ecommerceUnavailableMessage() {
  return 'The ecommerce runtime is unavailable right now. Check the ecommerce-service base URL and health status, then retry the live catalog or inventory view.'
}
