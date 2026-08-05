'use client'

import {
  ChevronRight,
  ClipboardList,
  FileStack,
  ListChecks,
  Users,
  X,
} from 'lucide-react'

import {
  JOB_ORDER_CONTROL_DRAWER_TABS,
  buildJobOrderDrawerContextRows,
  getJobOrderDrawerAssignmentMeta,
} from './jobOrderControlDrawerView.mjs'
import {
  WORKBENCH_STAGE_META,
  formatJobOrderReference,
  formatStatusLabel,
} from './jobOrderWorkbenchViewModel.mjs'

const drawerTabIcons = {
  overview: ListChecks,
  my_work: Users,
  context: ClipboardList,
}

export default function JobOrderControlDrawer({
  open,
  activeTab,
  onTabChange,
  activeJobOrder,
  activeSourceCandidate,
  currentStage,
  activeClaimId,
  hasSavedAssignments,
  nextAction,
  steps,
  onClose,
  onNavigateStage,
  onOpenQaAudit,
  onOpenMyWork,
  onOpenHistory,
}) {
  if (!open || !activeJobOrder) {
    return null
  }

  const contextRows = buildJobOrderDrawerContextRows({
    jobOrder: activeJobOrder,
    sourceCandidate: activeSourceCandidate,
    hasSavedAssignments,
  })
  const stageLabel =
    WORKBENCH_STAGE_META[currentStage]?.label ?? formatStatusLabel(currentStage)

  return (
    <>
      <button
        type="button"
        className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/60"
        aria-label="Close control drawer"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col border border-surface-border bg-surface-card shadow-2xl md:left-auto md:w-[min(520px,calc(100vw-2rem))]"
        aria-labelledby="job-order-control-drawer-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <div className="min-w-0">
            <p
              id="job-order-control-drawer-title"
              className="text-sm font-semibold text-ink-primary"
            >
              Job order control
            </p>
            <p className="mt-1 truncate text-xs text-ink-muted">
              {formatJobOrderReference(activeJobOrder)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ops-action-secondary h-10 w-10 px-0"
            aria-label="Close control drawer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 border-b border-surface-border p-2">
          {JOB_ORDER_CONTROL_DRAWER_TABS.map((tab) => {
            const Icon = drawerTabIcons[tab.key]
            const isActive = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'border-brand-orange text-ink-primary'
                    : 'border-transparent text-ink-muted hover:text-ink-primary'
                }`}
                aria-pressed={isActive}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' ? (
            <WorkflowTab
              activeJobOrder={activeJobOrder}
              currentStage={currentStage}
              nextAction={nextAction}
              steps={steps}
              onNavigateStage={onNavigateStage}
              onOpenQaAudit={onOpenQaAudit}
            />
          ) : null}

          {activeTab === 'my_work' ? (
            <div className="space-y-4">
              <div className="border-b border-surface-border pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Current assignment
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-ink-primary">
                    {formatJobOrderReference(activeJobOrder)}
                  </p>
                  <span className="badge badge-green">Assigned to you</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-secondary">
                  {activeSourceCandidate?.vehicleLabel ??
                    activeJobOrder.vehicleLabel ??
                    'Vehicle not recorded'}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {getJobOrderDrawerAssignmentMeta({
                    stageLabel,
                    activeClaimId,
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="ops-action-primary w-full"
              >
                <ChevronRight size={15} />
                Resume this job
              </button>
              <button
                type="button"
                onClick={onOpenMyWork}
                className="ops-action-secondary w-full"
              >
                <Users size={15} />
                Open My Work board
              </button>
            </div>
          ) : null}

          {activeTab === 'context' ? (
            <div className="space-y-3">
              {contextRows.map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-surface-border pb-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-1 text-sm text-ink-primary">{value}</p>
                </div>
              ))}
              <button
                type="button"
                onClick={onOpenMyWork}
                className="ops-action-secondary w-full"
              >
                <ClipboardList size={15} />
                Return to queue
              </button>
              <button
                type="button"
                onClick={onOpenHistory}
                className="ops-action-secondary w-full"
              >
                <FileStack size={15} />
                Open job history
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function WorkflowTab({
  activeJobOrder,
  currentStage,
  nextAction,
  steps,
  onNavigateStage,
  onOpenQaAudit,
}) {
  return (
    <div className="space-y-4">
      <div className={`border px-4 py-3 ${nextAction.toneClass}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
          Next - {nextAction.stepLabel}
        </p>
        <p className="mt-2 text-sm font-semibold text-ink-primary">
          {nextAction.title}
        </p>
        <p className="mt-2 text-xs leading-5 opacity-90">{nextAction.body}</p>
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const opensQa =
            step.key === 'qa_audit' &&
            activeJobOrder.status === 'ready_for_qa'
          const isActiveStep =
            step.workbenchStage === currentStage || opensQa
          const rowTone =
            step.state === 'done'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
              : step.state === 'blocked'
                ? 'border-red-500/25 bg-red-500/10 text-red-100'
                : step.state === 'action_needed' || isActiveStep
                  ? 'border-brand-orange/25 bg-brand-orange/10 text-amber-100'
                  : 'border-surface-border bg-surface-raised text-ink-secondary'

          return (
            <button
              key={`drawer-${step.key}`}
              type="button"
              disabled={step.state === 'locked'}
              onClick={() =>
                opensQa
                  ? onOpenQaAudit()
                  : onNavigateStage(step.workbenchStage)
              }
              className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition ${rowTone}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/25 text-[11px] font-semibold">
                {step.state === 'done'
                  ? 'OK'
                  : step.state === 'blocked'
                    ? 'X'
                    : step.state === 'action_needed'
                      ? '!'
                      : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{step.label}</span>
                <span className="mt-1 block truncate text-xs opacity-80">
                  {step.note}
                </span>
              </span>
              <ChevronRight size={15} className="shrink-0 opacity-70" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
