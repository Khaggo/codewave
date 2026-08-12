const normalizePart = (value) => String(value ?? '').trim()

const getVehicleIdentityParts = (vehicle) =>
  [
    vehicle?.year ?? vehicle?.vehicleYear,
    vehicle?.make ?? vehicle?.vehicleMake,
    vehicle?.model ?? vehicle?.vehicleModel,
  ]
    .map(normalizePart)
    .filter(Boolean)

export const getVehicleIdentityLabel = (vehicle) =>
  getVehicleIdentityParts(vehicle).join(' ') || normalizePart(vehicle?.displayName) || 'Vehicle'

export const getVehiclePlateLabel = (vehicle) =>
  normalizePart(vehicle?.plateNumber ?? vehicle?.licensePlate).toUpperCase() || 'No plate recorded'

export const getVehicleFullLabel = (vehicle) => {
  const identity = getVehicleIdentityLabel(vehicle)
  const plate = getVehiclePlateLabel(vehicle)

  if (identity === 'Vehicle' && plate !== 'No plate recorded') return plate
  return plate === 'No plate recorded' ? identity : `${identity} • ${plate}`
}

export const truncateVehicleLabel = (value, maxLength = 42) => {
  const normalizedValue = normalizePart(value)
  const limit = Math.max(8, Number(maxLength) || 42)

  if (normalizedValue.length <= limit) return normalizedValue

  const candidate = normalizedValue.slice(0, limit - 1).trimEnd()
  const wordBoundary = candidate.lastIndexOf(' ')
  const visibleValue =
    wordBoundary >= Math.floor(limit * 0.6)
      ? candidate.slice(0, wordBoundary)
      : candidate
  return `${visibleValue}…`
}

export const getVehicleDisplayLabel = (vehicle, maxLength = 42) =>
  truncateVehicleLabel(getVehicleIdentityLabel(vehicle), maxLength)
