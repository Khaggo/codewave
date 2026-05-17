const buildSearchHaystack = (vehicle) =>
  [vehicle?.plate, vehicle?.owner, vehicle?.model, vehicle?.color, vehicle?.ownerEmail]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export const filterVehicles = (vehicles, { query = '', statusFilter = 'all' } = {}) => {
  const normalizedQuery = query.trim().toLowerCase()

  return vehicles
    .filter((vehicle) => statusFilter === 'all' || vehicle.status === statusFilter)
    .filter((vehicle) => !normalizedQuery || buildSearchHaystack(vehicle).includes(normalizedQuery))
}

export const summarizeVehicles = (vehicles) =>
  vehicles.reduce(
    (summary, vehicle) => ({
      total: summary.total + 1,
      activeCount: summary.activeCount + (vehicle.status === 'active' ? 1 : 0),
      inactiveCount: summary.inactiveCount + (vehicle.status === 'inactive' ? 1 : 0),
    }),
    {
      total: 0,
      activeCount: 0,
      inactiveCount: 0,
    },
  )
