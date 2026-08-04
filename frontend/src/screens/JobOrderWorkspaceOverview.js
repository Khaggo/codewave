'use client'

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileStack,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import PortalLink from '@/components/PortalLink'
import PageHeader from '@/components/ui/PageHeader'
import { SummaryTile } from './JobOrderWorkbenchSummary'
import {
  formatDate,
  formatJobOrderReference,
} from './jobOrderWorkbenchViewModel.mjs'
import {
  buildJobOrderHistoryMetrics,
  buildJobOrderSummaryCards,
} from './jobOrderWorkspaceOverviewView.mjs'

const SUMMARY_ICONS = Object.freeze({
  queue: ClipboardList,
  phase: Wrench,
  ownership: ShieldCheck,
  completion: FileStack,
})

export default function JobOrderWorkspaceOverview({
  workspaceOnly,
  activeJobOrder,
  selectedDate,
  workbenchScope,
  onScopeChange,
  isTechnician,
  onRefresh,
  monthCount,
  markedDateCount,
  selectedDateCount,
  isQueueStageVisible,
  queueMode,
  handoffCount,
  handoffStatus,
  executionPhase,
  selectedCandidate,
  canAppendProgress,
  nextAction,
  onOpenQueue,
}) {
  const historyMetrics = buildJobOrderHistoryMetrics({
    monthCount,
    markedDateCount,
    selectedDateCount,
  })
  const summaryCards = buildJobOrderSummaryCards({
    isTechnician,
    workbenchScope,
    activeJobOrder,
    queueMode,
    handoffCount: workbenchScope === 'history' ? monthCount : handoffCount,
    handoffStatus,
    executionPhase,
    selectedCandidate,
    canAppendProgress,
  })

  return (
    <>
      {workspaceOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4">
          <PortalLink href="/admin/job-orders" className="ops-action-secondary">
            <ArrowLeft size={15} />
            Back to board
          </PortalLink>
          <p className="text-sm text-ink-muted">Focused job workspace</p>
        </div>
      ) : (
        <div className={activeJobOrder ? 'hidden md:block' : ''}>
          <PageHeader
            eyebrow="Workshop Operations"
            title="Job Orders"
            description="Review active work, update progress, and prepare jobs for QA."
            meta={
              <>
                <span className="badge badge-gray">{formatDate(selectedDate)}</span>
                <span
                  className={`badge ${
                    workbenchScope === 'history' ? 'badge-blue' : 'badge-orange'
                  }`}
                >
                  {workbenchScope === 'history' ? 'History view' : 'Active view'}
                </span>
              </>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div className="booking-segmented-control">
                  {[
                    { key: 'active', label: 'Active' },
                    { key: 'history', label: 'History' },
                  ].map((view) => (
                    <button
                      key={view.key}
                      type="button"
                      onClick={() => onScopeChange(view.key)}
                      className={`booking-tab-button ${
                        workbenchScope === view.key ? 'booking-tab-button-active' : ''
                      }`}
                      aria-pressed={workbenchScope === view.key}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
                {!isTechnician ? (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="ops-action-secondary h-11 w-11 min-w-11 self-start px-0 sm:w-auto sm:min-w-[148px] sm:px-4 xl:self-auto"
                    aria-label="Refresh job orders"
                  >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                ) : null}
              </div>
            }
          />
        </div>
      )}

      {!workspaceOnly && workbenchScope === 'history' ? (
        <>
          <section className="grid grid-cols-3 divide-x divide-surface-border rounded-[20px] border border-surface-border bg-surface-card px-2 py-4 sm:hidden">
            {historyMetrics.map((metric) => (
              <div key={metric.label} className="min-w-0 px-2 text-center">
                <p className="text-[10px] font-semibold uppercase text-ink-muted">
                  {metric.label}
                </p>
                <p className="mt-1 text-xl font-semibold text-ink-primary">{metric.value}</p>
              </div>
            ))}
          </section>
          <section className="hidden gap-3 sm:grid sm:grid-cols-3">
            <SummaryTile
              icon={FileStack}
              label="History Records"
              value={monthCount}
              sub="Finalized and cancelled job orders in the selected month"
            />
            <SummaryTile
              icon={CalendarDays}
              label="Dates Available"
              value={markedDateCount}
              sub="Choose a marked date to narrow the archive"
            />
            <SummaryTile
              icon={CheckCircle2}
              label="Selected Date"
              value={selectedDateCount}
              sub={
                selectedDateCount === 1
                  ? 'One job order is ready to review'
                  : `${selectedDateCount} job orders are ready to review`
              }
            />
          </section>
        </>
      ) : !workspaceOnly && (!activeJobOrder || isQueueStageVisible) ? (
        <section className="ops-summary-grid">
          {summaryCards.map((card) => (
            <SummaryTile
              key={card.label}
              icon={SUMMARY_ICONS[card.iconKey]}
              label={card.label}
              value={card.value}
              sub={card.sub}
            />
          ))}
        </section>
      ) : !workspaceOnly ? (
        <section className="hidden rounded-[20px] border border-surface-border bg-surface-card/90 px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.14)] backdrop-blur md:block">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-secondary">
              <span className="badge badge-gray">Queue collapsed</span>
              <span>
                <span className="font-semibold text-ink-primary">
                  {formatJobOrderReference(activeJobOrder)}
                </span>{' '}
                is active - {nextAction.stepLabel} - {nextAction.title}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenQueue}
              className="ops-action-secondary sm:min-w-[148px]"
            >
              <ClipboardList size={14} />
              Open queue
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}
