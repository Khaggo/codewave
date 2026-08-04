import { fn } from 'storybook/test'

import StaffWorkQueueItem from './StaffWorkQueueItem'

const baseItem = {
  entityId: 'job-order-1',
  jobOrderId: 'job-order-1',
  reference: 'JO · BK-20260622-0002',
  customerName: 'Queue Customer',
  vehicleName: '2019 Toyota Vios',
  plateNumber: 'QAJ01001',
  status: 'in_progress',
  queueEnteredAt: '2026-08-02T00:00:00.000Z',
  priorityReason: 'Workshop correction returned by QA',
};

const meta = {
  title: 'Operations/StaffWorkQueueItem',
  component: StaffWorkQueueItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-5xl divide-y divide-surface-border border border-surface-border bg-surface-panel">
        <Story />
      </div>
    ),
  ],
  args: {
    item: baseItem,
    view: 'team',
    queueType: 'job_order',
    selectedEntityId: '',
    hasCapacity: true,
    onSelect: fn(),
    onClaim: fn(),
    onOpen: fn(),
    onRelease: fn(),
  },
};

export default meta

export const Unassigned = {}

export const AssignedToYou = {
  args: {
    selectedEntityId: 'job-order-1',
    item: {
      ...baseItem,
      claim: { isMine: true, ownerName: 'Queue Adviser' },
    },
  },
}

export const HandledByAnotherStaffMember = {
  args: {
    item: {
      ...baseItem,
      claim: { isMine: false, ownerName: 'Alex Service Adviser' },
    },
  },
}

export const LongContent = {
  args: {
    item: {
      ...baseItem,
      reference: 'JO · BK-20260622-0002-WITH-A-LONG-REFERENCE',
      customerName: 'Customer with an unusually long registered account name',
      vehicleName: '2019 Toyota Vios with a long descriptive vehicle label',
    },
  },
  parameters: {
    viewport: { defaultViewport: 'compactMobile' },
  },
}

export const MissingData = {
  args: {
    item: {
      entityType: 'job_order',
      entityId: null,
      jobOrderId: null,
      reference: null,
      customerName: null,
      vehicleName: null,
      plateNumber: null,
      status: 'in_progress',
      queueEnteredAt: null,
      claim: null,
    },
  },
}

export const MissingOwner = {
  args: {
    item: {
      ...baseItem,
      claim: { isMine: false, ownerName: null },
    },
  },
}

export const CapacityReached = {
  args: {
    hasCapacity: false,
  },
}

export const HistoryReadOnly = {
  args: {
    view: 'history',
    item: {
      ...baseItem,
      claim: { isMine: true, ownerName: 'Queue Adviser' },
    },
  },
}
