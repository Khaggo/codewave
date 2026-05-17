'use client'

import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

const EMPTY_OPTION_VALUE = '__portal-select-empty__'

export default function PortalSelect({
  value,
  onValueChange,
  placeholder,
  items = [],
  emptyOptionLabel,
  disabled = false,
  triggerClassName = '',
  contentClassName = '',
}) {
  const normalizedValue = String(value ?? '').trim()
  const hasValue = normalizedValue.length > 0

  return (
    <Select.Root
      value={hasValue ? normalizedValue : undefined}
      onValueChange={(nextValue) => onValueChange?.(nextValue === EMPTY_OPTION_VALUE ? '' : nextValue)}
      disabled={disabled}
    >
      <Select.Trigger
        className={`select flex items-center justify-between gap-3 text-left ${triggerClassName}`.trim()}
        aria-label={placeholder}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild>
          <ChevronDown size={16} className="shrink-0 text-[rgb(var(--brand-orange))]" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          sideOffset={10}
          position="popper"
          className={`z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-1.5 shadow-card-md animate-slide-up ${contentClassName}`.trim()}
        >
          <Select.Viewport className="max-h-72 p-0.5">
            {emptyOptionLabel ? (
              <SelectItem value={EMPTY_OPTION_VALUE} label={emptyOptionLabel} />
            ) : null}
            {items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                label={item.label}
                helper={item.helper}
              />
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function SelectItem({ value, label, helper }) {
  return (
    <Select.Item
      value={value}
      className="mx-1 flex cursor-pointer items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-secondary outline-none transition-colors data-[highlighted]:bg-surface-hover/80 data-[highlighted]:text-ink-primary data-[state=checked]:bg-[rgb(var(--brand-orange)/0.14)] data-[state=checked]:text-ink-primary"
    >
      <div className="min-w-0">
        <Select.ItemText>
          <span className="block font-medium">{label}</span>
        </Select.ItemText>
        {helper ? <span className="mt-0.5 block text-xs text-ink-muted">{helper}</span> : null}
      </div>
      <Select.ItemIndicator className="mt-0.5 shrink-0 text-[rgb(var(--brand-orange))]">
        <Check size={14} />
      </Select.ItemIndicator>
    </Select.Item>
  )
}
