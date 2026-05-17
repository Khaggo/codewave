export function groupBookingServices(categories, services) {
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]))
  const groups = new Map()

  services.forEach((service) => {
    const groupKey = service.categoryId || 'uncategorized'
    const groupLabel = service.categoryId ? categoryMap.get(service.categoryId) || 'Unknown category' : 'Uncategorized'
    const nextGroup = groups.get(groupKey) ?? { key: groupKey, label: groupLabel, services: [] }
    nextGroup.services.push(service)
    groups.set(groupKey, nextGroup)
  })

  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label))
}
