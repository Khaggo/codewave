'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import PortalSelect from '@/components/ui/PortalSelect'
import { ApiError, listAdminCustomers, listTechnicianProfiles } from '@/lib/authClient'
import {
  createBackJobCase,
  createReworkJobOrderFromBackJob,
  getBackJobById,
  listBackJobsByVehicle,
  updateBackJobStatus,
} from '@/lib/backJobsClient'
import { listVehicleBookings } from '@/lib/bookingStaffClient'
import { listVehicleInspections } from '@/lib/inspectionStaffClient'
import { listVehicleJobOrders } from '@/lib/jobOrderWorkbenchClient'
import { getBackJobReference, getBookingReference, getJobOrderReference, REFERENCE_UNAVAILABLE } from '@/lib/businessReferenceDisplay.mjs'
import { useUser } from '@/lib/userContext'
import {
  backJobReviewContractSources,
  backJobStatusLabels,
  canCreateReworkJobOrder,
  canStaffManageBackJobs,
  getAllowedBackJobStatusTargets,
  getBackJobCustomerVisibility,
  getBackJobValidationState,
  isBackJobCustomerSafe,
} from '@/lib/api/generated/back-jobs/staff-web-back-jobs'
import {
  buildBackJobReworkDraft,
  buildBackJobStatusDraft,
  defaultBackJobStatusDraft,
  getBackJobCounts,
  resolveBackJobReworkServiceAdviser,
  splitCommaSeparatedIds,
  toggleDelimitedIdValue,
  upsertBackJob,
} from './backJobsView.mjs'

const STATUS_META = {
  reported: { label: 'Reported', cls: 'badge-red' },
  inspected: { label: 'Inspected', cls: 'badge-orange' },
  approved_for_rework: { label: 'Approved For Rework', cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-orange' },
  resolved: { label: 'Resolved', cls: 'badge-green' },
  closed: { label: 'Closed', cls: 'badge-gray' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
}

const SEVERITY_META = {
  info: { label: 'Info', cls: 'badge-gray' },
  low: { label: 'Low', cls: 'badge-gray' },
  medium: { label: 'Medium', cls: 'badge-orange' },
  high: { label: 'High', cls: 'badge-red' },
}

const visibilityCopy = {
  staff_only_review: 'Staff-only review',
  customer_safe_rework: 'Customer-safe rework',
  customer_safe_outcome: 'Customer-safe outcome',
}

const initialLoadState = {
  status: 'back_jobs_ready',
  message: '',
}

const initialCreateState = {
  status: 'create_ready',
  message: '',
}

const initialStatusState = {
  status: 'status_ready',
  message: '',
}

const initialReworkState = {
  status: 'rework_ready',
  message: '',
}

const findingCategoryOptions = [
  { value: 'return_inspection', label: 'Return Inspection' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'repair_quality', label: 'Repair Quality' },
  { value: 'parts', label: 'Parts' },
  { value: 'customer_report', label: 'Customer Report' },
]

const formatDateTime = (value) => {
  if (!value) return 'Not recorded'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString()
}

const formatShortDate = (value) => {
  if (!value) return 'No date'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatCompactDateToken = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const formatCompactTimeToken = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}${minutes}${seconds}`
}

const normalizeBusinessToken = (value, fallback = 'WORK') => {
  const normalizedValue = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  return normalizedValue || fallback
}

const formatVehicleDisplayLabel = (vehicle) => {
  if (!vehicle) {
    return 'Unknown vehicle'
  }

  const summary = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
  return vehicle.plateNumber
    ? summary
      ? `${vehicle.plateNumber} · ${summary}`
      : vehicle.plateNumber
    : summary || 'Unknown vehicle'
}

const formatBackJobCaseReference = (backJob) => getBackJobReference(backJob, REFERENCE_UNAVAILABLE)

const formatJobOrderDisplayReference = (jobOrder, fallbackId) => {
  if (jobOrder?.jobOrderReference) {
    return jobOrder.jobOrderReference
  }

  if (jobOrder?.sourceBackJobReference) {
    return `JO-RW · ${jobOrder.sourceBackJobReference}`
  }

  if (jobOrder?.sourceBookingReference) {
    return `JO · ${jobOrder.sourceBookingReference}`
  }

  return getJobOrderReference(jobOrder)
}

const formatBookingDisplayReference = (booking, fallbackId) => {
  if (booking?.bookingReference) {
    return booking.bookingReference
  }

  if (booking?.reference) {
    return booking.reference
  }

  return getBookingReference(booking, REFERENCE_UNAVAILABLE)
}

const formatReturnInspectionReference = (inspection, fallbackId) => {
  if (inspection?.inspectionReference) {
    return inspection.inspectionReference
  }

  const dateToken = formatCompactDateToken(inspection?.createdAt)
  const timeToken = formatCompactTimeToken(inspection?.createdAt)

  if (dateToken) {
    return `INSP-${dateToken}${timeToken ? `-${timeToken}` : ''}`
  }

  return fallbackId ? 'Linked return inspection' : 'Not attached'
}

const formatReturnInspectionHelper = (inspection) => {
  if (!inspection) {
    return 'No return inspection linked yet'
  }

  return [
    formatShortDate(inspection.createdAt),
    inspection.status ? String(inspection.status).replaceAll('_', ' ') : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function StatCard({ icon: Icon, label, value, toneClass }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-xl border ${toneClass}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xl font-extrabold text-ink-primary">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  )
}

function BackJobDetail({
  backJob,
  caseReference,
  customerLabel,
  vehicleLabel,
  originalJobOrderReference,
  originalBookingReference,
  reworkJobOrderReference,
}) {
  if (!backJob) {
    return (
      <div className="empty-panel text-sm text-ink-muted" role="status">
        <p className="font-semibold text-ink-primary">View Case Details</p>
        <p className="mt-1">Load a vehicle list, create a case, or choose a back-job reference to inspect live detail.</p>
      </div>
    )
  }

  const statusMeta = STATUS_META[backJob.status] ?? STATUS_META.reported
  const visibility = getBackJobCustomerVisibility(backJob.status)
  const validationState = getBackJobValidationState(backJob)
  const returnInspectionReference = formatReturnInspectionReference(backJob.returnInspection, backJob.returnInspectionId)
  const returnInspectionHelper = formatReturnInspectionHelper(backJob.returnInspection)

  return (
    <div className="card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">View Case Details</p>
          <h2 className="mt-2 text-xl font-bold text-ink-primary">{caseReference}</h2>
          <p className="mt-1 text-xs text-ink-muted">Opened {formatShortDate(backJob.createdAt)}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">{backJob.complaint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span>
          <span className={`badge ${isBackJobCustomerSafe(backJob.status) ? 'badge-green' : 'badge-gray'}`}>
            {visibilityCopy[visibility]}
          </span>
          <span className="badge badge-gray">Read-only details</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Customer / Vehicle</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{customerLabel}</p>
          <p className="mt-1 text-xs text-ink-secondary">{vehicleLabel}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Original Work</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{originalJobOrderReference}</p>
          <p className="mt-1 text-xs text-ink-secondary">{originalBookingReference}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Rework Linkage</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{reworkJobOrderReference}</p>
          <p className="mt-1 text-xs text-ink-secondary">Validation: {validationState.replaceAll('_', ' ')}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-sm font-bold text-ink-primary">Review Notes</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{backJob.reviewNotes || 'No review notes recorded.'}</p>
          <p className="mt-3 text-xs text-ink-muted">Return inspection: {returnInspectionReference}</p>
          <p className="mt-1 text-xs text-ink-muted">{returnInspectionHelper}</p>
        </section>
        <section className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-sm font-bold text-ink-primary">Resolution Notes</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{backJob.resolutionNotes || 'No resolution notes recorded.'}</p>
          <p className="mt-3 text-xs text-ink-muted">Updated {formatDateTime(backJob.updatedAt)}</p>
        </section>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink-primary">Findings</p>
          <span className="badge badge-gray">{backJob.validatedFindingCount ?? 0} validated</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {backJob.findings?.length ? (
            backJob.findings.map((finding) => {
              const severityMeta = SEVERITY_META[finding.severity] ?? SEVERITY_META.info
              return (
                <article key={finding.id} className="rounded-xl border border-surface-border bg-surface-raised p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={`badge ${severityMeta.cls}`}>{severityMeta.label}</span>
                    <span className={`badge ${finding.isValidated ? 'badge-green' : 'badge-gray'}`}>
                      {finding.isValidated ? 'Validated' : 'Unvalidated'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink-primary">{finding.label}</p>
                  <p className="mt-1 text-xs text-ink-muted">{finding.category}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">{finding.notes || 'No finding notes.'}</p>
                </article>
              )
            })
          ) : (
            <div className="rounded-xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-muted">
              No findings attached yet. Inspection/rework approval will require case or return-inspection evidence.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default function BackJobsContent() {
  const user = useUser()
  const role = user?.role ?? null
  const canManage = canStaffManageBackJobs(role)
  const [vehicleId, setVehicleId] = useState('')
  const [backJobId, setBackJobId] = useState('')
  const [backJobs, setBackJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [technicianProfiles, setTechnicianProfiles] = useState([])
  const [vehicleBookings, setVehicleBookings] = useState([])
  const [vehicleJobOrders, setVehicleJobOrders] = useState([])
  const [vehicleInspections, setVehicleInspections] = useState([])
  const [selectedCustomerUserId, setSelectedCustomerUserId] = useState('')
  const [activeBackJob, setActiveBackJob] = useState(null)
  const [loadState, setLoadState] = useState(initialLoadState)
  const [createState, setCreateState] = useState(initialCreateState)
  const [statusState, setStatusState] = useState(initialStatusState)
  const [reworkState, setReworkState] = useState(initialReworkState)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('case')
  const [createPanelOpen, setCreatePanelOpen] = useState(false)
  const [reworkPanelOpen, setReworkPanelOpen] = useState(false)
  const caseWorkspaceTabRef = useRef(null)
  const createWorkspaceTabRef = useRef(null)
  const detailSectionRef = useRef(null)
  const [createDraft, setCreateDraft] = useState({
    customerUserId: '',
    vehicleId: '',
    originalJobOrderId: '',
    originalBookingId: '',
    returnInspectionId: '',
    complaint: '',
    reviewNotes: '',
    findingCategory: 'return_inspection',
    findingLabel: '',
    findingSeverity: 'medium',
    findingNotes: '',
    findingValidated: true,
  })
  const [statusDraft, setStatusDraft] = useState({ ...defaultBackJobStatusDraft })
  const [reworkDraft, setReworkDraft] = useState(() => buildBackJobReworkDraft())

  const counts = useMemo(() => {
    const source = activeBackJob ? upsertBackJob(backJobs, activeBackJob) : backJobs
    return getBackJobCounts(source)
  }, [activeBackJob, backJobs])

  const allowedStatusTargets = getAllowedBackJobStatusTargets(activeBackJob?.status)
  const canSubmitRework = canCreateReworkJobOrder(activeBackJob)
  const reworkServiceAdviserSnapshot = useMemo(
    () =>
      resolveBackJobReworkServiceAdviser({
        activeBackJob,
        vehicleJobOrders,
        sessionUserId: user?.id,
        sessionUserRole: role,
        sessionStaffCode: user?.staffCode,
      }),
    [activeBackJob, role, user?.id, user?.staffCode, vehicleJobOrders],
  )
  const selectedReworkTechnicianIds = useMemo(
    () => splitCommaSeparatedIds(reworkDraft.assignedTechnicianIdsText),
    [reworkDraft.assignedTechnicianIdsText],
  )
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerUserId) ?? null,
    [customers, selectedCustomerUserId],
  )
  const selectedCustomerVehicles = selectedCustomer?.vehicles ?? []
  const selectedCreateCustomer = useMemo(
    () => customers.find((customer) => customer.id === createDraft.customerUserId) ?? null,
    [createDraft.customerUserId, customers],
  )
  const selectedCreateVehicle = useMemo(
    () => (selectedCreateCustomer?.vehicles ?? []).find((vehicle) => vehicle.id === createDraft.vehicleId) ?? null,
    [createDraft.vehicleId, selectedCreateCustomer],
  )
  const selectedCreateOriginalJobOrder = useMemo(
    () => vehicleJobOrders.find((jobOrder) => jobOrder.id === createDraft.originalJobOrderId) ?? null,
    [createDraft.originalJobOrderId, vehicleJobOrders],
  )
  const selectedCreateReturnInspection = useMemo(
    () => vehicleInspections.find((inspection) => inspection.id === createDraft.returnInspectionId) ?? null,
    [createDraft.returnInspectionId, vehicleInspections],
  )
  const technicianOptions = useMemo(
    () =>
      technicianProfiles.filter(
        (profile) => profile?.isActive !== false && Array.isArray(profile?.specialties) && profile.specialties.length > 0,
      ),
    [technicianProfiles],
  )
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  )
  const vehicleById = useMemo(
    () =>
      new Map(
        customers.flatMap((customer) =>
          (customer.vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]),
        ),
      ),
    [customers],
  )
  const jobOrderById = useMemo(
    () => new Map(vehicleJobOrders.map((jobOrder) => [jobOrder.id, jobOrder])),
    [vehicleJobOrders],
  )
  const bookingById = useMemo(
    () => new Map(vehicleBookings.map((booking) => [booking.id, booking])),
    [vehicleBookings],
  )
  const activeCustomer = activeBackJob ? customerById.get(activeBackJob.customerUserId) ?? null : null
  const activeVehicle = activeBackJob ? vehicleById.get(activeBackJob.vehicleId) ?? null : null
  const activeOriginalJobOrder = activeBackJob ? jobOrderById.get(activeBackJob.originalJobOrderId) ?? null : null
  const activeOriginalBooking = activeBackJob?.originalBookingId
    ? bookingById.get(activeBackJob.originalBookingId) ?? null
    : null
  const activeReworkJobOrder = activeBackJob?.reworkJobOrderId
    ? jobOrderById.get(activeBackJob.reworkJobOrderId) ?? null
    : null
  const activeCustomerLabel = activeCustomer?.displayName || activeCustomer?.email || 'Customer unavailable'
  const activeVehicleLabel = formatVehicleDisplayLabel(activeVehicle)
  const activeCaseReference = formatBackJobCaseReference(
    activeBackJob,
    activeVehicle?.plateNumber,
  )
  const activeOriginalJobOrderReference = formatJobOrderDisplayReference(
    activeOriginalJobOrder,
    activeBackJob?.originalJobOrderId,
  )
  const activeOriginalBookingReference = formatBookingDisplayReference(
    activeOriginalBooking,
    activeBackJob?.originalBookingId,
  )
  const activeReworkJobOrderReference = activeBackJob?.reworkJobOrderId
    ? formatJobOrderDisplayReference(activeReworkJobOrder, activeBackJob.reworkJobOrderId)
    : 'Not linked yet'

  useEffect(() => {
    if (!user?.accessToken || !canManage) {
      setCustomers([])
      setTechnicianProfiles([])
      return
    }

    void Promise.all([
      listAdminCustomers(user.accessToken),
      listTechnicianProfiles(user.accessToken, { activeOnly: false }),
    ])
      .then(([loadedCustomers, loadedTechnicianProfiles]) => {
        setCustomers(loadedCustomers)
        setTechnicianProfiles(loadedTechnicianProfiles)
      })
      .catch(() => {
        setCustomers([])
        setTechnicianProfiles([])
      })
  }, [canManage, user?.accessToken])

  useEffect(() => {
    const activeVehicleId = createDraft.vehicleId || vehicleId || activeBackJob?.vehicleId || ''
    if (!activeVehicleId || !user?.accessToken || !canManage) {
      setVehicleBookings([])
      setVehicleJobOrders([])
      setVehicleInspections([])
      return
    }

    void Promise.all([
      listVehicleBookings(activeVehicleId, user.accessToken),
      listVehicleJobOrders({ vehicleId: activeVehicleId, accessToken: user.accessToken }),
      listVehicleInspections({ vehicleId: activeVehicleId, accessToken: user.accessToken }),
    ])
      .then(([loadedBookings, loadedJobOrders, loadedInspections]) => {
        setVehicleBookings(loadedBookings)
        setVehicleJobOrders(loadedJobOrders)
        setVehicleInspections(loadedInspections)
      })
      .catch(() => {
        setVehicleBookings([])
        setVehicleJobOrders([])
        setVehicleInspections([])
      })
  }, [activeBackJob?.vehicleId, canManage, createDraft.vehicleId, user?.accessToken, vehicleId])

  useEffect(() => {
    if (!selectedCreateOriginalJobOrder) {
      return
    }

    if (selectedCreateOriginalJobOrder.sourceType === 'booking' && selectedCreateOriginalJobOrder.sourceId) {
      setCreateDraft((current) =>
        current.originalBookingId === selectedCreateOriginalJobOrder.sourceId
          ? current
          : {
              ...current,
              originalBookingId: selectedCreateOriginalJobOrder.sourceId,
            },
      )
      return
    }

    setCreateDraft((current) =>
      current.originalBookingId
        ? {
            ...current,
            originalBookingId: '',
          }
        : current,
    )
  }, [selectedCreateOriginalJobOrder])

  function requireStaffSession(stateSetter, failedStatus, message) {
    if (!canManage) {
      stateSetter({
        status: failedStatus,
        message: 'Only head technicians, service advisers, and super admins can manage back-job review and rework.',
      })
      return false
    }

    if (!user?.accessToken) {
      stateSetter({
        status: failedStatus,
        message,
      })
      return false
    }

    return true
  }

  function syncActiveBackJob(backJob) {
    setActiveBackJob(backJob)
    if (backJob) {
      setBackJobs((current) => upsertBackJob(current, backJob))
    }
    setBackJobId(backJob?.id ?? '')
    setStatusDraft(
      buildBackJobStatusDraft({
        backJob,
        allowedTargets: getAllowedBackJobStatusTargets(backJob?.status),
      }),
    )
    setStatusState(initialStatusState)
    setReworkDraft(buildBackJobReworkDraft())
    setReworkState(initialReworkState)
    setReworkPanelOpen(false)

    if (backJob) {
      requestAnimationFrame(() => {
        detailSectionRef.current?.scrollIntoView({
          block: 'start',
          behavior: 'auto',
        })
      })
    }
  }

  function clearActiveBackJobContext({ clearLoadedCases = false } = {}) {
    setActiveBackJob(null)
    setBackJobId('')
    if (clearLoadedCases) {
      setBackJobs([])
    }
    setStatusDraft(buildBackJobStatusDraft())
    setStatusState(initialStatusState)
    setReworkDraft(buildBackJobReworkDraft())
    setReworkState(initialReworkState)
    setReworkPanelOpen(false)
  }

  async function handleLoadVehicleBackJobs() {
    if (!requireStaffSession(setLoadState, 'back_jobs_forbidden_role', 'A valid staff session is required before loading back-jobs.')) {
      return
    }

    setLoadState({ status: 'back_jobs_loading', message: '' })

    try {
      const loadedBackJobs = await listBackJobsByVehicle({
        vehicleId,
        accessToken: user.accessToken,
      })
      setBackJobs(loadedBackJobs)
      setActiveWorkspaceTab('case')
      if (loadedBackJobs.length > 0) {
        syncActiveBackJob(loadedBackJobs[0])
      } else {
        clearActiveBackJobContext()
      }
      setLoadState({
        status: loadedBackJobs.length > 0 ? 'back_jobs_loaded' : 'back_jobs_empty',
        message: loadedBackJobs.length > 0
          ? `Loaded ${loadedBackJobs.length} back-job case(s) for the vehicle.`
          : 'No back-job cases were found for this vehicle.',
      })
    } catch (error) {
      let nextStatus = 'back_jobs_failed'
      if (error instanceof ApiError && error.status === 403) nextStatus = 'back_jobs_forbidden_role'
      if (error instanceof ApiError && error.status === 404) nextStatus = 'back_jobs_not_found'
      clearActiveBackJobContext({ clearLoadedCases: true })
      setLoadState({
        status: nextStatus,
        message: error?.message || 'Vehicle back-jobs could not be loaded.',
      })
    }
  }

  async function handleLoadBackJobDetail() {
    if (!requireStaffSession(setLoadState, 'back_jobs_forbidden_role', 'A valid staff session is required before loading back-job detail.')) {
      return
    }

    setLoadState({ status: 'back_jobs_loading', message: '' })

    try {
      const loadedBackJob = await getBackJobById({
        backJobId,
        accessToken: user.accessToken,
      })
      setActiveWorkspaceTab('case')
      syncActiveBackJob(loadedBackJob)
      setLoadState({
        status: 'back_jobs_loaded',
        message: 'Back-job detail loaded from the backend.',
      })
    } catch (error) {
      let nextStatus = 'back_jobs_failed'
      if (error instanceof ApiError && error.status === 403) nextStatus = 'back_jobs_forbidden_role'
      if (error instanceof ApiError && error.status === 404) nextStatus = 'back_jobs_not_found'
      if (nextStatus === 'back_jobs_not_found') {
        clearActiveBackJobContext()
      }
      setLoadState({
        status: nextStatus,
        message: error?.message || 'Back-job detail could not be loaded.',
      })
    }
  }

  async function handleCreateBackJob(event) {
    event.preventDefault()
    if (!requireStaffSession(setCreateState, 'create_forbidden_role', 'A valid staff session is required before creating a back-job.')) {
      return
    }

    if (!createDraft.customerUserId || !createDraft.vehicleId || !createDraft.originalJobOrderId) {
      setCreateState({
        status: 'create_failed',
        message: 'Choose the customer, vehicle, and finalized original job order before opening a back-job case.',
      })
      return
    }

    if (!createDraft.complaint.trim()) {
      setCreateState({
        status: 'create_failed',
        message: 'Enter the customer complaint before opening a back-job case.',
      })
      return
    }

    if (!selectedCreateOriginalJobOrder) {
      setCreateState({
        status: 'create_failed',
        message: 'Reload the original vehicle history, then choose the finalized job order again.',
      })
      return
    }

    if (selectedCreateOriginalJobOrder.status !== 'finalized') {
      setCreateState({
        status: 'create_failed',
        message: 'Only finalized original job orders can be reviewed as back-job lineage.',
      })
      return
    }

    if (
      selectedCreateOriginalJobOrder.customerUserId !== createDraft.customerUserId ||
      selectedCreateOriginalJobOrder.vehicleId !== createDraft.vehicleId
    ) {
      setCreateState({
        status: 'create_lineage_conflict',
        message: 'The selected original job order does not match the chosen customer and vehicle.',
      })
      return
    }

    if (createDraft.returnInspectionId) {
      if (!selectedCreateReturnInspection) {
        setCreateState({
          status: 'create_failed',
          message: 'Reload the vehicle inspections, then choose the return inspection again.',
        })
        return
      }

      if (selectedCreateReturnInspection.inspectionType !== 'return') {
        setCreateState({
          status: 'create_failed',
          message: 'Back-job review can only link a return inspection from the same vehicle.',
        })
        return
      }
    }

    setCreateState({ status: 'create_submitting', message: '' })

    try {
      const finding =
        createDraft.findingLabel.trim()
          ? [{
              category: createDraft.findingCategory,
              label: createDraft.findingLabel,
              severity: createDraft.findingSeverity,
              notes: createDraft.findingNotes,
              isValidated: createDraft.findingValidated,
            }]
          : []
      const createdBackJob = await createBackJobCase({
        ...createDraft,
        findings: finding,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(createdBackJob)
      setCreateState({
        status: 'create_saved',
        message: 'Back-job case created and linked to original work.',
      })
    } catch (error) {
      let nextStatus = 'create_failed'
      if (error instanceof ApiError && error.status === 403) nextStatus = 'create_forbidden_role'
      if (error instanceof ApiError && error.status === 409) nextStatus = 'create_lineage_conflict'
      setCreateState({
        status: nextStatus,
        message: error?.message || 'Back-job case could not be created.',
      })
    }
  }

  async function handleUpdateStatus() {
    if (!activeBackJob) {
      setStatusState({
        status: 'status_failed',
        message: 'Load a back-job before updating review status.',
      })
      return
    }

    if (!requireStaffSession(setStatusState, 'status_forbidden_role', 'A valid staff session is required before updating status.')) {
      return
    }

    const nextStatus = allowedStatusTargets.includes(statusDraft.status)
      ? statusDraft.status
      : allowedStatusTargets[0]

    if (!nextStatus) {
      setStatusState({
        status: 'status_invalid_transition',
        message: 'This back-job has no further allowed status transitions.',
      })
      return
    }

    setStatusState({ status: 'status_submitting', message: '' })

    try {
      const updatedBackJob = await updateBackJobStatus({
        backJobId: activeBackJob.id,
        status: nextStatus,
        returnInspectionId: statusDraft.returnInspectionId,
        reviewNotes: statusDraft.reviewNotes,
        resolutionNotes: statusDraft.resolutionNotes,
        expectedUpdatedAt: activeBackJob.updatedAt,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(updatedBackJob)
      setStatusState({
        status: 'status_saved',
        message: 'Back-job review status updated from the live backend.',
      })
    } catch (error) {
      let nextState = 'status_failed'
      const message = String(error?.message ?? '').toLowerCase()
      if (error instanceof ApiError && error.status === 403) nextState = 'status_forbidden_role'
      if (error instanceof ApiError && error.status === 409) {
        const isConcurrencyConflict = message.includes('already updated')
        if (isConcurrencyConflict) {
          try {
            const refreshedBackJob = await getBackJobById({
              backJobId: activeBackJob.id,
              accessToken: user.accessToken,
            })
            syncActiveBackJob(refreshedBackJob)
            setStatusState({
              status: 'status_conflict',
              message: 'Another staff member already updated this back-job. The latest record was reloaded.',
            })
            return
          } catch {}
        }

        nextState = isConcurrencyConflict
          ? 'status_conflict'
          : message.includes('inspection') || message.includes('evidence')
            ? 'status_evidence_required'
            : 'status_invalid_transition'
      }
      setStatusState({
        status: nextState,
        message: error?.message || 'Back-job status could not be updated.',
      })
    }
  }

  async function handleCreateReworkJobOrder() {
    if (!activeBackJob) {
      setReworkState({
        status: 'rework_failed',
        message: 'Load a back-job before creating rework.',
      })
      return
    }

    if (!requireStaffSession(setReworkState, 'rework_failed', 'A valid staff session is required before creating rework.')) {
      return
    }

    if (activeBackJob.reworkJobOrderId) {
      setReworkState({
        status: 'rework_already_linked',
        message: 'This back-job already has a linked rework job order.',
      })
      return
    }

    if (activeBackJob.status !== 'approved_for_rework') {
      setReworkState({
        status: 'rework_not_approved',
        message: 'Approve the back-job for rework before creating a rework job order.',
      })
      return
    }

    if (!reworkServiceAdviserSnapshot?.serviceAdviserUserId || !reworkServiceAdviserSnapshot?.serviceAdviserCode) {
      setReworkState({
        status: 'rework_failed',
        message:
          role === 'super_admin'
            ? 'The original job-order adviser snapshot could not be resolved for this back-job. Load the original vehicle history first or restore the original adviser linkage before creating rework.'
            : 'A valid service adviser snapshot is required before creating rework.',
      })
      return
    }

    setReworkState({ status: 'rework_submitting', message: '' })

    try {
      const reworkAssignments = splitCommaSeparatedIds(reworkDraft.assignedTechnicianIdsText)
        .map((technicianProfileId) => {
          const technicianProfile = technicianOptions.find((entry) => entry.id === technicianProfileId)
          const selectedSpecialty = technicianProfile?.specialties?.[0]
          return technicianProfile && selectedSpecialty
            ? {
                technicianProfileId,
                selectedSpecialty,
              }
            : null
        })
        .filter(Boolean)
      const createdJobOrder = await createReworkJobOrderFromBackJob({
        backJob: activeBackJob,
        serviceAdviserUserId: reworkServiceAdviserSnapshot.serviceAdviserUserId,
        serviceAdviserCode: reworkServiceAdviserSnapshot.serviceAdviserCode,
        notes: reworkDraft.notes,
        items: [{
          name: reworkDraft.itemName,
          description: reworkDraft.itemDescription,
          estimatedHours: reworkDraft.estimatedHours,
        }],
        assignments: reworkAssignments,
        accessToken: user.accessToken,
      })
      const refreshedBackJob = await getBackJobById({
        backJobId: activeBackJob.id,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(refreshedBackJob)
      setReworkState({
        status: 'rework_saved',
        message: `Rework job order ${getJobOrderReference(createdJobOrder)} linked to this back-job.`,
      })
    } catch (error) {
      let nextState = 'rework_failed'
      const message = String(error?.message ?? '').toLowerCase()
      if (error instanceof ApiError && error.status === 409) {
        nextState = message.includes('already') ? 'rework_already_linked' : 'rework_not_approved'
      }
      setReworkState({
        status: nextState,
        message: error?.message || 'Rework job order could not be created.',
      })
    }
  }

  function handleWorkspaceTabKeyDown(event) {
    let nextTab = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextTab = activeWorkspaceTab === 'case' ? 'create' : 'case'
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextTab = activeWorkspaceTab === 'case' ? 'create' : 'case'
    } else if (event.key === 'Home') {
      nextTab = 'case'
    } else if (event.key === 'End') {
      nextTab = 'create'
    }

    if (!nextTab) {
      return
    }

    event.preventDefault()
    setActiveWorkspaceTab(nextTab)
    const nextTabRef = nextTab === 'case' ? caseWorkspaceTabRef : createWorkspaceTabRef
    nextTabRef.current?.focus()
  }

  if (!canManage) {
    return (
      <div className="empty-panel text-left">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-red-400" />
          <div>
            <p className="text-lg font-bold text-ink-primary">Back-job review is staff-restricted</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Only head technicians, service advisers, and super admins can open, review, and resolve back-job cases.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Live Back-Jobs"
        title="Review And Rework Workbench"
        description="Create return cases, validate inspection-backed findings, update review status, and create linked rework job orders without leaking staff-only review state to customer surfaces."
        meta={
          <>
            <span className="badge badge-gray">{backJobReviewContractSources.length} source contracts</span>
            <span className="badge badge-gray">{counts.total} loaded cases</span>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Loaded Cases" value={counts.total} toneClass="border-surface-border bg-surface-raised text-brand-orange" />
        <StatCard icon={AlertTriangle} label="Reported" value={counts.reported} toneClass="border-red-500/15 bg-red-500/10 text-red-400" />
        <StatCard icon={Wrench} label="Approved" value={counts.approved} toneClass="border-blue-500/15 bg-blue-500/10 text-blue-300" />
        <StatCard icon={CheckCircle2} label="Unresolved" value={counts.unresolved} toneClass="border-emerald-500/15 bg-emerald-500/10 text-emerald-400" />
      </section>

      <section className="toolbar-surface">
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            className="rounded-2xl border border-surface-border bg-surface-raised p-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleLoadVehicleBackJobs()
            }}
          >
            <p className="text-sm font-bold text-ink-primary">Load Vehicle Back-Jobs</p>
            <p className="mt-1 text-xs text-ink-muted">Choose a customer vehicle to review the return cases tied to that vehicle.</p>
            <label className="label mt-3">
              Customer
              <PortalSelect
                value={selectedCustomerUserId}
                onValueChange={(nextValue) => {
                  setSelectedCustomerUserId(nextValue)
                  setVehicleId('')
                }}
                placeholder="Choose customer"
                emptyOptionLabel="Choose customer"
                items={customers.map((customer) => ({
                  value: customer.id,
                   label: customer.displayName || customer.email || 'Customer unavailable',
                   helper: customer.email || 'Customer record',
                }))}
              />
            </label>
            <label className="label mt-3">
              Vehicle
              <PortalSelect
                value={vehicleId}
                onValueChange={setVehicleId}
                placeholder="Choose vehicle"
                emptyOptionLabel="Choose vehicle"
                items={selectedCustomerVehicles.map((vehicle) => ({
                  value: vehicle.id,
                   label: vehicle.plateNumber || vehicle.publicReference || 'Vehicle unavailable',
                  helper:
                     [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle details unavailable',
                }))}
              />
            </label>
            <button type="submit" className="btn-primary mt-3" disabled={loadState.status === 'back_jobs_loading'}>
              {loadState.status === 'back_jobs_loading' ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              Load Vehicle Cases
            </button>
          </form>

          <form
            className="rounded-2xl border border-surface-border bg-surface-raised p-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleLoadBackJobDetail()
            }}
          >
            <p className="text-sm font-bold text-ink-primary">Load Case Detail</p>
            <p className="mt-1 text-xs text-ink-muted">
              Pick a loaded back-job case when staff need to review one specific record.
            </p>
            <label className="label mt-3">
              Back-job case
              <PortalSelect
                value={backJobId}
                onValueChange={setBackJobId}
                items={backJobs.map((backJob) => ({
                  value: backJob.id,
                  label: formatBackJobCaseReference(backJob),
                  helper: `${backJob.status.replaceAll('_', ' ')} - ${backJob.complaint || 'No complaint summary'}`,
                }))}
                emptyOptionLabel="Choose a loaded case"
                placeholder="Choose a loaded case"
              />
            </label>
            <p className="mt-2 text-xs text-ink-muted">
              {backJobs.length
                ? 'Choose a case from the loaded vehicle list.'
                : 'Load a customer vehicle first to choose a back-job case.'}
            </p>
            <button type="submit" className="btn-primary mt-3" disabled={loadState.status === 'back_jobs_loading'}>
              {loadState.status === 'back_jobs_loading' ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              Load Case Detail
            </button>
          </form>
        </div>

        {loadState.message ? (
          <div
            role={['back_jobs_loaded', 'back_jobs_empty'].includes(loadState.status) ? 'status' : 'alert'}
            aria-live="polite"
            className={`mt-4 ${
              ['back_jobs_loaded', 'back_jobs_empty'].includes(loadState.status)
                ? 'status-message status-message-success'
                : 'status-message status-message-danger'
            }`}
          >
            {loadState.message}
          </div>
        ) : null}
      </section>

      {backJobs.length > 0 ? (
        <section className="table-surface">
          <div className="border-b border-surface-border bg-surface-raised px-5 py-4">
            <p className="text-sm font-bold text-ink-primary">Loaded Vehicle Cases</p>
            <p className="mt-1 text-xs text-ink-muted">Select Review to open the case workspace for one loaded vehicle record.</p>
          </div>
          <div className="table-scroll w-full">
            <table className="data-table w-full min-w-[760px] table-fixed">
              <caption className="sr-only">Loaded vehicle back-job cases</caption>
              <colgroup>
                <col className="w-[21%]" />
                <col className="w-[17%]" />
                <col className="w-[28%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr>
                  <th>Back-Job</th>
                  <th>Original Job</th>
                  <th>Complaint</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {backJobs.map((backJob) => {
                  const statusMeta = STATUS_META[backJob.status] ?? STATUS_META.reported
                  const visibility = getBackJobCustomerVisibility(backJob.status)
                  const tableVehicle = vehicleById.get(backJob.vehicleId) ?? null
                  const tableOriginalJobOrder = jobOrderById.get(backJob.originalJobOrderId) ?? null
                  return (
                    <tr key={backJob.id} className={activeBackJob?.id === backJob.id ? 'bg-brand-orange/5' : undefined} aria-current={activeBackJob?.id === backJob.id ? 'true' : undefined}>
                      <td className="align-top">
                        <p className="break-words text-sm font-semibold text-brand-orange">
                          {formatBackJobCaseReference(backJob)}
                        </p>
                        <p className="mt-1 break-words text-xs text-ink-muted">{formatVehicleDisplayLabel(tableVehicle)}</p>
                      </td>
                      <td className="align-top break-words text-xs text-ink-secondary">
                        {formatJobOrderDisplayReference(tableOriginalJobOrder, backJob.originalJobOrderId)}
                      </td>
                      <td className="align-top">
                        <p className="max-w-none whitespace-normal break-words leading-5">{backJob.complaint}</p>
                      </td>
                      <td className="align-top"><span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span></td>
                      <td className="align-top"><span className="badge badge-gray whitespace-normal">{visibilityCopy[visibility]}</span></td>
                      <td className="align-top text-right">
                        <button
                          type="button"
                          className="btn-ghost inline-flex whitespace-nowrap py-1.5 text-xs"
                          aria-label={`Review ${formatBackJobCaseReference(backJob)}`}
                          aria-pressed={activeBackJob?.id === backJob.id}
                          onClick={() => {
                            setActiveWorkspaceTab('case')
                            syncActiveBackJob(backJob)
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="border-b border-surface-border" role="tablist" aria-label="Back-job workspace views" aria-orientation="horizontal">
        <div className="flex flex-wrap gap-2" role="presentation">
          <button
            ref={caseWorkspaceTabRef}
            id="back-job-tab-details"
            type="button"
            role="tab"
            aria-selected={activeWorkspaceTab === 'case'}
            aria-controls="back-job-case-details-panel"
            tabIndex={activeWorkspaceTab === 'case' ? 0 : -1}
            className={activeWorkspaceTab === 'case' ? 'border-b-2 border-brand-orange px-1 pb-3 text-sm font-bold text-ink-primary' : 'border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-ink-muted hover:text-ink-primary'}
            onClick={() => setActiveWorkspaceTab('case')}
            onKeyDown={handleWorkspaceTabKeyDown}
          >
            View Case Details
          </button>
          <button
            ref={createWorkspaceTabRef}
            id="back-job-tab-create"
            type="button"
            role="tab"
            aria-selected={activeWorkspaceTab === 'create'}
            aria-controls="back-job-create-panel"
            tabIndex={activeWorkspaceTab === 'create' ? 0 : -1}
            className={activeWorkspaceTab === 'create' ? 'border-b-2 border-brand-orange px-1 pb-3 text-sm font-bold text-ink-primary' : 'border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-ink-muted hover:text-ink-primary'}
            onClick={() => setActiveWorkspaceTab('create')}
            onKeyDown={handleWorkspaceTabKeyDown}
          >
            Create New Back-Job
          </button>
        </div>
        <p className="pb-3 pt-2 text-xs text-ink-muted">
          Review one selected case at a time, or open a separate surface to create a new case.
        </p>
      </div>

      <div
        ref={detailSectionRef}
        id="back-job-case-details-panel"
        role="tabpanel"
        aria-labelledby="back-job-tab-details"
        hidden={activeWorkspaceTab !== 'case'}
      >
        <BackJobDetail
          backJob={activeBackJob}
          caseReference={activeCaseReference}
          customerLabel={activeCustomerLabel}
          vehicleLabel={activeVehicleLabel}
          originalJobOrderReference={activeOriginalJobOrderReference}
          originalBookingReference={activeOriginalBookingReference}
          reworkJobOrderReference={activeReworkJobOrderReference}
        />
      </div>

      <section className="space-y-5">
        <div
          id="back-job-create-panel"
          role="tabpanel"
          aria-labelledby="back-job-tab-create"
          hidden={activeWorkspaceTab !== 'create'}
        >
          <details
            open={createPanelOpen}
            onToggle={(event) => setCreatePanelOpen(event.currentTarget.open)}
            className="overflow-hidden rounded-2xl border border-surface-border bg-surface-raised"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
              <span>
                <span className="block text-base font-bold text-ink-primary">Create Back-Job Case</span>
                <span className="mt-1 block text-xs text-ink-muted">Open a focused form for a new internal return case.</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="badge badge-gray">New case</span>
                <Plus size={18} className="text-brand-orange" aria-hidden="true" />
              </span>
            </summary>
            <form onSubmit={handleCreateBackJob} className="space-y-4 border-t border-surface-border p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">
              Customer
              <PortalSelect
                value={createDraft.customerUserId}
                onValueChange={(nextValue) =>
                  setCreateDraft((current) => ({
                    ...current,
                    customerUserId: nextValue,
                    vehicleId: '',
                    originalJobOrderId: '',
                    originalBookingId: '',
                    returnInspectionId: '',
                  }))
                }
                placeholder="Choose customer"
                emptyOptionLabel="Choose customer"
                items={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.displayName || customer.email || 'Customer unavailable',
                  helper: customer.email || 'Customer record',
                }))}
              />
            </label>
            <label className="label">
              Vehicle
              <PortalSelect
                value={createDraft.vehicleId}
                onValueChange={(nextValue) =>
                  setCreateDraft((current) => ({
                    ...current,
                    vehicleId: nextValue,
                    originalJobOrderId: '',
                    originalBookingId: '',
                    returnInspectionId: '',
                  }))
                }
                placeholder="Choose vehicle"
                emptyOptionLabel="Choose vehicle"
                items={(customers.find((customer) => customer.id === createDraft.customerUserId)?.vehicles ?? []).map((vehicle) => ({
                  value: vehicle.id,
                  label: vehicle.plateNumber || vehicle.publicReference || 'Vehicle unavailable',
                  helper:
                    [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle details unavailable',
                }))}
              />
            </label>
            <div className="rounded-xl border border-surface-border bg-surface-raised p-3 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">Original completed service</p>
              {selectedCreateOriginalJobOrder ? (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-surface-border bg-surface-card p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Job order</p>
                    <p className="mt-2 text-sm font-semibold text-ink-primary">
                      {formatJobOrderDisplayReference(
                        selectedCreateOriginalJobOrder,
                        selectedCreateOriginalJobOrder.id,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{selectedCreateOriginalJobOrder.status}</p>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Source</p>
                    <p className="mt-2 text-sm font-semibold text-ink-primary">
                      {selectedCreateOriginalJobOrder.sourceType === 'booking' ? 'Completed booking service' : 'Manual staff source'}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {formatBookingDisplayReference(
                        bookingById.get(selectedCreateOriginalJobOrder.sourceId) ?? null,
                        selectedCreateOriginalJobOrder.sourceId,
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Review gate</p>
                    <p className="mt-2 text-sm font-semibold text-ink-primary">
                      {selectedCreateOriginalJobOrder.status === 'finalized' ? 'Eligible for back-job review' : 'Not review-ready'}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Back-jobs should open from completed service history, not from a fresh booking.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">
                  Choose a finalized original job order from the vehicle history to anchor this complaint to completed service.
                </p>
              )}
            </div>
            <label className="label">
              Original job order
              <PortalSelect
                value={createDraft.originalJobOrderId}
                onValueChange={(nextValue) =>
                  setCreateDraft((current) => ({
                    ...current,
                    originalJobOrderId: nextValue,
                    originalBookingId: '',
                  }))
                }
                placeholder="Choose finalized job order"
                emptyOptionLabel="Choose finalized job order"
                items={vehicleJobOrders
                  .filter((jobOrder) => jobOrder.status === 'finalized')
                  .map((jobOrder) => ({
                    value: jobOrder.id,
                    label: formatJobOrderDisplayReference(jobOrder),
                    helper: jobOrder.status.replaceAll('_', ' '),
                  }))}
              />
            </label>
            <label className="label">
              Original booking
              <PortalSelect
                value={createDraft.originalBookingId}
                onValueChange={(nextValue) =>
                  setCreateDraft((current) => ({ ...current, originalBookingId: nextValue }))
                }
                placeholder="No booking reference"
                emptyOptionLabel="No booking reference"
                items={vehicleBookings.map((booking) => ({
                  value: booking.id,
                    label: formatBookingDisplayReference(booking),
                  helper: `${booking.scheduledDate || 'No scheduled date'} - ${booking.status}`,
                }))}
              />
            </label>
            <label className="label md:col-span-2">
              Return inspection
              <PortalSelect
                value={createDraft.returnInspectionId}
                onValueChange={(nextValue) =>
                  setCreateDraft((current) => ({ ...current, returnInspectionId: nextValue }))
                }
                placeholder="No return inspection yet"
                emptyOptionLabel="No return inspection yet"
                items={vehicleInspections
                  .filter((inspection) => inspection.inspectionType === 'return')
                  .map((inspection) => ({
                    value: inspection.id,
                    label: formatReturnInspectionReference(inspection, inspection.id),
                    helper: formatReturnInspectionHelper(inspection),
                  }))}
              />
            </label>
          </div>
          <label className="label">
            Complaint
            <textarea
              value={createDraft.complaint}
              onChange={(event) => setCreateDraft((current) => ({ ...current, complaint: event.target.value }))}
              rows={3}
              className="input min-h-[96px] resize-y"
              placeholder="Customer reports the same concern after prior completed work."
            />
          </label>
          <label className="label">
            Review notes
            <textarea
              value={createDraft.reviewNotes}
              onChange={(event) => setCreateDraft((current) => ({ ...current, reviewNotes: event.target.value }))}
              rows={2}
              className="input min-h-[84px] resize-y"
            />
          </label>
          <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
            <p className="text-sm font-semibold text-ink-primary">Optional Finding</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="label">
                Category
                <PortalSelect
                  value={createDraft.findingCategory}
                  onValueChange={(nextValue) =>
                    setCreateDraft((current) => ({ ...current, findingCategory: nextValue }))
                  }
                  placeholder="Choose category"
                  items={findingCategoryOptions}
                />
              </label>
              <label className="label">
                Severity
                <PortalSelect
                  value={createDraft.findingSeverity}
                  onValueChange={(nextValue) =>
                    setCreateDraft((current) => ({ ...current, findingSeverity: nextValue }))
                  }
                  placeholder="Choose severity"
                  items={Object.keys(SEVERITY_META).map((severity) => ({
                    value: severity,
                    label: SEVERITY_META[severity].label,
                  }))}
                />
              </label>
              <label className="label md:col-span-2">
                Label
                <input value={createDraft.findingLabel} onChange={(event) => setCreateDraft((current) => ({ ...current, findingLabel: event.target.value }))} className="input" />
              </label>
              <label className="label md:col-span-2">
                Notes
                <textarea value={createDraft.findingNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, findingNotes: event.target.value }))} rows={2} className="input min-h-[84px] resize-y" />
              </label>
            </div>
          </div>
          {createState.message ? (
            <div
              role={createState.status === 'create_saved' ? 'status' : 'alert'}
              aria-live="polite"
              className={createState.status === 'create_saved' ? 'status-message status-message-success' : 'status-message status-message-danger'}
            >
              {createState.message}
            </div>
          ) : null}
          <button type="submit" className="btn-primary" disabled={createState.status === 'create_submitting'}>
            {createState.status === 'create_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
            Create Back-Job
          </button>
            </form>
          </details>
        </div>

        <div
          id="back-job-case-actions-panel"
          role="region"
          aria-labelledby="back-job-tab-details"
          hidden={activeWorkspaceTab !== 'case'}
          className="space-y-5"
        >
          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-raised p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">Next action for selected case</p>
              <p className="mt-2 text-lg font-bold text-ink-primary">{activeBackJob ? activeCaseReference : 'No case selected'}</p>
              <p className="mt-1 text-sm text-ink-secondary">
                {activeBackJob ? 'Choose the next allowed review status and save it to the live case.' : 'Choose Review from Loaded Vehicle Cases to enable the contextual status action.'}
              </p>
            </div>
            <label className="label">
              Next status
              <PortalSelect
                value={allowedStatusTargets.includes(statusDraft.status) ? statusDraft.status : (allowedStatusTargets[0] ?? '')}
                onValueChange={(nextValue) => setStatusDraft((current) => ({ ...current, status: nextValue }))}
                placeholder={allowedStatusTargets.length ? 'Choose next status' : 'No transitions available'}
                items={allowedStatusTargets.map((status) => ({
                  value: status,
                  label: backJobStatusLabels[status],
                }))}
                disabled={!activeBackJob || !allowedStatusTargets.length}
              />
            </label>
            <label className="label">
              Return inspection
              <PortalSelect
                value={statusDraft.returnInspectionId}
                onValueChange={(nextValue) =>
                  setStatusDraft((current) => ({ ...current, returnInspectionId: nextValue }))
                }
                placeholder="Choose return inspection"
                emptyOptionLabel="Choose return inspection"
                items={vehicleInspections
                  .filter((inspection) => inspection.inspectionType === 'return')
                  .map((inspection) => ({
                    value: inspection.id,
                    label: formatReturnInspectionReference(inspection, inspection.id),
                    helper: formatReturnInspectionHelper(inspection),
                  }))}
                disabled={!activeBackJob}
              />
            </label>
            <label className="label">
              Review notes
              <textarea value={statusDraft.reviewNotes} onChange={(event) => setStatusDraft((current) => ({ ...current, reviewNotes: event.target.value }))} rows={2} disabled={!activeBackJob} className="input min-h-[84px] resize-y" />
            </label>
            <label className="label">
              Resolution notes
              <textarea value={statusDraft.resolutionNotes} onChange={(event) => setStatusDraft((current) => ({ ...current, resolutionNotes: event.target.value }))} rows={2} disabled={!activeBackJob} className="input min-h-[84px] resize-y" />
            </label>
            {statusState.message ? (
              <div
                role={statusState.status === 'status_saved' ? 'status' : 'alert'}
                aria-live="polite"
                className={statusState.status === 'status_saved' ? 'status-message status-message-success' : 'status-message status-message-danger'}
              >
                {statusState.message}
              </div>
            ) : null}
            <button type="button" className="btn-primary" aria-label={activeBackJob ? `Save review status for ${activeCaseReference}` : 'Select a case before saving review status'} disabled={!activeBackJob || !allowedStatusTargets.length || statusState.status === 'status_submitting'} onClick={handleUpdateStatus}>
              {statusState.status === 'status_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Save Review Status
            </button>
          </section>

          <details
            open={reworkPanelOpen}
            onToggle={(event) => setReworkPanelOpen(event.currentTarget.open)}
            className="overflow-hidden rounded-2xl border border-surface-border bg-surface-raised"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
              <span>
                <span className="block text-base font-bold text-ink-primary">Create Linked Rework Job Order</span>
                <span className="mt-1 block text-xs text-ink-muted">Open only when the selected case is approved for rework.</span>
              </span>
              <Link2 size={18} className="text-brand-orange" aria-hidden="true" />
            </summary>
            <div className="space-y-4 border-t border-surface-border p-5">
            <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
              <p className="text-xs text-ink-muted">Service adviser snapshot</p>
              <p className="mt-1 text-sm font-semibold text-ink-primary">
                {reworkServiceAdviserSnapshot?.serviceAdviserCode || 'Not resolved'}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                {reworkServiceAdviserSnapshot?.source === 'original_job_order'
                  ? 'Inherited from the original finalized job order for clean adviser-of-record audit history.'
                  : reworkServiceAdviserSnapshot?.source === 'session_user'
                    ? 'Using the signed-in service adviser session because no original adviser snapshot was found.'
                    : 'This back-job cannot create rework until a valid adviser-of-record snapshot is available.'}
              </p>
            </div>
            <label className="label">
              Work item name
              <input value={reworkDraft.itemName} onChange={(event) => setReworkDraft((current) => ({ ...current, itemName: event.target.value }))} className="input" />
            </label>
            <label className="label">
              Work item description
              <textarea value={reworkDraft.itemDescription} onChange={(event) => setReworkDraft((current) => ({ ...current, itemDescription: event.target.value }))} rows={2} className="input min-h-[84px] resize-y" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="label">
                Estimated hours
                <input type="number" min="1" step="1" value={reworkDraft.estimatedHours} onChange={(event) => setReworkDraft((current) => ({ ...current, estimatedHours: event.target.value }))} className="input" />
              </label>
              <div className="label">
                Assigned technicians
                <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
                  <p className="text-xs text-ink-muted">
                    {selectedReworkTechnicianIds.length > 0
                      ? `${selectedReworkTechnicianIds.length} technician${selectedReworkTechnicianIds.length === 1 ? '' : 's'} selected`
                      : 'No technicians selected yet'}
                  </p>
                  <div className="mt-3 space-y-2">
                    {technicianOptions.length > 0 ? (
                      technicianOptions.map((profile) => {
                        const checked = selectedReworkTechnicianIds.includes(profile.id)
                        return (
                          <label
                            key={profile.id}
                            className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-card px-3 py-3 text-sm text-ink-primary"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setReworkDraft((current) => ({
                                  ...current,
                                  assignedTechnicianIdsText: toggleDelimitedIdValue(
                                    current.assignedTechnicianIdsText,
                                    profile.id,
                                    event.target.checked,
                                  ),
                                }))
                              }
                              className="mt-0.5 h-4 w-4 rounded border-surface-border bg-surface-input accent-[rgb(var(--brand-orange))]"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-ink-primary">{profile.fullName || profile.code || 'Technician profile'}</span>
                              <span className="mt-1 block text-xs text-ink-secondary">
                                {profile.code || (profile.specialties ?? []).join(' · ') || 'Specialty profile'}
                              </span>
                            </span>
                          </label>
                        )
                      })
                    ) : (
                      <p className="text-xs text-ink-muted">
                        No active technicians are available to assign right now.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <label className="label">
              Rework notes
              <textarea value={reworkDraft.notes} onChange={(event) => setReworkDraft((current) => ({ ...current, notes: event.target.value }))} rows={2} className="input min-h-[84px] resize-y" />
            </label>
            {!canSubmitRework ? (
              <p className="status-message status-message-warning text-xs">
                Rework job creation unlocks only when the selected back-job is approved for rework and has no linked rework job order.
              </p>
            ) : null}
            {reworkState.message ? (
              <div
                role={reworkState.status === 'rework_saved' ? 'status' : 'alert'}
                aria-live="polite"
                className={reworkState.status === 'rework_saved' ? 'status-message status-message-success' : 'status-message status-message-danger'}
              >
                {reworkState.message}
              </div>
            ) : null}
            <button type="button" className="btn-primary" disabled={!canSubmitRework || reworkState.status === 'rework_submitting'} onClick={handleCreateReworkJobOrder}>
              {reworkState.status === 'rework_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <Wrench size={15} />}
              Create Rework Job Order
            </button>
            </div>
          </details>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="card-title">Live Back-Job Boundaries</p>
            <p className="mt-1 max-w-3xl text-sm text-ink-secondary">
              This page shows only the back-job cases staff intentionally load by vehicle or case reference, so the workflow stays focused on active operational review instead of an artificial queue.
            </p>
          </div>
          <span className="badge badge-gray">Loaded on demand</span>
        </div>
      </section>
    </div>
  )
}
