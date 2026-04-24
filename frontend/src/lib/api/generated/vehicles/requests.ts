import type { RouteContract } from '../shared';

export interface CreateVehicleRequest {
  userId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  vin?: string;
  notes?: string;
}

export interface UpdateVehicleRequest {
  plateNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  notes?: string;
}

export const vehiclesRoutes: Record<string, RouteContract> = {
  createVehicle: {
    method: 'POST',
    path: '/api/vehicles',
    status: 'live',
    source: 'swagger',
  },
  getVehicleById: {
    method: 'GET',
    path: '/api/vehicles/:id',
    status: 'live',
    source: 'swagger',
  },
  updateVehicle: {
    method: 'PATCH',
    path: '/api/vehicles/:id',
    status: 'live',
    source: 'swagger',
  },
  listVehiclesByUser: {
    method: 'GET',
    path: '/api/users/:id/vehicles',
    status: 'live',
    source: 'swagger',
  },
};
