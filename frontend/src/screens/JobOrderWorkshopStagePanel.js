'use client'

import { RefreshCw, ShieldCheck } from 'lucide-react'

import { formatStatusLabel } from './jobOrderWorkbenchViewModel.mjs'
import {
  getWorkshopStageMessageClassName,
  getWorkshopStageOptions,
} from './jobOrderWorkshopStageView.mjs'

export default function JobOrderWorkshopStagePanel({
  draft,
  setDraft,
  state,
  canSave,
  onSave,
}) {
  const options = getWorkshopStageOptions(draft.stage)
  const isSubmitting = state.status === 'submitting'

  return (
    <details className="order-3 mt-4 border-t border-surface-border pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-secondary">
        <span>Customer-facing workshop status</span>
        <span className="badge badge-gray">{formatStatusLabel(draft.stage)}</span>
      </summary>

      <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
        <label className="text-xs text-ink-muted">
          Current stage
          <select
            value={draft.stage}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                stage: event.target.value,
              }))
            }
            className="select mt-1"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-ink-muted">
          Stage note
          <input
            type="text"
            value={draft.note}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            className="input mt-1"
            placeholder="Explain what changed in this stage..."
          />
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || isSubmitting}
          className="ops-action-secondary self-end"
        >
          {isSubmitting ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <ShieldCheck size={14} />
          )}
          Save Workshop Stage
        </button>
      </div>

      {state.message ? (
        <div className={`mt-3 ${getWorkshopStageMessageClassName(state.status)}`}>
          {state.message}
        </div>
      ) : null}
    </details>
  )
}
