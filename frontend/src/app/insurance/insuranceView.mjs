export function formatStatusLabel(value) {
  return String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const countMatchingInquiries = (inquiries, predicate) =>
  inquiries.reduce((total, inquiry) => (predicate(inquiry) ? total + 1 : total), 0)

const buildLifecycleSummaryCards = (inquiries) => [
  {
    label: 'New Inquiries',
    value: countMatchingInquiries(inquiries, (inquiry) => inquiry?.status === 'submitted'),
    sub: 'Fresh customer intake waiting for review',
  },
  {
    label: 'Payment Pending',
    value: countMatchingInquiries(
      inquiries,
      (inquiry) =>
        inquiry?.status === 'payment_pending' ||
        ['proof_submitted', 'verifying', 'overdue', 'unpaid'].includes(inquiry?.paymentStatus),
    ),
    sub: 'Cases needing payment follow-up',
  },
  {
    label: 'For Renewal',
    value: countMatchingInquiries(
      inquiries,
      (inquiry) =>
        inquiry?.status === 'for_renewal' ||
        ['upcoming', 'quoted', 'awaiting_customer', 'expired'].includes(inquiry?.renewalStatus),
    ),
    sub: 'Cases due for renewal follow-up',
  },
  {
    label: 'Needs Documents',
    value: countMatchingInquiries(inquiries, (inquiry) => inquiry?.status === 'needs_documents'),
    sub: 'Cases waiting on document completion',
  },
]

export function buildInsuranceTableRow(inquiry) {
  return {
    key: inquiry?.id ?? '',
    customer: inquiry?.customerDisplayName || 'Unknown customer',
    vehicle: inquiry?.vehicleLabel || 'Unknown vehicle',
    status: formatStatusLabel(inquiry?.status),
    documentStatus: formatStatusLabel(inquiry?.documentStatus),
    paymentStatus: formatStatusLabel(inquiry?.paymentStatus),
    ...(inquiry?.renewalStatus
      ? {
          renewalStatus: formatStatusLabel(inquiry.renewalStatus),
        }
      : {}),
  }
}

export function getInsuranceSummaryCards(input = {}) {
  if (Array.isArray(input.inquiries)) {
    return buildLifecycleSummaryCards(input.inquiries)
  }

  const { queueItems = [], queueState, activeInquiry } = input

  return [
    {
      label: 'Review Queue',
      value: queueItems.length,
      sub: queueState === 'queue_loaded' ? 'Queue items loaded' : 'Manual inquiry lookup for now',
    },
    {
      label: 'Allowed Roles',
      value: '2',
      sub: 'service adviser, super admin',
    },
    {
      label: 'Selected Inquiry',
      value: activeInquiry ? formatStatusLabel(activeInquiry.status) : 'None',
      sub: activeInquiry ? activeInquiry.subject : 'Pick a queue item or enter an inquiry id',
    },
    {
      label: 'Editable Fields',
      value: '2',
      sub: 'status and review notes only',
    },
  ]
}
