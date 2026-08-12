export function getPortalLinkKind(href) {
  if (href && typeof href === 'object') {
    return 'next'
  }

  const value = String(href ?? '').trim()
  if ((value.startsWith('/') && !value.startsWith('//')) || value.startsWith('?')) {
    return 'next'
  }

  return 'anchor'
}
