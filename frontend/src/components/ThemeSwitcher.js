'use client'

import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'

const THEME_STORAGE_KEY = 'cc_portal_theme'

const themes = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'professional-blue', label: 'Professional Blue' },
  { value: 'automotive-red', label: 'Automotive Red' },
  { value: 'minimal-gray', label: 'Minimal Gray' },
  { value: 'premium-black', label: 'Premium Black' },
]

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
    const nextTheme = themes.some((item) => item.value === storedTheme) ? storedTheme : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }, [])

  const handleChange = (event) => {
    const nextTheme = event.target.value
    setTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
  }

  return (
    <label className="hidden items-center gap-2 rounded-xl border border-surface-border bg-surface-card/80 px-3 py-2 text-xs text-ink-muted lg:flex">
      <Palette size={14} className="text-ink-muted" />
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">Theme</span>
      <select
        value={theme}
        onChange={handleChange}
        className="max-w-[9rem] bg-transparent text-xs font-semibold text-ink-secondary outline-none"
        aria-label="Choose portal theme"
      >
        {themes.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}
