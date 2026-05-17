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
import { ApiError, listAdminCustomers, listStaffAccounts } from '@/lib/authClient'
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

function BackJobDetail({ backJob }) {
  if (!backJob) {
    return (
      <div className="empty-panel text-sm text-ink-muted">
        Load a vehicle list, create a case, or search by back-job id to inspect live detail.
      </div>
    )
  }

  const statusMeta = STATUS_META[backJob.status] ?? STATUS_META.reported
  const visibility = getBackJobCustomerVisibility(backJob.status)
  const validationState = getBackJobValidationState(backJob)

  return (
    <div className="card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">Live Back-Job Detail</p>
          <h2 className="mt-2 text-xl font-bold text-ink-primary">{backJob.id}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">{backJob.complaint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span>
          <span className={`badge ${isBackJobCustomerSafe(backJob.status) ? 'badge-green' : 'badge-gray'}`}>
            {visibilityCopy[visibility]}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Customer / Vehicle</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{backJob.customerUserId}</p>
          <p className="mt-1 text-xs text-ink-secondary">{backJob.vehicleId}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Original Work</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{backJob.originalJobOrderId}</p>
          <p className="mt-1 text-xs text-ink-secondary">{backJob.originalBookingId ?? 'No booking reference'}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Rework Linkage</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{backJob.reworkJobOrderId ?? 'Not linked yet'}</p>
          <p className="mt-1 text-xs text-ink-secondary">Validation: {validationState.replaceAll('_', ' ')}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-sm font-bold text-ink-primary">Review Notes</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{backJob.reviewNotes || 'No review notes recorded.'}</p>
          <p className="mt-3 text-xs text-ink-muted">Return inspection: {backJob.returnInspectionId ?? 'not attached'}</p>
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
  const [staffAccounts, setStaffAccounts] = useState([])
  const [vehicleBookings, setVehicleBookings] = useState([])
  const [vehicleJobOrders, setVehicleJobOrders] = useState([])
  const [vehicleInspections, setVehicleInspections] = useState([])
  const [selectedCustomerUserId, setSelectedCustomerUserId] = useState('')
  const [activeBackJob, setActiveBackJob] = useState(null)
  const [loadState, setLoadState] = useState(initialLoadState)
  const [createState, setCreateState] = useState(initialCreateState)
  const [statusState, setStatusState] = useState(initialStatusState)
  const [reworkState, setReworkState] = useState(initialReworkState)
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
  const technicianOptions = useMemo(
    () =>
      staffAccounts.filter(
        (account) =>
          account.isActive &&
          (account.accountType === 'mechanic' ||
            account.accountType === 'technician' ||
            account.role === 'technician'),
      ),
    [staffAccounts],
  )

  useEffect(() => {
    if (!user?.accessToken || !canManage) {
      setCustomers([])
      setStaffAccounts([])
      return
    }

    void Promise.all([
      listAdminCustomers(user.accessToken),
      listStaffAccounts(user.accessToken),
    ])
      .then(([loadedCustomers, loadedStaffAccounts]) => {
        setCustomers(loadedCustomers)
        setStaffAccounts(loadedStaffAccounts)
      })
      .catch(() => {
        setCustomers([])
        setStaffAccounts([])
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

  function requireStaffSession(stateSetter, failedStatus, message) {
    if (!canManage) {
      stateSetter({
        status: failedStatus,
        message: 'Only service advisers and super admins can manage back-job review and rework.',
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
        nextState = message.includes('inspection') || message.includes('evidence')
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
        assignedTechnicianIds: splitCommaSeparatedIds(reworkDraft.assignedTechnicianIdsText),
        accessToken: user.accessToken,
      })
      const refreshedBackJob = await getBackJobById({
        backJobId: activeBackJob.id,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(refreshedBackJob)
      setReworkState({
        status: 'rework_saved',
        message: `Rework job order ${createdJobOrder?.id ?? 'created'} linked to this back-job.`,
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

  if (!canManage) {
    return (
      <div className="empty-panel text-left">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-red-400" />
          <div>
            <p className="text-lg font-bold text-ink-primary">Back-job review is staff-restricted</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Only service advisers and super admins can open, review, and resolve back-job cases.
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
                  label: customer.displayName || customer.email || customer.id,
                  helper: customer.email || customer.id,
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
                  label: vehicle.plateNumber || vehicle.id,
                  helper:
                    [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.id,
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
              Paste a back-job id directly, or pick from the loaded vehicle cases when staff need to review one specific record.
            </p>
            <label className="label mt-3">
              Back-job id
              <input
                value={backJobId}
                onChange={(event) => setBackJobId(event.target.value)}
                className="input"
                list="loaded-back-job-options"
                placeholder="Paste a back-job id or choose a loaded case"
              />
              <datalist id="loaded-back-job-options">
                {backJobs.map((backJob) => (
                  <option key={backJob.id} value={backJob.id}>
                    {backJob.complaint} / {backJob.status}
                  </option>
                ))}
              </datalist>
            </label>
            <p className="mt-2 text-xs text-ink-muted">
              {backJobs.length
                ? 'Loaded cases are available as suggestions, but you can still look up any back-job id directly.'
                : 'No vehicle cases are loaded yet. You can still paste a known back-job id here.'}
            </p>
            <button type="submit" className="btn-primary mt-3" disabled={loadState.status === 'back_jobs_loading'}>
              {loadState.status === 'back_jobs_loading' ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              Load Case Detail
            </button>
          </form>
        </div>

        {loadState.message ? (
          <div
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
          </div>
          <div className="table-scroll">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Back-Job</th>
                  <th>Original Job</th>
                  <th>Complaint</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {backJobs.map((backJob) => {
                  const statusMeta = STATUS_META[backJob.status] ?? STATUS_META.reported
                  const visibility = getBackJobCustomerVisibility(backJob.status)
                  return (
                    <tr key={backJob.id}>
                      <td className="font-mono text-xs text-brand-orange">{backJob.id}</td>
                      <td className="font-mono text-xs text-ink-secondary">{backJob.originalJobOrderId}</td>
                      <td>
                        <p className="max-w-[260px] truncate">{backJob.complaint}</p>
                      </td>
                      <td><span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span></td>
                      <td><span className="badge badge-gray">{visibilityCopy[visibility]}</span></td>
                      <td>
                        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => syncActiveBackJob(backJob)}>
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

      <div ref={detailSectionRef}>
        <BackJobDetail backJob={activeBackJob} />
      </div>

      <section className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={handleCreateBackJob} className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="card-title">Create Back-Job Case</p>
              <p className="mt-1 text-xs text-ink-muted">Create an internal return case after staff verifies the customer complaint.</p>
            </div>
            <Plus size={18} className="text-brand-orange" />
          </div>
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
                  label: customer.displayName || customer.email || customer.id,
                  helper: customer.email || customer.id,
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
                  label: vehicle.plateNumber || vehicle.id,
                  helper:
                    [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.id,
                }))}
              />
            </label>
            <label className="label">
              Original job order
              <PortalSelect
                value={createDraft.originalJobOrderId}
                onValueChange={(nextValue) =>
                  setCreateDraft((current) => ({ ...current, originalJobOrderId: nextValue }))
                }
                placeholder="Choose finalized job order"
                emptyOptionLabel="Choose finalized job order"
                items={vehicleJobOrders
                  .filter((jobOrder) => jobOrder.status === 'finalized')
                  .map((jobOrder) => ({
                    value: jobOrder.id,
                    label: `JO-${jobOrder.id.slice(0, 8).toUpperCase()}`,
                    helper: `${jobOrder.id} • ${jobOrder.status.replaceAll('_', ' ')}`,
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
                  label: booking.scheduledDate || booking.id,
                  helper: `${booking.id} • ${booking.status}`,
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
                    label: inspection.createdAt || inspection.id,
                    helper: `${inspection.id} • ${inspection.status}`,
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
            <div className={createState.status === 'create_saved' ? 'status-message status-message-success' : 'status-message status-message-danger'}>
              {createState.message}
            </div>
          ) : null}
          <button type="submit" className="btn-primary" disabled={createState.status === 'create_submitting'}>
            {createState.status === 'create_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
            Create Back-Job
          </button>
        </form>

        <div className="space-y-5">
          <section className="card p-5 space-y-4">
            <div>
              <p className="card-title">Review Status Update</p>
              <p className="mt-1 text-xs text-ink-muted">Move the selected case through review, approval, or closure.</p>
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
                disabled={!allowedStatusTargets.length}
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
                    label: inspection.createdAt || inspection.id,
                    helper: `${inspection.id} • ${inspection.status}`,
                  }))}
              />
            </label>
            <label className="label">
              Review notes
              <textarea value={statusDraft.reviewNotes} onChange={(event) => setStatusDraft((current) => ({ ...current, reviewNotes: event.target.value }))} rows={2} className="input min-h-[84px] resize-y" />
            </label>
            <label className="label">
              Resolution notes
              <textarea value={statusDraft.resolutionNotes} onChange={(event) => setStatusDraft((current) => ({ ...current, resolutionNotes: event.target.value }))} rows={2} className="input min-h-[84px] resize-y" />
            </label>
            {statusState.message ? (
              <div className={statusState.status === 'status_saved' ? 'status-message status-message-success' : 'status-message status-message-danger'}>
                {statusState.message}
              </div>
            ) : null}
            <button type="button" className="btn-primary" disabled={!activeBackJob || !allowedStatusTargets.length || statusState.status === 'status_submitting'} onClick={handleUpdateStatus}>
              {statusState.status === 'status_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Save Review Status
            </button>
          </section>

          <section className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="card-title">Create Linked Rework Job Order</p>
                <p className="mt-1 text-xs text-ink-muted">Create a linked workshop order after the back-job is approved for rework.</p>
              </div>
              <Link2 size={18} className="text-brand-orange" />
            </div>
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
                      technicianOptions.map((account) => {
                        const checked = selectedReworkTechnicianIds.includes(account.id)
                        return (
                          <label
                            key={account.id}
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
                                    account.id,
                                    event.target.checked,
                                  ),
                                }))
                              }
                              className="mt-0.5 h-4 w-4 rounded border-surface-border bg-surface-input accent-[rgb(var(--brand-orange))]"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-ink-primary">{account.displayName}</span>
                              <span className="mt-1 block text-xs text-ink-secondary">
                                {account.staffCode || account.roleLabel}
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
              <div className={reworkState.status === 'rework_saved' ? 'status-message status-message-success' : 'status-message status-message-danger'}>
                {reworkState.message}
              </div>
            ) : null}
            <button type="button" className="btn-primary" disabled={!canSubmitRework || reworkState.status === 'rework_submitting'} onClick={handleCreateReworkJobOrder}>
              {reworkState.status === 'rework_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <Wrench size={15} />}
              Create Rework Job Order
            </button>
          </section>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="card-title">Live Back-Job Boundaries</p>
            <p className="mt-1 max-w-3xl text-sm text-ink-secondary">
              This page shows only the back-job cases staff intentionally load by vehicle or case id, so the workflow stays focused on active operational review instead of an artificial queue.
            </p>
          </div>
          <span className="badge badge-gray">Loaded on demand</span>
        </div>
      </section>
    </div>
  )
}
