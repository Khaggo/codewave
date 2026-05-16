'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileBadge2,
  RefreshCw,
  Search,
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
  buildCollectionsFocusHighlights,
  buildCollectionsTableRow,
  buildCollectionsUpdateDraft,
  filterCollectionsItems,
  getCollectionsActionState,
  getCollectionsFilterSummary,
  getCollectionsSummaryCards,
} from './insuranceCollectionsView.mjs'
import { formatStatusLabel } from '../insuranceView.mjs'
import {
  BlockingState,
  CollectionsDetailPanel,
  CollectionsWorkflowPanel,
  EmptyPanel,
  FilterSelect,
  formatDateOnly,
  SummaryTile,
  WorkspaceFocusBanner,
  WorkspaceSignalCard,
  WorkflowBadge,
} from './CollectionsPanels'

const PAYMENT_STATUS_OPTIONS = ['unpaid', 'proof_submitted', 'verifying', 'paid', 'overdue']
const HAS_PROOF_OPTIONS = [
  { value: 'all', label: 'All cases' },
  { value: 'with_proof', label: 'With proof' },
  { value: 'without_proof', label: 'Without proof' },
]

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
    return filterCollectionsItems(collectionItems, { filters })
  }, [collectionItems, filters])

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

  const filterSummary = useMemo(
    () =>
      getCollectionsFilterSummary({
        filters,
        visibleCount: filteredItems.length,
        totalCount: collectionItems.length,
      }),
    [collectionItems.length, filteredItems.length, filters],
  )

  const focusHighlights = useMemo(
    () =>
      buildCollectionsFocusHighlights({
        filters,
        selectedInquiry,
        hasProofInView: filteredItems.some(({ row }) => row.hasProofOfPayment),
        visibleCount: filteredItems.length,
      }),
    [filters, filteredItems, selectedInquiry],
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

  const handleDraftChange = (field, value) => {
    setUpdateDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  if (!canReviewInsurance) {
    return (
      <div className="space-y-5">
        <BlockingState
          title="Insurance collections is adviser/admin only"
          copy="Only service advisers and super admins can open this workspace."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Insurance Collections Workspace"
        title="Payment Follow-Up And Verification"
        description="Track unpaid cases, review proof, and move payment follow-ups forward."
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
            <p className="mt-1 text-xs text-ink-muted">Filter the queue, pick a case, then act.</p>
          </div>
          <button onClick={() => setReloadTick((current) => current + 1)} className="btn-secondary">
            <RefreshCw size={14} />
            Refresh Queue
          </button>
        </div>

        <div className="mt-4">
          <WorkspaceFocusBanner
            title={filterSummary.title}
            detail={filterSummary.detail}
            tone={filterSummary.tone}
            meta={[
              { label: `${filteredItems.length} visible` },
              { label: selectedInquiry ? 'Case selected' : 'Pick a case' },
            ]}
          />
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
              Past due only
            </span>
          </label>
        </div>

        {listMessage ? <div className="status-message status-message-danger mt-4">{listMessage}</div> : null}

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {focusHighlights.map((item) => (
            <WorkspaceSignalCard
              key={item.label}
              eyebrow={item.label}
              title={item.value}
              detail={item.hint}
              tone={item.tone}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        <section className="table-surface">
          <div className="flex flex-col gap-2 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="card-title">Collections Queue</p>
              <p className="mt-1 text-xs text-ink-muted">Payment state stays visible here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`badge ${filteredItems.length ? 'badge-orange' : 'badge-gray'}`}>
                {filteredItems.length} visible case{filteredItems.length === 1 ? '' : 's'}
              </span>
              <span className="badge badge-gray">
                {selectedInquiry ? `Selected ${selectedInquiry.customerDisplayName || selectedInquiry.id}` : 'No active selection'}
              </span>
            </div>
          </div>

          {listState === 'loading' ? (
            <div className="px-4 py-8 text-sm text-ink-muted">Loading live collections cases...</div>
          ) : filteredItems.length ? (
            <div className="table-scroll">
              <table className="data-table w-full min-w-[1120px]">
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
              copy="Broaden the filters or search to show more cases."
            />
          )}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <CollectionsDetailPanel
            detailMessage={detailMessage}
            detailState={detailState}
            onRefreshDetail={handleRefreshDetail}
            proofDocuments={proofDocuments}
            selectedInquiry={selectedInquiry}
            selectedRow={selectedRow}
          />

          <CollectionsWorkflowPanel
            isTerminalInquiry={isTerminalInquiry}
            nextStatuses={nextStatuses}
            onDraftChange={handleDraftChange}
            onFlagOverdue={() =>
              submitWorkflowUpdate(
                {
                  paymentStatus: 'overdue',
                  status: 'payment_pending',
                },
                'Collections workflow updated and the case is now flagged as overdue.',
              )
            }
            onMarkPaid={() =>
              submitWorkflowUpdate(
                {
                  status: 'active',
                  paymentStatus: 'paid',
                },
                'Collections workflow updated and the case is now marked paid.',
              )
            }
            onSave={() => submitWorkflowUpdate()}
            onStartVerifying={() =>
              submitWorkflowUpdate(
                {
                  paymentStatus: 'verifying',
                  status: 'payment_pending',
                },
                'Collections workflow updated and proof review is now in progress.',
              )
            }
            selectedActionState={selectedActionState}
            selectedInquiry={selectedInquiry}
            submitDisabled={!selectedInquiry || isTerminalInquiry || updateState === 'status_update_submitting'}
            updateDraft={updateDraft}
            updateMessage={updateMessage}
            updateState={updateState}
            selectedRow={selectedRow}
          />
        </div>
      </div>
    </div>
  )
}
