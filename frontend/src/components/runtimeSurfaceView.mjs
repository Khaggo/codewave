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

  return []
}
