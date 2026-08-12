import { useId, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { filterIntakeComboboxOptions } from './intakeSearchComboboxOptions.mjs'

export function IntakeSearchCombobox({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  placeholder = 'Search and choose',
  noResultsText = 'No matching records.',
  onSearchChange,
  loading = false,
  error = '',
}) {
  const inputId = useId()
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = options.find((option) => option.value === value) ?? null
  const filtered = useMemo(() => filterIntakeComboboxOptions(options, query), [options, query])
  const activeOption = filtered.items[activeIndex] ?? filtered.items[0] ?? null

  const close = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const select = (option) => {
    onValueChange(option.value)
    close()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(0)
        return
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => Math.max(0, Math.min(filtered.items.length - 1, current + direction)))
      return
    }

    if (event.key === 'Enter' && open && activeOption) {
      event.preventDefault()
      select(activeOption)
    }
  }

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      <label className="label" htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeOption ? `${listboxId}-${activeOption.value}` : undefined}
          aria-haspopup="listbox"
          autoComplete="off"
          disabled={disabled}
          className="input pr-10"
          placeholder={placeholder}
          value={open ? query : selected?.label ?? ''}
          onFocus={() => {
            setOpen(true)
            setQuery('')
            setActiveIndex(0)
            onSearchChange?.('')
          }}
          onClick={() => !disabled && setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(0)
            onSearchChange?.(event.target.value)
          }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" size={16} aria-hidden="true" />
      </div>

      {open && !disabled ? (
        <div className="absolute z-[65] mt-1 w-full rounded-lg border border-surface-border bg-surface-card p-1 shadow-2xl">
          <div id={listboxId} role="listbox" aria-label={`${label} results`} className="max-h-60 overflow-y-auto overscroll-contain">
            {filtered.items.map((option, index) => (
              <button
                key={option.value}
                id={`${listboxId}-${option.value}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                className={`block w-full rounded-md px-3 py-2 text-left ${index === activeIndex ? 'bg-brand-orange/10' : 'hover:bg-surface-hover'}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(option)}
              >
                <span className="block truncate text-sm font-semibold text-ink-primary">{option.label}</span>
                {option.helper ? <span className="mt-0.5 block truncate text-xs text-ink-muted">{option.helper}</span> : null}
              </button>
            ))}
            {loading ? <p className="px-3 py-3 text-sm text-ink-muted" role="status">Loading matches…</p> : null}
            {!loading && error ? <p className="px-3 py-3 text-sm text-red-300" role="alert">{error}</p> : null}
            {!loading && !error && !filtered.items.length ? <p className="px-3 py-4 text-sm text-ink-muted" role="status">{noResultsText}</p> : null}
          </div>
          {filtered.limited ? (
            <p className="border-t border-surface-border px-3 py-2 text-xs text-ink-muted" role="status">
              Showing 20 of {filtered.total} matches. Refine the search to find another record.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default IntakeSearchCombobox
