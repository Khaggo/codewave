export const INTAKE_COMBOBOX_VISIBLE_LIMIT = 20

const normalizeSearchText = (value) => String(value ?? '').trim().toLocaleLowerCase()

export const filterIntakeComboboxOptions = (
  options = [],
  query = '',
  limit = INTAKE_COMBOBOX_VISIBLE_LIMIT,
) => {
  const normalizedQuery = normalizeSearchText(query)
  const matches = options.filter((option) => {
    if (!normalizedQuery) return true
    return normalizeSearchText([
      option.label,
      option.helper,
      ...(option.searchTerms ?? []),
    ].join(' ')).includes(normalizedQuery)
  })

  return {
    items: matches.slice(0, limit),
    total: matches.length,
    limited: matches.length > limit,
  }
}
