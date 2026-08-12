import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { IntakeFocusedModal } from './DigitalIntakeInspectionComponents'
import {
  filterIntakeOptions,
  getIntakeOptionCategories,
  getIntakeChoiceOpenState,
  getIntakeSelectionSummary,
  normalizeIntakeOptions,
  normalizeSelectionValues,
  toggleIntakeSelection,
} from './intakeSelectionModal.mjs'

export function IntakeChoiceModal({
  open,
  kind,
  options = [],
  selectedValues = [],
  lockedValues = [],
  onApply,
  onClose,
  returnFocusRef,
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [draftSelection, setDraftSelection] = useState(() => new Set())
  const wasOpenRef = useRef(false)
  const normalizedOptions = useMemo(() => normalizeIntakeOptions(options), [options])
  const categories = useMemo(() => getIntakeOptionCategories(options), [options])
  const filteredOptions = useMemo(
    () => filterIntakeOptions(options, { query, category }),
    [category, options, query],
  )
  const locked = useMemo(() => new Set(normalizeSelectionValues(lockedValues)), [lockedValues])
  const summary = getIntakeSelectionSummary([...draftSelection], normalizedOptions.length)
  const isReasons = kind === 'reasons'

  useEffect(() => {
    const openState = getIntakeChoiceOpenState({
      open,
      wasOpen: wasOpenRef.current,
      selectedValues,
    })
    wasOpenRef.current = openState.wasOpen
    if (!openState.initialize) return
    setQuery(openState.query)
    setCategory(openState.category)
    setDraftSelection(new Set(openState.selectedValues))
  }, [open, selectedValues])

  const toggleValue = (value) => {
    if (locked.has(value)) return
    setDraftSelection((current) => new Set(toggleIntakeSelection([...current], value)))
  }

  return (
    <IntakeFocusedModal
      open={open}
      title={isReasons ? 'Choose reasons' : 'Choose services'}
      description={isReasons ? 'Search and select the customer’s visit reasons.' : 'Search or filter the service catalog, then apply the selection.'}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      widthClassName="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block">
            <span className="sr-only">Search {isReasons ? 'reasons' : 'services'}</span>
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-9"
              placeholder={`Search ${isReasons ? 'reasons' : 'services'}`}
            />
          </label>
          {!isReasons ? (
            <label className="label sm:min-w-44">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="input">
                <option value="all">All categories</option>
                {categories.map((optionCategory) => <option key={optionCategory} value={optionCategory}>{optionCategory}</option>)}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
          <p className="text-sm font-semibold text-ink-primary">{summary.selected} selected of {summary.total}</p>
          {locked.size ? <span className="badge badge-gray">Booking selection authoritative</span> : null}
        </div>

        <div className="max-h-[min(55dvh,32rem)] space-y-2 overflow-y-auto pr-1" role="group" aria-label={isReasons ? 'Visit reasons' : 'Services'}>
          {filteredOptions.length ? filteredOptions.map((option) => {
            const checked = draftSelection.has(option.value)
            const isLocked = locked.has(option.value)
            return (
              <label key={option.value} className={`flex min-h-11 items-start gap-3 rounded-xl border px-3 py-3 text-sm ${isLocked ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-surface-border bg-surface-raised'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isLocked}
                  onChange={() => toggleValue(option.value)}
                  className="mt-0.5 h-4 w-4 accent-[#f07c00]"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-ink-primary">{option.label}</span>
                  {option.helper ? <span className="mt-1 block text-xs text-ink-muted">{option.helper}</span> : null}
                  {isLocked ? <span className="mt-1 block text-xs font-semibold text-brand-orange">Locked from booking</span> : null}
                </span>
              </label>
            )
          }) : <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-ink-muted">No matching options.</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-surface-border pt-3">
          <button type="button" className="btn-ghost min-h-11" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary min-h-11" onClick={() => onApply([...draftSelection])}>Apply</button>
        </div>
      </div>
    </IntakeFocusedModal>
  )
}
