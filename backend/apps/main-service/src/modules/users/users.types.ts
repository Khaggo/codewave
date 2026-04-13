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
