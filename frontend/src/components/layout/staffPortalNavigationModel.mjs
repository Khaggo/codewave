export const STAFF_PORTAL_NAVIGATION_ORDER = Object.freeze([
  'dashboard',
  'bookings',
  'digital-intake-inspections',
  'job-orders-admin',
  'qa-audit',
  'invoice-order-management',
  'accessory-orders',
  'customer-directory',
  'back-jobs',
  'insurance',
  'loyalty-management',
  'service-management',
  'accessory-catalog',
  'accessory-stock',
  'user-admin',
  'summary-review',
  'settings',
])

const navigationOrderByKey = new Map(
  STAFF_PORTAL_NAVIGATION_ORDER.map((key, index) => [key, index]),
)

export function isStaffPortalNavigationActive(pathname, href) {
  const currentPath = String(pathname ?? '')
  const targetPath = String(href ?? '')
  return currentPath === targetPath || (targetPath === '/admin/job-orders' && currentPath.startsWith('/admin/job-orders/'))
}

export function shouldHandleStaffPortalNavigation({
  pathname,
  href,
  button = 0,
  defaultPrevented = false,
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
} = {}) {
  if (defaultPrevented || button !== 0 || metaKey || ctrlKey || shiftKey || altKey) return false
  return !isStaffPortalNavigationActive(pathname, href)
}

export function orderStaffPortalNavigationEntries(entries = []) {
  return entries
    .map((entry, sourceIndex) => ({ entry, sourceIndex }))
    .sort((left, right) => {
      const leftOrder =
        navigationOrderByKey.get(left.entry?.key) ??
        STAFF_PORTAL_NAVIGATION_ORDER.length
      const rightOrder =
        navigationOrderByKey.get(right.entry?.key) ??
        STAFF_PORTAL_NAVIGATION_ORDER.length

      return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex
    })
    .map(({ entry }) => entry)
}
