import { listCustomerVehicles } from './authClient';
import { buildOwnedVehicleLabel } from './bookingDiscoveryClient';

export const digitalGarageUnsupportedActions = [
  {
    key: 'set_default_vehicle',
    label: 'Set default vehicle',
    route: 'PATCH /api/users/:id/vehicles/:vehicleId/default',
    notes: 'Planned API gap. Do not store default-vehicle truth only on the client.',
  },
  {
    key: 'archive_vehicle',
    label: 'Archive vehicle',
    route: 'PATCH /api/vehicles/:id/archive',
    notes: 'Planned API gap. Vehicle history must remain backend-owned before archive is exposed.',
  },
];

export const digitalGarageRoutes = {
  listOwnedVehicles: {
    method: 'GET',
    path: '/api/users/:id/vehicles',
    status: 'live',
  },
  vehicleDetail: {
    method: 'GET',
    path: '/api/vehicles/:id',
    status: 'live',
  },
  updateVehicle: {
    method: 'PATCH',
    path: '/api/vehicles/:id',
    status: 'live',
  },
  vehicleTimeline: {
    method: 'GET',
    path: '/api/vehicles/:id/timeline',
    status: 'live',
  },
  createInsuranceInquiry: {
    method: 'POST',
    path: '/api/insurance/inquiries',
    status: 'live',
  },
  createBooking: {
    method: 'POST',
    path: '/api/bookings',
    status: 'live',
  },
};

export const createEmptyCustomerDigitalGarageSnapshot = () => ({
  status: 'garage_empty',
  vehicles: [],
  vehicleCount: 0,
  primaryVehicleId: null,
});

const selectPrimaryVehicleId = (vehicles, preferredVehicleId) => {
  if (preferredVehicleId && vehicles.some((vehicle) => vehicle.id === preferredVehicleId)) {
    return preferredVehicleId;
  }

  return vehicles[0]?.id ?? null;
};

export const buildDigitalGarageVehicleSummary = ({
  vehicle,
  index = 0,
  primaryVehicleId,
}) => {
  const title = buildOwnedVehicleLabel(vehicle);
  const subtitle = [
    vehicle?.plateNumber,
    vehicle?.color,
    vehicle?.vin ? `VIN ${vehicle.vin}` : null,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' - ');

  return {
    id: vehicle?.id ?? null,
    title,
    subtitle: subtitle || 'Vehicle metadata is ready for booking, insurance, and timeline use.',
    plateNumber: vehicle?.plateNumber ?? 'No plate',
    modelLabel: [vehicle?.year, vehicle?.make, vehicle?.model]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' '),
    isPrimary: Boolean(primaryVehicleId && vehicle?.id === primaryVehicleId),
    ordinalLabel: `Vehicle ${index + 1}`,
    routeTruth: 'Live owner route',
  };
};

export const buildDigitalGarageSnapshot = ({
  vehicles = [],
  preferredVehicleId,
} = {}) => {
  const normalizedVehicles = Array.isArray(vehicles) ? vehicles.filter(Boolean) : [];
  const primaryVehicleId = selectPrimaryVehicleId(normalizedVehicles, preferredVehicleId);

  return {
    status: normalizedVehicles.length ? 'garage_ready' : 'garage_empty',
    vehicles: normalizedVehicles,
    vehicleCount: normalizedVehicles.length,
    primaryVehicleId,
    vehicleSummaries: normalizedVehicles.map((vehicle, index) =>
      buildDigitalGarageVehicleSummary({
        vehicle,
        index,
        primaryVehicleId,
      }),
    ),
  };
};

export const loadCustomerDigitalGarageSnapshot = async ({
  userId,
  accessToken,
  preferredVehicleId,
}) => {
  const vehicles = await listCustomerVehicles({
    userId,
    accessToken,
  });

  return buildDigitalGarageSnapshot({
    vehicles,
    preferredVehicleId,
  });
};

export const getCustomerDigitalGarageLoadState = ({
  hasSession,
  status,
  errorStatus,
}) => {
  if (!hasSession) {
    return 'garage_unauthorized';
  }

  if (errorStatus === 401 || errorStatus === 403) {
    return 'garage_forbidden';
  }

  if (errorStatus) {
    return 'garage_failed';
  }

  return status ?? 'garage_ready';
};

export const customerDigitalGarageContractSources = [
  'docs/architecture/domains/main-service/vehicles.md',
  'docs/architecture/domains/main-service/vehicle-lifecycle.md',
  'docs/architecture/tasks/05-client-integration/T539-customer-digital-garage-mobile-surface.md',
  'mobile/src/lib/authClient.js',
  'mobile/src/lib/vehicleLifecycleClient.js',
  'mobile/src/screens/Dashboard.js',
];
