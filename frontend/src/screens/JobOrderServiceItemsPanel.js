'use client'

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CirclePlay,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Save,
} from 'lucide-react'

import { formatServiceItemName } from '@/lib/jobOrderServiceProgressModel.mjs'
import { emptyProgressDraft } from './jobOrderWorkbenchViewModel.mjs'
import {
  buildServiceItemImmediatePayload,
  buildServiceItemMessageDraft,
  buildServiceItemRows,
  getServiceItemActions,
  SERVICE_ITEM_STATE_META,
} from './jobOrderServiceItemsView.mjs'

const SERVICE_ACTION_ICONS = {
  start: CirclePlay,
  resume: RotateCcw,
  update: MessageSquareText,
  blocker: AlertTriangle,
  evidence: Camera,
  complete: CheckCircle2,
}

export default function JobOrderServiceItemsPanel({
  items = [],
  progressEntries = [],
  photos = [],
  progressDraft,
  setProgressDraft,
  progressState,
  progressStateClassName,
  onSubmit,
  onAddEvidence,
  canMutate = false,
}) {
  const {
    rows: itemRows,
    activeItems,
    completedItems,
  } = buildServiceItemRows({ items, progressEntries, photos })
  const selectedItem = itemRows.find((item) => item.id === progressDraft.workItemId)
  const selectedActionNeedsMessage = ['note', 'issue_found'].includes(progressDraft.entryType)
  const isSubmitting = progressState.status === 'progress_submitting'

  const chooseMessageAction = (item, entryType) => {
    setProgressDraft(buildServiceItemMessageDraft(item, entryType))
  }

  const submitImmediateAction = (item, entryType) => {
    void onSubmit(buildServiceItemImmediatePayload(item, entryType))
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-surface-border pb-3">
        <div>
          <p className="text-sm font-semibold text-ink-primary">Services</p>
        </div>
        <span className="badge badge-gray">
          {completedItems.length} of {itemRows.length} complete
        </span>
      </div>

      {activeItems.length > 0 ? (
        <div className="divide-y divide-surface-border">
          {activeItems.map((item) => {
            const stateMeta = SERVICE_ITEM_STATE_META[item.serviceState]
            const actions = getServiceItemActions(item)

            return (
              <div key={item.id} className="py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink-primary">
                        {formatServiceItemName(item)}
                      </p>
                      <span className={`badge ${stateMeta.className}`}>
                        {stateMeta.label}
                      </span>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-ink-secondary">
                        {item.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-ink-muted">
                        No additional service instructions.
                      </p>
                    )}
                    {item.requiresPhotoEvidence !== false ? (
                      <p
                        className={`mt-2 text-[11px] ${
                          item.requiresMissingEvidence
                            ? 'text-amber-200'
                            : 'text-emerald-200'
                        }`}
                      >
                        {item.requiresMissingEvidence
                          ? 'Photo evidence required before completion.'
                          : 'Required photo evidence attached.'}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {actions.map((action) => {
                      const ActionIcon = SERVICE_ACTION_ICONS[action.key]
                      const handleAction = () => {
                        if (action.kind === 'evidence') {
                          onAddEvidence(item.id)
                        } else if (action.kind === 'message') {
                          chooseMessageAction(item, action.entryType)
                        } else {
                          submitImmediateAction(item, action.entryType)
                        }
                      }

                      return (
                        <button
                          key={`${item.id}-${action.key}`}
                          type="button"
                          onClick={handleAction}
                          disabled={!canMutate || isSubmitting}
                          className={
                            action.primary ? 'ops-action-primary' : 'ops-action-secondary'
                          }
                        >
                          <ActionIcon size={14} />
                          {action.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {selectedItem?.id === item.id && selectedActionNeedsMessage ? (
                  <div className="mt-3 border-l-2 border-brand-orange pl-3">
                    <label className="block text-xs font-medium text-ink-secondary">
                      {progressDraft.entryType === 'issue_found'
                        ? 'Blocker reason'
                        : 'Service update'}
                      <textarea
                        value={progressDraft.message}
                        onChange={(event) =>
                          setProgressDraft((current) => ({
                            ...current,
                            message: event.target.value,
                          }))
                        }
                        rows={3}
                        className="mt-1 textarea"
                        placeholder={
                          progressDraft.entryType === 'issue_found'
                            ? 'What is preventing this service from continuing?'
                            : 'What changed on this service?'
                        }
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onSubmit(progressDraft)}
                        disabled={
                          !canMutate ||
                          !progressDraft.message.trim() ||
                          isSubmitting
                        }
                        className="ops-action-primary"
                      >
                        {isSubmitting ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        {progressDraft.entryType === 'issue_found'
                          ? 'Save blocker'
                          : 'Save update'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgressDraft(emptyProgressDraft)}
                        className="ops-action-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : itemRows.length > 0 ? (
        <div className="py-5 text-sm text-emerald-200">
          All services are complete. Review the evidence, then send this job order to QA.
        </div>
      ) : (
        <div className="py-5 text-sm text-ink-muted">
          No services were added to this job order.
        </div>
      )}

      {completedItems.length > 0 ? (
        <details className="border-t border-surface-border py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-secondary">
            Completed services ({completedItems.length})
          </summary>
          <div className="mt-3 divide-y divide-surface-border">
            {completedItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-300"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary">
                    {formatServiceItemName(item)}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-xs text-ink-muted">{item.description}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {progressState.message ? (
        <div className={`mt-3 ${progressStateClassName}`}>
          {progressState.message}
        </div>
      ) : null}
    </div>
  )
}
