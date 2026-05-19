'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  FileSearch,
  Loader2,
  Plus,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import PortalSelect from '@/components/ui/PortalSelect'
import { ApiError, listAdminCustomers, listStaffAccounts } from '@/lib/authClient'
import { listVehicleBookings } from '@/lib/bookingStaffClient'
import {
  createVehicleInspection,
  listVehicleInspections,
  uploadVehicleInspectionPhoto,
} from '@/lib/inspectionStaffClient'
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
  getReasonForVisitOptions,
  getIntakeRequirementOptions,
  intakeFieldMaxLengths,
  resolveIntakeNextRoute,
  sanitizeIntakeOdometer,
} from './digitalIntakeInspectionWorkspaceForm.mjs'
import {
  getArrivalPhotoButtonLabel,
  getArrivalPhotoDisplayLabel,
  getArrivalPhotoTemporaryRef,
  isArrivalPhotoTemporaryRef,
  getIntakeRequirementsBadge,
  getIntakeWorkspaceHeroCopy,
  getIntakeWorkspacePrimaryActionLabel,
} from './digitalIntakeInspectionWorkspaceView.mjs'

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

const arrivalTypeOptions = [
  { value: 'walk_in', label: 'Walk-in', helper: 'No advance booking' },
  { value: 'with_booking', label: 'Booking', helper: 'Scheduled arrival' },
]

const visitTypeOptions = [
  { value: 'regular_service', label: 'Regular Service', nextRoute: 'service' },
  { value: 'insurance_related', label: 'Insurance', nextRoute: 'insurance' },
  { value: 'back_job_complaint', label: 'Back Job', nextRoute: 'complaint' },
  { value: 'inspection_only', label: 'Inspection Only', nextRoute: 'inspection' },
]

const nextRouteLabels = {
  service: 'Service bay handoff',
  insurance: 'Insurance intake handoff',
  complaint: 'Return visit review',
  inspection: 'Inspection-only handoff',
}

const intakeFlowTabs = [
  { key: 'arrival_visit', label: 'Arrival & Visit' },
  { key: 'concern_requirements', label: 'Concern & Requirements' },
  { key: 'inspection_signoff', label: 'Inspection & Signoff' },
]

const formatLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

const getIntakeTabState = (draft) => {
  const arrivalReady = Boolean(String(draft.vehicleId ?? '').trim()) && Boolean(String(draft.visitType ?? '').trim())
  const concernReady =
    Boolean(String(draft.reasonForVisit ?? '').trim()) &&
    Boolean(String(draft.serviceConcern ?? '').trim()) &&
    Boolean(String(draft.requestedServiceSummary ?? '').trim())
  const inspectionReady =
    Boolean(String(draft.currentOdometerKm ?? '').trim()) &&
    Boolean(String(draft.receivedByStaff ?? '').trim()) &&
    Boolean(draft.customerAcknowledged)

  return {
    arrival_visit: arrivalReady ? 'ready' : 'incomplete',
    concern_requirements: concernReady ? 'ready' : 'incomplete',
    inspection_signoff: inspectionReady ? 'ready' : 'incomplete',
  }
}

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

const getResetIntakeDraft = ({ receivedByStaff = '' } = {}) => ({
  ...createInitialIntakeDraft(),
  receivedByStaff,
})

const isAttachmentLinkOpenable = (reference) => /^https?:\/\//i.test(String(reference ?? '').trim())

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

function IntakeSection({ step, title, description, badge, children }) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {step ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Step {step}
            </p>
          ) : null}
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
  const isTechnician = ['technician', 'head_technician'].includes(role)
  const canUseInspection = inspectionStaffRoles.includes(role)
  const [draft, setDraft] = useState(() => createInitialIntakeDraft())
  const [inspections, setInspections] = useState([])
  const [customers, setCustomers] = useState([])
  const [staffAccounts, setStaffAccounts] = useState([])
  const [vehicleBookings, setVehicleBookings] = useState([])
  const [selectedInspectionId, setSelectedInspectionId] = useState('')
  const [historyState, setHistoryState] = useState({
    status: 'history_empty',
    message: 'Select a vehicle to load live inspection history, or save a first inspection for that vehicle.',
  })
  const [captureState, setCaptureState] = useState({
    status: 'capture_ready',
    message: '',
  })
  const [submitIntent, setSubmitIntent] = useState(null)
  const [activeIntakeTab, setActiveIntakeTab] = useState('arrival_visit')
  const [arrivalPhotoUploads, setArrivalPhotoUploads] = useState({})
  const arrivalPhotoInputRefs = useRef({})

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
    if (!user?.accessToken) {
      setCustomers([])
      return
    }

    void listAdminCustomers(user.accessToken)
      .then((items) => setCustomers(items))
      .catch(() => setCustomers([]))
  }, [user?.accessToken])

  useEffect(() => {
    if (!user?.accessToken) {
      setStaffAccounts([])
      return
    }

    void listStaffAccounts(user.accessToken)
      .then((items) => setStaffAccounts(items.filter((account) => account?.isActive !== false)))
      .catch(() => setStaffAccounts([]))
  }, [user?.accessToken])

  useEffect(() => {
    if (!draft.vehicleId || !user?.accessToken) {
      setVehicleBookings([])
      return
    }

    void listVehicleBookings(draft.vehicleId, user.accessToken)
      .then((items) => setVehicleBookings(items))
      .catch(() => setVehicleBookings([]))
  }, [draft.vehicleId, user?.accessToken])

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
  const customerSelectItems = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.displayName || customer.email || customer.id,
        helper: customer.email || customer.id,
      })),
    [customers],
  )
  const vehicleSelectItems = useMemo(
    () =>
      customerVehicleOptions.map((vehicle) => ({
        value: vehicle.id,
        label: formatVehicleOptionLabel(vehicle),
      })),
    [customerVehicleOptions],
  )
  const bookingSelectItems = useMemo(
    () =>
      vehicleBookings.map((booking) => ({
        value: booking.id,
        label: formatBookingOptionLabel(booking),
      })),
    [vehicleBookings],
  )
  const inspectionSummaryCount = selectedInspection?.findings?.length ?? 0
  const heroCopy = getIntakeWorkspaceHeroCopy(isTechnician)
  const draftStatus = getDraftStatusMeta(draft.status)
  const defaultReceivedByStaff = getUserDisplayLabel(user)
  const isSubmittingPending = captureState.status === 'capture_submitting' && submitIntent === 'pending'
  const isSubmittingCompleted = captureState.status === 'capture_submitting' && submitIntent === 'completed'
  const selectedVisitTypeMeta =
    visitTypeOptions.find((option) => option.value === draft.visitType) ?? visitTypeOptions[0]
  const effectiveNextRoute = resolveIntakeNextRoute(draft.visitType, draft.nextRoute)
  const nextRouteLabel =
    nextRouteLabels[effectiveNextRoute] ?? (formatLabel(effectiveNextRoute) || 'Next handoff')
  const primaryActionLabel = getIntakeWorkspacePrimaryActionLabel(draft.visitType)
  const intakeTabState = useMemo(() => getIntakeTabState(draft), [draft])
  const visibleRequirementOptions = useMemo(
    () =>
      getIntakeRequirementOptions({
        arrivalType: draft.arrivalType,
        visitType: draft.visitType,
      }),
    [draft.arrivalType, draft.visitType],
  )
  const reasonForVisitOptions = useMemo(
    () => getReasonForVisitOptions({ visitType: draft.visitType, currentValue: draft.reasonForVisit }),
    [draft.reasonForVisit, draft.visitType],
  )
  const reasonForVisitSelectItems = useMemo(
    () => reasonForVisitOptions.map((option) => ({ value: option, label: option })),
    [reasonForVisitOptions],
  )
  const receivedByStaffOptions = useMemo(() => {
    const options = new Set()
    const currentValue = String(draft.receivedByStaff ?? '').trim()
    const currentUserLabel = String(defaultReceivedByStaff ?? '').trim()

    if (currentValue) {
      options.add(currentValue)
    }
    if (currentUserLabel) {
      options.add(currentUserLabel)
    }

    for (const account of staffAccounts) {
      const label = String(account?.displayName ?? account?.email ?? '').trim()
      if (label) {
        options.add(label)
      }
    }

    return [...options]
  }, [defaultReceivedByStaff, draft.receivedByStaff, staffAccounts])
  const receivedByStaffSelectItems = useMemo(
    () => receivedByStaffOptions.map((option) => ({ value: option, label: option })),
    [receivedByStaffOptions],
  )
  const activeRequirementsChecklist = useMemo(
    () =>
      visibleRequirementOptions.reduce((accumulator, option) => {
        accumulator[option.value] = draft.requirementsChecklist[option.value]
        return accumulator
      }, {}),
    [draft.requirementsChecklist, visibleRequirementOptions],
  )
  const requirementsBadge = getIntakeRequirementsBadge(
    activeRequirementsChecklist,
    draft.missingRequirementsNote,
  )

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

  const updateVisitType = (visitType) => {
    setDraft((current) => ({
      ...current,
      visitType,
      nextRoute: resolveIntakeNextRoute(visitType, current.nextRoute),
    }))
  }

  const updateRequirement = (field, checked) => {
    setDraft((current) => ({
      ...current,
      requirementsChecklist: {
        ...current.requirementsChecklist,
        [field]: checked,
      },
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

  const updateArrivalPhotoFile = (slot, file) => {
    if (!file || typeof FileReader === 'undefined') {
      updateArrivalPhoto(slot, '')
      setArrivalPhotoUploads((current) => ({
        ...current,
        [slot]: null,
      }))
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setArrivalPhotoUploads((current) => ({
        ...current,
        [slot]: {
          file,
          fileName: file.name,
          previewUrl: typeof reader.result === 'string' ? reader.result : '',
        },
      }))
      updateArrivalPhoto(slot, getArrivalPhotoTemporaryRef(slot))
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    }

    reader.onerror = () => {
      setArrivalPhotoUploads((current) => ({
        ...current,
        [slot]: null,
      }))
      updateArrivalPhoto(slot, '')
    }

    reader.readAsDataURL(file)
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

  const resolvePendingArrivalPhotoFile = async (slot) => {
    const uploadState = arrivalPhotoUploads[slot]
    const directFile = uploadState?.file

    if (
      directFile &&
      typeof directFile === 'object' &&
      typeof directFile.arrayBuffer === 'function' &&
      typeof directFile.size === 'number'
    ) {
      return {
        file: directFile,
        fileName: directFile.name || `${slot}.jpg`,
      }
    }

    const previewUrl = String(uploadState?.previewUrl ?? '').trim()
    if (previewUrl.startsWith('data:')) {
      const previewResponse = await fetch(previewUrl)
      const previewBlob = await previewResponse.blob()
      return {
        file: previewBlob,
        fileName: String(uploadState?.fileName ?? `${slot}.jpg`).trim() || `${slot}.jpg`,
      }
    }

    return null
  }

  const persistPendingArrivalPhotos = async (nextDraft) => {
    const vehicleId = String(nextDraft.vehicleId ?? '').trim()
    const pendingSlots = Object.entries(nextDraft.arrivalPhotos ?? {}).filter(([, value]) =>
      isArrivalPhotoTemporaryRef(value),
    )

    if (!pendingSlots.length) {
      return nextDraft
    }

    if (!vehicleId) {
      throw new ApiError('Select a vehicle before uploading arrival photos.', 400, {
        path: '/api/vehicles/:id/inspections/photos/upload',
      })
    }

    const uploadedRefs = await Promise.all(
      pendingSlots.map(async ([slot]) => {
        const resolvedUpload = await resolvePendingArrivalPhotoFile(slot)

        if (!resolvedUpload) {
          return [slot, '']
        }

        const uploadedPhoto = await uploadVehicleInspectionPhoto({
          vehicleId,
          slot,
          file: resolvedUpload.file,
          fileName: resolvedUpload.fileName,
          accessToken: user.accessToken,
        })

        return [slot, uploadedPhoto.attachmentRef]
      }),
    )

    setArrivalPhotoUploads((current) => {
      const nextUploads = { ...current }
      for (const [slot, uploadedRef] of uploadedRefs) {
        if (!uploadedRef) {
          delete nextUploads[slot]
        } else if (nextUploads[slot]) {
          nextUploads[slot] = {
            ...nextUploads[slot],
            attachmentRef: uploadedRef,
          }
          delete nextUploads[slot].file
        }
      }
      return nextUploads
    })

    return {
      ...nextDraft,
      arrivalPhotos: {
        ...nextDraft.arrivalPhotos,
        ...Object.fromEntries(uploadedRefs),
      },
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

  const saveInspection = async (nextStatus) => {
    if (captureState.status === 'capture_submitting') {
      return
    }

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
      message: 'Saving intake and syncing arrival evidence...',
    })

    try {
      const normalizedDraftWithUploads = await persistPendingArrivalPhotos(normalizedDraft)
      const savedInspection = await createVehicleInspection({
        vehicleId: normalizedDraftWithUploads.vehicleId.trim(),
        inspection: buildPayload(normalizedDraftWithUploads),
        accessToken: user.accessToken,
      })
      const nextCaptureState = getStaffInspectionCaptureSuccessState(savedInspection)

      setInspections((current) => [savedInspection, ...current.filter((item) => item.id !== savedInspection.id)])
      setSelectedInspectionId(savedInspection.id)
      setDraft((current) =>
        getResetIntakeDraft({
          receivedByStaff: current.receivedByStaff || defaultReceivedByStaff,
        }),
      )
      setArrivalPhotoUploads({})
      setActiveIntakeTab('arrival_visit')
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
              <p className="card-title">Front-Desk Flow</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Capture the visit, then record the vehicle condition.
              </p>
            </div>
            <span className={draftStatus.badgeClassName}>{draftStatus.label}</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {intakeFlowTabs.map((tab) => {
              const isReady = intakeTabState[tab.key] === 'ready'
              const isActive = activeIntakeTab === tab.key

              return (
                <button
                  type="button"
                  onClick={() => setActiveIntakeTab(tab.key)}
                  key={tab.key}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-brand-orange bg-brand-orange/10 shadow-[0_0_0_1px_rgba(240,124,0,0.2)]'
                      : isReady
                        ? 'border-emerald-500/25 bg-emerald-500/10'
                        : 'border-surface-border bg-surface-raised hover:border-brand-orange/35'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-primary">{tab.label}</p>
                    {isActive ? <span className="badge badge-orange">Open</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {isReady ? 'Ready' : 'Still needs input'}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="mt-5 space-y-4">
            {activeIntakeTab === 'arrival_visit' ? (
              <>
                <IntakeSection
                  step="1"
                  title="Arrival"
                  description="Identify the arrival and link the right record."
                  badge={draft.arrivalType === 'with_booking' ? 'Booking arrival' : 'Walk-in arrival'}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-surface-border bg-surface-raised p-4 md:col-span-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">Arrival mode</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {arrivalTypeOptions.map((option) => {
                          const isSelected = draft.arrivalType === option.value

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateDraft({ arrivalType: option.value })}
                              className={`rounded-2xl border p-4 text-left transition-colors ${
                                isSelected
                                  ? 'border-brand-orange bg-brand-orange/10'
                                  : 'border-surface-border bg-surface-card hover:border-brand-orange/40'
                              }`}
                            >
                              <p className="text-sm font-semibold text-ink-primary">{option.label}</p>
                              <p className="mt-1 text-xs text-ink-muted">{option.helper}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <label className="label">
                      Customer
                      <PortalSelect
                        value={draft.customerUserId}
                        onValueChange={(nextValue) =>
                          updateDraft({
                            customerUserId: nextValue,
                            vehicleId: '',
                            bookingId: '',
                          })
                        }
                        items={customerSelectItems}
                        placeholder="Choose a customer"
                        emptyOptionLabel="Choose a customer"
                      />
                    </label>
                    <label className="label">
                      Vehicle
                      <PortalSelect
                        value={draft.vehicleId}
                        onValueChange={(nextValue) => updateDraft({ vehicleId: nextValue, bookingId: '' })}
                        items={vehicleSelectItems}
                        placeholder="Choose a customer vehicle"
                        emptyOptionLabel="Choose a customer vehicle"
                      />
                    </label>
                    <label className="label md:col-span-2">
                      {draft.arrivalType === 'with_booking' ? 'Booking' : 'Booking reference'}
                      <PortalSelect
                        value={draft.bookingId}
                        onValueChange={(nextValue) => updateDraft({ bookingId: nextValue })}
                        items={bookingSelectItems}
                        placeholder={draft.arrivalType === 'with_booking' ? 'Choose a booking' : 'No booking link'}
                        emptyOptionLabel={draft.arrivalType === 'with_booking' ? 'Choose a booking' : 'No booking link'}
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
                          Link the customer and vehicle before you move forward.
                        </p>
                      )}
                    </div>
                  </div>
                </IntakeSection>

                <IntakeSection
                  step="2"
                  title="Visit Type"
                  description="Pick the handoff lane."
                  badge={selectedVisitTypeMeta.label}
                >
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {visitTypeOptions.map((option) => {
                        const isSelected = draft.visitType === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateVisitType(option.value)}
                            className={`rounded-2xl border p-4 text-left transition-colors ${
                              isSelected
                                ? 'border-brand-orange bg-brand-orange/10'
                                : 'border-surface-border bg-surface-raised hover:border-brand-orange/40'
                            }`}
                          >
                            <p className="text-sm font-semibold text-ink-primary">{option.label}</p>
                            <p className="mt-1 text-xs text-ink-muted">{nextRouteLabels[option.nextRoute]}</p>
                          </button>
                        )
                      })}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={draft.isRepeatVisit}
                          onChange={(event) => updateDraft({ isRepeatVisit: event.target.checked })}
                          className="h-4 w-4 accent-[#f07c00]"
                        />
                        Repeat visit
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={draft.urgencyFlag}
                          onChange={(event) => updateDraft({ urgencyFlag: event.target.checked })}
                          className="h-4 w-4 accent-[#f07c00]"
                        />
                        Mark as urgent
                      </label>
                    </div>
                  </div>
                </IntakeSection>
              </>
            ) : null}

            {activeIntakeTab === 'concern_requirements' ? (
              <>
                <IntakeSection
                  step="3"
                  title="Customer Concern"
                  description="Capture the front-desk summary."
                  badge={draft.serviceConcern.trim() ? 'Concern captured' : 'Waiting for concern'}
                >
                  <div className="grid gap-3">
                    <label className="label">
                      Reason for visit
                      <PortalSelect
                        value={draft.reasonForVisit}
                        onValueChange={(nextValue) => updateDraft({ reasonForVisit: nextValue })}
                        items={reasonForVisitSelectItems}
                        placeholder="Select the main reason for this visit"
                        emptyOptionLabel="Select the main reason for this visit"
                      />
                    </label>
                    <label className="label">
                      Customer concern
                      <textarea
                        value={draft.serviceConcern}
                        onChange={(event) => updateDraft({ serviceConcern: event.target.value })}
                        rows={3}
                        className="input min-h-[96px] resize-y"
                        maxLength={intakeFieldMaxLengths.serviceConcern}
                        placeholder="Summarize the reported issue."
                      />
                    </label>
                    <label className="label">
                      Requested service summary
                      <textarea
                        value={draft.requestedServiceSummary}
                        onChange={(event) => updateDraft({ requestedServiceSummary: event.target.value })}
                        rows={3}
                        className="input min-h-[96px] resize-y"
                        maxLength={intakeFieldMaxLengths.requestedServiceSummary}
                        placeholder="What should happen next?"
                      />
                    </label>
                  </div>
                </IntakeSection>

                <IntakeSection
                  step="4"
                  title="Requirements"
                  description="Check what the customer already brought in."
                  badge={requirementsBadge}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleRequirementOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(draft.requirementsChecklist[option.value])}
                          onChange={(event) => updateRequirement(option.value, event.target.checked)}
                          className="h-4 w-4 accent-[#f07c00]"
                        />
                        <span>
                          <span className="font-medium text-ink-primary">{option.label}</span>
                          <span className="mt-1 block text-xs text-ink-muted">
                            {option.required ? 'Required for this visit.' : 'Optional for this visit.'}
                            {option.helper ? ` ${option.helper}` : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <label className="label mt-4">
                    Missing requirements note
                    <textarea
                      value={draft.missingRequirementsNote}
                      onChange={(event) => updateDraft({ missingRequirementsNote: event.target.value })}
                      rows={3}
                      className="input min-h-[96px] resize-y"
                      maxLength={intakeFieldMaxLengths.missingRequirementsNote}
                      placeholder="List anything still needed."
                    />
                  </label>
                </IntakeSection>
              </>
            ) : null}

            {activeIntakeTab === 'inspection_signoff' ? (
              <IntakeSection
                step="5"
                title="Arrival Inspection"
                description="Record the condition before handoff."
                badge={draft.damageAreas.length ? `${draft.damageAreas.length} marked area(s)` : 'No damage marked'}
              >
                <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="label">
                    Current odometer (km)
                    <input
                      value={draft.currentOdometerKm}
                      onChange={(event) =>
                        updateDraft({ currentOdometerKm: sanitizeIntakeOdometer(event.target.value) })
                      }
                      className="input"
                      inputMode="numeric"
                      maxLength={intakeFieldMaxLengths.currentOdometerKm}
                      placeholder="45230"
                    />
                  </label>
                  <div>
                    <p className="label">Fuel level on arrival</p>
                    <div className="booking-segmented-control w-full flex-wrap">
                      {fuelLevelOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateDraft({ fuelLevel: option })}
                          className={`booking-tab-button ${
                            draft.fuelLevel === option ? 'booking-tab-button-active' : ''
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="label">Existing damage or marks</p>
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
                </div>

                <label className="label">
                  Additional damage notes
                  <textarea
                    value={draft.damageNotes}
                    onChange={(event) => updateDraft({ damageNotes: event.target.value })}
                    rows={3}
                    className="input min-h-[96px] resize-y"
                    maxLength={intakeFieldMaxLengths.damageNotes}
                    placeholder="Add quick condition notes."
                  />
                </label>

                <div>
                  <p className="label">Arrival photos</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {arrivalPhotoSlots.map((slot) => (
                      <div key={slot.value}>
                        <p className="label">{slot.label}</p>
                        <input
                          ref={(node) => {
                            arrivalPhotoInputRefs.current[slot.value] = node
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const [file] = Array.from(event.target.files ?? [])
                            updateArrivalPhotoFile(slot.value, file)
                            event.target.value = ''
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => arrivalPhotoInputRefs.current[slot.value]?.click()}
                          className="group flex h-[188px] w-full flex-col justify-between rounded-2xl border border-dashed border-surface-border bg-surface-raised p-4 text-left transition-colors hover:border-brand-orange/50 hover:bg-surface-hover"
                        >
                          {arrivalPhotoUploads[slot.value]?.previewUrl ? (
                            <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
                              <Image
                                src={arrivalPhotoUploads[slot.value].previewUrl}
                                alt={`${slot.label} preview`}
                                width={640}
                                height={192}
                                className="h-24 w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-24 items-center justify-center rounded-xl border border-surface-border bg-surface-card text-ink-muted transition-colors group-hover:text-brand-orange">
                              <div className="flex flex-col items-center gap-2 text-center">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-surface-raised">
                                  <Plus size={18} />
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                                  Add photo
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-ink-primary">
                              {getArrivalPhotoButtonLabel(arrivalPhotoUploads[slot.value]?.fileName)}
                            </p>
                            <p className="truncate text-sm leading-6 text-ink-muted">
                              {getArrivalPhotoDisplayLabel(arrivalPhotoUploads[slot.value]?.fileName)}
                            </p>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label">Inspection checklist</p>
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
                </div>

                <label className="label">
                  Items left in vehicle
                  <textarea
                    value={draft.customerItems}
                    onChange={(event) => updateDraft({ customerItems: event.target.value })}
                    rows={3}
                    className="input min-h-[96px] resize-y"
                    maxLength={intakeFieldMaxLengths.customerItems}
                    placeholder="List customer items left inside."
                  />
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-secondary">
                  <input
                    type="checkbox"
                    checked={draft.customerAcknowledged}
                    onChange={(event) => updateDraft({ customerAcknowledged: event.target.checked })}
                    className="h-4 w-4 accent-[#f07c00]"
                  />
                  Customer acknowledged the arrival summary.
                </label>

                <div className="grid gap-3 md:grid-cols-2">
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
                    <PortalSelect
                      value={draft.receivedByStaff}
                      onValueChange={(nextValue) => updateDraft({ receivedByStaff: nextValue })}
                      items={receivedByStaffSelectItems}
                      placeholder={defaultReceivedByStaff || 'Choose receiving staff'}
                      emptyOptionLabel={defaultReceivedByStaff || 'Choose receiving staff'}
                    />
                  </label>
                </div>

                <label className="label">
                  Additional staff notes
                  <textarea
                    value={draft.notes}
                    onChange={(event) => updateDraft({ notes: event.target.value })}
                    rows={3}
                    className="input min-h-[96px] resize-y"
                    maxLength={intakeFieldMaxLengths.notes}
                    placeholder="Optional extra handoff notes."
                  />
                </label>
              </div>
              </IntakeSection>
            ) : null}

            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-primary">Save And Handoff</p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    Keep save actions at the end of the intake flow so staff can finish the full record before deciding the handoff state.
                  </p>
                </div>
                <span className="badge badge-gray">{nextRouteLabel}</span>
              </div>

              <div className="mt-4 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">Handoff plan</p>
                <p className="mt-2 text-sm font-semibold text-ink-primary">{selectedVisitTypeMeta.label}</p>
                <p className="mt-1 text-sm text-ink-muted">{nextRouteLabel}</p>
                <p className="mt-3 text-sm text-ink-muted">
                  {draft.visitType === 'insurance_related'
                    ? 'Continue this arrival in insurance after save.'
                    : draft.arrivalType === 'with_booking'
                      ? 'Keep the booking linked when you hand this off.'
                      : 'Walk-ins can stay unbooked until the next handoff.'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
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
                  {primaryActionLabel}
                </button>
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
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="card-title">Inspection History</p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  Review past records for the active vehicle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-gray">Read state: {formatLabel(historyState.status)}</span>
                <button type="button" onClick={loadHistory} className="btn-ghost">
                  <FileSearch size={15} />
                  Load Vehicle History
                </button>
              </div>
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
                    Load history or save the first inspection for this vehicle.
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
                    ? 'Review evidence before continuing work.'
                    : 'Review the selected inspection evidence.'}
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
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink-primary">Findings</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {inspectionSummaryCount} finding{inspectionSummaryCount === 1 ? '' : 's'} attached to this inspection
                        record.
                      </p>
                    </div>
                    <span className="badge badge-gray">
                      {selectedInspection.attachmentRefs?.length ?? 0} attachment
                      {(selectedInspection.attachmentRefs?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>
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
                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Attachment References</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Saved intake uploads stay visible here so staff can review what was stored with the record.
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedInspection.attachmentRefs?.length ? (
                      selectedInspection.attachmentRefs.map((reference) => {
                        const openable = isAttachmentLinkOpenable(reference)

                        return (
                          <div
                            key={reference}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised px-3 py-3"
                          >
                            <p className="min-w-0 flex-1 break-all text-sm text-ink-primary">{reference}</p>
                            {openable ? (
                              <a
                                href={reference}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-ghost min-h-9 px-3 text-xs"
                              >
                                Open file
                              </a>
                            ) : (
                              <span className="badge badge-gray">Stored reference</span>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-ink-muted">
                        No attachment references are stored on this inspection yet.
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

      {captureState.message ? (
        <div className={`mt-4 ${getMessageTone(captureState.status)}`}>
          {captureState.message}
        </div>
      ) : null}
    </div>
  )
}
