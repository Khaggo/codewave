import { CalendarClock, PlusCircle, RefreshCw } from 'lucide-react'
import PortalSelect from '@/components/ui/PortalSelect'
import { getVehicleReference } from '@/lib/businessReferenceDisplay.mjs'
import { FilterSelect, WorkspaceSignalCard } from './RenewalsPanels'

export function RenewalCreationPanel({
  customerOptions = [],
  createDraft,
  createMessage,
  createState,
  inquiryTypeOptions,
  staffOptions = [],
  onCreate,
  onDraftChange,
  submitDisabled,
}) {
  const creationReady =
    String(createDraft.userId ?? '').trim() &&
    String(createDraft.vehicleId ?? '').trim() &&
    String(createDraft.subject ?? '').trim() &&
    String(createDraft.renewalDueAt ?? '').trim()
  const selectedCustomer = customerOptions.find((customer) => customer.id === createDraft.userId) ?? null
  const vehicleOptions = selectedCustomer?.vehicles ?? []

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Manual Renewal Follow-Up</p>
          <p className="mt-1 text-xs text-ink-muted">Create a staff-owned renewal case.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-green">Manual follow-up route</span>
          <span className="badge badge-gray">Creates purpose `renewal`</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <WorkspaceSignalCard
          eyebrow="Creation readiness"
          title={creationReady ? 'Ready for a staff-owned follow-up' : 'Needs the core renewal identifiers first'}
          detail={
            creationReady
              ? 'This draft has the minimum queue anchors to create a renewal and send it straight into staff follow-up.'
              : 'User, vehicle, subject, and a renewal due date give the queue enough structure to stay useful after creation.'
          }
          tone={creationReady ? 'positive' : 'warning'}
        />
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">Quick state</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`badge ${creationReady ? 'badge-green' : 'badge-gray'}`}>
              {creationReady ? 'Ready' : 'Needs basics'}
            </span>
            <span className="badge badge-gray">Creates renewal purpose</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="label">
          Customer
          <PortalSelect
            value={createDraft.userId}
            onValueChange={(value) => {
              onDraftChange('userId', value)
              onDraftChange('vehicleId', '')
            }}
            items={customerOptions.map((customer) => ({
              value: customer.id,
              label: customer.displayName || customer.email || 'Customer unavailable',
              helper: customer.email || `${customer.vehicleCount ?? customer.vehicles?.length ?? 0} vehicle(s)`,
            }))}
            placeholder="Choose customer"
            emptyOptionLabel="Choose customer"
          />
        </label>

        <label className="label">
          Vehicle
          <PortalSelect
            value={createDraft.vehicleId}
            onValueChange={(value) => onDraftChange('vehicleId', value)}
            items={vehicleOptions.map((vehicle) => ({
              value: vehicle.id,
              label: vehicle.plateNumber || getVehicleReference(vehicle),
              helper: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle details unavailable',
            }))}
            placeholder={selectedCustomer ? 'Choose vehicle' : 'Choose a customer first'}
            emptyOptionLabel={selectedCustomer ? 'Choose vehicle' : 'Choose a customer first'}
            disabled={!selectedCustomer}
          />
        </label>

        <FilterSelect
          label="Inquiry Type"
          value={createDraft.inquiryType}
          onChange={(event) => onDraftChange('inquiryType', event.target.value)}
          options={inquiryTypeOptions}
        />

        <label className="label">
          Assigned Staff
          <PortalSelect
            value={createDraft.assignedStaffId}
            onValueChange={(value) => onDraftChange('assignedStaffId', value)}
            items={staffOptions.map((account) => ({
              value: account.id,
              label: account.displayName || account.email || account.staffCode || 'Staff member',
              helper: account.roleLabel || account.staffCode || 'Staff account',
            }))}
            placeholder="Choose staff owner"
            emptyOptionLabel="Unassigned"
          />
        </label>

        <label className="label md:col-span-2">
          Subject
          <input
            value={createDraft.subject}
            onChange={(event) => onDraftChange('subject', event.target.value)}
            className="input"
            placeholder="Renewal due next month"
          />
        </label>

        <label className="label md:col-span-2">
          Description
          <textarea
            value={createDraft.description}
            onChange={(event) => onDraftChange('description', event.target.value)}
            rows={4}
            className="input min-h-[120px] resize-y"
            placeholder="Capture why staff are creating this renewal follow-up and what the next outreach should cover."
          />
        </label>

        <label className="label">
          Renewal Due Date
          <input
            type="date"
            value={createDraft.renewalDueAt}
            onChange={(event) => onDraftChange('renewalDueAt', event.target.value)}
            className="input"
          />
        </label>

        <label className="label">
          Policy Expiry Date
          <input
            type="date"
            value={createDraft.policyExpiryAt}
            onChange={(event) => onDraftChange('policyExpiryAt', event.target.value)}
            className="input"
          />
        </label>

        <label className="label">
          Provider Name
          <input
            value={createDraft.providerName}
            onChange={(event) => onDraftChange('providerName', event.target.value)}
            className="input"
            placeholder="Insurer name"
          />
        </label>

        <label className="label">
          Policy Number
          <input
            value={createDraft.policyNumber}
            onChange={(event) => onDraftChange('policyNumber', event.target.value)}
            className="input"
            placeholder="Policy number"
          />
        </label>

        <label className="label md:col-span-2">
          Internal Notes
          <textarea
            value={createDraft.notes}
            onChange={(event) => onDraftChange('notes', event.target.value)}
            rows={3}
            className="input min-h-[100px] resize-y"
            placeholder="Optional context for the staff-created follow-up."
          />
        </label>
      </div>

      {createMessage ? (
        <div
          className={`mt-4 ${
            createState === 'created'
              ? 'status-message status-message-success'
              : createState === 'forbidden_role'
                ? 'status-message status-message-warning'
                : 'status-message status-message-danger'
          }`}
        >
          {createMessage}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onCreate} disabled={submitDisabled} className="btn-primary">
          {createState === 'submitting' ? <RefreshCw size={14} className="animate-spin" /> : <PlusCircle size={14} />}
          Create Renewal Follow-Up
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-[11px] text-ink-muted">
          <CalendarClock size={14} />
          Returns to the queue after save.
        </div>
      </div>
    </div>
  )
}
