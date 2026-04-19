export interface UserProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  birthday?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddressResponse {
  id: string;
  userId: string;
  label?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  staffCode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfileResponse;
  addresses?: AddressResponse[];
}

