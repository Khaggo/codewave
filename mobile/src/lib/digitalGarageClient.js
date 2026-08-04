import {
  ApiError,
  buildAuthorizedHeaders,
  normalizeVehicleRecord,
  request,
} from './authClient';
import {
  buildDigitalGarageSnapshot,
  buildDigitalGarageVehicleSummary,
  createEmptyCustomerDigitalGarageSnapshot,
} from './digitalGarageModel.mjs';

export {
  buildDigitalGarageSnapshot,
  buildDigitalGarageVehicleSummary,
  createEmptyCustomerDigitalGarageSnapshot,
} from './digitalGarageModel.mjs';

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
    path: '/api/users/:id/vehicles/garage',
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

const listCustomerGarageVehicles = async ({
  userId,
  accessToken,
  cursor,
  limit = 3,
  search,
}) => {
  if (!userId) {
    throw new ApiError(
      'You need an active customer session before Garage vehicles can load.',
      401,
      {
        path: '/api/users/:id/vehicles/garage',
      },
    );
  }

  const query = [
    `limit=${encodeURIComponent(String(limit))}`,
    cursor ? `cursor=${encodeURIComponent(cursor)}` : '',
    search ? `search=${encodeURIComponent(search)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  const response = await request(
    `/api/users/${encodeURIComponent(userId)}/vehicles/garage?${query}`,
    {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    },
  );
  const page = response?.page ?? {};

  return {
    items: Array.isArray(response?.items)
      ? response.items.map(normalizeVehicleRecord).filter(Boolean)
      : [],
    page: {
      limit: Number(page.limit) > 0 ? Number(page.limit) : limit,
      total: Math.max(0, Number(page.total) || 0),
      hasNext: Boolean(page.hasNext),
      nextCursor:
        typeof page.nextCursor === 'string' && page.nextCursor
          ? page.nextCursor
          : null,
    },
  };
};

export const loadCustomerDigitalGarageSnapshot = async ({
  userId,
  accessToken,
  preferredVehicleId,
  cursor,
  limit = 3,
  pageIndex = 0,
  search,
}) => {
  const response = await listCustomerGarageVehicles({
    userId,
    accessToken,
    cursor,
    limit,
    search,
  });

  return buildDigitalGarageSnapshot({
    vehicles: response.items,
    preferredVehicleId,
    ordinalOffset: pageIndex * response.page.limit,
    page: {
      ...response.page,
      currentPage: pageIndex,
    },
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
