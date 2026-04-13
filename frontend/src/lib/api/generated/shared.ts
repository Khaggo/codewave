export type ContractRouteStatus = 'live' | 'planned';
export type ContractRouteSource = 'swagger' | 'task';

export interface RouteContract {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  status: ContractRouteStatus;
  source: ContractRouteSource;
  notes?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  source: ContractRouteSource;
  details?: Record<string, unknown>;
}
