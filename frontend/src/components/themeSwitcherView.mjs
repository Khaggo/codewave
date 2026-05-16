export const THEME_STORAGE_KEY = 'cc_portal_theme'

export const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'professional-blue', label: 'Professional Blue' },
  { value: 'automotive-red', label: 'Automotive Red' },
  { value: 'minimal-gray', label: 'Minimal Gray' },
  { value: 'premium-black', label: 'Premium Black' },
]

export function normalizeThemeValue(theme) {
  const normalizedTheme = String(theme ?? '').trim()
  return THEME_OPTIONS.some((option) => option.value === normalizedTheme) ? normalizedTheme : 'dark'
}

export function getThemeTriggerLabel(theme) {
  const normalizedTheme = normalizeThemeValue(theme)
  return THEME_OPTIONS.find((option) => option.value === normalizedTheme)?.label ?? 'Dark'
}
