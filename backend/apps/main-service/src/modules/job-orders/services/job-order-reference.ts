export const REFERENCE_UNAVAILABLE = 'Reference unavailable';

export const buildBackJobReadableReference = (
  backJob:
    | {
        backJobReference?: string | null;
        createdAt?: Date | string | null;
      }
    | null
    | undefined,
) => {
  return backJob?.backJobReference ?? null;
};

export const buildJobOrderReadableReference = ({
  jobOrderReference,
}: {
  jobOrderReference?: string | null;
  [key: string]: unknown;
}) => {
  return jobOrderReference || REFERENCE_UNAVAILABLE;
};

export const buildCustomerDisplayName = (
  profile:
    | {
        firstName?: string | null;
        lastName?: string | null;
      }
    | null
    | undefined,
) => {
  if (!profile) return 'Unknown customer';
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  return fullName || 'Unknown customer';
};

export const buildVehicleDisplayLabel = (
  vehicle:
    | {
        make?: string | null;
        model?: string | null;
        plateNumber?: string | null;
      }
    | null
    | undefined,
) => {
  if (!vehicle) return 'Unknown vehicle';

  const descriptor = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
  if (descriptor && vehicle.plateNumber) return `${descriptor} (${vehicle.plateNumber})`;
  return descriptor || vehicle.plateNumber || 'Unknown vehicle';
};
