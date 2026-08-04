const normalizeText = (value) => String(value ?? '').trim()

function normalizeVehicle(vehicle = {}, index = 0) {
  const id = normalizeText(vehicle.id)
  if (!id) {
    return null
  }

  const generatedTitle =
    [vehicle.year, vehicle.make, vehicle.model]
      .map(normalizeText)
      .filter(Boolean)
      .join(' ') || 'Saved vehicle'
  const generatedSubtitle =
    [vehicle.plateNumber, vehicle.color]
      .map(normalizeText)
      .filter(Boolean)
      .join(' - ') || 'Vehicle details saved'

  return {
    ...vehicle,
    id,
    title: normalizeText(vehicle.title) || generatedTitle,
    subtitle: normalizeText(vehicle.subtitle) || generatedSubtitle,
    ordinalLabel: normalizeText(vehicle.ordinalLabel) || `Vehicle ${index + 1}`,
  }
}

export function buildInsuranceEntryVehicles(
  vehicleSummaries = [],
  fallbackVehicles = [],
) {
  const source =
    Array.isArray(vehicleSummaries) && vehicleSummaries.length
      ? vehicleSummaries
      : Array.isArray(fallbackVehicles)
        ? fallbackVehicles
        : []

  return source
    .map(normalizeVehicle)
    .filter(Boolean)
}

export function getInsuranceEntryView({
  status = 'idle',
  errorMessage = '',
  vehicles = [],
  selectedVehicleId = '',
} = {}) {
  const normalizedVehicles = Array.isArray(vehicles) ? vehicles : []
  const selectedVehicle =
    normalizedVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null

  if (status === 'garage_loading' && normalizedVehicles.length === 0) {
    return { state: 'loading', selectedVehicle, canOpen: false }
  }

  if (
    ['garage_failed', 'garage_forbidden'].includes(status) &&
    normalizedVehicles.length === 0
  ) {
    return {
      state: 'error',
      selectedVehicle,
      canOpen: false,
      errorMessage:
        normalizeText(errorMessage) || 'We could not load your vehicles right now.',
    }
  }

  if (normalizedVehicles.length === 0) {
    return { state: 'empty', selectedVehicle, canOpen: false }
  }

  return {
    state: 'ready',
    selectedVehicle,
    canOpen: Boolean(selectedVehicle),
  }
}
