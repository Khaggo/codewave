import { buildOwnedVehicleLabel } from './bookingDisplayModel.mjs'

export const createEmptyCustomerDigitalGarageSnapshot = () => ({
  status: 'garage_empty',
  vehicles: [],
  vehicleCount: 0,
  primaryVehicleId: null,
  vehicleSummaries: [],
  page: {
    currentPage: 0,
    limit: 3,
    total: 0,
    hasNext: false,
    nextCursor: null,
  },
})

const selectPrimaryVehicleId = (vehicles, preferredVehicleId) => {
  if (
    preferredVehicleId &&
    vehicles.some((vehicle) => vehicle.id === preferredVehicleId)
  ) {
    return preferredVehicleId
  }

  return vehicles[0]?.id ?? null
}

export const buildDigitalGarageVehicleSummary = ({
  vehicle,
  index = 0,
  primaryVehicleId,
}) => {
  const title = buildOwnedVehicleLabel(vehicle)
  const subtitle = [
    vehicle?.plateNumber,
    vehicle?.color,
    vehicle?.vin ? `VIN ${vehicle.vin}` : null,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' - ')

  return {
    id: vehicle?.id ?? null,
    title,
    subtitle:
      subtitle ||
      'Vehicle metadata is ready for booking, insurance, and timeline use.',
    plateNumber: vehicle?.plateNumber ?? 'No plate',
    modelLabel: [vehicle?.year, vehicle?.make, vehicle?.model]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' '),
    isPrimary: Boolean(primaryVehicleId && vehicle?.id === primaryVehicleId),
    ordinalLabel: `Vehicle ${index + 1}`,
    routeTruth: 'Live owner route',
  }
}

export const buildDigitalGarageSnapshot = ({
  vehicles = [],
  preferredVehicleId,
  ordinalOffset = 0,
  page,
} = {}) => {
  const normalizedVehicles = Array.isArray(vehicles)
    ? vehicles.filter(Boolean)
    : []
  const primaryVehicleId = selectPrimaryVehicleId(
    normalizedVehicles,
    preferredVehicleId,
  )
  const normalizedLimit = Math.max(1, Number(page?.limit) || normalizedVehicles.length || 3)
  const normalizedTotal = Math.max(
    normalizedVehicles.length,
    Number(page?.total) || normalizedVehicles.length,
  )
  const currentPage = Math.max(0, Number(page?.currentPage) || 0)

  return {
    status: normalizedVehicles.length ? 'garage_ready' : 'garage_empty',
    vehicles: normalizedVehicles,
    vehicleCount: normalizedTotal,
    primaryVehicleId,
    vehicleSummaries: normalizedVehicles.map((vehicle, index) =>
      buildDigitalGarageVehicleSummary({
        vehicle,
        index: Math.max(0, Number(ordinalOffset) || 0) + index,
        primaryVehicleId,
      }),
    ),
    page: {
      currentPage,
      limit: normalizedLimit,
      total: normalizedTotal,
      hasNext: Boolean(page?.hasNext),
      nextCursor:
        typeof page?.nextCursor === 'string' && page.nextCursor
          ? page.nextCursor
          : null,
    },
  }
}
