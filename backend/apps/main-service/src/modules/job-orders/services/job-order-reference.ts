const normalizeBusinessToken = (value: string | null | undefined, fallback = 'WORK') => {
  const normalizedValue = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return normalizedValue || fallback;
};

const formatCompactDateToken = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const formatCompactTimeToken = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
};

export const buildBackJobReadableReference = (
  backJob: { createdAt?: Date | string | null } | null | undefined,
) => {
  const dateToken = formatCompactDateToken(backJob?.createdAt);
  const timeToken = formatCompactTimeToken(backJob?.createdAt);
  if (!dateToken) return null;
  return `BJ-${dateToken}${timeToken ? `-${timeToken}` : ''}`;
};

export const buildJobOrderReadableReference = ({
  jobOrderReference,
  sourceBookingReference,
  sourceBackJobReference,
  workDate,
  createdAt,
  updatedAt,
  serviceAdviserCode,
  jobType,
}: {
  jobOrderReference?: string | null;
  sourceBookingReference?: string | null;
  sourceBackJobReference?: string | null;
  workDate?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  serviceAdviserCode?: string | null;
  jobType?: 'normal' | 'back_job' | null;
}) => {
  if (jobOrderReference) return jobOrderReference;
  if (sourceBackJobReference) return `JO-RW \u00b7 ${sourceBackJobReference}`;
  if (sourceBookingReference) return `JO \u00b7 ${sourceBookingReference}`;

  const dateToken = formatCompactDateToken(workDate ?? createdAt ?? updatedAt);
  const timeToken = formatCompactTimeToken(createdAt ?? updatedAt);
  const adviserToken = normalizeBusinessToken(serviceAdviserCode, jobType === 'back_job' ? 'RW' : 'WORK');
  const prefix = jobType === 'back_job' ? 'JO-RW' : 'JO';
  return dateToken
    ? `${prefix}-${dateToken}-${timeToken || adviserToken}`
    : `${prefix}-${adviserToken}`;
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
