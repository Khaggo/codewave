'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, CalendarClock } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { ApiError } from '@/lib/authClient'
import {
  createInsuranceRenewalFollowUp,
  getInsuranceInquiryById,
  listInsuranceInquiries,
  updateInsuranceInquiryWorkflow,
} from '@/lib/insuranceStaffClient'
import { useUser } from '@/lib/userContext'
import {
  getAllowedInsuranceStatusTargets,
  insuranceReviewStaffRoles,
} from '@/lib/api/generated/insurance/staff-web-insurance'
import {
  ACTIVE_RENEWAL_WORKSPACE_STATUSES,
  buildRenewalUpdateDraft,
  buildRenewalsTableRow,
  getRenewalsSummaryCards,
  isRenewalWorkspaceInquiry,
  mergeRenewalInquiryUpdate,
  shouldApplyRenewalAsyncResult,
} from './insuranceRenewalsView.mjs'
import { formatStatusLabel } from '../insuranceView.mjs'
import {
  BlockingState,
  EmptyPanel,
  FilterSelect,
  RenewalCreationPanel,
  RenewalsDetailPanel,
  RenewalsWorkflowPanel,
  SummaryTile,
  WorkflowBadge,
  formatDateOnly,
} from './RenewalsPanels'

const RENEWAL_STATUS_OPTIONS = ACTIVE_RENEWAL_WORKSPACE_STATUSES

const TIME_WINDOW_OPTIONS = [
  { value: 'all', label: 'All windows' },
  { value: 'Due in 30 Days', label: 'Due In 30 Days' },
  { value: 'Due in 15 Days', label: 'Due In 15 Days' },
  { value: 'Due in 7 Days', label: 'Due In 7 Days' },
  { value: 'Overdue', label: 'Overdue' },
]

const INQUIRY_TYPE_OPTIONS = ['comprehensive', 'ctpl']
const TERMINAL_INQUIRY_STATUSES = new Set(['closed', 'cancelled', 'rejected'])

const DEFAULT_FILTERS = {
  timeWindow: 'all',
  renewalStatus: 'all',
  manualOnly: false,
  search: '',
}

const DEFAULT_CREATE_DRAFT = {
  userId: '',
  vehicleId: '',
  inquiryType: 'comprehensive',
  subject: '',
  description: '',
  renewalDueAt: '',
  policyExpiryAt: '',
  providerName: '',
  policyNumber: '',
  assignedStaffId: '',
  notes: '',
}

const SUMMARY_CARD_ICONS = {
  'Due in 30 Days': CalendarClock,
  'Due in 15 Days': Activity,
  'Due in 7 Days': CalendarClock,
  Overdue: AlertTriangle,
  'Awaiting Customer': Activity,
}

const normalizeFilterValue = (value) => (value && value !== 'all' ? value : undefined)

export default function RenewalsContent() {
  const user = useUser()
  const role = user?.role ?? null
  const canReviewInsurance = insuranceReviewStaffRoles.includes(role)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [inquiries, setInquiries] = useState([])
  const [selectedInquiryId, setSelectedInquiryId] = useState('')
  const [listState, setListState] = useState('idle')
  const [listMessage, setListMessage] = useState('')
  const [detailState, setDetailState] = useState('idle')
  const [detailMessage, setDetailMessage] = useState('')
  const [updateState, setUpdateState] = useState('status_update_ready')
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateDraft, setUpdateDraft] = useState(buildRenewalUpdateDraft())
  const [createState, setCreateState] = useState('idle')
  const [createMessage, setCreateMessage] = useState('')
  const [createDraft, setCreateDraft] = useState(DEFAULT_CREATE_DRAFT)
  const [reloadTick, setReloadTick] = useState(0)
  const selectedInquiryIdRef = useRef('')
  const previousSelectedInquiryIdRef = useRef('')

  selectedInquiryIdRef.current = selectedInquiryId

  useEffect(() => {
    if (!user?.accessToken || !canReviewInsurance) {
      setInquiries([])
      setListState('idle')
      return
    }

    let ignore = false

    const loadInquiries = async () => {
      setListState('loading')
      setListMessage('')

      try {
        const records = await listInsuranceInquiries({
          accessToken: user.accessToken,
          renewalStatus: normalizeFilterValue(filters.renewalStatus),
        })

        if (ignore) return

        setInquiries(records)
        setListState('loaded')
      } catch (error) {
        if (ignore) return

        setListState('load_failed')
        setListMessage(error?.message || 'Renewal cases could not be loaded.')
      }
    }

    void loadInquiries()

    return () => {
      ignore = true
    }
  }, [canReviewInsurance, filters.renewalStatus, reloadTick, user?.accessToken])

  const renewalQueue = useMemo(
    () => inquiries.filter((inquiry) => isRenewalWorkspaceInquiry(inquiry)),
    [inquiries],
  )

  const renewalItems = useMemo(() => {
    const now = new Date().toISOString()

    return renewalQueue.map((inquiry) => ({
      inquiry,
      row: buildRenewalsTableRow(inquiry, { now }),
    }))
  }, [renewalQueue])

  const filteredItems = useMemo(() => {
    const searchNeedle = filters.search.trim().toLowerCase()

    return renewalItems.filter(({ inquiry, row }) => {
      if (filters.renewalStatus !== 'all' && inquiry?.renewalStatus !== filters.renewalStatus) {
        return false
      }

      if (filters.timeWindow !== 'all' && row.timeWindow !== filters.timeWindow) {
        return false
      }

      if (filters.manualOnly && inquiry?.purpose !== 'renewal') {
        return false
      }

      if (!searchNeedle) {
        return true
      }

      return [
        inquiry?.id,
        inquiry?.customerDisplayName,
        inquiry?.vehicleLabel,
        inquiry?.subject,
        inquiry?.policyNumber,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchNeedle))
    })
  }, [filters, renewalItems])

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedInquiryId('')
      return
    }

    if (!filteredItems.some(({ inquiry }) => inquiry.id === selectedInquiryId)) {
      setSelectedInquiryId(filteredItems[0].inquiry.id)
    }
  }, [filteredItems, selectedInquiryId])

  const selectedItem = useMemo(
    () => filteredItems.find(({ inquiry }) => inquiry.id === selectedInquiryId) ?? null,
    [filteredItems, selectedInquiryId],
  )

  const selectedInquiry = selectedItem?.inquiry ?? null
  const selectedRow = selectedItem?.row ?? null
  const isTerminalInquiry = TERMINAL_INQUIRY_STATUSES.has(selectedInquiry?.status)

  useEffect(() => {
    if (!selectedInquiry) {
      previousSelectedInquiryIdRef.current = ''
      setUpdateDraft(buildRenewalUpdateDraft())
      setDetailState('idle')
      setDetailMessage('')
      setUpdateState('status_update_ready')
      setUpdateMessage('')
      return
    }

    if (previousSelectedInquiryIdRef.current !== selectedInquiry.id) {
      setUpdateDraft(buildRenewalUpdateDraft(selectedInquiry))
      setDetailState('detail_loaded')
      setDetailMessage('')
      setUpdateState('status_update_ready')
      setUpdateMessage('')
    }

    previousSelectedInquiryIdRef.current = selectedInquiry.id
  }, [selectedInquiry])

  const summaryCards = useMemo(
    () => getRenewalsSummaryCards({ inquiries: renewalQueue, now: new Date().toISOString() }),
    [renewalQueue],
  )

  const nextStatuses = useMemo(() => {
    const currentStatus = selectedInquiry?.status ?? 'for_renewal'
    return Array.from(new Set([currentStatus, ...getAllowedInsuranceStatusTargets(currentStatus)]))
  }, [selectedInquiry?.status])

  const applyInquiryUpdate = (updatedInquiry, successMessage) => {
    setUpdateDraft(buildRenewalUpdateDraft(updatedInquiry))
    setUpdateState('status_update_saved')
    setUpdateMessage(successMessage)
    setDetailState('detail_loaded')
    setDetailMessage('Renewal detail refreshed with the latest workflow update.')
  }

  const submitWorkflowUpdate = async () => {
    if (!selectedInquiry?.id) {
      setUpdateState('inquiry_not_found')
      setUpdateMessage('Select a live renewal case before saving workflow changes.')
      return
    }

    if (!user?.accessToken) {
      setUpdateState('update_failed')
      setUpdateMessage('A valid staff session is required before saving workflow changes.')
      return
    }

    const requestInquiryId = selectedInquiry.id

    setUpdateState('status_update_submitting')
    setUpdateMessage('')

    try {
      const updatedInquiry = await updateInsuranceInquiryWorkflow({
        inquiryId: requestInquiryId,
        status: updateDraft.status,
        renewalStatus: updateDraft.renewalStatus,
        policyExpiryAt: updateDraft.policyExpiryAt,
        renewalDueAt: updateDraft.renewalDueAt,
        assignedStaffId: updateDraft.assignedStaffId,
        reviewNotes: updateDraft.reviewNotes,
        accessToken: user.accessToken,
      })

      setInquiries((currentInquiries) => mergeRenewalInquiryUpdate(currentInquiries, updatedInquiry))

      if (
        !shouldApplyRenewalAsyncResult({
          requestInquiryId,
          selectedInquiryId: selectedInquiryIdRef.current,
        })
      ) {
        return
      }

      applyInquiryUpdate(
        updatedInquiry,
        `Renewal workflow updated to ${formatStatusLabel(updatedInquiry.renewalStatus)}.`,
      )
    } catch (error) {
      if (selectedInquiryIdRef.current !== requestInquiryId) {
        return
      }

      if (error instanceof ApiError && error.status === 404) {
        setUpdateState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setUpdateState('forbidden_role')
      } else if (error instanceof ApiError && error.status === 409) {
        setUpdateState('invalid_transition')
      } else {
        setUpdateState('update_failed')
      }

      setUpdateMessage(error?.message || 'Renewal workflow could not be updated.')
    }
  }

  const handleRefreshDetail = async () => {
    if (!selectedInquiry?.id || !user?.accessToken) {
      return
    }

    const requestInquiryId = selectedInquiry.id

    setDetailState('loading')
    setDetailMessage('')

    try {
      const liveInquiry = await getInsuranceInquiryById({
        inquiryId: requestInquiryId,
        accessToken: user.accessToken,
      })

      setInquiries((currentInquiries) => mergeRenewalInquiryUpdate(currentInquiries, liveInquiry))

      if (selectedInquiryIdRef.current === requestInquiryId) {
        setDetailState('detail_loaded')
        setDetailMessage('Live renewal detail refreshed from the backend.')
      }
    } catch (error) {
      if (selectedInquiryIdRef.current !== requestInquiryId) {
        return
      }

      if (error instanceof ApiError && error.status === 404) {
        setDetailState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setDetailState('forbidden_role')
      } else {
        setDetailState('load_failed')
      }

      setDetailMessage(error?.message || 'Renewal detail could not be refreshed.')
    }
  }

  const handleCreateFollowUp = async () => {
    if (!user?.accessToken) {
      setCreateState('failed')
      setCreateMessage('A valid staff session is required before creating renewal follow-ups.')
      return
    }

    setCreateState('submitting')
    setCreateMessage('')

    try {
      const createdInquiry = await createInsuranceRenewalFollowUp({
        userId: createDraft.userId,
        vehicleId: createDraft.vehicleId,
        inquiryType: createDraft.inquiryType,
        subject: createDraft.subject,
        description: createDraft.description,
        renewalDueAt: createDraft.renewalDueAt,
        policyExpiryAt: createDraft.policyExpiryAt,
        providerName: createDraft.providerName,
        policyNumber: createDraft.policyNumber,
        assignedStaffId: createDraft.assignedStaffId,
        notes: createDraft.notes,
        accessToken: user.accessToken,
      })

      setInquiries((currentInquiries) => [
        createdInquiry,
        ...currentInquiries.filter((inquiry) => inquiry.id !== createdInquiry.id),
      ])
      setSelectedInquiryId(createdInquiry.id)
      setCreateDraft(DEFAULT_CREATE_DRAFT)
      setCreateState('created')
      setCreateMessage(`Renewal follow-up created for ${createdInquiry.customerDisplayName}.`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setCreateState('forbidden_role')
      } else {
        setCreateState('failed')
      }

      setCreateMessage(error?.message || 'Renewal follow-up could not be created.')
    }
  }

  const handleFilterChange = (field) => (event) => {
    const nextValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setFilters((current) => ({
      ...current,
      [field]: nextValue,
    }))
  }

  const handleUpdateDraftChange = (field, value) => {
    setUpdateDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleCreateDraftChange = (field, value) => {
    setCreateDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  if (!canReviewInsurance) {
    return (
      <div className="space-y-5">
        <BlockingState
          title="Insurance renewals is adviser/admin only"
          copy="This workspace is reserved for service advisers and super admins, with direct navigation blocked for other roles."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Insurance Renewals Workspace"
        title="Renewal Timing And Follow-Up Queue"
        description="This route stays focused on renewal operations: triage upcoming expiries, update renewal workflow metadata, and create manual follow-ups through the dedicated staff route."
        meta={
          <>
            <span className="badge badge-orange">Time-window triage</span>
            <span className="badge badge-green">Workflow route ready</span>
            <span className="badge badge-green">Manual follow-up ready</span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = SUMMARY_CARD_ICONS[card.label] ?? CalendarClock
          return <SummaryTile key={card.label} icon={Icon} {...card} />
        })}
      </div>

      <div className="card p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="card-title">Renewals Filters</p>
            <p className="mt-1 text-xs text-ink-muted">
              Renewal stage can hit the live list route, while timing, manual-only, and search filters narrow the loaded workspace locally.
            </p>
          </div>
          <button onClick={() => setReloadTick((current) => current + 1)} className="btn-secondary">
            <CalendarClock size={14} />
            Refresh Queue
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="label xl:col-span-1">
            Search
            <input
              value={filters.search}
              onChange={handleFilterChange('search')}
              className="input"
              placeholder="Customer, vehicle, policy, or case id"
            />
          </label>

          <FilterSelect
            label="Time Window"
            value={filters.timeWindow}
            onChange={handleFilterChange('timeWindow')}
            options={TIME_WINDOW_OPTIONS}
          />

          <FilterSelect
            label="Renewal Status"
            value={filters.renewalStatus}
            onChange={handleFilterChange('renewalStatus')}
            options={[{ value: 'all', label: 'All statuses' }, ...RENEWAL_STATUS_OPTIONS]}
          />

          <label className="label">
            Manual Only
            <span className="mt-3 flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary">
              <input
                type="checkbox"
                checked={filters.manualOnly}
                onChange={handleFilterChange('manualOnly')}
                className="h-4 w-4"
              />
              Show only staff-created renewal follow-up cases
            </span>
          </label>
        </div>

        {listMessage ? <div className="status-message status-message-danger mt-4">{listMessage}</div> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="table-surface">
          <div className="flex flex-col gap-2 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="card-title">Renewals Queue</p>
              <p className="mt-1 text-xs text-ink-muted">
                Timing stays visible in the table so staff can scan urgent renewals before they open the detail panel.
              </p>
            </div>
            <span className={`badge ${filteredItems.length ? 'badge-orange' : 'badge-gray'}`}>
              {filteredItems.length} visible renewal{filteredItems.length === 1 ? '' : 's'}
            </span>
          </div>

          {listState === 'loading' ? (
            <div className="px-4 py-8 text-sm text-ink-muted">Loading live renewal cases...</div>
          ) : filteredItems.length ? (
            <div className="table-scroll">
              <table className="data-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Renewal Stage</th>
                    <th>Renewal Due</th>
                    <th>Policy Expiry</th>
                    <th>Time Window</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(({ inquiry, row }) => {
                    const isSelected = inquiry.id === selectedInquiryId

                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedInquiryId(inquiry.id)}
                        className={isSelected ? 'bg-[#f07c00]/10' : undefined}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="space-y-1">
                            <p className="font-semibold text-ink-primary">{row.customer}</p>
                            <p className="text-xs text-ink-muted">{inquiry.subject || inquiry.id}</p>
                          </div>
                        </td>
                        <td>{row.vehicle}</td>
                        <td>
                          <WorkflowBadge value={inquiry.status}>{row.status}</WorkflowBadge>
                        </td>
                        <td>
                          <WorkflowBadge value={inquiry.renewalStatus}>{row.renewalStage}</WorkflowBadge>
                        </td>
                        <td>{formatDateOnly(row.renewalDueAt)}</td>
                        <td>{formatDateOnly(row.policyExpiryAt)}</td>
                        <td>
                          {row.timeWindow ? (
                            <span className={`badge ${row.timeWindow === 'Overdue' ? 'badge-orange' : 'badge-gray'}`}>
                              {row.timeWindow}
                            </span>
                          ) : (
                            <span className="badge badge-gray">No target date</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              title="No renewals match the current filters"
              copy="Broaden the renewal filters or clear manual-only mode to bring cases back into the workspace."
            />
          )}
        </section>

        <div className="space-y-5">
          <RenewalsDetailPanel
            detailMessage={detailMessage}
            detailState={detailState}
            onRefreshDetail={handleRefreshDetail}
            selectedInquiry={selectedInquiry}
            selectedRow={selectedRow}
          />

          <RenewalsWorkflowPanel
            isTerminalInquiry={isTerminalInquiry}
            nextStatuses={nextStatuses}
            onDraftChange={handleUpdateDraftChange}
            onSave={submitWorkflowUpdate}
            renewalStatusOptions={RENEWAL_STATUS_OPTIONS}
            selectedInquiry={selectedInquiry}
            selectedRow={selectedRow}
            submitDisabled={!selectedInquiry || isTerminalInquiry || updateState === 'status_update_submitting'}
            updateDraft={updateDraft}
            updateMessage={updateMessage}
            updateState={updateState}
          />

          <RenewalCreationPanel
            createDraft={createDraft}
            createMessage={createMessage}
            createState={createState}
            inquiryTypeOptions={INQUIRY_TYPE_OPTIONS}
            onCreate={handleCreateFollowUp}
            onDraftChange={handleCreateDraftChange}
            submitDisabled={createState === 'submitting'}
          />
        </div>
      </div>
    </div>
  )
}
