const normalizeOption = (option) => {
  if (typeof option === 'string') {
    return { value: option, label: option, helper: '', category: 'Visit reasons' }
  }

  return {
    value: String(option?.value ?? option?.id ?? '').trim(),
    label: String(option?.label ?? option?.name ?? option?.value ?? '').trim(),
    helper: String(option?.helper ?? option?.description ?? '').trim(),
    category: String(option?.category ?? option?.group ?? 'Services').trim() || 'Services',
  }
}

export const normalizeIntakeOptions = (options = []) => {
  const seenValues = new Set()

  return options
    .map(normalizeOption)
    .filter((option) => {
      if (!option.value || !option.label || seenValues.has(option.value)) return false
      seenValues.add(option.value)
      return true
    })
}

export const normalizeSelectionValues = (values = []) =>
  [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))]

export const toggleIntakeSelection = (selectedValues = [], value) => {
  const nextSelection = new Set(normalizeSelectionValues(selectedValues))
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) return [...nextSelection]
  if (nextSelection.has(normalizedValue)) nextSelection.delete(normalizedValue)
  else nextSelection.add(normalizedValue)

  return [...nextSelection]
}

export const getIntakeChoiceOpenState = ({ open = false, wasOpen = false, selectedValues = [] } = {}) => {
  const nextWasOpen = Boolean(open)
  if (!nextWasOpen || wasOpen) {
    return { wasOpen: nextWasOpen, initialize: false }
  }

  return {
    wasOpen: true,
    initialize: true,
    query: '',
    category: 'all',
    selectedValues: normalizeSelectionValues(selectedValues),
  }
}

export const getIntakeOptionCategories = (options = []) =>
  [...new Set(normalizeIntakeOptions(options).map((option) => option.category))].sort((left, right) =>
    left.localeCompare(right),
  )

export const filterIntakeOptions = (options = [], { query = '', category = 'all' } = {}) => {
  const normalizedQuery = String(query ?? '').trim().toLowerCase()
  const normalizedCategory = String(category ?? 'all').trim()

  return normalizeIntakeOptions(options).filter((option) => {
    const matchesCategory = normalizedCategory === 'all' || option.category === normalizedCategory
    const searchableText = `${option.label} ${option.helper} ${option.category}`.toLowerCase()
    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery))
  })
}

export const getIntakeSelectionSummary = (selectedValues = [], total = 0) => ({
  selected: normalizeSelectionValues(selectedValues).length,
  total: Number(total) || 0,
})
