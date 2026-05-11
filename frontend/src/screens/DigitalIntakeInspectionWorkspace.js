'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  FileSearch,
  Loader2,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import { ApiError, listAdminCustomers } from '@/lib/authClient'
import { listVehicleBookings } from '@/lib/bookingStaffClient'
import { createVehicleInspection, listVehicleInspections } from '@/lib/inspectionStaffClient'
import { useUser } from '@/lib/userContext'
import {
  getSelectedInspection,
  getStaffInspectionCaptureSuccessState,
  getStaffInspectionHistoryState,
  inspectionCaptureSubmissionTemplate,
  inspectionStaffRoles,
  summarizeInspectionFindings,
} from '@/lib/api/generated/inspections/staff-web-inspections'
import { getInspectionMessageTone, splitRefs } from './digitalIntakeInspectionView.mjs'
import { getIntakeWorkspaceHeroCopy } from './digitalIntakeInspectionWorkspaceView.mjs'

const formatLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDateTime = (value) => {
  if (!value) return 'Not recorded'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getVerificationTone = (state) => {
  if (state === 'verified') return 'badge-green'
  if (state === 'mixed_verification') return 'badge-orange'
  return 'badge-gray'
}

const getMessageTone = (state) => {
  const tone = getInspectionMessageTone(state)
  if (tone === 'success') return 'status-message status-message-success'
  if (tone === 'warning' || tone === 'info') return 'status-message status-message-warning'
  return 'status-message status-message-danger'
}

const initialDraft = {
  customerUserId: '',
  vehicleId: '',
  bookingId: '',
  inspectionType: inspectionCaptureSubmissionTemplate.request.inspectionType,
  status: inspectionCaptureSubmissionTemplate.request.status ?? 'completed',
  notes: inspectionCaptureSubmissionTemplate.request.notes ?? '',
  attachmentRefsText: '',
  findingCategory: inspectionCaptureSubmissionTemplate.request.findings?.[0]?.category ?? 'general',
  findingLabel: inspectionCaptureSubmissionTemplate.request.findings?.[0]?.label ?? '',
  findingSeverity: inspectionCaptureSubmissionTemplate.request.findings?.[0]?.severity ?? 'medium',
  findingNotes: inspectionCaptureSubmissionTemplate.request.findings?.[0]?.notes ?? '',
  findingVerified: inspectionCaptureSubmissionTemplate.request.findings?.[0]?.isVerified ?? true,
}

const inspectionFindingCategoryOptions = [
  { value: 'general', label: 'General' },
  { value: 'engine', label: 'Engine' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'body', label: 'Body' },
  { value: 'interior', label: 'Interior' },
  { value: 'fluids', label: 'Fluids' },
  { value: 'tires', label: 'Tires' },
]

function InspectionCard({ inspection, isSelected, onSelect }) {
  const summaries = summarizeInspectionFindings(inspection.findings)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        isSelected
          ? 'border-brand-orange bg-brand-orange/10'
          : 'border-surface-border bg-surface-card hover:border-brand-orange/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            {formatLabel(inspection.inspectionType)}
          </p>
          <p className="mt-2 text-sm font-bold text-ink-primary">{inspection.id}</p>
          <p className="mt-1 text-xs text-ink-muted">{formatDateTime(inspection.createdAt)}</p>
        </div>
        <span className={`badge ${getVerificationTone(inspection.verificationState)}`}>
          {formatLabel(inspection.verificationState)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-secondary">
        {inspection.notes || 'No inspection notes were recorded.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="badge badge-gray">{formatLabel(inspection.status)}</span>
        <span className="badge badge-gray">
          {inspection.findings?.length ?? 0} finding{inspection.findings?.length === 1 ? '' : 's'}
        </span>
        <span className="badge badge-gray">
          {inspection.attachmentRefs?.length ?? 0} attachment{inspection.attachmentRefs?.length === 1 ? '' : 's'}
        </span>
      </div>
      {summaries.length ? (
        <ul className="mt-3 space-y-1 text-xs text-ink-muted">
          {summaries.slice(0, 2).map((summary) => (
            <li key={summary}>{summary}</li>
          ))}
        </ul>
      ) : null}
    </button>
  )
}

export default function DigitalIntakeInspectionWorkspace() {
  const user = useUser()
  const role = user?.role ?? null
  const isTechnician = role === 'technician'
  const canUseInspection = inspectionStaffRoles.includes(role)
  const [draft, setDraft] = useState(initialDraft)
  const [inspections, setInspections] = useState([])
  const [customers, setCustomers] = useState([])
  const [vehicleBookings, setVehicleBookings] = useState([])
  const [selectedInspectionId, setSelectedInspectionId] = useState('')
  const [historyState, setHistoryState] = useState({
    status: 'history_empty',
    message: 'Enter a vehicle id to load live inspection history, or save a first inspection for that vehicle.',
  })
  const [captureState, setCaptureState] = useState({
    status: 'capture_ready',
    message: '',
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const vehicleId = params.get('vehicleId')
    const bookingId = params.get('bookingId')

    if (vehicleId || bookingId) {
      setDraft((current) => ({
        ...current,
        vehicleId: vehicleId ?? current.vehicleId,
        bookingId: bookingId ?? current.bookingId,
      }))
    }
  }, [])

  useEffect(() => {
    if (!user?.accessToken || isTechnician) {
      setCustomers([])
      return
    }

    void listAdminCustomers(user.accessToken)
      .then((items) => setCustomers(items))
      .catch(() => setCustomers([]))
  }, [isTechnician, user?.accessToken])

  useEffect(() => {
    if (!draft.vehicleId || !user?.accessToken || isTechnician) {
      setVehicleBookings([])
      return
    }

    void listVehicleBookings(draft.vehicleId, user.accessToken)
      .then((items) => setVehicleBookings(items))
      .catch(() => setVehicleBookings([]))
  }, [draft.vehicleId, isTechnician, user?.accessToken])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === draft.customerUserId) ?? null,
    [customers, draft.customerUserId],
  )
  const customerVehicleOptions = selectedCustomer?.vehicles ?? []

  const selectedInspection = useMemo(
    () => getSelectedInspection(inspections, selectedInspectionId),
    [inspections, selectedInspectionId],
  )
  const inspectionSummaryCount = selectedInspection?.findings?.length ?? 0
  const heroCopy = getIntakeWorkspaceHeroCopy(isTechnician)

  const updateDraft = (patch) => {
    setDraft((current) => ({
      ...current,
      ...patch,
    }))
  }

  const buildPayload = () => {
    const finding =
      draft.findingLabel.trim() || draft.findingCategory.trim() || draft.findingNotes.trim()
        ? {
            category: draft.findingCategory.trim() || 'general',
            label: draft.findingLabel.trim() || 'Inspection note',
            severity: draft.findingSeverity,
            notes: draft.findingNotes.trim() || undefined,
            isVerified: draft.findingVerified,
          }
        : null

    return {
      inspectionType: draft.inspectionType,
      status: draft.status,
      bookingId: draft.bookingId.trim() || undefined,
      inspectorUserId: user?.id,
      notes: draft.notes.trim() || undefined,
      attachmentRefs: splitRefs(draft.attachmentRefsText),
      findings: finding ? [finding] : [],
    }
  }

  const loadHistory = async () => {
    if (!canUseInspection) {
      setHistoryState({
        status: 'forbidden_role',
        message: 'This inspection workspace is only available to technician, service adviser, and super-admin sessions.',
      })
      return
    }

    if (!draft.vehicleId.trim()) {
      setHistoryState({
        status: 'load_failed',
        message: 'Enter a vehicle id before loading inspection history.',
      })
      return
    }

    if (!user?.accessToken) {
      setHistoryState({
        status: 'load_failed',
        message: 'A valid staff session is required before loading inspection history.',
      })
      return
    }

    setHistoryState({
      status: 'history_loading',
      message: 'Loading vehicle-scoped inspection history...',
    })

    try {
      const loadedInspections = await listVehicleInspections({
        vehicleId: draft.vehicleId.trim(),
        accessToken: user.accessToken,
      })
      const nextStatus = getStaffInspectionHistoryState(loadedInspections)

      setInspections(loadedInspections)
      setSelectedInspectionId(loadedInspections[0]?.id ?? '')
      setHistoryState({
        status: nextStatus,
        message:
          nextStatus === 'history_loaded'
            ? 'Live vehicle inspection history loaded.'
            : 'This vehicle has no inspection records yet.',
      })
    } catch (error) {
      let nextStatus = 'load_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'vehicle_not_found'
      }

      setInspections([])
      setSelectedInspectionId('')
      setHistoryState({
        status: nextStatus,
        message: error?.message || 'Inspection history could not be loaded.',
      })
    }
  }

  const saveInspection = async () => {
    if (!canUseInspection) {
      setCaptureState({
        status: 'forbidden_role',
        message: 'This inspection workspace is only available to technician, service adviser, and super-admin sessions.',
      })
      return
    }

    if (!draft.vehicleId.trim()) {
      setCaptureState({
        status: 'capture_failed',
        message: 'Enter a vehicle id before saving an inspection.',
      })
      return
    }

    if (draft.inspectionType === 'completion' && !draft.findingLabel.trim()) {
      setCaptureState({
        status: 'completion_missing_findings',
        message: 'Completion inspections need at least one finding before they can support release verification.',
      })
      return
    }

    if (!user?.accessToken) {
      setCaptureState({
        status: 'capture_failed',
        message: 'A valid staff session is required before saving an inspection.',
      })
      return
    }

    setCaptureState({
      status: 'capture_submitting',
      message: '',
    })

    try {
      const savedInspection = await createVehicleInspection({
        vehicleId: draft.vehicleId.trim(),
        inspection: buildPayload(),
        accessToken: user.accessToken,
      })
      const nextStatus = getStaffInspectionCaptureSuccessState(savedInspection)

      setInspections((current) => [savedInspection, ...current.filter((item) => item.id !== savedInspection.id)])
      setSelectedInspectionId(savedInspection.id)
      setCaptureState({
        status: nextStatus,
        message: `Inspection saved with ${formatLabel(savedInspection.verificationState)} evidence state.`,
      })
      setHistoryState({
        status: 'history_loaded',
        message: 'Latest saved inspection is selected below.',
      })
    } catch (error) {
      let nextStatus = 'capture_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'vehicle_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'booking_vehicle_conflict'
      } else if (error instanceof ApiError && error.status === 400) {
        nextStatus = 'completion_missing_findings'
      }

      setCaptureState({
        status: nextStatus,
        message: error?.message || 'Inspection could not be saved.',
      })
    }
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Digital Intake And Inspection"
        title={heroCopy.title}
        description={heroCopy.description}
        meta={
          <>
            <span className="badge badge-gray">{isTechnician ? 'Technician workflow' : 'Staff workflow'}</span>
            <span className="badge badge-gray">{inspections.length} loaded record{inspections.length === 1 ? '' : 's'}</span>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="card-title">Live Vehicle Inspection Capture</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                {isTechnician
                  ? 'Save one inspection record for the assigned vehicle.'
                  : 'Save one inspection record for the selected vehicle.'}
              </p>
            </div>
            <span className="badge badge-gray">{isTechnician ? 'Assigned vehicle context' : 'Vehicle and booking selectors'}</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {!isTechnician ? (
              <label className="label">
                Customer
                <select
                  value={draft.customerUserId}
                  onChange={(event) =>
                    updateDraft({
                      customerUserId: event.target.value,
                      vehicleId: '',
                      bookingId: '',
                    })
                  }
                  className="select"
                >
                  <option value="">Choose a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.displayName} / {customer.email}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="label">
              Vehicle
              {isTechnician ? (
                <input
                  value={draft.vehicleId}
                  onChange={(event) => updateDraft({ vehicleId: event.target.value, bookingId: '' })}
                  className="input"
                  placeholder="Paste vehicle UUID"
                />
              ) : (
                <select
                  value={draft.vehicleId}
                  onChange={(event) => updateDraft({ vehicleId: event.target.value, bookingId: '' })}
                  className="select"
                >
                  <option value="">Choose a customer vehicle</option>
                  {customerVehicleOptions.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNumber || vehicle.id} / {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="label">
              Optional booking
              {isTechnician ? (
                <input
                  value={draft.bookingId}
                  onChange={(event) => updateDraft({ bookingId: event.target.value })}
                  className="input"
                  placeholder="Booking UUID if this came from intake"
                />
              ) : (
                <select
                  value={draft.bookingId}
                  onChange={(event) => updateDraft({ bookingId: event.target.value })}
                  className="select"
                >
                  <option value="">No booking link</option>
                  {vehicleBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.customerLabel} / {booking.scheduledDate} / {booking.status}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="label">
              Inspection type
              <select
                value={draft.inspectionType}
                onChange={(event) => updateDraft({ inspectionType: event.target.value })}
                className="select"
              >
                <option value="intake">Intake</option>
                <option value="pre_repair">Pre Repair</option>
                <option value="completion">Completion</option>
                <option value="return">Return</option>
              </select>
            </label>
            <label className="label">
              Status
              <select
                value={draft.status}
                onChange={(event) => updateDraft({ status: event.target.value })}
                className="select"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="needs_followup">Needs Followup</option>
                <option value="void">Void</option>
              </select>
            </label>
            <label className="label md:col-span-2">
              Notes
              <textarea
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                rows={3}
                className="input min-h-[96px] resize-y"
                placeholder="Describe the condition observed during intake or inspection."
              />
            </label>
            <label className="label md:col-span-2">
              Attachment refs
              <input
                value={draft.attachmentRefsText}
                onChange={(event) => updateDraft({ attachmentRefsText: event.target.value })}
                className="input"
                placeholder="upload://vehicle/intake-front, upload://vehicle/intake-dashboard"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-surface-border bg-surface-card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink-primary">Primary Finding</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Capture the clearest visible condition or repair-relevant note from this inspection.
                </p>
              </div>
              <span className="badge badge-gray">Single finding entry</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="label">
                Category
                <select
                  value={draft.findingCategory}
                  onChange={(event) => updateDraft({ findingCategory: event.target.value })}
                  className="select"
                >
                  {inspectionFindingCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                Severity
                <select
                  value={draft.findingSeverity}
                  onChange={(event) => updateDraft({ findingSeverity: event.target.value })}
                  className="select"
                >
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="label md:col-span-2">
                Finding label
                <input
                  value={draft.findingLabel}
                  onChange={(event) => updateDraft({ findingLabel: event.target.value })}
                  className="input"
                  placeholder="Brake pedal response confirmed"
                />
              </label>
              <label className="label md:col-span-2">
                Finding notes
                <textarea
                  value={draft.findingNotes}
                  onChange={(event) => updateDraft({ findingNotes: event.target.value })}
                  rows={3}
                  className="input min-h-[96px] resize-y"
                  placeholder="Evidence notes or customer-safe observation."
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={draft.findingVerified}
                onChange={(event) => updateDraft({ findingVerified: event.target.checked })}
                className="h-4 w-4 accent-[#f07c00]"
              />
              Mark this finding as verified evidence
            </label>
          </div>

          {captureState.message ? (
            <div className={`mt-4 ${getMessageTone(captureState.status)}`}>
              {captureState.message}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveInspection}
              disabled={captureState.status === 'capture_submitting'}
              className="btn-primary"
            >
              {captureState.status === 'capture_submitting' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <BadgeCheck size={15} />
              )}
              Save Inspection
            </button>
            <button type="button" onClick={loadHistory} className="btn-ghost">
              <FileSearch size={15} />
              Load Vehicle History
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <section className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="card-title">Vehicle Inspection History</p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  Load prior inspection records for the active vehicle.
                </p>
              </div>
              <span className="badge badge-gray">Read state: {formatLabel(historyState.status)}</span>
            </div>

            {historyState.message ? (
              <div className={`mt-4 ${getMessageTone(historyState.status)}`}>
                {historyState.message}
              </div>
            ) : null}

            {historyState.status === 'history_loading' ? (
              <div className="status-message status-message-warning mt-4 flex items-center gap-2">
                <Loader2 size={15} className="animate-spin text-brand-orange" />
                Loading live inspection history...
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {inspections.length ? (
                inspections.map((inspection) => (
                  <InspectionCard
                    key={inspection.id}
                    inspection={inspection}
                    isSelected={selectedInspection?.id === inspection.id}
                    onSelect={() => setSelectedInspectionId(inspection.id)}
                  />
                ))
              ) : (
                <div className="empty-panel px-4 py-8 text-center">
                  <AlertTriangle size={26} className="mx-auto text-brand-orange" />
                  <p className="mt-3 text-sm font-bold text-ink-primary">No inspection records loaded</p>
                  <p className="mt-2 text-sm text-ink-muted">
                    Enter a vehicle id and load history, or save a first inspection for that vehicle.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="card-title">Selected Inspection Detail</p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  {isTechnician
                    ? 'Review findings and verification before continuing work.'
                    : 'Review findings and verification for the selected inspection.'}
                </p>
              </div>
              {selectedInspection ? (
                <span className={`badge ${getVerificationTone(selectedInspection.verificationState)}`}>
                  {formatLabel(selectedInspection.verificationState)}
                </span>
              ) : null}
            </div>

            {selectedInspection ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">Vehicle</p>
                    <p className="mt-2 break-all text-sm font-semibold text-ink-primary">{selectedInspection.vehicleId}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">Booking</p>
                    <p className="mt-2 break-all text-sm font-semibold text-ink-primary">
                      {selectedInspection.bookingId || 'Not linked'}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Findings</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {inspectionSummaryCount} finding{inspectionSummaryCount === 1 ? '' : 's'} attached to this inspection record.
                  </p>
                  <div className="mt-3 space-y-3">
                    {selectedInspection.findings?.length ? (
                      selectedInspection.findings.map((finding) => (
                        <div key={finding.id ?? `${finding.category}-${finding.label}`} className="rounded-xl border border-surface-border bg-surface-raised p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-gray">{finding.category}</span>
                            <span className={finding.isVerified ? 'badge badge-green' : 'badge badge-orange'}>
                              {finding.isVerified ? 'Verified' : 'Needs verification'}
                            </span>
                            <span className="badge badge-gray">{formatLabel(finding.severity)}</span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-ink-primary">{finding.label}</p>
                          {finding.notes ? <p className="mt-2 text-sm text-ink-muted">{finding.notes}</p> : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-ink-muted">
                        No findings are attached. This record cannot be treated as verified condition evidence yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-panel mt-4">
                Select an inspection from history to review its findings and verification state.
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="card-title">Workflow Notes</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
              {isTechnician
                ? 'Use this page for vehicle evidence and history review.'
                : 'Use this workspace for inspection records without duplicating other workflows.'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">Vehicle History</p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {isTechnician
                ? 'Load prior inspection records before continuing work.'
                : 'Create and review inspection records for the selected vehicle.'}
            </p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">
              {isTechnician ? 'Workshop Discipline' : 'Queue Expectation'}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {isTechnician
                ? 'Use clear labels and verified evidence for the next handoff.'
                : 'Start from a known vehicle instead of a broad intake queue.'}
            </p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">
              {isTechnician ? 'Job Order Handoff' : 'Product Boundary'}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {isTechnician
                ? 'Use Job Orders for progress updates after inspection capture.'
                : 'Staff inspection capture stays separate from the customer mobile app.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
