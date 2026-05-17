const buildSearchHaystack = (customer) =>
  [
    customer?.displayName,
    customer?.email,
    customer?.profile?.phone,
    ...(customer?.vehicles ?? []).flatMap((vehicle) => [
      vehicle?.plateNumber,
      vehicle?.make,
      vehicle?.model,
      vehicle?.year,
    ]),
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export const buildAddressLabel = (address) => {
  if (!address) return 'No address saved'

  return [address.addressLine1, address.addressLine2, address.city, address.province, address.postalCode]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ')
}

export const buildVehicleLabel = (vehicle) =>
  [vehicle?.year, vehicle?.make, vehicle?.model]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ') || vehicle?.plateNumber || 'Vehicle details pending'

export const filterCustomers = (customers, { query = '', statusFilter = 'all', vehicleFilter = 'all' } = {}) => {
  const normalizedQuery = query.trim().toLowerCase()

  return customers.filter((customer) => {
    const matchesQuery = !normalizedQuery || buildSearchHaystack(customer).includes(normalizedQuery)

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && customer.isActive) ||
      (statusFilter === 'inactive' && !customer.isActive)

    const vehicleCount = customer.vehicles?.length ?? 0
    const matchesVehicleFilter =
      vehicleFilter === 'all' ||
      (vehicleFilter === 'with_vehicles' && vehicleCount > 0) ||
      (vehicleFilter === 'without_vehicles' && vehicleCount === 0)

    return matchesQuery && matchesStatus && matchesVehicleFilter
  })
}

export const summarizeCustomers = (customers) =>
  customers.reduce(
    (summary, customer) => {
      const vehicleCount = customer.vehicles?.length ?? 0

      return {
        total: summary.total + 1,
        activeCount: summary.activeCount + (customer.isActive ? 1 : 0),
        inactiveCount: summary.inactiveCount + (customer.isActive ? 0 : 1),
        withVehiclesCount: summary.withVehiclesCount + (vehicleCount > 0 ? 1 : 0),
      }
    },
    {
      total: 0,
      activeCount: 0,
      inactiveCount: 0,
      withVehiclesCount: 0,
    },
  )
