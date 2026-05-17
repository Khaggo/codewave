'use client'

import { useEffect, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Palette } from 'lucide-react'
import { getThemeTriggerLabel, normalizeThemeValue, THEME_OPTIONS, THEME_STORAGE_KEY } from './themeSwitcherView.mjs'

const applyTheme = (theme) => {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const nextTheme = normalizeThemeValue(storedTheme)
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }, [])

  const handleChange = (nextTheme) => {
    const normalizedTheme = normalizeThemeValue(nextTheme)
    setTheme(normalizedTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme)
    applyTheme(normalizedTheme)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="hidden items-center gap-2 rounded-xl border border-surface-border bg-surface-card/80 px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-hover/80 hover:text-ink-secondary lg:flex"
          aria-label="Choose portal theme"
        >
          <Palette size={14} className="text-ink-muted" />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">Theme</span>
          <span className="min-w-[6.5rem] text-left text-xs font-semibold text-ink-secondary">
            {getThemeTriggerLabel(theme)}
          </span>
          <ChevronDown size={14} className="text-ink-dim" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={10}
          align="end"
          className="z-50 min-w-[14rem] overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-1.5 shadow-card-md animate-slide-up"
        >
          <div className="border-b border-surface-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-dim">Theme</p>
            <p className="mt-1 text-xs text-ink-muted">Switch the portal palette.</p>
          </div>

          <div className="py-1">
            {THEME_OPTIONS.map((item) => {
              const active = item.value === theme

              return (
                <DropdownMenu.Item
                  key={item.value}
                  onSelect={() => handleChange(item.value)}
                  className={`mx-1 flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                    active
                      ? 'bg-[rgb(var(--brand-orange)/0.14)] text-ink-primary'
                      : 'text-ink-secondary hover:bg-surface-hover/80 hover:text-ink-primary'
                  }`}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="flex h-4 w-4 items-center justify-center">
                    {active ? <Check size={14} className="text-[rgb(var(--brand-orange))]" /> : null}
                  </span>
                </DropdownMenu.Item>
              )
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
