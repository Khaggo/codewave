const normalized = (value) => (typeof value === 'string' ? value.trim() : '')

export function isEcommerceEnabled() {
  return normalized(process.env.NEXT_PUBLIC_ECOMMERCE_API_BASE_URL).length > 0
}

export function ecommerceUnavailableMessage() {
  return 'This deployment uses the lower-cost setup, so ecommerce catalog and inventory features are offline for now.'
}
