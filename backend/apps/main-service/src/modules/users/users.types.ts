import { userRoleEnum } from './schemas/users.schema';

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export type CreateManagedUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  staffCode?: string;
};

export type CreateWalkInCustomerInput = {
  email?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  contactConsentAcknowledgedAt: Date;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  requestKey?: string;
};

export type ListCustomersWithVehiclesQuery = {
  search?: string;
  cursor?: string;
  limit?: number;
  customerId?: string;
};
