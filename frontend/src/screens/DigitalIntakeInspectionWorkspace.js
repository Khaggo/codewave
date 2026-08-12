'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, BadgeCheck, ChevronLeft, Eye, FileSearch, Loader2, Plus } from 'lucide-react'

import PortalSelect from '@/components/ui/PortalSelect'
import { canApplyAdminCustomerSearchResult } from '@/lib/adminCustomerListResponse.mjs'
import { ApiError, listAdminCustomers, listStaffAccounts } from '@/lib/authClient'
import { getStaffBooking, listVehicleBookings } from '@/lib/bookingStaffClient'
import { listBookingServices } from '@/lib/bookingServiceAdminClient'
import {
  completeIntakeDraft,
  createIntakeDraft,
  createVehicleInspection,
  getIntakeDraftForBooking,
  listVehicleInspectionHistory,
  loadInspectionEvidenceFile,
  updateIntakeDraft,
  uploadIntakeInspectionEvidence,
  uploadVehicleInspectionPhoto,
} from '@/lib/inspectionStaffClient'
import { sendIntakeToWorkshop } from '@/lib/jobOrderWorkbenchClient'
import { useUser } from '@/lib/userContext'
import {
  getSelectedInspection,
  getStaffInspectionCaptureSuccessState,
  getStaffInspectionHistoryState,
  inspectionStaffRoles,
} from '@/lib/api/generated/inspections/staff-web-inspections'
import { getInspectionMessageTone } from './digitalIntakeInspectionView.mjs'
import { InspectionCard, IntakeFocusedModal, IntakeSection } from './DigitalIntakeInspectionComponents'
import { ArrivalInspectionPager } from './ArrivalInspectionPager'
import IntakeSearchCombobox from './IntakeSearchCombobox.jsx'
import { IntakeChoiceModal } from './IntakeChoiceModal'
import { WalkInCustomerModal } from './WalkInCustomerModal'
import {
  arrivalPhotoSlots,
  arrivalInspectionCategoryOptions,
  buildIntakeCompletionReceipt,
  buildIntakeDraftPayload,
  buildIntakeInspectionPayload,
  createInitialIntakeDraft,
  damageAreaOptions,
  fuelLevelOptions,
  getCompletedIntakeRequirements,
  getBookingQueryHydrationState,
  getBookingIntakePrefill,
  getChecklistIssueDetails,
  getArrivalInspectionCategoryProgress,
  getArrivalInspectionProgress,
  getEligibleIntakeBookings,
  getReasonForVisitOptions,
  isValidIntakeVisitType,
  getIntakeRequirementOptions,
  intakeFieldMaxLengths,
  hydrateIntakeDraft,
  normalizeCustomerConcernObjects,
  normalizeCustomerConcerns,
  paperChecklistStatusOptions,
  buildChecklistIssueValue,
  resolveIntakeNextRoute,
  sanitizeIntakeOdometer,
  serializeCustomerConcerns,
} from './digitalIntakeInspectionWorkspaceForm.mjs'
import {
  getArrivalPhotoButtonLabel,
  getArrivalPhotoDisplayLabel,
  getArrivalPhotoTemporaryRef,
  isArrivalPhotoTemporaryRef,
  getIntakeRequirementsBadge,
  getIntakeWorkspaceHeroCopy,
  getIntakeWorkspacePrimaryActionLabel,
  canNavigateFromVisitTypeStage,
  getAdjacentIntakeStage,
  getIntakeStageKeyForBlocker,
  getIntakeStageStatusText,
  INTAKE_STAGE_ORDER,
} from './digitalIntakeInspectionWorkspaceView.mjs'
import { WORKSPACE_INFORMATION_ARCHITECTURE } from './workspaceInformationArchitecture.mjs'

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

const visitTypeOptions = [
  {
    value: 'regular_service',
    label: 'Regular Service',
    description: 'Routine maintenance or repair visit.',
    nextRoute: 'service',
  },
  {
    value: 'insurance_related',
    label: 'Insurance',
    description: 'Claim, estimate, or accident assessment.',
    nextRoute: 'insurance',
  },
  {
    value: 'back_job_complaint',
    label: 'Back Job',
    description: 'Return visit for an unresolved prior concern.',
    nextRoute: 'complaint',
  },
  {
    value: 'inspection_only',
    label: 'Inspection Only',
    description: 'Condition or safety check without a repair lane.',
    nextRoute: 'inspection',
  },
]

const nextRouteLabels = {
  service: 'Service bay handoff',
  insurance: 'Insurance intake handoff',
  complaint: 'Return visit review',
  inspection: 'Inspection-only handoff',
}

const intakeFlowTabs = INTAKE_STAGE_ORDER

const formatLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

const getIntakeTabState = (draft, requirementOptions = []) => {
  const arrivalReady = Boolean(String(draft.customerUserId ?? '').trim()) && Boolean(String(draft.vehicleId ?? '').trim())
  const visitTypeReady = isValidIntakeVisitType(draft.visitType)
  const concernsReady =
    Boolean(draft.reasonForVisits?.length || String(draft.reasonForVisit ?? '').trim()) &&
    Boolean(String(draft.serviceConcern ?? '').trim()) &&
    Boolean(
      draft.requestedServiceIds?.length ||
        draft.requestedServiceNames?.length ||
        String(draft.requestedServiceSummary ?? '').trim(),
    )
  const requirementsReady =
    !requirementOptions.length || requirementOptions.every((option) => Boolean(draft.requirementsChecklist?.[option.value]))
  const inspectionReady =
    Boolean(String(draft.currentOdometerKm ?? '').trim()) &&
    Boolean(draft.customerAcknowledged) &&
    !(draft.arrivalInspectionItems ?? []).some((item) => item.status === 'unchecked')
  const reviewReady = arrivalReady && visitTypeReady && concernsReady && requirementsReady && inspectionReady

  return {
    arrival: arrivalReady ? 'ready' : 'blocked',
    visit_type: visitTypeReady ? 'ready' : 'blocked',
    concerns_services: concernsReady ? 'ready' : 'blocked',
    requirements: requirementsReady ? 'ready' : 'blocked',
    arrival_inspection: inspectionReady ? 'ready' : 'blocked',
    review_handoff: reviewReady ? 'ready' : 'blocked',
  }
}

const formatVehicleOptionLabel = (vehicle) =>
  [
    vehicle?.publicReference || vehicle?.plateNumber || 'Vehicle reference unavailable',
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

const getUserDisplayLabel = (user) =>
  user?.displayName ||
  user?.name ||
  user?.fullName ||
  user?.roleLabel ||
  user?.email ||
  user?.id ||
  ''

const formatEvidenceSize = (byteSize) => {
  const bytes = Number(byteSize) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DigitalIntakeInspectionWorkspace() {
  const user = useUser()
  const role = user?.role ?? null
  const isTechnician = ['technician', 'head_technician'].includes(role)
  const canUseInspection = inspectionStaffRoles.includes(role)
  const [draft, setDraft] = useState(() => createInitialIntakeDraft())
  const [inspections, setInspections] = useState([])
  const [customers, setCustomers] = useState([])
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerListState, setCustomerListState] = useState({ status: 'idle', message: '' })
  const [staffAccounts, setStaffAccounts] = useState([])
  const [serviceCatalog, setServiceCatalog] = useState([])
  const [serviceCatalogState, setServiceCatalogState] = useState({ status: 'idle', message: '' })
  const [vehicleBookings, setVehicleBookings] = useState([])
  const [selectedInspectionId, setSelectedInspectionId] = useState('')
  const [historyCursor, setHistoryCursor] = useState(null)
  const [historyPreviousCursors, setHistoryPreviousCursors] = useState([])
  const [historyPageInfo, setHistoryPageInfo] = useState({ nextCursor: null, total: null })
  const [historyState, setHistoryState] = useState({
    status: 'history_empty',
    message: 'Select a vehicle to load live inspection history, or save a first inspection for that vehicle.',
  })
  const [captureState, setCaptureState] = useState({
    status: 'capture_ready',
    message: '',
  })
  const [submitIntent, setSubmitIntent] = useState(null)
  const [activeIntakeTab, setActiveIntakeTab] = useState('arrival')
  const [arrivalPhotoUploads, setArrivalPhotoUploads] = useState({})
  const [queryBookingId, setQueryBookingId] = useState('')
  const [bookingHydrationState, setBookingHydrationState] = useState({ status: 'idle', message: '' })
  const [draftRecord, setDraftRecord] = useState(null)
  const [draftPersistenceState, setDraftPersistenceState] = useState({ status: 'idle', message: '' })
  const [completionReceipt, setCompletionReceipt] = useState(null)
  const [evidenceViewState, setEvidenceViewState] = useState({})
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [arrivalPhotosModalOpen, setArrivalPhotosModalOpen] = useState(false)
  const [checklistIssueEditor, setChecklistIssueEditor] = useState(null)
  const [markChecklistConfirmationOpen, setMarkChecklistConfirmationOpen] = useState(false)
  const [walkInModalOpen, setWalkInModalOpen] = useState(false)
  const [choiceModalKind, setChoiceModalKind] = useState(null)
  const [detailModalKind, setDetailModalKind] = useState(null)
  const [detailModalDraft, setDetailModalDraft] = useState(null)
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false)
  const [reviewDetailsModalOpen, setReviewDetailsModalOpen] = useState(false)
  const [concernsModalOpen, setConcernsModalOpen] = useState(false)
  const [concernsModalDraft, setConcernsModalDraft] = useState([])
  const [concernsModalError, setConcernsModalError] = useState('')
  const [activeInspectionCategory, setActiveInspectionCategory] = useState(arrivalInspectionCategoryOptions[0].value)
  const [walkInAnnouncement, setWalkInAnnouncement] = useState('')
  const arrivalPhotoInputRefs = useRef({})
  const evidenceObjectUrlsRef = useRef(new Set())
  const bookingPrefillKeyRef = useRef('')
  const checklistIssueTriggerRef = useRef(null)
  const walkInTriggerRef = useRef(null)
  const reasonChooserTriggerRef = useRef(null)
  const serviceChooserTriggerRef = useRef(null)
  const requirementsNotesTriggerRef = useRef(null)
  const arrivalDetailsTriggerRef = useRef(null)
  const arrivalPhotosTriggerRef = useRef(null)
  const inspectionModalTriggerRef = useRef(null)
  const reviewDetailsTriggerRef = useRef(null)
  const concernsTriggerRef = useRef(null)
  const visitTypeGroupRef = useRef(null)
  const concernDraftIdRef = useRef(0)
  const customerRequestSequenceRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const vehicleId = params.get('vehicleId')
    const bookingId = params.get('bookingId')
    const customerUserId = params.get('customerUserId')

    setQueryBookingId(bookingId ?? '')

    if (vehicleId || customerUserId) {
      setDraft((current) => ({
        ...current,
        bookingId: bookingId ?? current.bookingId,
        vehicleId: vehicleId ?? current.vehicleId,
        customerUserId: customerUserId ?? current.customerUserId,
      }))
    }
  }, [])

  useEffect(
    () => () => {
      for (const objectUrl of evidenceObjectUrlsRef.current) URL.revokeObjectURL(objectUrl)
      evidenceObjectUrlsRef.current.clear()
    },
    [],
  )

  useEffect(() => {
    if (!queryBookingId || !user?.accessToken) return

    let cancelled = false
    setBookingHydrationState(getBookingQueryHydrationState({ bookingId: queryBookingId }))

    void getStaffBooking(queryBookingId, user.accessToken)
      .then((booking) => {
        if (cancelled) return
        const nextState = getBookingQueryHydrationState({ bookingId: queryBookingId, booking })
        setBookingHydrationState(nextState)
        if (nextState.status !== 'ready') return

        setVehicleBookings((current) => [booking, ...current.filter((item) => item.id !== booking.id)])
        setDraft((current) => ({
          ...current,
          bookingId: booking.id,
          vehicleId: booking.vehicleId || current.vehicleId,
          customerUserId: booking.userId || booking.customerUserId || current.customerUserId,
          arrivalType: 'with_booking',
        }))
      })
      .catch((error) => {
        if (!cancelled) {
          setBookingHydrationState(getBookingQueryHydrationState({ bookingId: queryBookingId, error }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [queryBookingId, user?.accessToken])

  useEffect(() => {
    if (
      bookingHydrationState.status !== 'ready' ||
      !queryBookingId ||
      !draft.vehicleId ||
      !user?.accessToken
    ) return

    let cancelled = false
    setDraftPersistenceState({ status: 'loading', message: 'Checking for a resumable intake draft...' })
    void getIntakeDraftForBooking({
      bookingId: queryBookingId,
      vehicleId: draft.vehicleId,
      accessToken: user.accessToken,
    })
      .then((record) => {
        if (cancelled) return
        if (!record || record.status !== 'pending') {
          setDraftPersistenceState({ status: 'new', message: 'No resumable draft is stored for this booking.' })
          return
        }
        setDraftRecord(record)
        setDraft((current) =>
          hydrateIntakeDraft(record, {
            bookingId: queryBookingId,
            customerUserId: current.customerUserId,
            vehicleId: current.vehicleId,
          }),
        )
        setDraftPersistenceState({
          status: 'resumed',
          message: `Draft ${record.inspectionReference || 'Reference unavailable'} resumed at version ${record.version}.`,
        })
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && [404, 405, 501].includes(error.status)) {
          setDraftPersistenceState({
            status: 'compatibility',
            message: 'Draft resume will use legacy inspection compatibility until the intake draft endpoint is available.',
          })
          return
        }
        setDraftPersistenceState({ status: 'error', message: error?.message || 'The intake draft could not be loaded.' })
      })

    return () => {
      cancelled = true
    }
  }, [bookingHydrationState.status, draft.vehicleId, queryBookingId, user?.accessToken])

  useEffect(() => {
    if (!user?.accessToken) {
      setCustomers([])
      return
    }
    const controller = new AbortController()
    const requestSequence = ++customerRequestSequenceRef.current
    setCustomerListState({ status: 'loading', message: '' })
    const timeoutId = window.setTimeout(() => {
      void listAdminCustomers(user.accessToken, {
        search: customerSearchQuery,
        limit: 20,
        paged: true,
        signal: controller.signal,
      }).then((result) => {
        if (!canApplyAdminCustomerSearchResult({
          aborted: controller.signal.aborted,
          requestSequence,
          currentRequestSequence: customerRequestSequenceRef.current,
        })) return
        if (!Array.isArray(result?.items)) {
          throw new TypeError('Customer search returned an invalid response. Please retry.')
        }
        setCustomers((current) => {
          const retained = current.find((customer) => customer.id === draft.customerUserId)
          return [retained, ...result.items].filter(Boolean).filter((customer, index, items) =>
            items.findIndex((item) => item.id === customer.id) === index)
        })
        setCustomerListState({ status: 'ready', message: '' })
      }).catch((error) => {
        if (controller.signal.aborted || requestSequence !== customerRequestSequenceRef.current) return
        setCustomerListState({ status: 'error', message: error?.message || 'Customer search could not be loaded.' })
      })
    }, 250)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [customerSearchQuery, draft.customerUserId, user?.accessToken])

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
    let cancelled = false
    setServiceCatalogState({ status: 'loading', message: '' })
    void listBookingServices()
      .then((items) => {
        if (cancelled) return
        setServiceCatalog(items.filter((service) => service?.isActive !== false))
        setServiceCatalogState({ status: 'ready', message: '' })
      })
      .catch((error) => {
        if (cancelled) return
        setServiceCatalog([])
        setServiceCatalogState({
          status: 'error',
          message: error?.message || 'The live service catalog could not be loaded.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      !draft.vehicleId ||
      !user?.accessToken ||
      (queryBookingId && bookingHydrationState.status !== 'ready')
    ) {
      setVehicleBookings([])
      return
    }

    void listVehicleBookings(draft.vehicleId, user.accessToken)
      .then((items) => setVehicleBookings((current) => {
        const linked = current.find((booking) => booking.id === queryBookingId)
        return linked ? [linked, ...items.filter((booking) => booking.id !== linked.id)] : items
      }))
      .catch(() => setVehicleBookings([]))
  }, [bookingHydrationState.status, draft.vehicleId, queryBookingId, user?.accessToken])

  useEffect(() => {
    if (!draft.vehicleId || draft.customerUserId || customers.length === 0) {
      return
    }

    const owningCustomer = customers.find((customer) =>
      (customer?.vehicles ?? []).some((vehicle) => vehicle.id === draft.vehicleId),
    )

    if (owningCustomer?.id) {
      setDraft((current) => ({
        ...current,
        customerUserId: owningCustomer.id,
      }))
    }
  }, [customers, draft.customerUserId, draft.vehicleId])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === draft.customerUserId) ?? null,
    [customers, draft.customerUserId],
  )
  useEffect(() => {
    if (!draft.customerUserId || selectedCustomer || !user?.accessToken) return
    const controller = new AbortController()
    void listAdminCustomers(user.accessToken, {
      customerId: draft.customerUserId,
      limit: 1,
      paged: true,
      signal: controller.signal,
    }).then((result) => {
      const exact = Array.isArray(result?.items) ? result.items[0] : null
      if (exact?.id === draft.customerUserId) {
        setCustomers((current) => [exact, ...current.filter((customer) => customer.id !== exact.id)])
      }
    }).catch(() => undefined)
    return () => controller.abort()
  }, [draft.customerUserId, selectedCustomer, user?.accessToken])
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
  const eligibleVehicleBookings = useMemo(
    () => getEligibleIntakeBookings(vehicleBookings),
    [vehicleBookings],
  )
  const hasEligibleLinkedBooking = Boolean(
    draft.bookingId && eligibleVehicleBookings.some((booking) => booking.id === draft.bookingId),
  )
  const isBookingRouteLocked = Boolean(
    queryBookingId && bookingHydrationState.status === 'ready' && draft.bookingId === queryBookingId,
  )
  const isBookingArrival = isBookingRouteLocked || hasEligibleLinkedBooking
  const derivedArrivalType = isBookingArrival ? 'with_booking' : 'walk_in'
  const selectedArrivalPhotoCount = Object.values(draft.arrivalPhotos ?? {}).filter(Boolean).length
  const arrivalInspectionProgress = useMemo(
    () => getArrivalInspectionProgress(draft.arrivalInspectionItems, draft.checklist),
    [draft.arrivalInspectionItems, draft.checklist],
  )
  const arrivalInspectionCategoryProgress = useMemo(
    () => getArrivalInspectionCategoryProgress(draft.arrivalInspectionItems, draft.checklist),
    [draft.arrivalInspectionItems, draft.checklist],
  )
  const customerSelectItems = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: `${customer.displayName || customer.email || customer.id}${customer.identityKind === 'walk_in' ? ' · Walk-in' : ''}`,
        helper: [customer.identityKind === 'walk_in' ? 'Intake-only profile' : null, customer.email || 'No email', customer.id].filter(Boolean).join(' · '),
        searchTerms: [customer.displayName, customer.email],
      })),
    [customers],
  )
  const vehicleSelectItems = useMemo(
    () =>
      customerVehicleOptions.map((vehicle) => ({
        value: vehicle.id,
        label: formatVehicleOptionLabel(vehicle),
        helper: [vehicle.plateNumber, vehicle.publicReference, vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' · '),
        searchTerms: [vehicle.plateNumber, vehicle.publicReference, vehicle.make, vehicle.model],
      })),
    [customerVehicleOptions],
  )
  const bookingSelectItems = useMemo(
    () =>
      eligibleVehicleBookings.map((booking) => ({
        value: booking.id,
        label: formatBookingOptionLabel(booking),
      })),
    [eligibleVehicleBookings],
  )
  const inspectionSummaryCount = selectedInspection?.findings?.length ?? 0
  const heroCopy = getIntakeWorkspaceHeroCopy(isTechnician)
  const draftStatus = getDraftStatusMeta(draft.status)
  const defaultReceivedByStaff = getUserDisplayLabel(user)
  const isSubmittingPending = captureState.status === 'capture_submitting' && submitIntent === 'pending'
  const isSubmittingCompleted = captureState.status === 'capture_submitting' && submitIntent === 'completed'
  const selectedVisitTypeMeta =
    visitTypeOptions.find((option) => option.value === draft.visitType) ?? { label: 'Not selected' }
  const visitTypeReady = isValidIntakeVisitType(draft.visitType)
  const effectiveNextRoute = resolveIntakeNextRoute(draft.visitType, draft.nextRoute)
  const nextRouteLabel =
    nextRouteLabels[effectiveNextRoute] ?? (formatLabel(effectiveNextRoute) || 'Next handoff')
  const primaryActionLabel = getIntakeWorkspacePrimaryActionLabel(draft.visitType)
  const completedIntakeRequirements = useMemo(
    () => getCompletedIntakeRequirements({
      ...draft,
      receivedByStaff: draft.receivedByStaff || defaultReceivedByStaff,
    }),
    [defaultReceivedByStaff, draft],
  )
  const visibleRequirementOptions = useMemo(
    () =>
      getIntakeRequirementOptions({
        arrivalType: draft.arrivalType,
        visitType: draft.visitType,
      }),
    [draft.arrivalType, draft.visitType],
  )
  const intakeTabState = useMemo(
    () => getIntakeTabState(draft, visibleRequirementOptions),
    [draft, visibleRequirementOptions],
  )
  const reasonForVisitOptions = useMemo(
    () => getReasonForVisitOptions({ visitType: draft.visitType, currentValue: draft.reasonForVisit }),
    [draft.reasonForVisit, draft.visitType],
  )
  const serviceCatalogItems = useMemo(
    () =>
      serviceCatalog
        .map((service) => ({
          value: String(service?.id ?? service?.serviceId ?? '').trim(),
          label: String(service?.name ?? service?.serviceName ?? '').trim(),
          helper: String(service?.description ?? '').trim(),
          category: String(
            service?.categoryName ??
              (typeof service?.category === 'string' ? service.category : service?.category?.name) ??
              service?.serviceCategory ??
              'Services',
          ).trim() || 'Services',
        }))
        .filter((service) => service.value && service.label),
    [serviceCatalog],
  )
  const selectedServiceNames = useMemo(() => {
    const namesById = new Map(serviceCatalogItems.map((service) => [service.value, service.label]))
    return [
      ...(draft.requestedServiceIds ?? []).map((id) => namesById.get(id) || '').filter(Boolean),
      ...(draft.requestedServiceNames ?? []),
    ].filter((name, index, names) => names.indexOf(name) === index)
  }, [draft.requestedServiceIds, draft.requestedServiceNames, serviceCatalogItems])
  const customerConcerns = useMemo(
    () => normalizeCustomerConcerns(draft.customerConcerns?.length ? draft.customerConcerns : draft.serviceConcern),
    [draft.customerConcerns, draft.serviceConcern],
  )
  const bookingPrefill = useMemo(
    () => getBookingIntakePrefill(selectedBooking),
    [selectedBooking],
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
    visibleRequirementOptions,
  )

  const focusIntakeBlocker = (blocker) => {
    if (!blocker) return
    setActiveIntakeTab(getIntakeStageKeyForBlocker(blocker))
    if (typeof window === 'undefined') return

    window.setTimeout(() => {
      const container = document.querySelector(`[data-intake-control="${blocker.control}"]`)
      const target = container?.querySelector('input, textarea, button, [role="combobox"]') ?? container
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      target?.focus?.()
    }, 0)
  }

  const stageButtonRefs = useRef({})
  const focusVisitTypeGate = () => {
    setActiveIntakeTab('visit_type')
    if (typeof window === 'undefined') return
    window.setTimeout(() => visitTypeGroupRef.current?.focus(), 0)
  }
  const requestIntakeStage = (targetKey, { allowCompletedRevisit = true, focusStageTab = false } = {}) => {
    const canNavigate = canNavigateFromVisitTypeStage({
      currentStage: activeIntakeTab,
      targetStage: targetKey,
      visitTypeReady,
      targetStageState: intakeTabState[targetKey],
      allowCompletedRevisit,
    })
    if (!canNavigate) {
      focusVisitTypeGate()
      return false
    }

    setActiveIntakeTab(targetKey)
    if (focusStageTab && typeof window !== 'undefined') {
      window.setTimeout(() => stageButtonRefs.current[targetKey]?.focus(), 0)
    }
    return true
  }
  const handleIntakeStageKeyDown = (event, stageKey) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 'next' :
      event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 'previous' : null
    const targetKey = direction
      ? getAdjacentIntakeStage(stageKey, direction)
      : event.key === 'Home'
        ? intakeFlowTabs[0].key
        : event.key === 'End'
          ? intakeFlowTabs.at(-1).key
          : null

    if (!targetKey) return
    event.preventDefault()
    requestIntakeStage(targetKey, { allowCompletedRevisit: true, focusStageTab: true })
  }

  const activeIntakeStageIndex = Math.max(0, intakeFlowTabs.findIndex((stage) => stage.key === activeIntakeTab))
  const previousIntakeStage = activeIntakeStageIndex > 0 ? getAdjacentIntakeStage(activeIntakeTab, 'previous') : null
  const nextIntakeStage = activeIntakeStageIndex < intakeFlowTabs.length - 1
    ? getAdjacentIntakeStage(activeIntakeTab, 'next')
    : null
  const visitTypeNextBlocked = activeIntakeTab === 'visit_type' && !visitTypeReady

  useEffect(() => {
    if (queryBookingId && bookingHydrationState.status === 'loading') return
    setDraft((current) => {
      const nextBookingId =
        !queryBookingId && current.bookingId && !hasEligibleLinkedBooking ? '' : current.bookingId
      if (current.arrivalType === derivedArrivalType && current.bookingId === nextBookingId) return current
      return {
        ...current,
        arrivalType: derivedArrivalType,
        bookingId: nextBookingId,
        requirementsChecklist: {
          ...current.requirementsChecklist,
          bookingFound: derivedArrivalType === 'with_booking',
        },
      }
    })
  }, [
    bookingHydrationState.status,
    derivedArrivalType,
    hasEligibleLinkedBooking,
    queryBookingId,
  ])

  useEffect(() => {
    if (queryBookingId || !draft.vehicleId || draft.bookingId || eligibleVehicleBookings.length !== 1) return
    setDraft((current) => ({
      ...current,
      bookingId: eligibleVehicleBookings[0].id,
      arrivalType: 'with_booking',
      requirementsChecklist: {
        ...current.requirementsChecklist,
        bookingFound: true,
      },
    }))
  }, [draft.bookingId, draft.vehicleId, eligibleVehicleBookings, queryBookingId])

  useEffect(() => {
    if (!isBookingArrival || !selectedBooking?.id || bookingPrefillKeyRef.current === selectedBooking.id) return
    bookingPrefillKeyRef.current = selectedBooking.id
    setDraft((current) => ({
      ...current,
      visitType: current.visitType || bookingPrefill.visitType,
      nextRoute: resolveIntakeNextRoute(current.visitType || bookingPrefill.visitType, current.nextRoute),
      reasonForVisits: bookingPrefill.reasonForVisits,
      reasonForVisit: bookingPrefill.reasonForVisits[0] || current.reasonForVisit,
      requestedServiceIds: bookingPrefill.requestedServiceIds,
      requestedServiceNames: bookingPrefill.requestedServiceNames,
      requestedServiceSummary:
        bookingPrefill.requestedServiceSummary || current.requestedServiceSummary,
      customerConcerns: current.customerConcerns?.length
        ? current.customerConcerns
        : bookingPrefill.customerConcerns,
      serviceConcern: current.serviceConcern || bookingPrefill.serviceConcern,
      requirementsChecklist: {
        ...current.requirementsChecklist,
        bookingFound: true,
      },
    }))
  }, [bookingPrefill, isBookingArrival, selectedBooking?.id])

  const intakeContext = useMemo(() => {
    const items = []

    if (selectedCustomer) {
      items.push({
        label: 'Customer',
        value: selectedCustomer.displayName || selectedCustomer.email || 'Selected customer',
        sub: selectedCustomer.email || 'Customer profile',
      })
    } else if (draft.customerUserId.trim()) {
      items.push({
        label: 'Customer',
        value: 'Linked customer context',
        sub: draft.customerUserId,
      })
    }

    if (selectedVehicle) {
      items.push({
        label: 'Vehicle',
        value: formatVehicleOptionLabel(selectedVehicle),
        sub: selectedVehicle.plateNumber || 'Vehicle profile',
      })
    } else if (draft.vehicleId.trim()) {
      items.push({
        label: 'Vehicle',
        value: 'Vehicle reference unavailable',
        sub: isTechnician ? 'Manual vehicle reference was supplied' : 'Vehicle selected without profile details',
      })
    }

    if (selectedBooking) {
      items.push({
        label: 'Booking',
        value: selectedBooking.bookingReference || 'Scheduled booking',
        sub: formatBookingOptionLabel(selectedBooking),
      })
    } else if (draft.bookingId.trim()) {
      items.push({
        label: 'Booking',
        value: 'Booking reference unavailable',
        sub: 'A booking link was supplied without its public reference',
      })
    }

    return items
  }, [draft.bookingId, draft.customerUserId, draft.vehicleId, isTechnician, selectedBooking, selectedCustomer, selectedVehicle])

  const updateDraft = (patch) => {
    setDraft((current) => ({
      ...current,
      ...patch,
    }))
  }

  const handleWalkInSuccess = ({ result, form }) => {
    const vehicle = {
      id: result.vehicleId,
      publicReference: result.vehicleReference,
      plateNumber: form.plateNumber.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      color: form.color.trim() || null,
    }
    const customer = {
      id: result.customerUserId,
      displayName: result.customerLabel,
      email: form.email.trim() || null,
      identityKind: result.customerIdentityKind || 'walk_in',
      vehicles: [vehicle],
      addresses: [],
      vehicleCount: 1,
    }

    setCustomers((current) => [customer, ...current.filter((item) => item.id !== customer.id)])
    clearPersistedDraftContext()
    setDraft((current) => ({
      ...current,
      customerUserId: result.customerUserId,
      vehicleId: result.vehicleId,
      bookingId: '',
      arrivalType: 'walk_in',
      requirementsChecklist: {
        ...current.requirementsChecklist,
        bookingFound: false,
      },
    }))
    setWalkInModalOpen(false)
    setWalkInAnnouncement(`${result.customerLabel} and ${result.vehicleReference} are selected as a walk-in. No booking is linked.`)
  }

  const applyChoiceSelection = (kind, values) => {
    const nextValues = [...new Set(values)]
    if (kind === 'reasons') {
      setDraft((current) => ({
        ...current,
        reasonForVisits: nextValues,
        reasonForVisit: nextValues[0] || '',
      }))
    } else {
      const namesById = new Map(serviceCatalogItems.map((item) => [item.value, item.label]))
      const requestedServiceNames = nextValues.map((id) => namesById.get(id)).filter(Boolean)
      setDraft((current) => ({
        ...current,
        requestedServiceIds: nextValues,
        requestedServiceNames,
        requestedServiceSummary: requestedServiceNames.join(', '),
      }))
    }
    setChoiceModalKind(null)
  }

  const closeAllIntakeOverlays = () => {
    setWalkInModalOpen(false)
    setChoiceModalKind(null)
    setDetailModalKind(null)
    setHistoryModalOpen(false)
    setArrivalPhotosModalOpen(false)
    setChecklistIssueEditor(null)
    setMarkChecklistConfirmationOpen(false)
    setInspectionModalOpen(false)
    setReviewDetailsModalOpen(false)
    setConcernsModalOpen(false)
  }

  const openWalkInModal = () => {
    closeAllIntakeOverlays()
    setWalkInModalOpen(true)
  }

  const openChoiceModal = (kind) => {
    closeAllIntakeOverlays()
    setChoiceModalKind(kind)
  }

  const closeConcernsModal = () => {
    setConcernsModalOpen(false)
    setConcernsModalDraft([])
    setConcernsModalError('')
  }

  const openConcernsModal = () => {
    closeAllIntakeOverlays()
    const values = normalizeCustomerConcernObjects(
      draft.customerConcerns?.length ? draft.customerConcerns : draft.serviceConcern,
    )
    setConcernsModalDraft(values.length ? values : [{ id: `concern-${++concernDraftIdRef.current}`, text: '' }])
    setConcernsModalError('')
    setConcernsModalOpen(true)
  }

  const saveConcernsModal = () => {
    if (concernsModalDraft.some((item) => !item.text.trim())) {
      setConcernsModalError('Complete or remove each blank concern before saving.')
      return
    }
    if (concernsModalDraft.length > 10 || concernsModalDraft.some((item) => item.text.trim().length > intakeFieldMaxLengths.customerConcernText)) {
      setConcernsModalError('Use no more than 10 concerns and 500 characters per concern.')
      return
    }
    const values = normalizeCustomerConcernObjects(concernsModalDraft)
    if (!values.length) {
      setConcernsModalError('Add at least one customer concern.')
      return
    }
    setDraft((current) => ({
      ...current,
      customerConcerns: values,
      serviceConcern: serializeCustomerConcerns(values),
    }))
    closeConcernsModal()
  }

  const openDetailModal = (kind) => {
    closeAllIntakeOverlays()
    setDetailModalDraft(kind === 'requirements-notes'
      ? {
          missingRequirementsNote: draft.missingRequirementsNote,
          safetyAccessNotes: draft.safetyAccessNotes,
        }
      : {
          damageAreas: [...draft.damageAreas],
          damageNotes: draft.damageNotes,
          customerItems: draft.customerItems,
          customerSignatureName: draft.customerSignatureName,
          paperChecklistStatus: draft.paperChecklistStatus,
          notes: draft.notes,
        })
    setDetailModalKind(kind)
  }

  const closeDetailModal = () => {
    const reopenInspection = detailModalKind === 'arrival-details'
    setDetailModalKind(null)
    setDetailModalDraft(null)
    if (reopenInspection) setInspectionModalOpen(true)
  }

  const applyDetailModal = () => {
    if (detailModalDraft) {
      updateDraft(detailModalDraft)
    }
    closeDetailModal()
  }

  const clearPersistedDraftContext = () => {
    setQueryBookingId('')
    setDraftRecord(null)
    setCompletionReceipt(null)
    setDraftPersistenceState({ status: 'new', message: 'Selection changed. Save to create a new resumable draft.' })
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
      customerAcknowledged:
        field === 'authorizationAcknowledged' ? checked : current.customerAcknowledged,
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

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      updateArrivalPhoto(slot, '')
      setArrivalPhotoUploads((current) => ({
        ...current,
        [slot]: { error: 'Choose a JPEG, PNG, or WebP image.' },
      }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      updateArrivalPhoto(slot, '')
      setArrivalPhotoUploads((current) => ({
        ...current,
        [slot]: { error: 'Choose an image that is 5 MB or smaller.' },
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
        [slot]: { error: 'This image could not be previewed. Choose another file.' },
      }))
      updateArrivalPhoto(slot, '')
    }

    reader.readAsDataURL(file)
  }

  const updateChecklistItem = (item, value) => {
    setDraft((current) => ({
      ...current,
      arrivalInspectionItems: (current.arrivalInspectionItems ?? []).map((entry) =>
        entry.key === item
          ? { key: item, status: value === 'issue' ? 'issue' : value, issue: value === 'issue' ? entry.issue : null }
          : entry,
      ),
      checklist: {
        ...current.checklist,
        [item]: value,
      },
    }))
  }

  const openChecklistIssueEditor = (item) => {
    checklistIssueTriggerRef.current =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null
    const inspectionItem = draft.arrivalInspectionItems?.find((entry) => entry.key === item.value)
    const details = getChecklistIssueDetails(inspectionItem ?? draft.checklist[item.value])
    setChecklistIssueEditor({
      itemKey: item.value,
      label: item.label,
      location: details.location,
      severity: details.severity,
      description: details.description,
      evidenceSlot: details.evidenceSlot || `issue-${item.value}`,
      photoName: arrivalPhotoUploads[details.evidenceSlot || `issue-${item.value}`]?.fileName || '',
      error: '',
    })
  }

  const closeChecklistIssueEditor = () => {
    setChecklistIssueEditor(null)
  }

  const saveChecklistIssue = () => {
    const description = String(checklistIssueEditor?.description ?? '').trim()
    const location = String(checklistIssueEditor?.location ?? '').trim()
    const severity = String(checklistIssueEditor?.severity ?? '').trim()
    if (!location || !description || !['low', 'medium', 'high'].includes(severity)) {
      setChecklistIssueEditor((current) => ({
        ...current,
        error: 'Add the issue location, attention level, and notes before saving it.',
      }))
      return
    }

    const issue = {
      location,
      severity,
      notes: description,
      evidenceSlot: checklistIssueEditor.evidenceSlot || `issue-${checklistIssueEditor.itemKey}`,
    }
    setDraft((current) => ({
      ...current,
      arrivalInspectionItems: (current.arrivalInspectionItems ?? []).map((entry) =>
        entry.key === checklistIssueEditor.itemKey
          ? { ...entry, status: 'issue', issue }
          : entry,
      ),
      checklist: {
        ...current.checklist,
        [checklistIssueEditor.itemKey]: buildChecklistIssueValue({
          ...issue,
          description,
        }),
      },
    }))
    closeChecklistIssueEditor()
  }

  const removeChecklistIssue = (itemKey) => {
    const currentItem = draft.arrivalInspectionItems?.find((item) => item.key === itemKey)
    const evidenceSlot = currentItem?.issue?.evidenceSlot
    setDraft((current) => ({
      ...current,
      arrivalInspectionItems: (current.arrivalInspectionItems ?? []).map((entry) =>
        entry.key === itemKey ? { key: itemKey, status: 'unchecked', issue: null } : entry,
      ),
      checklist: {
        ...current.checklist,
        [itemKey]: 'unchecked',
      },
      arrivalPhotos: evidenceSlot
        ? { ...current.arrivalPhotos, [evidenceSlot]: '' }
        : current.arrivalPhotos,
    }))
    if (evidenceSlot) {
      setArrivalPhotoUploads((current) => {
        const next = { ...current }
        delete next[evidenceSlot]
        return next
      })
    }
  }

  const markAllChecklistOk = () => {
    setDraft((current) => ({
      ...current,
      arrivalInspectionItems: (current.arrivalInspectionItems ?? []).map((entry) => ({
        key: entry.key,
        status: 'ok',
        issue: null,
      })),
      checklist: Object.fromEntries((current.arrivalInspectionItems ?? []).map((entry) => [entry.key, 'ok'])),
    }))
    setMarkChecklistConfirmationOpen(false)
    setInspectionModalOpen(true)
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

  const persistStructuredEvidence = async (inspectionId, nextDraft) => {
    const pendingSlots = Object.entries(nextDraft.arrivalPhotos ?? {}).filter(([, value]) =>
      isArrivalPhotoTemporaryRef(value),
    )

    if (!pendingSlots.length) return []

    const uploadedEvidence = []
    for (const [slot] of pendingSlots) {
      const resolvedUpload = await resolvePendingArrivalPhotoFile(slot)
      if (!resolvedUpload) {
        throw new ApiError(`The ${formatLabel(slot)} photo is unavailable. Choose it again before saving.`, 400)
      }
      const evidence = await uploadIntakeInspectionEvidence({
        inspectionId,
        slot,
        file: resolvedUpload.file,
        fileName: resolvedUpload.fileName,
        accessToken: user.accessToken,
      })
      uploadedEvidence.push(evidence)
    }

    setArrivalPhotoUploads((current) => {
      const nextUploads = { ...current }
      for (const evidence of uploadedEvidence) {
        nextUploads[evidence.slot] = {
          ...nextUploads[evidence.slot],
          evidence,
          fileName: evidence.originalName || nextUploads[evidence.slot]?.fileName,
        }
        delete nextUploads[evidence.slot].file
      }
      return nextUploads
    })

    return uploadedEvidence
  }

  const saveStructuredDraft = async (nextDraft) => {
    const payload = buildIntakeDraftPayload(nextDraft)
    if (draftRecord?.id && draftRecord?.compatibilityMode !== 'legacy') {
      return updateIntakeDraft({
        inspectionId: draftRecord.id,
        version: draftRecord.version,
        draft: payload,
        accessToken: user.accessToken,
      })
    }
    return createIntakeDraft({
      vehicleId: nextDraft.vehicleId.trim(),
      draft: payload,
      accessToken: user.accessToken,
    })
  }

  const loadHistory = async ({ cursor = historyCursor, previousCursors = historyPreviousCursors } = {}) => {
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
      const historyPage = await listVehicleInspectionHistory({
        vehicleId: draft.vehicleId.trim(),
        accessToken: user.accessToken,
        cursor,
        limit: 20,
      })
      const loadedInspections = historyPage.items
      const nextStatus = getStaffInspectionHistoryState(loadedInspections)

      setInspections(loadedInspections)
      setSelectedInspectionId(loadedInspections[0]?.id ?? '')
      setHistoryCursor(cursor)
      setHistoryPreviousCursors(previousCursors)
      setHistoryPageInfo({ nextCursor: historyPage.nextCursor, total: historyPage.total })
      setHistoryState({
        status: nextStatus,
        message:
          nextStatus === 'history_loaded'
            ? `Newest-first inspection history loaded${historyPage.compatibilityMode === 'legacy' ? ' through legacy compatibility' : ''}.`
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
      setHistoryCursor(null)
      setHistoryPreviousCursors([])
      setHistoryPageInfo({ nextCursor: null, total: null })
      setHistoryState({
        status: nextStatus,
        message: error?.message || 'Inspection history could not be loaded.',
      })
    }
  }

  const viewEvidence = async (evidence) => {
    if (!evidence?.id || !evidence?.fileUrl || !user?.accessToken) return

    setEvidenceViewState((current) => ({
      ...current,
      [evidence.id]: { status: 'loading', message: '' },
    }))
    try {
      const blob = await loadInspectionEvidenceFile({
        fileUrl: evidence.fileUrl,
        accessToken: user.accessToken,
      })
      const objectUrl = URL.createObjectURL(blob)
      evidenceObjectUrlsRef.current.add(objectUrl)
      setEvidenceViewState((current) => {
        const previousUrl = current[evidence.id]?.url
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl)
          evidenceObjectUrlsRef.current.delete(previousUrl)
        }
        return {
          ...current,
          [evidence.id]: { status: 'loaded', message: '', url: objectUrl },
        }
      })
    } catch (error) {
      setEvidenceViewState((current) => ({
        ...current,
        [evidence.id]: {
          status: 'error',
          message: error?.message || 'This evidence preview could not be loaded.',
        },
      }))
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

    if (nextStatus === 'completed' && !completedIntakeRequirements.ready) {
      setCaptureState({
        status: 'capture_failed',
        message: `Complete the intake before handoff. Missing: ${completedIntakeRequirements.missing.join(', ')}.`,
      })
      focusIntakeBlocker(completedIntakeRequirements.blockers[0])
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
      let savedInspection
      let savedDraftRecord
      let completionResult = null
      let compatibilityMode = 'planned'
      let uploadedEvidence = []

      try {
        savedDraftRecord = await saveStructuredDraft(normalizedDraft)
        uploadedEvidence = await persistStructuredEvidence(savedDraftRecord.id, normalizedDraft)
        if (uploadedEvidence.length) {
          savedDraftRecord = {
            ...savedDraftRecord,
            evidence: [...(savedDraftRecord.evidence ?? []), ...uploadedEvidence],
          }
        }

        if (nextStatus === 'completed') {
          completionResult = await completeIntakeDraft({
            inspectionId: savedDraftRecord.id,
            version: savedDraftRecord.version,
            draft: buildIntakeDraftPayload(normalizedDraft),
            accessToken: user.accessToken,
          })
          savedInspection = completionResult.inspection
        } else {
          savedInspection = savedDraftRecord
        }
      } catch (error) {
        if (!(error instanceof ApiError) || ![404, 405, 501].includes(error.status)) throw error

        compatibilityMode = 'legacy'
        const normalizedDraftWithUploads = await persistPendingArrivalPhotos(normalizedDraft)
        savedInspection = await createVehicleInspection({
          vehicleId: normalizedDraftWithUploads.vehicleId.trim(),
          inspection: buildPayload(normalizedDraftWithUploads),
          accessToken: user.accessToken,
        })
        savedDraftRecord = { ...savedInspection, compatibilityMode }
      }

      let jobOrderId = completionResult?.jobOrderId ?? completionResult?.jobOrder?.id ?? null
      if (nextStatus === 'completed' && normalizedDraft.visitType === 'regular_service') {
        if (!jobOrderId) {
          const handoff = await sendIntakeToWorkshop({
            inspectionId: savedInspection.id,
            accessToken: user.accessToken,
          })
          jobOrderId = handoff.jobOrderId
        }
      }

      const nextCaptureState = getStaffInspectionCaptureSuccessState(savedInspection)

      setInspections((current) => [savedInspection, ...current.filter((item) => item.id !== savedInspection.id)])
      setSelectedInspectionId(savedInspection.id)
      setHistoryCursor(null)
      setHistoryPreviousCursors([])
      setDraftRecord({ ...savedDraftRecord, compatibilityMode })
      setDraft((current) => ({
        ...current,
        status: nextStatus,
        arrivalPhotos: uploadedEvidence.reduce(
          (photos, evidence) => ({
            ...photos,
            [evidence.slot]: evidence.fileUrl || evidence.id,
          }),
          current.arrivalPhotos,
        ),
      }))
      setDraftPersistenceState({
        status: nextStatus === 'pending' ? 'saved' : 'completed',
        message:
          compatibilityMode === 'legacy'
            ? 'Saved through the legacy inspection endpoint. Server-backed resume will activate when the draft API is available.'
            : `Draft version ${savedDraftRecord.version} saved${nextStatus === 'pending' ? ' and ready to resume' : ''}.`,
      })
      setCompletionReceipt(
        nextStatus === 'completed'
          ? buildIntakeCompletionReceipt({
              draft: normalizedDraft,
              result: { ...(completionResult ?? {}), inspection: savedInspection, jobOrderId },
            })
          : null,
      )
      setSubmitIntent(null)
      setCaptureState({
        status: nextCaptureState,
        message: `${
          savedInspection.status === 'pending' ? 'Resumable intake draft saved' : 'Intake inspection completed'
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
      } else if (error instanceof ApiError && [409, 412].includes(error.status)) {
        nextCaptureState = draftRecord?.id ? 'stale_draft' : 'booking_vehicle_conflict'
        if (nextCaptureState === 'stale_draft') {
          setDraftPersistenceState({
            status: 'stale',
            message: 'Another staff session changed this intake. Reload the linked draft before saving again.',
          })
        }
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
    <div className="ops-page-shell flex min-h-0 min-w-0 flex-col overflow-x-hidden lg:h-full" data-intake-workspace>
      <header className="mx-auto w-full max-w-[90rem] min-w-0 shrink-0 px-3 pb-1 pt-1 md:px-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-ink-primary md:text-xl">{heroCopy.title}</h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={draftStatus.badgeClassName}>{draftStatus.label}</span>
            <span className="badge badge-gray">{isTechnician ? 'Technician' : 'Staff'} · {inspections.length} history records loaded</span>
            <button
              type="button"
              className="btn-ghost min-h-9"
              onClick={() => {
                setHistoryModalOpen(true)
                void loadHistory({ cursor: null, previousCursors: [] })
              }}
            >
              <FileSearch size={15} aria-hidden="true" />
              History
            </button>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-surface-border bg-surface-card px-2 py-1 lg:grid-cols-4" aria-label="Arrival context">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Arrival</p>
            <p className="truncate text-xs font-semibold text-ink-primary xl:text-sm">{isBookingArrival ? 'Booked · locked' : 'Walk-in'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Customer</p>
            <p className="truncate text-xs font-semibold text-ink-primary xl:text-sm">{selectedCustomer?.displayName ?? selectedCustomer?.email ?? 'Not selected'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Vehicle</p>
            <p className="truncate text-xs font-semibold text-ink-primary xl:text-sm">{selectedVehicle ? formatVehicleOptionLabel(selectedVehicle) : 'Not selected'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Booking / next</p>
            <p className="truncate text-xs font-semibold text-ink-primary xl:text-sm">
              {selectedBooking?.bookingReference ?? (draft.bookingId ? 'Reference unavailable' : 'No booking')} · {intakeFlowTabs.find((stage) => stage.key === activeIntakeTab)?.label}
            </p>
          </div>
        </div>
        {bookingHydrationState.status !== 'idle' || draftPersistenceState.message ? (
          <div
            className={`mt-2 ${
              ['stale', 'ineligible', 'error'].includes(bookingHydrationState.status) ||
              ['stale', 'error'].includes(draftPersistenceState.status)
                ? 'status-message status-message-danger'
                : draftPersistenceState.status === 'saved' || draftPersistenceState.status === 'resumed'
                  ? 'status-message status-message-success'
                  : 'status-message status-message-warning'
            }`}
            role={
              ['stale', 'ineligible', 'error'].includes(bookingHydrationState.status) ||
              ['stale', 'error'].includes(draftPersistenceState.status)
                ? 'alert'
                : 'status'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{bookingHydrationState.message || draftPersistenceState.message}</span>
              {draftPersistenceState.status === 'stale' ? (
                <button type="button" className="btn-ghost min-h-9 px-3" onClick={() => window.location.reload()}>
                  Reload draft
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      <section className="mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 overflow-x-hidden px-3 pb-2 md:px-4">
        <div className="flex h-full min-w-0 flex-1 flex-col rounded-xl border border-surface-border bg-surface-card/70 p-2.5" data-intake-stage-shell>
          <nav
            aria-label="Intake stages"
            role="tablist"
            className="min-w-0 overflow-hidden overscroll-x-contain"
          >
            <div className="grid min-w-0 grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-6">
            {intakeFlowTabs.map((tab) => {
              const state = intakeTabState[tab.key] ?? 'blocked'
              const isActive = activeIntakeTab === tab.key
              const statusText = getIntakeStageStatusText(state)

              return (
                <button
                  type="button"
                  key={tab.key}
                  ref={(node) => {
                    stageButtonRefs.current[tab.key] = node
                  }}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'step' : undefined}
                  aria-controls="intake-stage-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => requestIntakeStage(tab.key, { allowCompletedRevisit: true })}
                  onKeyDown={(event) => handleIntakeStageKeyDown(event, tab.key)}
                  className={`flex min-h-10 w-full min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
                    isActive
                      ? 'border-brand-orange bg-brand-orange/10'
                      : state === 'ready'
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-surface-border bg-surface-raised hover:border-brand-orange/35'
                  }`}
                >
                  <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                    {state === 'ready' ? '✓' : intakeFlowTabs.findIndex((stage) => stage.key === tab.key) + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-ink-primary xl:text-sm">{tab.label}</span>
                    <span className="block truncate text-[10px] text-ink-muted lg:hidden xl:block xl:text-xs">
                      {isActive ? `Current · ${statusText}` : statusText}
                    </span>
                  </span>
                  <span className="sr-only">{statusText}</span>
                </button>
              )
            })}
            </div>
          </nav>

          <div
            id="intake-stage-panel"
            role="tabpanel"
            aria-label={`${intakeFlowTabs.find((stage) => stage.key === activeIntakeTab)?.label} stage`}
            className="mt-2 min-w-0 flex-1"
            data-intake-stage-panel
          >

          <div className="space-y-3">
            {['arrival', 'visit_type'].includes(activeIntakeTab) ? (
              <>
                {activeIntakeTab === 'arrival' ? (
                  <IntakeSection
                  step="1"
                  title={WORKSPACE_INFORMATION_ARCHITECTURE.intake.sections.arrival}
                  badge={draft.arrivalType === 'with_booking' ? 'Booking arrival' : 'Walk-in arrival'}
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2 md:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Arrival mode</p>
                          <p className="text-sm font-semibold text-ink-primary">
                            {isBookingArrival ? 'Booked' : 'Walk-in'}
                          </p>
                        </div>
                        <span className={`badge ${isBookingArrival ? 'badge-green' : 'badge-gray'}`}>
                          {isBookingArrival ? 'Locked from booking context' : 'No eligible booking linked'}
                        </span>
                      </div>
                      {isBookingArrival && selectedBooking ? (
                        <div className="mt-2 hidden gap-2 xl:grid xl:grid-cols-3">
                          <div>
                            <p className="text-xs text-ink-muted">Booking</p>
                            <p className="mt-1 text-sm font-semibold text-ink-primary">
                              {selectedBooking.bookingReference || 'Reference unavailable'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-muted">Scheduled</p>
                            <p className="mt-1 text-sm font-semibold text-ink-primary">
                              {selectedBooking.scheduledDate || 'Date unavailable'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-muted">Requested services</p>
                            <p className="mt-1 text-sm font-semibold text-ink-primary">
                              {bookingPrefill.requestedServiceNames.join(', ') || 'Not supplied'}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div data-intake-control="customer">
                      <IntakeSearchCombobox
                        label="Customer"
                        value={draft.customerUserId}
                        disabled={isBookingRouteLocked}
                        onValueChange={(nextValue) => {
                          clearPersistedDraftContext()
                          updateDraft({
                            customerUserId: nextValue,
                            vehicleId: '',
                            bookingId: '',
                          })
                        }}
                        options={customerSelectItems}
                        placeholder="Search customer name or email"
                        noResultsText="No matching customer. Add a walk-in customer if this is a new record."
                        onSearchChange={setCustomerSearchQuery}
                        loading={customerListState.status === 'loading'}
                        error={customerListState.status === 'error' ? customerListState.message : ''}
                      />
                    </div>
                    <div data-intake-control="vehicle">
                      <IntakeSearchCombobox
                        label="Vehicle"
                        value={draft.vehicleId}
                        disabled={isBookingRouteLocked || !draft.customerUserId}
                        onValueChange={(nextValue) => {
                          clearPersistedDraftContext()
                          updateDraft({ vehicleId: nextValue, bookingId: '' })
                        }}
                        options={vehicleSelectItems}
                        placeholder={draft.customerUserId ? 'Search plate, reference, make, or model' : 'Choose a customer first'}
                        noResultsText="No matching vehicle belongs to this customer."
                      />
                    </div>
                    {!selectedCustomer || !selectedVehicle ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-orange/25 bg-brand-orange/5 px-3 py-2 md:col-span-2">
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">No suitable customer or vehicle selected?</p>
                          <p className="hidden text-xs text-ink-muted xl:block">Create or reuse an intake-only walk-in record without login credentials.</p>
                        </div>
                        <button
                          ref={walkInTriggerRef}
                          type="button"
                          className="btn-primary min-h-11"
                          aria-haspopup="dialog"
                          aria-controls="walk-in-customer-dialog"
                          onClick={openWalkInModal}
                        >
                          <Plus size={16} aria-hidden="true" />
                          Add walk-in customer
                        </button>
                      </div>
                    ) : null}
                    {isBookingArrival || eligibleVehicleBookings.length > 1 ? (
                      <label className="label md:col-span-2" data-intake-control="booking">
                        {isBookingRouteLocked ? 'Linked booking' : 'Choose a booking when applicable'}
                        <PortalSelect
                          value={draft.bookingId}
                          disabled={isBookingRouteLocked}
                          onValueChange={(nextValue) => {
                            clearPersistedDraftContext()
                            updateDraft({ bookingId: nextValue })
                          }}
                          items={bookingSelectItems}
                          placeholder={isBookingRouteLocked ? 'Linked booking' : 'No booking / choose one'}
                          emptyOptionLabel={isBookingRouteLocked ? 'Linked booking' : 'No booking / choose one'}
                        />
                      </label>
                    ) : (
                      <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-secondary">
                        <p className="font-semibold text-ink-primary">No booking link</p>
                      </div>
                    )}
                    {walkInAnnouncement ? <p className="sr-only" role="status" aria-live="polite">{walkInAnnouncement}</p> : null}
                  </div>
                  </IntakeSection>
                ) : null}

                {activeIntakeTab === 'visit_type' ? (
                  <IntakeSection
                  step="2"
                  title={WORKSPACE_INFORMATION_ARCHITECTURE.intake.sections.visitType}
                >
                  <div className="space-y-3">
                    <div
                      ref={visitTypeGroupRef}
                      role="group"
                      aria-label="Visit Type"
                      aria-describedby={!visitTypeReady ? 'visit-type-next-reason' : undefined}
                      tabIndex={-1}
                      data-intake-control="visit-type"
                      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                    >
                      {visitTypeOptions.map((option) => {
                        const isSelected = draft.visitType === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => updateVisitType(option.value)}
                            className={`rounded-lg border p-3 text-left transition-colors ${
                              isSelected
                                ? 'border-brand-orange bg-brand-orange/10'
                                : 'border-surface-border bg-surface-raised hover:border-brand-orange/40'
                            }`}
                          >
                            <p className="text-sm font-semibold text-ink-primary">{option.label}</p>
                            <p className="mt-1 text-xs leading-5 text-ink-muted lg:hidden xl:block">{option.description}</p>
                          </button>
                        )
                      })}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-raised p-3 text-sm text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={draft.isRepeatVisit}
                          onChange={(event) => updateDraft({ isRepeatVisit: event.target.checked })}
                          className="h-4 w-4 accent-[#f07c00]"
                        />
                        Repeat visit
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-raised p-3 text-sm text-ink-secondary">
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
                ) : null}
              </>
            ) : null}

            {['concerns_services', 'requirements'].includes(activeIntakeTab) ? (
              <>
                {activeIntakeTab === 'concerns_services' ? (
                  <IntakeSection
                  step="3"
                  title={WORKSPACE_INFORMATION_ARCHITECTURE.intake.sections.concern}
                  badge={customerConcerns.length ? `${customerConcerns.length} concern${customerConcerns.length === 1 ? '' : 's'}` : 'Waiting for concern'}
                >
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-surface-border bg-surface-raised p-3 md:col-span-2 lg:col-span-1" data-intake-control="reason-for-visit">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="label">Reasons for visit</p>
                          <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                            {((draft.reasonForVisits?.length ? draft.reasonForVisits : [draft.reasonForVisit]).filter(Boolean).slice(0, 3)).map((reason) => <span key={reason} className="badge badge-gray">{reason}</span>)}
                            {((draft.reasonForVisits?.length ? draft.reasonForVisits : [draft.reasonForVisit]).filter(Boolean).length > 3) ? <span className="badge badge-gray">+{(draft.reasonForVisits?.length ? draft.reasonForVisits : [draft.reasonForVisit]).filter(Boolean).length - 3} more</span> : null}
                            {!((draft.reasonForVisits?.length ? draft.reasonForVisits : [draft.reasonForVisit]).filter(Boolean).length) ? <span className="text-sm text-ink-muted">No reasons selected yet.</span> : null}
                          </div>
                          <p className="mt-2 text-xs text-ink-muted">{(draft.reasonForVisits?.length || draft.reasonForVisit ? (draft.reasonForVisits?.length || 1) : 0)} selected</p>
                        </div>
                        <button ref={reasonChooserTriggerRef} type="button" className="btn-ghost min-h-10" aria-haspopup="dialog" onClick={() => openChoiceModal('reasons')}>
                          {isBookingArrival ? 'Review locked reasons' : 'Choose reasons'}
                        </button>
                      </div>
                      {isBookingArrival ? <p className="mt-2 text-xs font-semibold text-brand-orange">Booking reasons are authoritative and cannot be changed here.</p> : null}
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-raised p-3" data-intake-control="service-concern">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="label">Customer concerns</p>
                          <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                            {customerConcerns.slice(0, 2).map((concern) => <span key={concern} className="badge badge-gray max-w-full truncate">{concern}</span>)}
                            {customerConcerns.length > 2 ? <span className="badge badge-gray">+{customerConcerns.length - 2} more</span> : null}
                            {!customerConcerns.length ? <span className="text-sm text-ink-muted">No concerns captured.</span> : null}
                          </div>
                          <p className="mt-2 text-xs text-ink-muted">{customerConcerns.length} recorded</p>
                        </div>
                        <button
                          ref={concernsTriggerRef}
                          type="button"
                          className="btn-ghost min-h-10"
                          aria-haspopup="dialog"
                          onClick={openConcernsModal}
                        >
                          {customerConcerns.length ? 'Edit concerns' : 'Add concerns'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-raised p-3" data-intake-control="requested-services">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="label">Requested services</p>
                          <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                            {selectedServiceNames.slice(0, 3).map((serviceName) => <span key={serviceName} className="badge badge-gray">{serviceName}</span>)}
                            {selectedServiceNames.length > 3 ? <span className="badge badge-gray">+{selectedServiceNames.length - 3} more</span> : null}
                            {!selectedServiceNames.length ? <span className="text-sm text-ink-muted">No services selected yet.</span> : null}
                          </div>
                          <p className="mt-2 text-xs text-ink-muted">{selectedServiceNames.length} selected of {serviceCatalogItems.length}</p>
                        </div>
                        <button ref={serviceChooserTriggerRef} type="button" className="btn-ghost min-h-10" aria-haspopup="dialog" onClick={() => openChoiceModal('services')}>
                          {isBookingArrival ? 'Review locked services' : 'Choose services'}
                        </button>
                      </div>
                      {isBookingArrival ? <p className="mt-2 text-xs font-semibold text-brand-orange">Booked services are authoritative and cannot be changed here.</p> : null}
                      {serviceCatalogState.status === 'loading' ? <p className="mt-2 text-xs text-ink-muted" role="status">Loading live service catalog…</p> : null}
                      {serviceCatalogState.status === 'error' ? <p className="mt-2 text-xs text-red-300" role="alert">{serviceCatalogState.message}</p> : null}
                    </div>
                  </div>
                  </IntakeSection>
                ) : null}

                {activeIntakeTab === 'requirements' ? (
                  <IntakeSection
                  step="4"
                  title={WORKSPACE_INFORMATION_ARCHITECTURE.intake.sections.requirements}
                  badge={requirementsBadge}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleRequirementOptions.map((option) => (
                      <label
                        key={option.value}
                        data-intake-control={option.value}
                        className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-raised p-3 text-sm text-ink-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(draft.requirementsChecklist[option.value])}
                          onChange={(event) => updateRequirement(option.value, event.target.checked)}
                          className="h-4 w-4 accent-[#f07c00]"
                        />
                        <span>
                          <span className="font-medium text-ink-primary">{option.label}</span>
                          {option.helper ? <span className="mt-1 block text-xs text-ink-muted lg:hidden xl:block">{option.helper}</span> : null}
                        </span>
                      </label>
                    ))}
                    <fieldset
                      data-intake-control="sticker-observation"
                      className="rounded-lg border border-surface-border bg-surface-raised p-3 sm:col-span-2 lg:col-span-3"
                    >
                      <legend className="px-1 text-sm font-semibold text-ink-primary">Official vehicle sticker</legend>
                      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
                        {[
                          { value: 'verified_present', label: 'Official sticker verified present' },
                          { value: 'not_present', label: 'Not present' },
                        ].map((option) => (
                          <label key={option.value} className="flex min-h-10 items-center gap-2 text-sm text-ink-secondary">
                            <input
                              type="radio"
                              name="stickerObservation"
                              value={option.value}
                              checked={draft.stickerObservation === option.value}
                              onChange={(event) => setDraft((current) => ({
                                ...current,
                                stickerObservation: event.target.value,
                                stickerObservationReason:
                                  event.target.value === 'not_present'
                                    ? current.stickerObservationReason
                                    : '',
                              }))}
                              className="h-4 w-4 accent-[#f07c00]"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">An affixed official sticker is required to earn and redeem loyalty points.</p>
                      {draft.stickerObservation === 'not_present' ? (
                        <div className="mt-2" data-intake-control="sticker-observation-reason">
                          <label className="label" htmlFor="sticker-observation-reason">Reason sticker is absent</label>
                          <input
                            id="sticker-observation-reason"
                            value={draft.stickerObservationReason ?? ''}
                            onChange={(event) => setDraft((current) => ({
                              ...current,
                              stickerObservationReason: event.target.value,
                            }))}
                            maxLength={intakeFieldMaxLengths.stickerObservationReason}
                            required
                            placeholder="Concise intake observation"
                            className="input mt-1"
                          />
                        </div>
                      ) : null}
                    </fieldset>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-surface-border bg-surface-raised p-2.5">
                      <p className="text-xs text-ink-muted">Odometer</p>
                      <p className="mt-1 text-sm font-semibold text-ink-primary">
                        {draft.currentOdometerKm || 'Not captured'} km
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-raised p-2.5">
                      <p className="text-xs text-ink-muted">Customer acknowledgement</p>
                      <p className="mt-1 text-sm font-semibold text-ink-primary">
                        {draft.customerAcknowledged ? 'Confirmed' : 'Still needed'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-raised p-2.5">
                      <p className="text-xs text-ink-muted">Arrival mode</p>
                      <p className="mt-1 text-sm font-semibold text-ink-primary">
                        {isBookingArrival ? 'Booked' : 'Walk-in'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">Requirement notes</p>
                      <p className="text-xs text-ink-muted">
                        {[draft.missingRequirementsNote, draft.safetyAccessNotes].filter(Boolean).length} of 2 notes captured
                      </p>
                    </div>
                    <button
                      ref={requirementsNotesTriggerRef}
                      type="button"
                      className="btn-ghost min-h-9"
                      aria-haspopup="dialog"
                      onClick={() => openDetailModal('requirements-notes')}
                    >
                      Edit notes
                    </button>
                  </div>
                  </IntakeSection>
                ) : null}
              </>
            ) : null}

            {activeIntakeTab === 'arrival_inspection' ? (
              <IntakeSection
                step="5"
                title={WORKSPACE_INFORMATION_ARCHITECTURE.intake.sections.inspection}
                badge={`${arrivalInspectionProgress.checked} of ${arrivalInspectionProgress.total} checked`}
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" data-intake-inspection-overview>
                  <div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {arrivalInspectionCategoryProgress.map((category) => (
                        <div key={category.value} className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink-primary">{category.label}</p>
                            <span className="text-xs text-ink-muted">{category.checked}/{category.total}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {category.issues} issue{category.issues === 1 ? '' : 's'} · {category.total - category.checked} unreviewed
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-muted" role="status">
                      {arrivalInspectionProgress.issues
                        ? `${arrivalInspectionProgress.issues} issue${arrivalInspectionProgress.issues === 1 ? '' : 's'} need handoff attention.`
                        : `${arrivalInspectionProgress.total - arrivalInspectionProgress.checked} condition item${arrivalInspectionProgress.total - arrivalInspectionProgress.checked === 1 ? '' : 's'} remain unreviewed.`}
                    </p>
                  </div>
                  <button
                    ref={inspectionModalTriggerRef}
                    type="button"
                    className="btn-primary min-h-11 lg:min-w-52"
                    aria-haspopup="dialog"
                    onClick={() => setInspectionModalOpen(true)}
                  >
                    {arrivalInspectionProgress.checked ? 'Continue inspection' : 'Open inspection'}
                  </button>
                </div>

                <IntakeFocusedModal
                  open={inspectionModalOpen}
                  title="Arrival inspection"
                  description="Review each category, record issues, and complete the reception sign-off."
                  onClose={() => setInspectionModalOpen(false)}
                  returnFocusRef={inspectionModalTriggerRef}
                  widthClassName="max-w-5xl"
                >
                <div className="grid gap-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="label" data-intake-control="odometer">
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

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2">
                  <p className="text-xs text-ink-muted">
                    {draft.damageAreas.length} damage areas · {selectedArrivalPhotoCount}/{arrivalPhotoSlots.length} photos
                  </p>
                  <div className="flex flex-wrap gap-2">
                  <button
                    ref={arrivalDetailsTriggerRef}
                    type="button"
                    className="btn-ghost min-h-9"
                    aria-haspopup="dialog"
                    onClick={() => openDetailModal('arrival-details')}
                  >
                    Condition details
                  </button>
                  <button
                    ref={arrivalPhotosTriggerRef}
                    type="button"
                    className="btn-ghost min-h-9"
                    onClick={() => setArrivalPhotosModalOpen(true)}
                  >
                    <Plus size={16} />
                    Photos
                  </button>
                  </div>
                </div>

                <IntakeFocusedModal
                  open={arrivalPhotosModalOpen}
                  title="Arrival photos"
                  description="Add only the views needed to document the vehicle condition at reception."
                  onClose={() => setArrivalPhotosModalOpen(false)}
                  returnFocusRef={arrivalPhotosTriggerRef}
                  widthClassName="max-w-4xl"
                >
                  <div className="grid gap-3 md:grid-cols-2">
  {arrivalPhotoSlots.map((slot) => (
    <div key={slot.value}>
      <p className="label">{slot.label}</p>
      <input
        ref={(node) => {
          arrivalPhotoInputRefs.current[slot.value] = node
        }}
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
      {arrivalPhotoUploads[slot.value]?.error ? (
        <p className="mt-2 text-sm text-red-300" role="alert">
          {arrivalPhotoUploads[slot.value].error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">JPEG, PNG, or WebP, up to 5 MB.</p>
      )}
    </div>
  ))}
</div>
                </IntakeFocusedModal>

                <div>
                  <div className="hidden">
                    <div>
                      <p className="label">Arrival condition</p>
                      <p className="text-sm text-ink-muted" aria-live="polite">
                        {arrivalInspectionProgress.checked} of {arrivalInspectionProgress.total} checked
                        {arrivalInspectionProgress.issues ? ` · ${arrivalInspectionProgress.issues} issue` : ''}. Each item must be marked OK or Issue.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost min-h-10 px-3 text-xs"
                      onClick={() => setMarkChecklistConfirmationOpen(true)}
                    >
                      Mark checked OK
                    </button>
                  </div>
                  <ArrivalInspectionPager
                    draft={draft}
                    arrivalPhotoUploads={arrivalPhotoUploads}
                    activeCategory={activeInspectionCategory}
                    onCategoryChange={setActiveInspectionCategory}
                    onUpdateItem={updateChecklistItem}
                    onOpenIssue={openChecklistIssueEditor}
                    onRemoveIssue={removeChecklistIssue}
                    onMarkAllOk={() => {
                      setInspectionModalOpen(false)
                      setMarkChecklistConfirmationOpen(true)
                    }}
                  />
                  {/* The former inline checklist selector was removed; ArrivalInspectionPager above owns this stage.
                  <div className="hidden" aria-hidden="true">
                    {checklistItemOptions.map((item) => {
                      const inspectionItem = draft.arrivalInspectionItems?.find((entry) => entry.key === item.value)
                      const status = getChecklistStatus(inspectionItem ?? draft.checklist[item.value])
                      const issueDetails = getChecklistIssueDetails(inspectionItem ?? draft.checklist[item.value])
                      const issuePhoto = issueDetails.evidenceSlot
                        ? arrivalPhotoUploads[issueDetails.evidenceSlot]
                        : null

                      return (
                        <div
                          key={item.value}
                          data-intake-control={`checklist-${item.value}`}
                          className="rounded-lg border border-surface-border bg-surface-raised p-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-ink-primary">{item.label}</p>
                            <div className="booking-segmented-control w-full flex-wrap sm:w-auto">
                              <button
                                type="button"
                                onClick={() => updateChecklistItem(item.value, 'unchecked')}
                                aria-pressed={status === 'unchecked'}
                                className={`booking-tab-button min-h-11 ${status === 'unchecked' ? 'booking-tab-button-active' : ''}`}
                              >
                                Unchecked
                              </button>
                              <button
                                type="button"
                                onClick={() => updateChecklistItem(item.value, 'ok')}
                                aria-pressed={status === 'ok'}
                                className={`booking-tab-button min-h-11 ${status === 'ok' ? 'booking-tab-button-active' : ''}`}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => openChecklistIssueEditor(item)}
                                aria-pressed={status === 'issue'}
                                className={`booking-tab-button min-h-11 ${status === 'issue' ? 'booking-tab-button-active' : ''}`}
                              >
                                {status === 'issue' ? 'Edit issue' : 'Issue'}
                              </button>
                            </div>
                          </div>
                          {status === 'issue' ? (
                            <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/5 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-orange">
                                    Issue · {formatLabel(issueDetails.severity)} attention
                                  </p>
                                  <p className="mt-1 text-sm text-ink-primary">
                                    {[issueDetails.location, issueDetails.description].filter(Boolean).join(' — ') ||
                                      'Details still need to be completed.'}
                                  </p>
                                  {issuePhoto?.fileName ? (
                                    <p className="mt-1 text-xs text-ink-muted">Evidence: {issuePhoto.fileName}</p>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  className="btn-ghost min-h-9 px-3 text-xs"
                                  onClick={() => removeChecklistIssue(item.value)}
                                >
                                  Remove issue
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  */}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <label data-intake-control="customer-acknowledgement" className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={draft.customerAcknowledged}
                      onChange={(event) => updateDraft({ customerAcknowledged: event.target.checked })}
                      className="h-4 w-4 accent-[#f07c00]"
                    />
                    Customer acknowledged the arrival summary.
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
              </div>
              </IntakeFocusedModal>
              </IntakeSection>
            ) : null}

            {activeIntakeTab === 'review_handoff' ? (
              <div className="rounded-lg border border-surface-border bg-surface-card p-3" data-intake-review-overview>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink-primary">Readiness and handoff</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {completedIntakeRequirements.ready
                        ? 'Required Intake information is complete.'
                        : `${completedIntakeRequirements.blockers.length} required item${completedIntakeRequirements.blockers.length === 1 ? '' : 's'} need attention.`}
                    </p>
                  </div>
                  <span className={`badge ${completedIntakeRequirements.ready ? 'badge-green' : 'badge-orange'}`}>
                    {completedIntakeRequirements.ready ? 'Ready' : 'Not ready'}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2">
                    <p className="text-xs text-ink-muted">Destination</p>
                    <p className="text-sm font-semibold text-ink-primary">{nextRouteLabel}</p>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2">
                    <p className="text-xs text-ink-muted">Next action</p>
                    <p className="text-sm font-semibold text-ink-primary">
                      {completedIntakeRequirements.ready ? primaryActionLabel : 'Resolve required items'}
                    </p>
                  </div>
                </div>

                {completedIntakeRequirements.blockers.length ? (
                  <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/5 px-3 py-2" role="status">
                    <p className="text-xs font-semibold text-ink-primary">Required before handoff</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {completedIntakeRequirements.blockers.slice(0, 3).map((blocker) => (
                        <button
                          key={blocker.key}
                          type="button"
                          className="min-h-9 text-left text-xs text-brand-orange underline decoration-brand-orange/40 underline-offset-2"
                          onClick={() => focusIntakeBlocker(blocker)}
                        >
                          {blocker.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-3">
                  <p className="text-xs text-ink-muted">Save draft or complete handoff using the persistent actions below.</p>
                  <button
                    ref={reviewDetailsTriggerRef}
                    type="button"
                    className="btn-ghost min-h-9"
                    aria-haspopup="dialog"
                    onClick={() => setReviewDetailsModalOpen(true)}
                  >
                    Review details
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          </div>

          <footer className="mt-2 flex min-w-0 shrink-0 flex-col gap-2 border-t border-surface-border px-1 pt-2 sm:flex-row sm:items-center sm:justify-between" data-intake-actions>
            <div>
              <p className="text-xs text-ink-muted" aria-live="polite">
                {captureState.status === 'capture_submitting'
                  ? 'Saving intake...'
                  : completedIntakeRequirements.ready
                    ? 'Ready to complete when you reach Review & Handoff.'
                    : `${completedIntakeRequirements.blockers.length} item${completedIntakeRequirements.blockers.length === 1 ? '' : 's'} needs attention.`}
              </p>
              {visitTypeNextBlocked ? (
                <p id="visit-type-next-reason" className="mt-1 text-xs font-medium text-amber-300" role="status">
                  Choose a visit type to continue.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost min-h-9"
                disabled={!previousIntakeStage || captureState.status === 'capture_submitting'}
                onClick={() => previousIntakeStage && setActiveIntakeTab(previousIntakeStage)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                className="btn-ghost min-h-9"
                disabled={captureState.status === 'capture_submitting'}
                onClick={() => void saveInspection('pending')}
              >
                {isSubmittingPending ? 'Saving draft...' : 'Save draft'}
              </button>
              {activeIntakeTab === 'review_handoff' ? (
                <button
                  type="button"
                  className="btn-primary min-h-9"
                  disabled={isSubmittingCompleted || !completedIntakeRequirements.ready}
                  onClick={() => void saveInspection('completed')}
                >
                  {isSubmittingCompleted ? 'Completing...' : primaryActionLabel}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary min-h-9"
                  disabled={!nextIntakeStage || captureState.status === 'capture_submitting' || visitTypeNextBlocked}
                  aria-describedby={visitTypeNextBlocked ? 'visit-type-next-reason' : undefined}
                  onClick={() => nextIntakeStage && requestIntakeStage(nextIntakeStage, { allowCompletedRevisit: false })}
                >
                  Next
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </footer>
        </div>

        <IntakeFocusedModal
          open={historyModalOpen}
          title="Vehicle inspection history"
          description="Browse 20 records per page. Select a record to review its findings and evidence."
          onClose={() => setHistoryModalOpen(false)}
          widthClassName="max-w-5xl"
        >
          <section className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="card-title">Inspection History</p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  Review past records for the active vehicle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-gray">
                  {inspections.length
                    ? `Page ${historyPreviousCursors.length + 1} / ${inspections.length} record${inspections.length === 1 ? '' : 's'}`
                    : 'No records'}
                </span>
                <span className="badge badge-gray">Read state: {formatLabel(historyState.status)}</span>
                <button
                  type="button"
                  onClick={() => void loadHistory({ cursor: null, previousCursors: [] })}
                  className="btn-ghost"
                >
                  <FileSearch size={15} />
                  Refresh history
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
            {historyPreviousCursors.length > 0 || historyPageInfo.nextCursor ? (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-border pt-3">
                <p className="text-xs text-ink-muted">
                  20 records per page, newest first{historyPageInfo.total ? ` / ${historyPageInfo.total} total` : ''}.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost min-h-10"
                    disabled={historyPreviousCursors.length === 0 || historyState.status === 'history_loading'}
                    onClick={() => {
                      const previous = historyPreviousCursors.slice(0, -1)
                      void loadHistory({
                        cursor: historyPreviousCursors.at(-1) ?? null,
                        previousCursors: previous,
                      })
                    }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-ghost min-h-10"
                    disabled={!historyPageInfo.nextCursor || historyState.status === 'history_loading'}
                    onClick={() =>
                      void loadHistory({
                        cursor: historyPageInfo.nextCursor,
                        previousCursors: [...historyPreviousCursors, historyCursor],
                      })
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
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
                    <p className="mt-2 text-sm font-semibold text-ink-primary">
                      {selectedVehicle?.publicReference || selectedVehicle?.plateNumber || 'Reference unavailable'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">Booking</p>
                    <p className="mt-2 break-all text-sm font-semibold text-ink-primary">
                      {selectedBooking?.bookingReference || (selectedInspection.bookingId ? 'Reference unavailable' : 'Not linked')}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink-primary">Captured Intake Snapshot</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge badge-gray">Version {selectedInspection.version ?? 'legacy'}</span>
                      <span className="badge badge-gray">
                        Paper: {formatLabel(selectedInspection.intakeData?.paperChecklistStatus || 'not_started')}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    Saved intake details appear here so staff can review what was actually recorded during
                    reception, not only the linked booking data.
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">
                    Provenance: {selectedInspection.intakeDataVersion === 1 ? 'Structured intake v1' : 'Legacy intake'}
                    {selectedInspection.createdAt ? ` / created ${new Date(selectedInspection.createdAt).toLocaleString('en-PH')}` : ''}
                    {selectedInspection.updatedAt ? ` / updated ${new Date(selectedInspection.updatedAt).toLocaleString('en-PH')}` : ''}
                  </p>
                  <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised p-3">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-ink-primary">
                      {selectedInspection.notes || 'No intake notes were saved on this inspection record.'}
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
                      {(selectedInspection.evidence?.length || selectedInspection.attachmentRefs?.length) ?? 0} attachment
                      {((selectedInspection.evidence?.length || selectedInspection.attachmentRefs?.length) ?? 0) === 1 ? '' : 's'}
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
                  <p className="text-sm font-bold text-ink-primary">Inspection Evidence</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Files are loaded through authenticated evidence routes. Internal storage keys are never displayed.
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedInspection.evidence?.length ? (
                      selectedInspection.evidence.map((evidence) => {
                        const viewState = evidenceViewState[evidence.id] ?? { status: 'idle' }
                        return (
                          <div key={evidence.id} className="rounded-xl border border-surface-border bg-surface-raised p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink-primary">{evidence.originalName}</p>
                                <p className="mt-1 text-xs text-ink-muted">
                                  {formatLabel(evidence.slot)} / {evidence.mimeType} / {formatEvidenceSize(evidence.byteSize)}
                                </p>
                                <p className="mt-1 text-xs text-ink-muted">
                                  Provenance: Staff upload{evidence.createdAt ? ` on ${new Date(evidence.createdAt).toLocaleString('en-PH')}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="btn-ghost min-h-9 px-3 text-xs"
                                disabled={viewState.status === 'loading'}
                                onClick={() => void viewEvidence(evidence)}
                                aria-label={`Preview ${evidence.originalName}`}
                              >
                                {viewState.status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                                Preview
                              </button>
                            </div>
                            {viewState.status === 'loaded' && viewState.url ? (
                              <div className="mt-3 overflow-hidden rounded-lg border border-surface-border bg-surface-card">
                                <Image
                                  src={viewState.url}
                                  alt={`${formatLabel(evidence.slot)} inspection evidence: ${evidence.originalName}`}
                                  width={640}
                                  height={360}
                                  unoptimized
                                  className="max-h-80 w-full object-contain"
                                />
                              </div>
                            ) : null}
                            {viewState.status === 'error' ? (
                              <p className="mt-3 text-sm text-red-300" role="alert">{viewState.message}</p>
                            ) : null}
                          </div>
                        )
                      })
                    ) : selectedInspection.attachmentRefs?.length ? (
                      <div className="status-message status-message-warning">
                        {selectedInspection.attachmentRefs.length} legacy evidence file
                        {selectedInspection.attachmentRefs.length === 1 ? '' : 's'} stored. Secure preview metadata is unavailable for this older record.
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        No evidence is stored on this inspection yet.
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
        </IntakeFocusedModal>
      </section>

      <IntakeFocusedModal
        open={reviewDetailsModalOpen}
        title="Intake review details"
        description="Read-only record, evidence, and handoff provenance for this Intake draft."
        onClose={() => setReviewDetailsModalOpen(false)}
        returnFocusRef={reviewDetailsTriggerRef}
        widthClassName="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
              <p className="text-xs text-ink-muted">Customer</p>
              <p className="mt-1 text-sm font-semibold text-ink-primary">{selectedCustomer?.displayName || selectedCustomer?.email || 'Not selected'}</p>
              <p className="mt-1 text-xs text-ink-muted">{draft.customerUserId || 'No customer reference'}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
              <p className="text-xs text-ink-muted">Vehicle</p>
              <p className="mt-1 text-sm font-semibold text-ink-primary">{selectedVehicle ? formatVehicleOptionLabel(selectedVehicle) : 'Not selected'}</p>
              <p className="mt-1 text-xs text-ink-muted">{draft.vehicleId || 'No vehicle reference'}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
              <p className="text-xs text-ink-muted">Arrival provenance</p>
              <p className="mt-1 text-sm font-semibold text-ink-primary">{isBookingArrival ? 'Eligible booking link' : 'Walk-in intake'}</p>
              <p className="mt-1 text-xs text-ink-muted">{selectedBooking?.bookingReference || 'No booking reference'}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
              <p className="text-sm font-semibold text-ink-primary">Visit and services</p>
              <dl className="mt-2 space-y-2 text-sm text-ink-muted">
                <div><dt className="inline font-medium text-ink-primary">Visit: </dt><dd className="inline">{selectedVisitTypeMeta.label}</dd></div>
                <div><dt className="inline font-medium text-ink-primary">Reasons: </dt><dd className="inline">{draft.reasonForVisits?.join(', ') || draft.reasonForVisit || 'None selected'}</dd></div>
                <div><dt className="inline font-medium text-ink-primary">Services: </dt><dd className="inline">{draft.requestedServiceNames?.join(', ') || draft.requestedServiceSummary || 'None selected'}</dd></div>
              </dl>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
              <p className="text-sm font-semibold text-ink-primary">Inspection and evidence</p>
              <dl className="mt-2 space-y-2 text-sm text-ink-muted">
                <div><dt className="inline font-medium text-ink-primary">Checklist: </dt><dd className="inline">{arrivalInspectionProgress.checked}/{arrivalInspectionProgress.total} checked, {arrivalInspectionProgress.issues} issues</dd></div>
                <div><dt className="inline font-medium text-ink-primary">Arrival: </dt><dd className="inline">{draft.currentOdometerKm || 'No odometer'} km · {draft.fuelLevel || 'No fuel level'}</dd></div>
                <div><dt className="inline font-medium text-ink-primary">Evidence: </dt><dd className="inline">{selectedArrivalPhotoCount} staff-selected arrival file{selectedArrivalPhotoCount === 1 ? '' : 's'}</dd></div>
              </dl>
            </div>
          </div>

          {completedIntakeRequirements.blockers.length ? (
            <div className="rounded-lg border border-brand-orange/25 bg-brand-orange/5 p-3">
              <p className="text-sm font-semibold text-ink-primary">Required items</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {completedIntakeRequirements.blockers.map((blocker) => (
                  <li key={blocker.key}>
                    <button
                      type="button"
                      className="min-h-9 text-left text-sm text-brand-orange underline decoration-brand-orange/40 underline-offset-2"
                      onClick={() => {
                        setReviewDetailsModalOpen(false)
                        focusIntakeBlocker(blocker)
                      }}
                    >
                      {blocker.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="status-message status-message-success">All required Intake information is ready for {nextRouteLabel.toLowerCase()}.</p>
          )}
        </div>
      </IntakeFocusedModal>

      <IntakeFocusedModal
        open={Boolean(checklistIssueEditor)}
        title={checklistIssueEditor ? `${checklistIssueEditor.label} issue` : 'Checklist issue'}
        description="Capture enough detail for the next team to act on the exception."
        onClose={closeChecklistIssueEditor}
        widthClassName="max-w-xl"
        returnFocusRef={checklistIssueTriggerRef}
      >
        {checklistIssueEditor ? (
          <div className="space-y-4">
            <label className="label">
              Issue location <span className="text-brand-orange" aria-hidden="true">*</span>
              <input
                className="input"
                value={checklistIssueEditor.location}
                maxLength={160}
                placeholder="Example: front-left side, engine bay, dashboard"
                onChange={(event) =>
                  setChecklistIssueEditor((current) => ({ ...current, location: event.target.value, error: '' }))
                }
                autoFocus
              />
            </label>
            <label className="label">
              Attention level <span className="text-brand-orange" aria-hidden="true">*</span>
              <select
                className="input"
                value={checklistIssueEditor.severity}
                onChange={(event) =>
                  setChecklistIssueEditor((current) => ({ ...current, severity: event.target.value, error: '' }))
                }
              >
                <option value="low">Low — note for handoff</option>
                <option value="medium">Medium — review before work</option>
                <option value="high">High — safety or immediate attention</option>
              </select>
            </label>
            <label className="label">
              What was observed? <span className="text-brand-orange" aria-hidden="true">*</span>
              <textarea
                className="input min-h-[120px] resize-y"
                value={checklistIssueEditor.description}
                maxLength={500}
                placeholder="Describe what was observed and any immediate concern."
                onChange={(event) =>
                  setChecklistIssueEditor((current) => ({ ...current, description: event.target.value, error: '' }))
                }
              />
            </label>
            <div>
              <p className="label">Optional evidence photo</p>
              <input
                ref={(node) => {
                  if (checklistIssueEditor.evidenceSlot) {
                    arrivalPhotoInputRefs.current[checklistIssueEditor.evidenceSlot] = node
                  }
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const [file] = Array.from(event.target.files ?? [])
                  const slot = checklistIssueEditor.evidenceSlot
                  updateArrivalPhotoFile(slot, file)
                  if (file) {
                    setChecklistIssueEditor((current) => ({ ...current, photoName: file.name, error: '' }))
                  }
                  event.target.value = ''
                }}
              />
              <button
                type="button"
                className="btn-ghost min-h-11 w-full justify-start"
                onClick={() => arrivalPhotoInputRefs.current[checklistIssueEditor.evidenceSlot]?.click()}
              >
                <Plus size={15} />
                {checklistIssueEditor.photoName || 'Add an evidence photo'}
              </button>
              {arrivalPhotoUploads[checklistIssueEditor.evidenceSlot]?.error ? (
                <p className="mt-2 text-sm text-red-300" role="alert">
                  {arrivalPhotoUploads[checklistIssueEditor.evidenceSlot].error}
                </p>
              ) : (
                <p className="mt-2 text-xs text-ink-muted">JPEG, PNG, or WebP, up to 5 MB.</p>
              )}
            </div>
            {checklistIssueEditor.error ? (
              <p className="status-message status-message-danger" role="alert">
                {checklistIssueEditor.error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 border-t border-surface-border pt-4">
              <button type="button" className="btn-ghost min-h-11" onClick={closeChecklistIssueEditor}>
                Cancel
              </button>
              <button type="button" className="btn-primary min-h-11" onClick={saveChecklistIssue}>
                Save issue
              </button>
            </div>
          </div>
        ) : null}
      </IntakeFocusedModal>

      <IntakeFocusedModal
        open={markChecklistConfirmationOpen}
        title="Mark arrival condition checked"
        description="This marks every baseline item OK. Use it only when each visible condition has been checked at reception."
        onClose={() => {
          setMarkChecklistConfirmationOpen(false)
          setInspectionModalOpen(true)
        }}
        widthClassName="max-w-md"
      >
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-ghost min-h-11"
            onClick={() => {
              setMarkChecklistConfirmationOpen(false)
              setInspectionModalOpen(true)
            }}
          >
            Cancel
          </button>
          <button type="button" className="btn-primary min-h-11" onClick={markAllChecklistOk}>
            Mark all checked OK
          </button>
        </div>
      </IntakeFocusedModal>

      <IntakeFocusedModal
        open={concernsModalOpen}
        title="Customer concerns"
        description="Keep each reported concern separate for a clearer handoff."
        onClose={closeConcernsModal}
        returnFocusRef={concernsTriggerRef}
        widthClassName="max-w-2xl"
      >
        <div className="space-y-3">
          {concernsModalDraft.map((item, index) => (
            <div key={item.id} className="grid gap-2 rounded-lg border border-surface-border bg-surface-raised p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="label">
                Concern {index + 1}
                <input
                  className="input"
                  value={item.text}
                  maxLength={intakeFieldMaxLengths.customerConcernText}
                  placeholder="Describe one reported concern"
                  onChange={(event) => {
                    const text = event.target.value
                    setConcernsModalDraft((current) => current.map((entry) => entry.id === item.id ? { ...entry, text } : entry))
                    setConcernsModalError('')
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-ghost min-h-11 text-red-300"
                onClick={() => {
                  setConcernsModalDraft((current) => current.filter((entry) => entry.id !== item.id))
                  setConcernsModalError('')
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">Up to 10 concerns, 500 characters each. The legacy summary is generated automatically.</p>
            <button
              type="button"
              className="btn-ghost min-h-10"
              disabled={concernsModalDraft.length >= 10}
              onClick={() => {
                setConcernsModalDraft((current) => [...current, { id: `concern-${++concernDraftIdRef.current}`, text: '' }])
                setConcernsModalError('')
              }}
            >
              <Plus size={16} aria-hidden="true" />
              Add concern
            </button>
          </div>
          {concernsModalError ? <p className="status-message status-message-danger" role="alert">{concernsModalError}</p> : null}
          <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
            <button type="button" className="btn-ghost min-h-11" onClick={closeConcernsModal}>Cancel</button>
            <button type="button" className="btn-primary min-h-11" onClick={saveConcernsModal}>Save concerns</button>
          </div>
        </div>
      </IntakeFocusedModal>

      <IntakeFocusedModal
        open={detailModalKind === 'requirements-notes'}
        title="Requirement notes"
        description="Capture optional missing-document and safety or access details."
        onClose={closeDetailModal}
        returnFocusRef={requirementsNotesTriggerRef}
        widthClassName="max-w-xl"
      >
        {detailModalDraft ? (
          <div className="space-y-4">
            <label className="label">
              Missing requirements note
              <textarea
                value={detailModalDraft.missingRequirementsNote ?? ''}
                onChange={(event) => setDetailModalDraft((current) => ({ ...current, missingRequirementsNote: event.target.value }))}
                rows={3}
                className="input min-h-[88px] resize-y"
                maxLength={intakeFieldMaxLengths.missingRequirementsNote}
                placeholder="Note anything the customer still needs to provide."
              />
            </label>
            <label className="label">
              Safety or access notes
              <textarea
                value={detailModalDraft.safetyAccessNotes ?? ''}
                onChange={(event) => setDetailModalDraft((current) => ({ ...current, safetyAccessNotes: event.target.value }))}
                rows={4}
                className="input min-h-[104px] resize-y"
                maxLength={intakeFieldMaxLengths.safetyAccessNotes}
                placeholder="Record access instructions or safety considerations."
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
              <button type="button" className="btn-ghost min-h-11" onClick={closeDetailModal}>Cancel</button>
              <button type="button" className="btn-primary min-h-11" onClick={applyDetailModal}>Save notes</button>
            </div>
          </div>
        ) : null}
      </IntakeFocusedModal>

      <IntakeFocusedModal
        open={detailModalKind === 'arrival-details'}
        title="Arrival condition details"
        description="Record optional damage, customer items, signature, paper status, and staff notes."
        onClose={closeDetailModal}
        returnFocusRef={arrivalDetailsTriggerRef}
      >
        {detailModalDraft ? (
          <div className="space-y-4">
            <fieldset>
              <legend className="label">Visible damage areas</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {damageAreaOptions.map((option) => {
                  const selected = detailModalDraft.damageAreas?.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      className={`booking-tab-button min-h-10 ${selected ? 'booking-tab-button-active' : ''}`}
                      onClick={() => setDetailModalDraft((current) => ({
                        ...current,
                        damageAreas: selected
                          ? current.damageAreas.filter((value) => value !== option.value)
                          : [...current.damageAreas, option.value],
                      }))}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="label">
                Damage notes
                <textarea
                  value={detailModalDraft.damageNotes ?? ''}
                  onChange={(event) => setDetailModalDraft((current) => ({ ...current, damageNotes: event.target.value }))}
                  rows={3}
                  className="input min-h-[88px] resize-y"
                  maxLength={intakeFieldMaxLengths.damageNotes}
                />
              </label>
              <label className="label">
                Items left in vehicle
                <textarea
                  value={detailModalDraft.customerItems ?? ''}
                  onChange={(event) => setDetailModalDraft((current) => ({ ...current, customerItems: event.target.value }))}
                  rows={3}
                  className="input min-h-[88px] resize-y"
                  maxLength={intakeFieldMaxLengths.customerItems}
                />
              </label>
              <label className="label">
                Customer signature name
                <input
                  value={detailModalDraft.customerSignatureName ?? ''}
                  onChange={(event) => setDetailModalDraft((current) => ({ ...current, customerSignatureName: event.target.value }))}
                  className="input"
                  maxLength={intakeFieldMaxLengths.customerSignatureName}
                />
              </label>
              <label className="label">
                Paper checklist status
                <PortalSelect
                  value={detailModalDraft.paperChecklistStatus}
                  onValueChange={(value) => setDetailModalDraft((current) => ({ ...current, paperChecklistStatus: value }))}
                  items={paperChecklistStatusOptions}
                  placeholder="Choose paper checklist status"
                  emptyOptionLabel="Choose paper checklist status"
                />
              </label>
            </div>
            <label className="label">
              Additional staff notes
              <textarea
                value={detailModalDraft.notes ?? ''}
                onChange={(event) => setDetailModalDraft((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="input min-h-[88px] resize-y"
                maxLength={intakeFieldMaxLengths.notes}
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
              <button type="button" className="btn-ghost min-h-11" onClick={closeDetailModal}>Cancel</button>
              <button type="button" className="btn-primary min-h-11" onClick={applyDetailModal}>Save details</button>
            </div>
          </div>
        ) : null}
      </IntakeFocusedModal>

      <WalkInCustomerModal
        open={walkInModalOpen}
        accessToken={user?.accessToken}
        returnFocusRef={walkInTriggerRef}
        onClose={() => setWalkInModalOpen(false)}
        onSuccess={handleWalkInSuccess}
      />

      <IntakeChoiceModal
        open={Boolean(choiceModalKind)}
        kind={choiceModalKind}
        options={choiceModalKind === 'reasons' ? reasonForVisitOptions : serviceCatalogItems}
        selectedValues={choiceModalKind === 'reasons'
          ? (draft.reasonForVisits?.length ? draft.reasonForVisits : [draft.reasonForVisit]).filter(Boolean)
          : draft.requestedServiceIds ?? []}
        lockedValues={isBookingArrival
          ? (choiceModalKind === 'reasons'
            ? (draft.reasonForVisits?.length ? draft.reasonForVisits : [draft.reasonForVisit]).filter(Boolean)
            : draft.requestedServiceIds ?? [])
          : []}
        returnFocusRef={choiceModalKind === 'reasons' ? reasonChooserTriggerRef : serviceChooserTriggerRef}
        onClose={() => setChoiceModalKind(null)}
        onApply={(values) => applyChoiceSelection(choiceModalKind, values)}
      />

      {captureState.message ? (
        <div className={`mt-4 ${getMessageTone(captureState.status)}`}>
          {captureState.message}
        </div>
      ) : null}

      {completionReceipt ? (
        <section className="mt-4 rounded-lg border border-brand-orange/30 bg-brand-orange/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-primary">Intake completion receipt</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Destination: {completionReceipt.destination}. The completed intake stays linked to this customer, vehicle, and booking.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge badge-gray">
                  {completionReceipt.inspectionReference || completionReceipt.inspectionId || 'Inspection recorded'}
                </span>
                <span className="badge badge-gray">Version {completionReceipt.version ?? 'legacy'}</span>
                <span className="badge badge-green">Completed {new Date(completionReceipt.completedAt).toLocaleString('en-PH')}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary min-h-11 shrink-0"
                onClick={() => {
                const params = new URLSearchParams()
                if (draft.bookingId) {
                  params.set('bookingId', draft.bookingId)
                }
                if (draft.vehicleId) {
                  params.set('vehicleId', draft.vehicleId)
                }
                if (draft.customerUserId) {
                  params.set('customerUserId', draft.customerUserId)
                }
                const suffix = params.toString()
                window.location.assign(`${completionReceipt.path}${suffix ? `?${suffix}` : ''}`)
              }}
              >
                {completionReceipt.actionLabel}
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="btn-ghost min-h-11"
                onClick={() => {
                  setDraft(getResetIntakeDraft({ receivedByStaff: defaultReceivedByStaff }))
                  setDraftRecord(null)
                  setCompletionReceipt(null)
                  setArrivalPhotoUploads({})
                  setDraftPersistenceState({ status: 'new', message: 'Ready for a new intake.' })
                  setActiveIntakeTab('arrival')
                }}
              >
                New Intake
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
