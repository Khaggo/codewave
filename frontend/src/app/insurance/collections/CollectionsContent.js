'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileBadge2,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { ApiError } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'
import {
  getInsuranceInquiryById,
  listInsuranceInquiries,
  updateInsuranceInquiryWorkflow,
} from '@/lib/insuranceStaffClient'
import {
  getAllowedInsuranceStatusTargets,
  insuranceReviewStaffRoles,
} from '@/lib/api/generated/insurance/staff-web-insurance'
import {
  buildCollectionsTableRow,
  buildCollectionsUpdateDraft,
  formatStatusLabel,
  getCollectionsActionState,
  getCollectionsSummaryCards,
} from './insuranceCollectionsView.mjs'

const PAYMENT_STATUS_OPTIONS = ['unpaid', 'proof_submitted', 'verifying', 'paid', 'overdue']
const HAS_PROOF_OPTIONS = [
  { value: 'all', label: 'All cases' },
  { value: 'with_proof', label: 'With proof' },
  { value: 'without_proof', label: 'Without proof' },
]

const POSITIVE_BADGE_VALUES = new Set(['active', 'paid'])
const WARNING_BADGE_VALUES = new Set([
  'payment_pending',
  'proof_submitted',
  'unpaid',
  'overdue',
  'for_renewal',
])
const INFO_BADGE_VALUES = new Set(['verifying'])
const TERMINAL_INQUIRY_STATUSES = new Set(['closed', 'cancelled', 'rejected'])

const DEFAULT_COLLECTIONS_FILTERS = {
  paymentStatus: 'all',
  overdueOnly: false,
  hasProof: 'all',
  search: '',
}

const DEFAULT_UPDATE_DRAFT = {
  status: 'payment_pending',
  paymentStatus: 'unpaid',
  paymentDueAt: '',
  reviewNotes: '',
}

const SUMMARY_CARD_ICONS = {
  Unpaid: Wallet,
  'Proof Submitted': FileBadge2,
  Verifying: ClipboardCheck,
  Overdue: AlertTriangle,
  'Paid This Week': CheckCircle2,
}

const normalizeFilterValue = (value) => (value && value !== 'all' ? value : undefined)

const getBadgeClassName = (value) => {
  if (POSITIVE_BADGE_VALUES.has(value)) return 'badge-green'
  if (WARNING_BADGE_VALUES.has(value)) return 'badge-orange'
  if (INFO_BADGE_VALUES.has(value)) return 'badge-blue'
  return 'badge-gray'
}

const formatDateTime = (value) => {
  if (!value) return 'Not available'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateOnly = (value) => {
  if (!value) return 'Not set'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not set'
  }

  return parsedDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="mt-1 text-2xl font-black text-ink-primary">{value}</p>
          {sub ? <p className="mt-1 text-[11px] text-ink-muted">{sub}</p> : null}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function BlockingState({ title, copy }) {
  return (
    <div className="empty-panel px-5 py-10 text-center">
      <ShieldAlert size={34} className="mx-auto mb-3" style={{ color: '#f07c00' }} />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

function EmptyPanel({ title, copy }) {
  return (
    <div className="empty-panel px-4 py-10 text-center">
      <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mt-2 text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

function WorkflowBadge({ value, children }) {
  return <span className={`badge ${getBadgeClassName(value)}`}>{children ?? formatStatusLabel(value)}</span>
}

function DetailField({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className={`mt-1 text-sm whitespace-pre-wrap ${accent ? 'font-semibold text-[#a65600]' : 'text-ink-primary'}`}>
        {value || 'Not set'}
      </p>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="label">
      {label}
      <select value={value} onChange={onChange} className="select">
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? formatStatusLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function CollectionsContent() {
  const user = useUser()
  const role = user?.role ?? null
  const canReviewInsurance = insuranceReviewStaffRoles.includes(role)
  const [filters, setFilters] = useState(DEFAULT_COLLECTIONS_FILTERS)
  const [inquiries, setInquiries] = useState([])
  const [selectedInquiryId, setSelectedInquiryId] = useState('')
  const [listState, setListState] = useState('idle')
  const [listMessage, setListMessage] = useState('')
  const [detailState, setDetailState] = useState('idle')
  const [detailMessage, setDetailMessage] = useState('')
  const [updateState, setUpdateState] = useState('status_update_ready')
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateDraft, setUpdateDraft] = useState(DEFAULT_UPDATE_DRAFT)
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
          paymentStatus: normalizeFilterValue(filters.paymentStatus),
        })

        if (ignore) return

        setInquiries(records)
        setListState('loaded')
      } catch (error) {
        if (ignore) return

        setListState('load_failed')
        setListMessage(error?.message || 'Collections cases could not be loaded.')
      }
    }

    void loadInquiries()

    return () => {
      ignore = true
    }
  }, [canReviewInsurance, filters.paymentStatus, reloadTick, user?.accessToken])

  const collectionItems = useMemo(() => {
    const now = new Date().toISOString()

    return inquiries.map((inquiry) => ({
      inquiry,
      row: buildCollectionsTableRow(inquiry, { now }),
      actionState: getCollectionsActionState(inquiry, { now }),
    }))
  }, [inquiries])

  const filteredItems = useMemo(() => {
    const searchNeedle = filters.search.trim().toLowerCase()

    return collectionItems.filter(({ inquiry, row }) => {
      if (filters.overdueOnly && row.daysOverdue < 1) {
        return false
      }

      if (filters.hasProof === 'with_proof' && !row.hasProofOfPayment) {
        return false
      }

      if (filters.hasProof === 'without_proof' && row.hasProofOfPayment) {
        return false
      }

      if (!searchNeedle) {
        return true
      }

      return [
        inquiry.id,
        inquiry.customerDisplayName,
        inquiry.vehicleLabel,
        inquiry.subject,
        inquiry.policyNumber,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchNeedle))
    })
  }, [collectionItems, filters.hasProof, filters.overdueOnly, filters.search])

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
  const selectedActionState = selectedItem?.actionState ?? {
    canSendPaymentReminder: false,
    canReviewProofOfPayment: false,
    canMarkAsPaid: false,
  }
  const isTerminalInquiry = TERMINAL_INQUIRY_STATUSES.has(selectedInquiry?.status)

  useEffect(() => {
    if (!selectedInquiry) {
      previousSelectedInquiryIdRef.current = ''
      setUpdateDraft(DEFAULT_UPDATE_DRAFT)
      setDetailState('idle')
      setDetailMessage('')
      setUpdateState('status_update_ready')
      setUpdateMessage('')
      return
    }

    if (previousSelectedInquiryIdRef.current !== selectedInquiry.id) {
      setUpdateDraft(buildCollectionsUpdateDraft(selectedInquiry))
      setDetailState('detail_loaded')
      setDetailMessage('')
      setUpdateState('status_update_ready')
      setUpdateMessage('')
    }

    previousSelectedInquiryIdRef.current = selectedInquiry.id
  }, [selectedInquiry])

  const summaryCards = useMemo(
    () => getCollectionsSummaryCards({ inquiries }),
    [inquiries],
  )

  const nextStatuses = useMemo(() => {
    const currentStatus = selectedInquiry?.status ?? DEFAULT_UPDATE_DRAFT.status
    return Array.from(new Set([currentStatus, ...getAllowedInsuranceStatusTargets(currentStatus)]))
  }, [selectedInquiry?.status])

  const proofDocuments = useMemo(
    () => (selectedInquiry?.documents ?? []).filter((document) => document?.documentType === 'proof_of_payment'),
    [selectedInquiry?.documents],
  )

  const applyInquiryUpdate = (updatedInquiry, successMessage) => {
    setInquiries((currentInquiries) =>
      currentInquiries.map((inquiry) => (inquiry.id === updatedInquiry.id ? updatedInquiry : inquiry)),
    )
    setUpdateDraft(buildCollectionsUpdateDraft(updatedInquiry))
    setUpdateState('status_update_saved')
    setUpdateMessage(successMessage)
    setDetailState('detail_loaded')
    setDetailMessage('Collections detail refreshed with the latest workflow update.')
  }

  const submitWorkflowUpdate = async (draftOverrides = {}, successMessage) => {
    if (!selectedInquiry?.id) {
      setUpdateState('inquiry_not_found')
      setUpdateMessage('Select a live collections case before saving workflow changes.')
      return
    }

    if (!user?.accessToken) {
      setUpdateState('update_failed')
      setUpdateMessage('A valid staff session is required before saving workflow changes.')
      return
    }

    const requestInquiryId = selectedInquiry.id
    const nextDraft = { ...updateDraft, ...draftOverrides }

    setUpdateDraft(nextDraft)
    setUpdateState('status_update_submitting')
    setUpdateMessage('')

    try {
      const updatedInquiry = await updateInsuranceInquiryWorkflow({
        inquiryId: requestInquiryId,
        status: nextDraft.status,
        paymentStatus: nextDraft.paymentStatus,
        paymentDueAt: nextDraft.paymentDueAt,
        reviewNotes: nextDraft.reviewNotes,
        accessToken: user.accessToken,
      })

      if (selectedInquiryIdRef.current !== requestInquiryId) {
        return
      }

      applyInquiryUpdate(
        updatedInquiry,
        successMessage ??
          `Collections workflow updated to ${formatStatusLabel(updatedInquiry.paymentStatus)}.`,
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

      setUpdateMessage(error?.message || 'Collections workflow could not be updated.')
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

      setInquiries((currentInquiries) =>
        currentInquiries.map((inquiry) => (inquiry.id === liveInquiry.id ? liveInquiry : inquiry)),
      )

      if (selectedInquiryIdRef.current === requestInquiryId) {
        setDetailState('detail_loaded')
        setDetailMessage('Live collections detail refreshed from the backend.')
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

      setDetailMessage(error?.message || 'Collections detail could not be refreshed.')
    }
  }

  const handleFilterChange = (field) => (event) => {
    const nextValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setFilters((current) => ({
      ...current,
      [field]: nextValue,
    }))
  }

  if (!canReviewInsurance) {
    return (
      <div className="space-y-5">
        <BlockingState
          title="Insurance collections is adviser/admin only"
          copy="This workspace is reserved for service advisers and super admins, with direct navigation blocked for other roles."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Insurance Collections Workspace"
        title="Payment Follow-Up And Verification"
        description="This collections route stays focused on payment operations: triage unpaid cases, review proof, update due dates, and move inquiries forward with the broad workflow route."
        meta={
          <>
            <span className="badge badge-orange">Collections focused</span>
            <span className="badge badge-green">Workflow route ready</span>
            <span className="badge badge-gray">Phase-1 page untouched</span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = SUMMARY_CARD_ICONS[card.label] ?? Wallet
          return <SummaryTile key={card.label} icon={Icon} {...card} />
        })}
      </div>

      <div className="card p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="card-title">Collections Filters</p>
            <p className="mt-1 text-xs text-ink-muted">
              Payment status uses the live list route, while overdue and proof filters narrow the loaded workspace locally.
            </p>
          </div>
          <button onClick={() => setReloadTick((current) => current + 1)} className="btn-secondary">
            <RefreshCw size={14} />
            Refresh Queue
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="label xl:col-span-1">
            Search
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input
                value={filters.search}
                onChange={handleFilterChange('search')}
                className="input pl-9"
                placeholder="Customer, vehicle, policy, or case id"
              />
            </div>
          </label>

          <FilterSelect
            label="Payment Status"
            value={filters.paymentStatus}
            onChange={handleFilterChange('paymentStatus')}
            options={[{ value: 'all', label: 'All statuses' }, ...PAYMENT_STATUS_OPTIONS]}
          />

          <FilterSelect
            label="Proof Filter"
            value={filters.hasProof}
            onChange={handleFilterChange('hasProof')}
            options={HAS_PROOF_OPTIONS}
          />

          <label className="label">
            Overdue Only
            <span className="mt-3 flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary">
              <input
                type="checkbox"
                checked={filters.overdueOnly}
                onChange={handleFilterChange('overdueOnly')}
                className="h-4 w-4"
              />
              Show only cases already past due
            </span>
          </label>
        </div>

        {listMessage ? <div className="status-message status-message-danger mt-4">{listMessage}</div> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="table-surface">
          <div className="flex flex-col gap-2 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="card-title">Collections Queue</p>
              <p className="mt-1 text-xs text-ink-muted">
                The table keeps payment visibility front and center so advisers can sort through collections work fast.
              </p>
            </div>
            <span className={`badge ${filteredItems.length ? 'badge-orange' : 'badge-gray'}`}>
              {filteredItems.length} visible case{filteredItems.length === 1 ? '' : 's'}
            </span>
          </div>

          {listState === 'loading' ? (
            <div className="px-4 py-8 text-sm text-ink-muted">Loading live collections cases...</div>
          ) : filteredItems.length ? (
            <div className="table-scroll">
              <table className="data-table min-w-[1020px]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Proof</th>
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
                          <WorkflowBadge value={inquiry.paymentStatus}>{row.paymentStatus}</WorkflowBadge>
                        </td>
                        <td>{formatDateOnly(row.paymentDueAt)}</td>
                        <td>
                          {row.daysOverdue > 0 ? (
                            <span className="badge badge-orange">{row.daysOverdue} day{row.daysOverdue === 1 ? '' : 's'}</span>
                          ) : (
                            <span className="badge badge-gray">On time</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${row.hasProofOfPayment ? 'badge-green' : 'badge-gray'}`}>
                            {row.hasProofOfPayment ? 'Received' : 'Missing'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              title="No collections cases match the current filters"
              copy="Broaden the payment filters or search to bring more cases back into the workspace."
            />
          )}
        </section>

        <div className="space-y-5">
          <div className="card p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="card-title">Case Detail</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Payment due dates, proof uploads, and activity history stay together here so collections review stays focused.
                </p>
              </div>
              <button
                onClick={handleRefreshDetail}
                disabled={!selectedInquiry || detailState === 'loading'}
                className="btn-secondary"
              >
                {detailState === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh Detail
              </button>
            </div>

            {detailMessage ? (
              <div
                className={`mt-4 ${
                  detailState === 'detail_loaded'
                    ? 'status-message status-message-success'
                    : detailState === 'forbidden_role'
                      ? 'status-message status-message-warning'
                      : 'status-message status-message-danger'
                }`}
              >
                {detailMessage}
              </div>
            ) : null}

            {selectedInquiry && selectedRow ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <WorkflowBadge value={selectedInquiry.paymentStatus} />
                  <WorkflowBadge value={selectedInquiry.status} />
                  <span className={`badge ${selectedRow.hasProofOfPayment ? 'badge-green' : 'badge-gray'}`}>
                    {selectedRow.hasProofOfPayment ? 'Proof on file' : 'No proof yet'}
                  </span>
                  {selectedRow.daysOverdue > 0 ? (
                    <span className="badge badge-orange">{selectedRow.daysOverdue} days overdue</span>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <DetailField label="Customer" value={selectedInquiry.customerDisplayName} />
                  <DetailField label="Vehicle" value={selectedInquiry.vehicleLabel} />
                  <DetailField label="Subject" value={selectedInquiry.subject || selectedInquiry.id} />
                  <DetailField label="Policy Number" value={selectedInquiry.policyNumber} />
                  <DetailField label="Payment Due" value={formatDateOnly(selectedInquiry.paymentDueAt)} />
                  <DetailField
                    label="Days Overdue"
                    value={selectedRow.daysOverdue > 0 ? String(selectedRow.daysOverdue) : '0'}
                    accent={selectedRow.daysOverdue > 0}
                  />
                  <DetailField label="Last Updated" value={formatDateTime(selectedInquiry.updatedAt)} />
                  <DetailField label="Created" value={formatDateTime(selectedInquiry.createdAt)} />
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileBadge2 size={16} className="text-ink-dim" />
                    <p className="text-sm font-semibold text-ink-primary">Proof Of Payment</p>
                  </div>
                  {proofDocuments.length ? (
                    <div className="mt-3 space-y-3">
                      {proofDocuments.map((document) => (
                        <div key={document.id ?? `${document.fileName}-${document.fileUrl}`} className="rounded-xl border border-surface-border bg-surface-card px-3 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-ink-primary">{document.fileName}</p>
                              <p className="mt-1 break-all text-xs text-ink-muted">{document.fileUrl}</p>
                            </div>
                            <span className="badge badge-green">{document.documentTypeLabel || 'Proof Of Payment'}</span>
                          </div>
                          {document.notes ? <p className="mt-2 text-xs leading-5 text-ink-secondary">{document.notes}</p> : null}
                          <p className="mt-2 text-[11px] text-ink-muted">Uploaded {formatDateTime(document.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-muted">No proof-of-payment document has been attached to this case yet.</p>
                  )}
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-ink-dim" />
                    <p className="text-sm font-semibold text-ink-primary">Collections Activity</p>
                  </div>
                  {selectedInquiry.activities?.length ? (
                    <div className="mt-3 space-y-3">
                      {selectedInquiry.activities.map((activityItem) => (
                        <div
                          key={activityItem.id ?? `${activityItem.action}-${activityItem.createdAt}`}
                          className="rounded-xl border border-surface-border bg-surface-card px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink-primary">
                              {formatStatusLabel(activityItem.action)}
                            </p>
                            <p className="text-[11px] text-ink-muted">{formatDateTime(activityItem.createdAt)}</p>
                          </div>
                          <p className="mt-2 text-xs text-ink-muted">
                            Actor: {activityItem.actorUserId || 'System'}
                          </p>
                          {activityItem.notes ? (
                            <p className="mt-2 text-sm text-ink-secondary">{activityItem.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-muted">No collections activity has been recorded for this case yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <EmptyPanel
                title="No case selected"
                copy="Choose a collections case from the table to inspect its payment detail and workflow history."
              />
            )}
          </div>

          <div className="card p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="card-title">Workflow Update</p>
                <p className="mt-1 text-xs text-ink-muted">
                  This panel only edits collections metadata and saves through the broad workflow route.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`badge ${isTerminalInquiry ? 'badge-gray' : 'badge-green'}`}>
                  {isTerminalInquiry ? 'Read only' : 'Collections editable'}
                </span>
                <span className="badge badge-gray">Workflow route only</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="label">
                Inquiry Status
                <select
                  value={updateDraft.status}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, status: event.target.value }))
                  }
                  className="select"
                  disabled={!selectedInquiry || isTerminalInquiry}
                >
                  {nextStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Payment Status
                <select
                  value={updateDraft.paymentStatus}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, paymentStatus: event.target.value }))
                  }
                  className="select"
                  disabled={!selectedInquiry || isTerminalInquiry}
                >
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Payment Due Date
                <input
                  type="date"
                  value={updateDraft.paymentDueAt}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, paymentDueAt: event.target.value }))
                  }
                  className="input"
                  disabled={!selectedInquiry || isTerminalInquiry}
                />
              </label>

              <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Action State</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`badge ${selectedActionState.canSendPaymentReminder ? 'badge-orange' : 'badge-gray'}`}>
                    {selectedActionState.canSendPaymentReminder ? 'Payment follow-up due' : 'No reminder flag'}
                  </span>
                  <span className={`badge ${selectedActionState.canReviewProofOfPayment ? 'badge-blue' : 'badge-gray'}`}>
                    {selectedActionState.canReviewProofOfPayment ? 'Proof ready for review' : 'No proof review'}
                  </span>
                  <span className={`badge ${selectedActionState.canMarkAsPaid ? 'badge-green' : 'badge-gray'}`}>
                    {selectedActionState.canMarkAsPaid ? 'Ready to mark paid' : 'Paid action locked'}
                  </span>
                </div>
              </div>

              <label className="label md:col-span-2">
                Review Notes
                <textarea
                  value={updateDraft.reviewNotes}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, reviewNotes: event.target.value }))
                  }
                  rows={4}
                  className="input min-h-[120px] resize-y"
                  placeholder="Capture collections notes, verification context, or next follow-up steps."
                  disabled={!selectedInquiry || isTerminalInquiry}
                />
              </label>
            </div>

            {updateMessage ? (
              <div
                className={`mt-4 ${
                  updateState === 'status_update_saved'
                    ? 'status-message status-message-success'
                    : updateState === 'forbidden_role'
                      ? 'status-message status-message-warning'
                      : 'status-message status-message-danger'
                }`}
              >
                {updateMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => submitWorkflowUpdate()}
                disabled={!selectedInquiry || isTerminalInquiry || updateState === 'status_update_submitting'}
                className="btn-primary"
              >
                {updateState === 'status_update_submitting' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Wallet size={14} />
                )}
                Save Collections Update
              </button>

              <button
                onClick={() =>
                  submitWorkflowUpdate(
                    {
                      paymentStatus: 'overdue',
                      status: 'payment_pending',
                    },
                    'Collections workflow updated and the case is now flagged as overdue.',
                  )
                }
                disabled={!selectedInquiry || isTerminalInquiry || !selectedActionState.canSendPaymentReminder || updateState === 'status_update_submitting'}
                className="btn-secondary"
              >
                <AlertTriangle size={14} />
                Flag Overdue
              </button>

              <button
                onClick={() =>
                  submitWorkflowUpdate(
                    {
                      paymentStatus: 'verifying',
                      status: 'payment_pending',
                    },
                    'Collections workflow updated and proof review is now in progress.',
                  )
                }
                disabled={!selectedInquiry || isTerminalInquiry || !selectedActionState.canReviewProofOfPayment || updateState === 'status_update_submitting'}
                className="btn-secondary"
              >
                <ClipboardCheck size={14} />
                Start Verifying
              </button>

              <button
                onClick={() =>
                  submitWorkflowUpdate(
                    {
                      status: 'active',
                      paymentStatus: 'paid',
                    },
                    'Collections workflow updated and the case is now marked paid.',
                  )
                }
                disabled={!selectedInquiry || isTerminalInquiry || !selectedActionState.canMarkAsPaid || updateState === 'status_update_submitting'}
                className="btn-secondary"
              >
                <CheckCircle2 size={14} />
                Mark Paid
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-muted">
              <span className="badge badge-gray">Due date keeps `YYYY-MM-DD` form for the workflow route</span>
              <span className="badge badge-gray">Quick actions only update collections fields</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
