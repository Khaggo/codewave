export const customerTimelineFilters = [
  { label: 'All', sourceType: null },
  { label: 'Bookings', sourceType: 'booking' },
  { label: 'Workshop', sourceType: 'job_order' },
  { label: 'Insurance', sourceType: 'insurance' },
  { label: 'Summary', sourceType: 'lifecycle_summary' },
]

export const createEmptyCustomerVehicleLifecycleSnapshot = () => ({
  timelineState: 'timeline_empty',
  events: [],
  stats: {
    totalEvents: 0,
    verifiedEvents: 0,
    administrativeEvents: 0,
  },
  filters: customerTimelineFilters,
  page: {
    limit: 20,
    hasNext: false,
    nextCursor: null,
  },
  summaryCard: {
    state: 'hidden_summary',
    stateLabel: 'Hidden',
    title: 'No approved summary yet',
    helperText: 'An approved service summary will appear here when available.',
    summaryText: null,
    reviewedAt: null,
    source: 'hidden',
  },
})
