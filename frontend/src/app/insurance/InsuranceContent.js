'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileClock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useUser } from '@/lib/userContext'
import { ApiError } from '@/lib/authClient'
import {
  getInsuranceInquiryById,
  updateInsuranceInquiryStatus,
} from '@/lib/insuranceStaffClient'
import {
  getAllowedInsuranceStatusTargets,
  getSelectedInsuranceQueueItem,
  getStaffInsuranceQueueState,
  insuranceReviewStaffRoles,
  staffInsuranceContractSources,
} from '@/lib/api/generated/insurance/staff-web-insurance'

const STATUS_META = {
  submitted: { label: 'Submitted', cls: 'badge-orange' },
  under_review: { label: 'Under Review', cls: 'badge-blue' },
  needs_documents: { label: 'Needs Documents', cls: 'badge-gray' },
  approved_for_record: { label: 'Approved For Record', cls: 'badge-green' },
  rejected: { label: 'Rejected', cls: 'badge-gray' },
  closed: { label: 'Closed', cls: 'badge-gray' },
}

const formatStatusLabel = (value) =>
  STATUS_META[value]?.label ??
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const formatDateTime = (value) => {
  if (!value) return 'Not available'

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: formatStatusLabel(status), cls: 'badge-gray' }
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>
}

function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="text-2xl font-black text-ink-primary mt-1">{value}</p>
          {sub ? <p className="text-[11px] text-ink-muted mt-1">{sub}</p> : null}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
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
    <div className="card px-5 py-10 text-center">
      <ShieldAlert size={34} className="mx-auto mb-3" style={{ color: '#f07c00' }} />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="text-xs text-ink-muted mt-2 max-w-lg mx-auto">{copy}</p>
    </div>
  )
}

function DetailRow({ label, value }) {
  if (!value) return null

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="text-sm text-ink-primary mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

export default function InsuranceContent() {
  const user = useUser()
  const role = user?.role ?? null
  const canReviewInsurance = insuranceReviewStaffRoles.includes(role)
  const [queueItems, setQueueItems] = useState([])
  const [selectedInquiryId, setSelectedInquiryId] = useState('')
  const [manualInquiryId, setManualInquiryId] = useState('')
  const [liveInquiry, setLiveInquiry] = useState(null)
  const [detailState, setDetailState] = useState('idle')
  const [detailMessage, setDetailMessage] = useState('')
  const [updateState, setUpdateState] = useState('status_update_ready')
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateDraft, setUpdateDraft] = useState({
    status: 'under_review',
    reviewNotes: '',
  })

  const queueState = useMemo(() => getStaffInsuranceQueueState(queueItems), [queueItems])
  const selectedQueueItem = useMemo(
    () => getSelectedInsuranceQueueItem(queueItems, selectedInquiryId),
    [queueItems, selectedInquiryId],
  )
  const activeInquiry =
    liveInquiry && liveInquiry.id === (manualInquiryId || selectedInquiryId)
      ? liveInquiry
      : selectedQueueItem
  const nextStatuses = useMemo(
    () => getAllowedInsuranceStatusTargets(activeInquiry?.status ?? 'closed'),
    [activeInquiry?.status],
  )

  useEffect(() => {
    if (!selectedQueueItem) return

    setManualInquiryId(selectedQueueItem.id)
    setLiveInquiry(null)
    setDetailState('detail_loaded')
    setDetailMessage('')
  }, [selectedQueueItem])

  useEffect(() => {
    if (!activeInquiry) return

    setUpdateDraft({
      status: nextStatuses[0] ?? activeInquiry.status,
      reviewNotes: activeInquiry.reviewNotes ?? '',
    })
    setUpdateState('status_update_ready')
    setUpdateMessage('')
  }, [activeInquiry, nextStatuses])

  const handleLoadLiveDetail = async () => {
    if (!canReviewInsurance) {
      setDetailState('forbidden_role')
      setDetailMessage('Only service advisers and super admins can load staff insurance detail.')
      return
    }

    if (!user?.accessToken) {
      setDetailState('load_failed')
      setDetailMessage('A valid staff session is required before loading a live insurance inquiry.')
      return
    }

    if (!manualInquiryId.trim()) {
      setDetailState('load_failed')
      setDetailMessage('Enter or select an inquiry id before loading live detail.')
      return
    }

    setDetailState('loading')
    setDetailMessage('')

    try {
      const inquiry = await getInsuranceInquiryById({
        inquiryId: manualInquiryId.trim(),
        accessToken: user.accessToken,
      })

      setLiveInquiry(inquiry)
      setSelectedInquiryId(inquiry.id)
      setDetailState('detail_loaded')
      setDetailMessage('Live inquiry detail loaded from the backend.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setDetailState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setDetailState('forbidden_role')
      } else {
        setDetailState('load_failed')
      }

      setDetailMessage(error?.message || 'Insurance inquiry detail could not be loaded.')
    }
  }

  const handleSaveStatus = async () => {
    if (!canReviewInsurance) {
      setUpdateState('forbidden_role')
      setUpdateMessage('Only service advisers and super admins can update insurance status.')
      return
    }

    if (!user?.accessToken) {
      setUpdateState('update_failed')
      setUpdateMessage('A valid staff session is required before saving status changes.')
      return
    }

    if (!activeInquiry?.id) {
      setUpdateState('inquiry_not_found')
      setUpdateMessage('Select a valid inquiry before saving a status update.')
      return
    }

    setUpdateState('status_update_submitting')
    setUpdateMessage('')

    try {
      const updatedInquiry = await updateInsuranceInquiryStatus({
        inquiryId: activeInquiry.id,
        status: updateDraft.status,
        reviewNotes: updateDraft.reviewNotes,
        accessToken: user.accessToken,
      })

      setLiveInquiry(updatedInquiry)
      setQueueItems((currentQueue) =>
        currentQueue.map((item) =>
          item.id === updatedInquiry.id
            ? {
                ...item,
                status: updatedInquiry.status,
                statusHint: updatedInquiry.statusHint,
                updatedAt: updatedInquiry.updatedAt,
              }
            : item,
        ),
      )
      setUpdateState('status_update_saved')
      setUpdateMessage(`Insurance inquiry updated to ${formatStatusLabel(updatedInquiry.status)}.`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setUpdateState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setUpdateState('forbidden_role')
      } else if (error instanceof ApiError && error.status === 409) {
        setUpdateState('invalid_transition')
      } else {
        setUpdateState('update_failed')
      }

      setUpdateMessage(error?.message || 'Insurance status could not be updated.')
    }
  }

  if (!canReviewInsurance) {
    return (
      <div className="space-y-5">
        <BlockingState
          title="Insurance review is adviser/admin only"
          copy="This workspace is reserved for service advisers and super admins. The sidebar may already hide the route, but this page also blocks direct navigation for non-authorized roles."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 md:p-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Insurance Review Workspace</p>
            <h1 className="text-xl md:text-2xl font-black text-ink-primary mt-1">Queue, Detail, and Claim Status Updates</h1>
            <p className="text-sm text-ink-muted mt-2 max-w-3xl">
              This web surface keeps staff review distinct from customer intake. Enter a known inquiry id from mobile intake,
              then use live detail and status routes without placeholder queue data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-orange">
              Queue route {staffInsuranceContractSources.queue.status}
            </span>
            <span className="badge badge-green">
              Detail route {staffInsuranceContractSources.detail.status}
            </span>
            <span className="badge badge-green">
              Status update {staffInsuranceContractSources.update.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryTile
          icon={ClipboardList}
          label="Review Queue"
          value={queueItems.length}
          sub={queueState === 'queue_loaded' ? 'Live queue items loaded' : 'No live queue endpoint yet'}
        />
        <SummaryTile
          icon={ShieldCheck}
          label="Allowed Roles"
          value="2"
          sub="service adviser, super admin"
        />
        <SummaryTile
          icon={FileClock}
          label="Selected Inquiry"
          value={activeInquiry ? formatStatusLabel(activeInquiry.status) : 'None'}
          sub={activeInquiry ? activeInquiry.subject : 'Pick a queue item or enter an inquiry id'}
        />
        <SummaryTile
          icon={CheckCircle2}
          label="Editable Fields"
          value="2"
          sub="status and review notes only"
        />
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-xs text-ink-muted">
        The current backend does not expose a live insurance queue list route yet. Use a known inquiry id from mobile intake
        to load detail with `GET /api/insurance/inquiries/:id`, then update status through the live staff route.
      </div>

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="card-title">Insurance Review Queue</p>
              <p className="text-xs text-ink-muted mt-1">
                No placeholder queue is shown. Staff review starts from a known live inquiry id.
              </p>
            </div>
            <span className={`badge ${queueState === 'queue_loaded' ? 'badge-orange' : 'badge-gray'}`}>
              {queueState === 'queue_loaded' ? 'Loaded' : 'Empty'}
            </span>
          </div>

          <div className="space-y-3 mt-4">
            {queueItems.length === 0 ? (
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-8 text-center">
                <p className="text-sm font-bold text-ink-primary">No queue items yet</p>
                <p className="text-xs text-ink-muted mt-2">
                  A live queue list is not available yet. Paste a known inquiry id in the detail panel to continue.
                </p>
              </div>
            ) : (
              queueItems.map((item) => {
                const isSelected = item.id === selectedInquiryId
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedInquiryId(item.id)}
                    className={`w-full text-left rounded-xl border px-4 py-4 transition ${
                      isSelected
                        ? 'border-[#f07c00] bg-[#f07c00]/10'
                        : 'border-surface-border bg-surface-card hover:border-[#f07c00]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold" style={{ color: '#f07c00' }}>
                          INQ-{item.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm font-semibold text-ink-primary mt-1">{item.subject}</p>
                        <p className="text-xs text-ink-muted mt-2 line-clamp-2">{item.statusHint}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-[11px] text-ink-muted mt-3">
                      {item.inquiryType.toUpperCase()} | {formatDateTime(item.updatedAt)}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div>
                <p className="card-title">Inquiry Detail</p>
                <p className="text-xs text-ink-muted mt-1">
                  Load the selected inquiry from the live backend route to confirm current staff state before updating it.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <input
                  value={manualInquiryId}
                  onChange={(event) => setManualInquiryId(event.target.value)}
                  placeholder="Insurance inquiry id"
                  className="w-full lg:w-[320px] rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                />
                <button onClick={handleLoadLiveDetail} className="btn-primary justify-center">
                  <RefreshCw size={14} /> Load Live Detail
                </button>
              </div>
            </div>

            {detailMessage ? (
              <div
                className={`rounded-xl border px-4 py-3 text-xs mt-4 ${
                  detailState === 'detail_loaded'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : detailState === 'forbidden_role'
                      ? 'border-orange-500/25 bg-orange-500/10 text-orange-100'
                      : 'border-red-500/25 bg-red-500/10 text-red-200'
                }`}
              >
                {detailMessage}
              </div>
            ) : null}

            {activeInquiry ? (
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <DetailRow label="Current Status" value={formatStatusLabel(activeInquiry.status)} />
                <DetailRow label="Inquiry Type" value={activeInquiry.inquiryType.toUpperCase()} />
                <DetailRow label="Subject" value={activeInquiry.subject} />
                <DetailRow label="Customer User" value={activeInquiry.userId} />
                <DetailRow label="Vehicle" value={activeInquiry.vehicleId} />
                <DetailRow label="Created" value={formatDateTime(activeInquiry.createdAt)} />
                <DetailRow label="Provider Name" value={activeInquiry.providerName} />
                <DetailRow label="Policy Number" value={activeInquiry.policyNumber} />
                <DetailRow label="Customer Notes" value={activeInquiry.notes} />
                <DetailRow label="Document Count" value={String(activeInquiry.documentCount ?? 0)} />
                <div className="md:col-span-2">
                  <DetailRow label="Description" value={activeInquiry.description} />
                </div>
                <div className="md:col-span-2 rounded-xl border border-surface-border bg-surface-raised px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Supporting Documents</p>
                  {activeInquiry.documents?.length ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {activeInquiry.documents.map((document) => (
                        <div
                          key={document.id ?? `${document.fileName}-${document.fileUrl}`}
                          className="rounded-xl border border-surface-border bg-surface-card px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-ink-primary">{document.fileName}</p>
                              <p className="mt-1 break-all text-xs text-ink-muted">{document.fileUrl}</p>
                            </div>
                            <span className="badge badge-blue">{document.documentTypeLabel ?? document.documentType}</span>
                          </div>
                          {document.notes ? (
                            <p className="mt-3 text-xs leading-5 text-ink-secondary">{document.notes}</p>
                          ) : null}
                          <p className="mt-3 text-[11px] text-ink-muted">
                            Uploaded {formatDateTime(document.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-ink-muted">
                      No supporting document metadata is attached to this inquiry yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-10 text-center mt-4">
                <AlertTriangle size={28} className="mx-auto text-ink-dim mb-3" />
                <p className="text-sm font-bold text-ink-primary">No inquiry selected yet</p>
                <p className="text-xs text-ink-muted mt-2">
                  Pick a queue item or load a known inquiry id. Customer-only intake fields remain read-only in this workspace.
                </p>
              </div>
            )}
          </div>

          <div className="card p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Status Update</p>
                <p className="text-xs text-ink-muted mt-1">
                  Staff can edit only the fields the backend DTO supports: <strong>status</strong> and <strong>review notes</strong>.
                </p>
              </div>
              <span className={`badge ${nextStatuses.length ? 'badge-green' : 'badge-gray'}`}>
                {nextStatuses.length ? `${nextStatuses.length} valid next state${nextStatuses.length === 1 ? '' : 's'}` : 'No transitions'}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <label className="text-xs text-ink-muted">
                Next status
                <select
                  value={updateDraft.status}
                  onChange={(event) => setUpdateDraft((current) => ({ ...current, status: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                  disabled={!nextStatuses.length}
                >
                  {nextStatuses.length ? (
                    nextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))
                  ) : (
                    <option value={activeInquiry?.status ?? 'closed'}>
                      {activeInquiry ? 'No valid transition available' : 'Select an inquiry first'}
                    </option>
                  )}
                </select>
              </label>
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Current route</p>
                <p className="text-sm text-ink-primary mt-1">
                  {staffInsuranceContractSources.update.method} {staffInsuranceContractSources.update.path}
                </p>
                <p className="text-xs text-ink-muted mt-2">
                  Role failures, missing records, and invalid transitions stay distinct from one another.
                </p>
              </div>
              <label className="text-xs text-ink-muted md:col-span-2">
                Review notes
                <textarea
                  value={updateDraft.reviewNotes ?? ''}
                  onChange={(event) => setUpdateDraft((current) => ({ ...current, reviewNotes: event.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                  placeholder="Add staff review notes for the next status transition."
                />
              </label>
            </div>

            {updateMessage ? (
              <div
                className={`rounded-xl border px-4 py-3 text-xs mt-4 ${
                  updateState === 'status_update_saved'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : updateState === 'forbidden_role'
                      ? 'border-orange-500/25 bg-orange-500/10 text-orange-100'
                      : 'border-red-500/25 bg-red-500/10 text-red-200'
                }`}
              >
                {updateMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handleSaveStatus}
                disabled={!activeInquiry || !nextStatuses.length || updateState === 'status_update_submitting'}
                className="btn-primary"
              >
                {updateState === 'status_update_submitting' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                Save Status Update
              </button>
              <span className="badge badge-gray">Live detail/status routes only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
