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
  inspectionStaffRoles,
  summarizeInspectionFindings,
} from '@/lib/api/generated/inspections/staff-web-inspections'
import { getInspectionMessageTone } from './digitalIntakeInspectionView.mjs'
import {
  arrivalPhotoSlots,
  buildIntakeInspectionPayload,
  checklistItemOptions,
  createInitialIntakeDraft,
  damageAreaOptions,
  fuelLevelOptions,
  intakeFieldMaxLengths,
} from './digitalIntakeInspectionWorkspaceForm.mjs'
import { getIntakeWorkspaceHeroCopy } from './digitalIntakeInspectionWorkspaceView.mjs'

const intakeStatusMeta = {
  pending: {
    badgeClassName: 'badge badge-orange',
    label: 'Pending draft',
  },
  completed: {
    badgeClassName: 'badge badge-green',
    label: 'Completed intake',
  },
}

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

const formatVehicleOptionLabel = (vehicle) =>
  [
    vehicle?.plateNumber || vehicle?.id,
    [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' / ')

const formatBookingOptionLabel = (booking) =>
  [
    booking?.customerLabel,
    booking?.scheduledDate,
    formatLabel(booking?.status),
  ]
    .filter(Boolean)
    .join(' / ')

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

const getDraftStatusMeta = (status) =>
  intakeStatusMeta[status] ?? {
    badgeClassName: 'badge badge-gray',
    label: formatLabel(status) || 'Intake draft',
  }

const getUserDisplayLabel = (user) =>
  user?.displayName ||
  user?.name ||
  user?.fullName ||
  user?.roleLabel ||
  user?.email ||
  user?.id ||
  ''

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

function IntakeSection({ title, description, badge, children }) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-primary">{title}</p>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {badge ? <span className="badge badge-gray">{badge}</span> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function DigitalIntakeInspectionWorkspace() {
  const user = useUser()
  const role = user?.role ?? null
  const isTechnician = role === 'technician'
  const canUseInspection = inspectionStaffRoles.includes(role)
  const [draft, setDraft] = useState(() => createInitialIntakeDraft())
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
  const [submitIntent, setSubmitIntent] = useState(null)

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
  const customerVehicleOptions = useMemo(() => selectedCustomer?.vehicles ?? [], [selectedCustomer])
  const selectedVehicle = useMemo(
    () => customerVehicleOptions.find((vehicle) => vehicle.id === draft.vehicleId) ?? null,
    [customerVehicleOptions, draft.vehicleId],
  )
  const selectedBooking = useMemo(
    () => vehicleBookings.find((booking) => booking.id === draft.bookingId) ?? null,
    [vehicleBookings, draft.bookingId],
  )
  const selectedInspection = useMemo(
    () => getSelectedInspection(inspections, selectedInspectionId),
    [inspections, selectedInspectionId],
  )
  const inspectionSummaryCount = selectedInspection?.findings?.length ?? 0
  const heroCopy = getIntakeWorkspaceHeroCopy(isTechnician)
  const draftStatus = getDraftStatusMeta(draft.status)
  const defaultReceivedByStaff = getUserDisplayLabel(user)
  const isSubmittingPending = captureState.status === 'capture_submitting' && submitIntent === 'pending'
  const isSubmittingCompleted = captureState.status === 'capture_submitting' && submitIntent === 'completed'

  const intakeContext = useMemo(() => {
    const items = []

    if (selectedCustomer) {
      items.push({
        label: 'Customer',
        value: selectedCustomer.displayName || selectedCustomer.email || selectedCustomer.id,
        sub: selectedCustomer.email || selectedCustomer.id,
      })
    }

    if (selectedVehicle) {
      items.push({
        label: 'Vehicle',
        value: formatVehicleOptionLabel(selectedVehicle),
        sub: `Vehicle ID: ${selectedVehicle.id}`,
      })
    } else if (draft.vehicleId.trim()) {
      items.push({
        label: 'Vehicle',
        value: draft.vehicleId.trim(),
        sub: isTechnician ? 'Manual vehicle reference' : 'Vehicle selected without profile details',
      })
    }

    if (selectedBooking) {
      items.push({
        label: 'Booking',
        value: selectedBooking.id,
        sub: formatBookingOptionLabel(selectedBooking),
      })
    } else if (draft.bookingId.trim()) {
      items.push({
        label: 'Booking',
        value: draft.bookingId.trim(),
        sub: 'Manual booking reference',
      })
    }

    return items
  }, [draft.bookingId, draft.vehicleId, isTechnician, selectedBooking, selectedCustomer, selectedVehicle])

  const updateDraft = (patch) => {
    setDraft((current) => ({
      ...current,
      ...patch,
    }))
  }

  const updateArrivalPhoto = (slot, value) => {
    setDraft((current) => ({
      ...current,
      arrivalPhotos: {
        ...current.arrivalPhotos,
        [slot]: value,
      },
    }))
  }

  const updateChecklistItem = (item, value) => {
    setDraft((current) => ({
      ...current,
      checklist: {
        ...current.checklist,
        [item]: value,
      },
    }))
  }

  const toggleDamageArea = (area) => {
    setDraft((current) => ({
      ...current,
      damageAreas: current.damageAreas.includes(area)
        ? current.damageAreas.filter((item) => item !== area)
        : [...current.damageAreas, area],
    }))
  }

  const buildPayload = (nextDraft = draft) =>
    buildIntakeInspectionPayload({
      draft: nextDraft,
      userId: user?.id,
    })

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

  const saveInspection = async (nextStatus) => {
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

    if (!user?.accessToken) {
      setCaptureState({
        status: 'capture_failed',
        message: 'A valid staff session is required before saving an inspection.',
      })
      return
    }

    const normalizedDraft = {
      ...draft,
      status: nextStatus,
      receivedByStaff: draft.receivedByStaff || defaultReceivedByStaff,
    }

    setSubmitIntent(nextStatus)
    setCaptureState({
      status: 'capture_submitting',
      message: '',
    })

    try {
      const savedInspection = await createVehicleInspection({
        vehicleId: normalizedDraft.vehicleId.trim(),
        inspection: buildPayload(normalizedDraft),
        accessToken: user.accessToken,
      })
      const nextCaptureState = getStaffInspectionCaptureSuccessState(savedInspection)

      setInspections((current) => [savedInspection, ...current.filter((item) => item.id !== savedInspection.id)])
      setSelectedInspectionId(savedInspection.id)
      setDraft((current) => ({
        ...current,
        status: savedInspection.status || nextStatus,
        receivedByStaff: current.receivedByStaff || defaultReceivedByStaff,
      }))
      setSubmitIntent(null)
      setCaptureState({
        status: nextCaptureState,
        message: `${
          savedInspection.status === 'pending' ? 'Pending intake draft saved' : 'Intake inspection saved'
        } with ${formatLabel(savedInspection.verificationState)} evidence state.`,
      })
      setHistoryState({
        status: 'history_loaded',
        message: 'Latest saved inspection is selected below.',
      })
    } catch (error) {
      let nextCaptureState = 'capture_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextCaptureState = 'forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextCaptureState = 'vehicle_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextCaptureState = 'booking_vehicle_conflict'
      } else if (error instanceof ApiError && error.status === 400) {
        nextCaptureState = 'capture_failed'
      }

      setCaptureState({
        status: nextCaptureState,
        message: error?.message || 'Inspection could not be saved.',
      })
      setSubmitIntent(null)
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
              <p className="card-title">Booking Reference</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Start from the customer, vehicle, and booking, then capture the vehicle&apos;s arrival condition before
                service begins.
              </p>
            </div>
            <span className={draftStatus.badgeClassName}>{draftStatus.label}</span>
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
                      {formatVehicleOptionLabel(vehicle)}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="label md:col-span-2">
              Optional booking
              {isTechnician ? (
                <input
                  value={draft.bookingId}
                  onChange={(event) => updateDraft({ bookingId: event.target.value })}
                  className="input"
                  placeholder="Booking UUID if this intake came from a scheduled visit"
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
                      {formatBookingOptionLabel(booking)}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>

          <div className="mt-5 space-y-4">
            <IntakeSection
              title="Vehicle Details"
              description="Record the odometer and a concise arrival summary for the selected intake context."
              badge={draft.vehicleId ? 'Vehicle selected' : 'Vehicle required'}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="label">
                  Current odometer (km)
                  <input
                    value={draft.currentOdometerKm}
                    onChange={(event) => updateDraft({ currentOdometerKm: event.target.value })}
                    className="input"
                    inputMode="numeric"
                    maxLength={intakeFieldMaxLengths.currentOdometerKm}
                    placeholder="45230"
                  />
                </label>
                <div className="rounded-xl border border-surface-border bg-surface-raised p-4 md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">Selected context</p>
                  {intakeContext.length ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {intakeContext.map((item) => (
                        <div key={item.label} className="rounded-xl border border-surface-border bg-surface-card p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">{item.label}</p>
                          <p className="mt-2 text-sm font-semibold text-ink-primary">{item.value}</p>
                          {item.sub ? <p className="mt-1 text-xs text-ink-muted">{item.sub}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-ink-muted">
                      Select a customer and vehicle, or paste the assigned vehicle reference first.
                    </p>
                  )}
                </div>
                <label className="label md:col-span-2">
                  Service concern on arrival
                  <textarea
                    value={draft.serviceConcern}
                    onChange={(event) => updateDraft({ serviceConcern: event.target.value })}
                    rows={3}
                    className="input min-h-[96px] resize-y"
                    maxLength={intakeFieldMaxLengths.serviceConcern}
                    placeholder="Summarize the customer-reported concern or requested check."
                  />
                </label>
              </div>
            </IntakeSection>

            <IntakeSection
              title="Fuel Level On Arrival"
              description="Use the intake-first fuel snapshot instead of a free-form note."
              badge={draft.fuelLevel || 'Not set'}
            >
              <div className="booking-segmented-control w-full flex-wrap">
                {fuelLevelOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateDraft({ fuelLevel: option })}
                    className={`booking-tab-button ${draft.fuelLevel === option ? 'booking-tab-button-active' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </IntakeSection>

            <IntakeSection
              title="Existing Damage / Marks"
              description="Mark visible areas with existing damage or special attention points before the vehicle enters service."
              badge={draft.damageAreas.length ? `${draft.damageAreas.length} area(s)` : 'None marked'}
            >
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {damageAreaOptions.map((area) => {
                  const isSelected = draft.damageAreas.includes(area.value)

                  return (
                    <button
                      key={area.value}
                      type="button"
                      onClick={() => toggleDamageArea(area.value)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-brand-orange bg-brand-orange/10 text-ink-primary'
                          : 'border-surface-border bg-surface-raised text-ink-secondary hover:border-brand-orange/40'
                      }`}
                    >
                      {area.label}
                    </button>
                  )
                })}
              </div>
              <label className="label mt-4">
                Additional damage notes
                <textarea
                  value={draft.damageNotes}
                  onChange={(event) => updateDraft({ damageNotes: event.target.value })}
                  rows={3}
                  className="input min-h-[96px] resize-y"
                  maxLength={intakeFieldMaxLengths.damageNotes}
                  placeholder="Describe scratches, dents, chips, or anything the next handoff should know."
                />
              </label>
            </IntakeSection>

            <IntakeSection
              title="Arrival Photos"
              description="Use named slots for the existing upload-ref workflow. This screen records refs only."
              badge="Ref-based save"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {arrivalPhotoSlots.map((slot) => (
                  <label key={slot.value} className="label">
                    {slot.label}
                    <input
                      value={draft.arrivalPhotos[slot.value]}
                      onChange={(event) => updateArrivalPhoto(slot.value, event.target.value)}
                      className="input"
                      placeholder={`upload://vehicle/${slot.value}`}
                    />
                  </label>
                ))}
              </div>
            </IntakeSection>

            <IntakeSection
              title="Pre-Service Checklist"
              description="Capture a quick OK or Issue result for the standard arrival checks."
              badge="OK / Issue"
            >
              <div className="space-y-3">
                {checklistItemOptions.map((item) => (
                  <div
                    key={item.value}
                    className="rounded-xl border border-surface-border bg-surface-raised p-3 md:flex md:items-center md:justify-between"
                  >
                    <p className="text-sm font-medium text-ink-primary">{item.label}</p>
                    <div className="booking-segmented-control mt-3 w-full flex-wrap md:mt-0 md:w-auto">
                      {[
                        { value: 'ok', label: 'OK' },
                        { value: 'issue', label: 'Issue' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateChecklistItem(item.value, option.value)}
                          className={`booking-tab-button ${
                            draft.checklist[item.value] === option.value ? 'booking-tab-button-active' : ''
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </IntakeSection>

            <IntakeSection
              title="Customer Items In Vehicle"
              description="Note any personal items or accessories that should be acknowledged at handoff."
            >
              <label className="label">
                Items left in vehicle
                <textarea
                  value={draft.customerItems}
                  onChange={(event) => updateDraft({ customerItems: event.target.value })}
                  rows={3}
                  className="input min-h-[96px] resize-y"
                  maxLength={intakeFieldMaxLengths.customerItems}
                  placeholder="Dashcam, child seat, parking card, tools, loose valuables, and similar items."
                />
              </label>
            </IntakeSection>

            <IntakeSection
              title="Customer Acknowledgment"
              description="Capture the sign-off details that confirm the arrival condition was reviewed with the customer."
              badge={draft.customerAcknowledged ? 'Acknowledged' : 'Awaiting acknowledgment'}
            >
              <label className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={draft.customerAcknowledged}
                  onChange={(event) => updateDraft({ customerAcknowledged: event.target.checked })}
                  className="h-4 w-4 accent-[#f07c00]"
                />
                Customer acknowledged the intake condition summary.
              </label>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="label">
                  Customer signature name
                  <input
                    value={draft.customerSignatureName}
                    onChange={(event) => updateDraft({ customerSignatureName: event.target.value })}
                    className="input"
                    maxLength={intakeFieldMaxLengths.customerSignatureName}
                    placeholder="Customer full name"
                  />
                </label>
                <label className="label">
                  Received by staff
                  <input
                    value={draft.receivedByStaff}
                    onChange={(event) => updateDraft({ receivedByStaff: event.target.value })}
                    className="input"
                    maxLength={intakeFieldMaxLengths.receivedByStaff}
                    placeholder={defaultReceivedByStaff || 'Staff member name'}
                  />
                </label>
                <label className="label md:col-span-2">
                  Additional staff notes
                  <textarea
                    value={draft.notes}
                    onChange={(event) => updateDraft({ notes: event.target.value })}
                    rows={3}
                    className="input min-h-[96px] resize-y"
                    maxLength={intakeFieldMaxLengths.notes}
                    placeholder="Optional extra intake notes that should travel with the inspection record."
                  />
                </label>
              </div>
            </IntakeSection>
          </div>

          {captureState.message ? (
            <div className={`mt-4 ${getMessageTone(captureState.status)}`}>
              {captureState.message}
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-surface-border bg-surface-card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink-primary">Actions</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Save a pending draft while the intake is still in progress, or submit the completed intake once the
                  arrival check is captured.
                </p>
              </div>
              <span className="badge badge-gray">History stays on the right</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveInspection('pending')}
                disabled={captureState.status === 'capture_submitting'}
                className="btn-ghost"
              >
                {isSubmittingPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileSearch size={15} />
                )}
                Save Pending Draft
              </button>
              <button
                type="button"
                onClick={() => void saveInspection('completed')}
                disabled={captureState.status === 'capture_submitting'}
                className="btn-primary"
              >
                {isSubmittingCompleted ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <BadgeCheck size={15} />
                )}
                Submit Completed Intake
              </button>
              <button type="button" onClick={loadHistory} className="btn-ghost">
                <FileSearch size={15} />
                Load Vehicle History
              </button>
            </div>
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
                    {inspectionSummaryCount} finding{inspectionSummaryCount === 1 ? '' : 's'} attached to this inspection
                    record.
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
    </div>
  )
}
