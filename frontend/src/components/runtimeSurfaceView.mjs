export function getRuntimeRecoveryCopy() {
  return 'Bring up the ecommerce service and verify NEXT_PUBLIC_ECOMMERCE_API_BASE_URL, or the main API fallback, so catalog and inventory surfaces can reconnect to the live runtime.'
}

export function getStaffRedirectLinks(surface) {
  if (surface === 'timeline') {
    return [
      {
        href: '/admin/job-orders',
        title: 'Job Orders',
        copy: 'Update workshop progress.',
      },
      {
        href: '/admin/qa-audit',
        title: 'QA Audit',
        copy: 'Review release readiness.',
      },
      {
        href: '/admin/invoices',
        title: 'Invoices',
        copy: 'Finalize customer billing.',
      },
    ]
  }

  return [
    {
      href: '/admin/catalog',
      title: 'Catalog Admin',
      copy: 'Create and edit sellable catalog items.',
    },
    {
      href: '/admin/inventory',
      title: 'Inventory Admin',
      copy: 'Review stock visibility and inventory status.',
    },
  ]
}
