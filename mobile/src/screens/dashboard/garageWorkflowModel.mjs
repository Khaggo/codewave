import {
  buildDigitalGarageSnapshot,
  createEmptyCustomerDigitalGarageSnapshot,
} from '../../lib/digitalGarageModel.mjs'
import { createEmptyCustomerVehicleLifecycleSnapshot } from '../../lib/customerVehicleLifecycleState.mjs'

export const createInitialGarageState = () => ({
  ...createEmptyCustomerDigitalGarageSnapshot(),
  status: 'idle',
  errorMessage: '',
})

export const createInitialLifecycleState = () => ({
  entityId: null,
  status: 'idle',
  errorMessage: '',
  ...createEmptyCustomerVehicleLifecycleSnapshot(),
})

export const buildFallbackGarageState = ({
  vehicles,
  preferredVehicleId,
  pageIndex = 0,
  pageSize = 3,
}) => {
  const normalizedVehicles = Array.isArray(vehicles) ? vehicles : []
  const normalizedPageIndex = Math.max(0, Number(pageIndex) || 0)
  const normalizedPageSize = Math.max(1, Number(pageSize) || 3)
  const pageStart = normalizedPageIndex * normalizedPageSize
  const pageVehicles = normalizedVehicles.slice(
    pageStart,
    pageStart + normalizedPageSize,
  )

  return buildDigitalGarageSnapshot({
    vehicles: pageVehicles,
    preferredVehicleId,
    ordinalOffset: pageStart,
    page: {
      currentPage: normalizedPageIndex,
      limit: normalizedPageSize,
      total: normalizedVehicles.length,
      hasNext: pageStart + pageVehicles.length < normalizedVehicles.length,
      nextCursor: null,
    },
  })
}

export const resolveGarageVehicleId = ({
  garage,
  currentVehicleId,
  preferredVehicleId,
}) => {
  const vehicles = Array.isArray(garage?.vehicles) ? garage.vehicles : []

  if (vehicles.some((vehicle) => vehicle.id === currentVehicleId)) {
    return currentVehicleId
  }
  if (vehicles.some((vehicle) => vehicle.id === preferredVehicleId)) {
    return preferredVehicleId
  }

  return garage?.primaryVehicleId ?? vehicles[0]?.id ?? null
}

export const resolveGaragePageNavigation = ({
  direction,
  status,
  page,
  cursorHistory = [],
}) => {
  if (status === 'garage_loading') {
    return null
  }

  const currentPage = Math.max(0, Number(page?.currentPage) || 0)
  if (direction === 'previous') {
    if (currentPage === 0) {
      return null
    }
    const previousPage = currentPage - 1
    return {
      pageIndex: previousPage,
      cursor: cursorHistory[previousPage] ?? null,
    }
  }

  if (
    direction === 'next' &&
    page?.hasNext &&
    typeof page?.nextCursor === 'string' &&
    page.nextCursor
  ) {
    return {
      pageIndex: currentPage + 1,
      cursor: page.nextCursor,
    }
  }

  return null
}

export const buildGarageFailureState = ({
  fallback,
  statusCode,
  message,
}) => ({
  ...fallback,
  status:
    statusCode === 401 || statusCode === 403
      ? 'garage_forbidden'
      : 'garage_failed',
  errorMessage: message,
})

export const buildLifecycleUnavailableState = ({
  hasSession,
  vehicleId,
}) => ({
  entityId: vehicleId ?? null,
  status: hasSession
    ? vehicleId
      ? 'idle'
      : 'timeline_empty'
    : 'timeline_forbidden',
  errorMessage: hasSession
    ? vehicleId
      ? ''
      : 'Add a vehicle first to unlock lifecycle history.'
    : 'Sign in again to view your vehicle lifecycle history.',
  ...createEmptyCustomerVehicleLifecycleSnapshot(),
})

export const buildLifecycleFailureState = ({ error, vehicleId }) => {
  let status = 'timeline_load_failed'
  let errorMessage =
    'We could not load your lifecycle history right now. Please try again in a moment.'

  if (error?.status === 401 || error?.status === 403) {
    status = 'timeline_forbidden'
    errorMessage = 'Your customer session cannot access lifecycle history right now.'
  } else if (error?.status === 404) {
    status = 'timeline_not_found'
    errorMessage = 'We could not find lifecycle history for the selected vehicle.'
  } else if (error?.message) {
    errorMessage = error.message
  }

  return {
    entityId: vehicleId ?? null,
    status,
    errorMessage,
    ...createEmptyCustomerVehicleLifecycleSnapshot(),
  }
}
