const ROUTE_META = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Operations overview, quick actions, and active work',
  },
  '/vehicles': {
    title: 'Vehicle Records',
    subtitle: 'Customer vehicle history, status, and service visibility',
  },
  '/bookings': {
    title: 'Booking Schedule',
    subtitle: 'Daily schedule, queue visibility, and slot administration',
  },
  '/backjobs': {
    title: 'Back-Jobs',
    subtitle: 'Follow-up work, status handling, and assigned ownership',
  },
  '/insurance': {
    title: 'Insurance',
    subtitle: 'Inquiry review, requirements, and coordination status',
  },
  '/shop': {
    title: 'Shop & Inventory',
    subtitle: 'Catalog browsing and stock visibility',
  },
  '/loyalty': {
    title: 'Loyalty Management',
    subtitle: 'Rewards, redemptions, and customer retention controls',
  },
  '/admin/customers': {
    title: 'Customers & Vehicles',
    subtitle: 'Customer profiles linked to vehicle records',
  },
  '/admin/users': {
    title: 'Staff Accounts',
    subtitle: 'Provision, review, and manage operations access',
  },
  '/admin/services': {
    title: 'Service Management',
    subtitle: 'Service catalog, categories, and booking visibility',
  },
  '/admin/job-orders': {
    title: 'Job Orders',
    subtitle: 'Execution handoff, progress, evidence, and completion',
  },
  '/admin/intake-inspections': {
    title: 'Intake Inspection',
    subtitle: 'Vehicle condition capture before workshop work begins',
  },
  '/admin/qa-audit': {
    title: 'QA Audit',
    subtitle: 'Quality gate review and release decisions',
  },
  '/admin/invoices': {
    title: 'Invoices & Orders',
    subtitle: 'Invoice readiness and order record lookup',
  },
  '/admin/catalog': {
    title: 'Catalog Admin',
    subtitle: 'Product listing visibility and merchandising controls',
  },
  '/admin/inventory': {
    title: 'Inventory',
    subtitle: 'Stock coverage, alerts, and quantity updates',
  },
  '/admin/summaries': {
    title: 'Analytics',
    subtitle: 'Operational reporting and cross-workspace summaries',
  },
}

const DEFAULT_ROUTE_META = {
  title: 'Cruisers Crib Portal',
  subtitle: 'Operations workspace',
}

const SIDEBAR_EXPANDED_WIDTH = 256
const SIDEBAR_COLLAPSED_WIDTH = 72

export function getShellRouteMeta(pathname) {
  return ROUTE_META[pathname] ?? DEFAULT_ROUTE_META
}

export function getSidebarWidth(collapsed) {
  return collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
}
