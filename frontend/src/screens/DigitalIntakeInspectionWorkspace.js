'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  FileSearch,
  History,
  Loader2,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

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

const splitRefs = (value) =>
  String(value ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

const getVerificationTone = (state) => {
  if (state === 'verified') return 'badge-green'
  if (state === 'mixed_verification') return 'badge-orange'
  return 'badge-gray'
}

const getMessageTone = (state) => {
  if (
    state === 'capture_saved_verified' ||
    state === 'capture_saved_mixed' ||
    state === 'capture_saved_unverified' ||
    state === 'history_loaded'
  ) {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
  }

  if (state === 'history_empty') {
    return 'border-brand-orange/25 bg-brand-orange/10 text-orange-100'
  }

  if (state === 'history_loading') {
    return 'border-blue-500/25 bg-blue-500/10 text-blue-100'
  }

  return 'border-red-500/25 bg-red-500/10 text-red-200'
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

const technicianLinks = [
  {
    href: '/admin/job-orders',
    icon: Wrench,
    title: 'Job Order Workbench',
    roleNote: 'technician execution',
    copy: 'Load a known job order, record progress, update status, and attach photo evidence from the workshop.',
  },
  {
    href: '/admin',
    icon: ClipboardList,
    title: 'Technician Dashboard',
    roleNote: 'assigned work queue',
    copy: 'Return to your technician task board to review active job orders and open the next vehicle in queue.',
  },
]

const staffLinks = [
  {
    href: '/bookings',
    icon: ClipboardList,
    title: 'Booking Intake',
    roleNote: 'service adviser / super admin',
    copy: 'Confirm or reschedule customer booking requests before any inspection or job-order handoff.',
  },
  {
    href: '/admin/job-orders',
    icon: Wrench,
    title: 'Job Order Workbench',
    roleNote: 'technician / adviser / super admin',
    copy: 'Create handoffs, load known job orders, add progress, attach evidence, and finalize invoice-ready work.',
  },
  {
    href: '/admin/qa-audit',
    icon: ShieldCheck,
    title: 'QA Release Review',
    roleNote: 'service adviser / super admin',
    copy: 'Review quality gates after job-order evidence exists. Super admins keep override authority.',
  },
]

function RouteCard({ item }) {
  const Icon = item.icon

  return (
    <Link href={item.href} className="card group p-5 transition-colors hover:border-brand-orange/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
          <Icon size={18} />
        </div>
        <ExternalLink size={15} className="text-ink-dim transition-colors group-hover:text-brand-orange" />
      </div>
      <p className="mt-4 text-sm font-bold text-ink-primary">{item.title}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-dim">
        {item.roleNote}
      </p>
      <p className="mt-3 text-sm leading-6 text-ink-secondary">{item.copy}</p>
    </Link>
  )
}

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
  const routeLinks = isTechnician ? technicianLinks : staffLinks

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
      <section className="ops-page-header">
        <div className="space-y-2">
          <p className="ops-page-kicker">Digital Intake And Inspection</p>
          <h1 className="ops-page-title">
            {isTechnician ? 'Capture Vehicle Condition And Workshop Findings' : 'Capture Vehicle Condition Before Release Decisions'}
          </h1>
          <p className="ops-page-copy">
            {isTechnician
              ? 'Use this technician surface to review known vehicle history, capture intake or completion findings, and keep inspection evidence attached to the vehicle before and after service work.'
              : 'Use this staff surface for vehicle-scoped intake, pre-repair, completion, and return inspection records. QA release review stays separate in the quality-gate workspace and should not replace physical inspection evidence.'}
          </p>
        </div>
      </section>

      <section className="ops-summary-grid">
        <div className="card p-5 transition-colors hover:border-[rgba(240,124,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Inspection capture</p>
              <p className="mt-3 text-xl font-black tracking-tight text-ink-primary">
                {isTechnician ? 'Technician-owned findings' : 'Vehicle-scoped intake'}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {isTechnician
                  ? 'Capture the condition you observed on the vehicle without creating separate booking or job-order truth.'
                  : 'Staff records observed condition and findings against the vehicle. Booking id is optional and only references existing booking truth.'}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
              <ClipboardCheck size={14} />
            </div>
          </div>
        </div>
        <div className="card p-5 transition-colors hover:border-[rgba(240,124,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Vehicle history</p>
              <p className="mt-3 text-xl font-black tracking-tight text-ink-primary">
                {isTechnician ? 'History before repair' : 'Known vehicle lookup'}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {isTechnician
                  ? 'Load the active vehicle first so you can compare current findings against prior intake or return records.'
                  : 'Inspection history is vehicle-scoped today. Staff should start from a known customer vehicle rather than expecting a broad queue on this page.'}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/15 bg-blue-500/10 text-blue-300">
              <History size={14} />
            </div>
          </div>
        </div>
        <div className="card p-5 transition-colors hover:border-[rgba(240,124,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {isTechnician ? 'Verification state' : 'QA boundary'}
              </p>
              <p className="mt-3 text-xl font-black tracking-tight text-ink-primary">
                {isTechnician ? 'Verified evidence matters' : 'Release review stays separate'}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {isTechnician
                  ? 'Verified findings and clear notes help the next release review without replacing the later QA gate process.'
                  : 'QA review uses job-order quality gates after work evidence exists. Super-admin overrides stay audit-visible and do not erase inspection findings.'}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/15 bg-emerald-500/10 text-emerald-300">
              <ShieldCheck size={14} />
            </div>
          </div>
        </div>
        <div className="card p-5 transition-colors hover:border-[rgba(240,124,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">History state</p>
              <p className="mt-3 text-3xl font-black tracking-tight tabular-nums text-ink-primary">
                {inspections.length}
              </p>
              <p className="mt-1.5 text-[11px] text-ink-muted">
                {historyState.status === 'history_loaded'
                  ? 'Loaded inspection records for the active vehicle'
                  : 'Enter a vehicle id to load inspection history'}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
              <FileSearch size={14} />
            </div>
          </div>
        </div>
      </section>

      <section className={`grid gap-4 ${isTechnician ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {routeLinks.map((item) => (
          <RouteCard key={item.href} item={item} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="card-title">Live Vehicle Inspection Capture</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                {isTechnician
                  ? 'Save one vehicle-owned inspection record and keep the evidence tied to the vehicle being serviced.'
                  : 'Save one vehicle-owned inspection record. Do not create booking or job-order truth here.'}
              </p>
            </div>
            <span className="badge badge-gray">{isTechnician ? 'Assigned vehicle context' : 'Vehicle and booking selectors'}</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {!isTechnician ? (
              <label className="text-xs text-ink-muted">
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
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
            <label className="text-xs text-ink-muted">
              Vehicle
              {isTechnician ? (
                <input
                  value={draft.vehicleId}
                  onChange={(event) => updateDraft({ vehicleId: event.target.value, bookingId: '' })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                  placeholder="Paste vehicle UUID"
                />
              ) : (
                <select
                  value={draft.vehicleId}
                  onChange={(event) => updateDraft({ vehicleId: event.target.value, bookingId: '' })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
            <label className="text-xs text-ink-muted">
              Optional booking
              {isTechnician ? (
                <input
                  value={draft.bookingId}
                  onChange={(event) => updateDraft({ bookingId: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                  placeholder="Booking UUID if this came from intake"
                />
              ) : (
                <select
                  value={draft.bookingId}
                  onChange={(event) => updateDraft({ bookingId: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
            <label className="text-xs text-ink-muted">
              Inspection type
              <select
                value={draft.inspectionType}
                onChange={(event) => updateDraft({ inspectionType: event.target.value })}
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              >
                <option value="intake">Intake</option>
                <option value="pre_repair">Pre Repair</option>
                <option value="completion">Completion</option>
                <option value="return">Return</option>
              </select>
            </label>
            <label className="text-xs text-ink-muted">
              Status
              <select
                value={draft.status}
                onChange={(event) => updateDraft({ status: event.target.value })}
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="needs_followup">Needs Followup</option>
                <option value="void">Void</option>
              </select>
            </label>
            <label className="text-xs text-ink-muted md:col-span-2">
              Notes
              <textarea
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                rows={3}
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                placeholder="Describe the condition observed during intake or inspection."
              />
            </label>
            <label className="text-xs text-ink-muted md:col-span-2">
              Attachment refs
              <input
                value={draft.attachmentRefsText}
                onChange={(event) => updateDraft({ attachmentRefsText: event.target.value })}
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                placeholder="upload://vehicle/intake-front, upload://vehicle/intake-dashboard"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">Primary Finding</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-ink-muted">
                Category
                <select
                  value={draft.findingCategory}
                  onChange={(event) => updateDraft({ findingCategory: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                >
                  {inspectionFindingCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-ink-muted">
                Severity
                <select
                  value={draft.findingSeverity}
                  onChange={(event) => updateDraft({ findingSeverity: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                >
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="text-xs text-ink-muted md:col-span-2">
                Finding label
                <input
                  value={draft.findingLabel}
                  onChange={(event) => updateDraft({ findingLabel: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                  placeholder="Brake pedal response confirmed"
                />
              </label>
              <label className="text-xs text-ink-muted md:col-span-2">
                Finding notes
                <textarea
                  value={draft.findingNotes}
                  onChange={(event) => updateDraft({ findingNotes: event.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${getMessageTone(captureState.status)}`}>
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
                  {isTechnician
                    ? 'Load prior intake, pre-repair, and return records for the vehicle currently being worked on.'
                    : 'Load prior intake and condition records for the vehicle currently being reviewed.'}
                </p>
              </div>
              <span className="badge badge-gray">Read state: {formatLabel(historyState.status)}</span>
            </div>

            {historyState.message ? (
              <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${getMessageTone(historyState.status)}`}>
                {historyState.message}
              </div>
            ) : null}

            {historyState.status === 'history_loading' ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-secondary">
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
                <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-8 text-center">
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
                    ? 'Review findings, verification, and notes before continuing work or adding new inspection evidence.'
                    : 'Verification state is derived from findings and stays separate from lifecycle summary review.'}
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
              <p className="mt-4 rounded-2xl border border-surface-border bg-surface-card p-4 text-sm text-ink-muted">
                Select an inspection from history to review its findings and verification state.
              </p>
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
                ? 'This page supports technician capture and vehicle history review. It should stay focused on evidence and condition tracking, not admin routing.'
                : 'This workspace intentionally exposes existing inspection capability instead of creating duplicate booking, vehicle, job-order, or QA truth.'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">Vehicle History</p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {isTechnician
                ? 'Load prior inspection records before you continue diagnosis, repair, or completion checks.'
                : 'Create and read inspection records from the selected customer vehicle context.'}
            </p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">
              {isTechnician ? 'Workshop Discipline' : 'Queue Expectation'}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {isTechnician
                ? 'Use clear finding labels, verified evidence, and attachment refs so the next handoff is easy to review.'
                : 'A broad intake queue is planned later, so staff should enter a known vehicle id for the demo.'}
            </p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">
              {isTechnician ? 'Job Order Handoff' : 'Product Boundary'}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {isTechnician
                ? 'Use Job Orders for progress and execution updates after inspection capture. This page stays vehicle-history-first.'
                : 'Customer mobile remains customer-only and does not expose staff inspection capture controls.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
