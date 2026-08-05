import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, FileText, Search, ShieldCheck } from 'lucide-react'
import { expect, fn, userEvent, within } from 'storybook/test'

import PageHeader from '@/components/ui/PageHeader'
import PortalSelect from '@/components/ui/PortalSelect'
import ServiceLifecycleHeader from '@/components/ServiceLifecycleHeader'
import StaffWorkQueueItem from '@/components/StaffWorkQueueItem'
import JobOrderControlDrawer from './JobOrderControlDrawer'
import { QualityFindingCard, SectionFrame } from './QAAuditPresentation'
import { SummaryTile } from './JobOrderWorkbenchSummary'

const meta = {
  title: 'Operations/Critical workflows',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-surface-bg p-4 text-ink-primary md:p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: 'error' },
    layout: 'fullscreen',
  },
}

export default meta

const queueItem = {
  entityId: 'job-order-fixture-1',
  jobOrderId: 'job-order-fixture-1',
  reference: 'JO-2026-000241',
  customerName: 'Queue Customer',
  vehicleName: '2019 Toyota Vios',
  plateNumber: 'QAJ01001',
  status: 'in_progress',
  queueEnteredAt: '2026-08-04T04:00:00.000Z',
  priorityReason: 'Workshop correction returned by QA',
}

const jobOrder = {
  id: 'job-order-fixture-1',
  jobOrderReference: 'JO-2026-000241',
  sourceType: 'booking',
  sourceBookingReference: 'BK-20260804-0042',
  workDate: '2026-08-04',
  customerLabel: 'Queue Customer',
  vehicleLabel: '2019 Toyota Vios / QAJ01001',
  serviceAdviserCode: 'SA-2026-001',
  status: 'in_progress',
  updatedAt: '2026-08-04T05:10:00.000Z',
  assignedTechnicianIds: ['technician-fixture-1'],
  photos: [{ id: 'photo-fixture-1' }],
}

const workflowSteps = [
  { key: 'intake', label: 'Intake', workbenchStage: 'intake', state: 'done', note: 'Captured' },
  { key: 'assignments', label: 'Assignments', workbenchStage: 'assignments', state: 'done', note: '1 technician saved' },
  { key: 'progress', label: 'Progress', workbenchStage: 'progress', state: 'action_needed', note: 'Add the latest workshop update' },
  { key: 'qa_audit', label: 'QA audit', workbenchStage: 'qa_audit', state: 'locked', note: 'Available after handoff' },
  { key: 'finalize', label: 'Finalize', workbenchStage: 'finalize', state: 'locked', note: 'Requires a passing QA verdict' },
]

const nextAction = {
  toneClass: 'border-brand-orange/25 bg-brand-orange/10',
  stepLabel: 'Progress',
  title: 'Add the next workshop update',
  body: 'Save one concise progress note before sending this job order to QA.',
}

export const BookingHandoff = {
  render: () => (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Front desk flow"
        title="Booking handoffs"
        description="Select a confirmed booking and send it to the workshop once."
        meta={<span className="badge badge-green">2 ready today</span>}
        actions={<button type="button" className="btn-primary min-h-11 px-4">Send to workshop</button>}
      />
      <SectionFrame
        title="Confirmed booking"
        copy="The handoff keeps the booking reference and opens the focused Job Order workspace."
        badge={<span className="badge badge-blue">Ready</span>}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="font-semibold text-ink-primary">BK-20260804-0042</p>
            <p className="mt-1 text-sm text-ink-secondary">Queue Customer / 2019 Toyota Vios / QAJ01001</p>
          </div>
          <button type="button" className="ops-action-primary min-h-11">Open handoff</button>
        </div>
      </SectionFrame>
    </div>
  ),
}

export const GarageVehicleContext = {
  render: () => (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Customer records"
        title="Garage context"
        description="Keep vehicle identity visible while staff review related work."
        actions={<button type="button" className="ops-action-secondary min-h-11">Change vehicle</button>}
      />
      <SectionFrame title="Selected vehicle" copy="Customer-safe vehicle context for booking, insurance, and service history.">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile icon={ClipboardList} label="Vehicle" value="2019 Vios" sub="QAJ01001" />
          <SummaryTile icon={FileText} label="Latest service" value="Brake inspection" sub="Aug 4, 2026" />
          <SummaryTile icon={ShieldCheck} label="Insurance" value="Under review" sub="Documents requested" />
        </div>
      </SectionFrame>
    </div>
  ),
}

export const JobOrderQueue = {
  render: () => (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workshop operations"
        title="Job Orders"
        description="Resume assigned work or claim an eligible record from the bounded queue."
        meta={<><span className="badge badge-green">3 yours</span><span className="badge badge-gray">12 waiting</span></>}
      />
      <section className="overflow-hidden border border-surface-border bg-surface-card" aria-labelledby="job-order-queue-story-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div>
            <h2 id="job-order-queue-story-title" className="text-sm font-semibold">My Work</h2>
            <p className="mt-1 text-xs text-ink-muted">One row per job order. Details open in a preview before the workspace.</p>
          </div>
          <button type="button" className="ops-action-secondary min-h-11">Take next</button>
        </div>
        <StaffWorkQueueItem
          item={{ ...queueItem, claim: { isMine: true, ownerName: 'Queue Adviser' } }}
          view="mine"
          queueType="job_order"
          selectedEntityId={queueItem.entityId}
          hasCapacity
          onSelect={fn()}
          onClaim={fn()}
          onOpen={fn()}
          onRelease={fn()}
        />
        <StaffWorkQueueItem
          item={{ ...queueItem, entityId: 'job-order-fixture-2', jobOrderId: 'job-order-fixture-2', reference: 'JO-2026-000242', claim: null, priorityReason: 'Overdue scheduled date' }}
          view="team"
          queueType="job_order"
          selectedEntityId=""
          hasCapacity
          onSelect={fn()}
          onClaim={fn()}
          onOpen={fn()}
          onRelease={fn()}
        />
      </section>
    </div>
  ),
}

export const JobOrderControlDrawerPreview = {
  render: () => (
    <div className="min-h-[680px]">
      <PageHeader title="Focused Job Order workspace" description="The optional context drawer keeps the active work area visible." />
      <JobOrderControlDrawer
        open
        activeTab="overview"
        onTabChange={fn()}
        activeJobOrder={jobOrder}
        activeSourceCandidate={{ customerLabel: 'Queue Customer', vehicleLabel: '2019 Toyota Vios / QAJ01001' }}
        currentStage="progress"
        activeClaimId="claim-fixture-1"
        hasSavedAssignments
        nextAction={nextAction}
        steps={workflowSteps}
        onClose={fn()}
        onNavigateStage={fn()}
        onOpenQaAudit={fn()}
        onOpenMyWork={fn()}
        onOpenHistory={fn()}
      />
    </div>
  ),
}

export const QAReview = {
  render: () => (
    <div className="space-y-4">
      <ServiceLifecycleHeader
        currentStep="qa"
        reference="JO-2026-000241"
        customer="Queue Customer"
        vehicle="2019 Toyota Vios / QAJ01001"
        status="Pending review"
        owner="Queue Adviser"
        nextAction="Review findings and record one release verdict."
        actionLabel="Return to Job Order"
        actionHref="/admin/job-orders/job-order-fixture-1"
      />
      <SectionFrame title="QA findings" copy="Evidence and deterministic rules are visible before the reviewer acts." badge={<span className="badge badge-orange">Pending review</span>}>
        <div className="grid gap-3 md:grid-cols-2">
          <QualityFindingCard finding={{ gate: 'foundation', severity: 'warning', code: 'review_needed', message: 'A reviewer should confirm the saved progress note and evidence before release.', provenance: { evidenceSummary: 'Progress and required evidence are present.' } }} />
          <QualityFindingCard finding={{ gate: 'evidence', severity: 'info', code: 'evidence_complete', message: 'All required service evidence is attached.', provenance: null }} />
        </div>
      </SectionFrame>
    </div>
  ),
}

export const BillingWorkspace = {
  render: () => (
    <div className="space-y-4">
      <PageHeader eyebrow="Financial operations" title="Service invoices" description="Search by persisted business reference and verify payment state." />
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile icon={FileText} label="Invoice" value="INV-2026-00142" sub="Finalized service" />
        <SummaryTile icon={CheckCircle2} label="Payment" value="Pending" sub="No payment recorded" />
        <SummaryTile icon={ShieldCheck} label="Source" value="JO-2026-000241" sub="Customer-safe reference" />
      </div>
      <ServiceLifecycleHeader
        currentStep="payment"
        reference="JO-2026-000241"
        customer="Queue Customer"
        vehicle="2019 Toyota Vios / QAJ01001"
        status="Finalized"
        nextAction="Choose the payment method, then record the receipt."
      />
    </div>
  ),
}

export const InsuranceReview = {
  render: () => (
    <div className="space-y-4">
      <PageHeader eyebrow="Insurance assistance" title="Inquiry review" description="Keep internal review notes separate from customer-visible updates." meta={<span className="badge badge-orange">Needs documents</span>} />
      <SectionFrame title="INS-2026-000018" copy="2019 Toyota Vios / QAJ01001" badge={<span className="badge badge-blue">Customer update pending</span>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border border-surface-border bg-surface-raised p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Customer-visible update</p>
            <p className="mt-2 text-sm leading-6 text-ink-primary">Please upload the OR/CR scan so the adviser can continue the guided claim review.</p>
          </div>
          <div className="border border-surface-border bg-surface-raised p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Required action</p>
            <button type="button" className="ops-action-primary mt-3 min-h-11">Request documents</button>
          </div>
        </div>
      </SectionFrame>
    </div>
  ),
}

const selectorOptions = [
  { value: 'jo-241', label: 'JO-2026-000241', helper: 'Queue Customer / Toyota Vios' },
  { value: 'jo-242', label: 'JO-2026-000242', helper: 'Mina Santos / Honda City' },
  { value: 'jo-243', label: 'JO-2026-000243', helper: 'Rafael Cruz / Mitsubishi Mirage' },
]

function SearchableSelectorFixture() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const filtered = useMemo(
    () => selectorOptions.filter((item) => `${item.label} ${item.helper}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  return (
    <div className="space-y-4 border border-surface-border bg-surface-card p-4">
      <label className="block text-sm font-semibold" htmlFor="story-search-reference">Search reference, customer, or vehicle</label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted" aria-hidden="true" />
        <input id="story-search-reference" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Toyota or JO-2026" className="input min-h-11 w-full pl-9" />
      </div>
      <PortalSelect value={selected} onValueChange={setSelected} placeholder="Select a matching record" items={filtered} emptyOptionLabel="Clear selection" triggerClassName="min-h-11 w-full" />
      <p role="status" className="text-sm text-ink-secondary">{selected ? `Selected ${selectorOptions.find((item) => item.value === selected)?.label}` : `${filtered.length} matching records`}</p>
    </div>
  )
}

export const SearchableSelectors = {
  render: () => <SearchableSelectorFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('searchbox', { name: 'Search reference, customer, or vehicle' })
    await userEvent.type(input, 'Honda')
    await expect(canvas.getByRole('status')).toHaveTextContent('1 matching records')
  },
}

function StatePanel({ status, title, message, actionLabel }) {
  const tone = status === 'error' ? 'border-red-500/30 bg-red-500/10' : status === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-surface-border bg-surface-card'
  return (
    <div className={`border p-5 ${tone}`} role={status === 'error' ? 'alert' : 'status'}>
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{message}</p>
      {actionLabel ? <button type="button" className="ops-action-secondary mt-4 min-h-11">{actionLabel}</button> : null}
    </div>
  )
}

export const AsyncStates = {
  render: () => (
    <div className="space-y-3">
      <StatePanel status="loading" title="Loading queue" message="Retrieving one bounded page of records." />
      <StatePanel status="empty" title="No matching work" message="Try another filter or return to Team Queue." actionLabel="Clear filters" />
      <StatePanel status="error" title="Queue unavailable" message="The request failed. Refresh the queue and try again." actionLabel="Retry" />
      <StatePanel status="success" title="Work saved" message="The record moved to the next stage and the queue is refreshing." />
    </div>
  ),
}
