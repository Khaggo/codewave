export function formatStatusLabel(value) {
  return String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getInsuranceSummaryCards({ queueItems, queueState, activeInquiry }) {
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
