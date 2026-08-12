export type StaffAccountType =
  | 'staff'
  | 'mechanic'
  | 'technician'
  | 'head_technician'
  | 'admin';

export const staffAccountTypeEmailSegments: Record<StaffAccountType, string> = {
  staff: 'staff',
  mechanic: 'mechanic',
  technician: 'technician',
  head_technician: 'headtech',
  admin: 'admin',
};

export const staffAccountTypeCodePrefixes: Record<StaffAccountType, string> = {
  staff: 'STA',
  mechanic: 'MEC',
  technician: 'TEC',
  head_technician: 'HTC',
  admin: 'ADM',
};

export const roleFallbackAccountTypes: Record<string, StaffAccountType> = {
  service_adviser: 'staff',
  technician: 'technician',
  head_technician: 'head_technician',
  super_admin: 'admin',
};

export const MAX_ACTIVE_HEAD_TECHNICIANS = 2;
