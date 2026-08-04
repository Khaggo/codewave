import { formatDate } from '../../utils/validation.js';

export const BOOKING_AVAILABILITY_PAGE_DAYS = 14;
export const BOOKING_SERVICE_PAGE_SIZE = 6;

const toBookingDateString = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());

  if (!match) {
    return null;
  }

  const parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatBookingDateLabel = (value) => {
  const parsedDate = parseDateOnly(value);

  return parsedDate ? formatDate(parsedDate) : String(value ?? '').trim() || '--';
};

export const addDaysToDate = (value, offsetDays) => {
  const parsedDate = value instanceof Date ? new Date(value) : parseDateOnly(value);

  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const nextDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  nextDate.setDate(nextDate.getDate() + offsetDays);
  return nextDate;
};

export const clampDateKeyToRange = (dateKey, minimumDateKey, maximumDateKey) => {
  const normalizedDateKey = toBookingDateString(parseDateOnly(dateKey));

  if (!normalizedDateKey) {
    return minimumDateKey || maximumDateKey || '';
  }

  if (minimumDateKey && normalizedDateKey < minimumDateKey) {
    return minimumDateKey;
  }

  if (maximumDateKey && normalizedDateKey > maximumDateKey) {
    return maximumDateKey;
  }

  return normalizedDateKey;
};

export const buildBookingAvailabilityWindow = ({
  anchorDateKey,
  minimumDateKey = '',
  maximumDateKey = '',
  pageDays = BOOKING_AVAILABILITY_PAGE_DAYS,
}) => {
  const fallbackAnchorDate =
    minimumDateKey || toBookingDateString(addDaysToDate(new Date(), 1) ?? new Date());
  const clampedAnchorDateKey = clampDateKeyToRange(
    anchorDateKey || fallbackAnchorDate,
    minimumDateKey,
    maximumDateKey,
  );
  const maximumPageEndCandidate = toBookingDateString(
    addDaysToDate(clampedAnchorDateKey, Math.max(pageDays - 1, 0)) ??
      parseDateOnly(clampedAnchorDateKey),
  );
  let endDateKey = maximumPageEndCandidate || clampedAnchorDateKey;
  let startDateKey = clampedAnchorDateKey;

  if (maximumDateKey && endDateKey > maximumDateKey) {
    endDateKey = maximumDateKey;
    const shiftedStartDate = toBookingDateString(
      addDaysToDate(endDateKey, -Math.max(pageDays - 1, 0)) ?? parseDateOnly(endDateKey),
    );
    startDateKey = minimumDateKey
      ? clampDateKeyToRange(shiftedStartDate, minimumDateKey, maximumDateKey)
      : shiftedStartDate;
  }

  return {
    startDate: startDateKey,
    endDate: endDateKey,
  };
};

export const getInitialBookingAvailabilityWindow = () =>
  buildBookingAvailabilityWindow({
    anchorDateKey: toBookingDateString(addDaysToDate(new Date(), 1) ?? new Date()),
  });

export const getBookingAvailabilityDayByDate = (availability, scheduledDate) =>
  availability?.days?.find((day) => day.scheduledDate === scheduledDate) ?? null;

export const getBookingAvailabilitySlotForTime = (availabilityDay, timeSlotId) =>
  availabilityDay?.slots?.find((slot) => slot.timeSlotId === timeSlotId) ?? null;

export const getFirstBookableBookingDateKey = (availability, timeSlotId) => {
  const days = Array.isArray(availability?.days) ? availability.days : [];
  const matchingDay = days.find((day) => {
    const matchingSlot = getBookingAvailabilitySlotForTime(day, timeSlotId);

    if (matchingSlot) {
      return matchingSlot.isAvailable;
    }

    return day.isBookable;
  });

  return matchingDay?.scheduledDate ?? availability?.minBookableDate ?? '';
};

export const formatBookingAvailabilityStatusLabel = (status) => {
  switch (status) {
    case 'bookable':
      return 'Open';
    case 'limited':
      return 'Limited';
    case 'blocked':
      return 'Blocked';
    case 'full':
      return 'Full';
    case 'closed':
    case 'no_active_slots':
      return 'Closed';
    case 'outside_window':
      return 'Window';
    default:
      return 'Status';
  }
};

export const getBookingAvailabilityTone = (status) => {
  switch (status) {
    case 'bookable':
      return 'success';
    case 'limited':
    case 'blocked':
      return 'warning';
    case 'full':
      return 'danger';
    case 'closed':
    default:
      return 'muted';
  }
};

export const getBookingAvailabilityWindowLabel = (availability) => {
  if (!availability?.startDate || !availability?.endDate) {
    return 'Live window unavailable';
  }

  return `${formatBookingDateLabel(availability.startDate)} to ${formatBookingDateLabel(
    availability.endDate,
  )}`;
};

export const getBlockedBookingSlotMessage = (slot, selectedTimeSlot) => {
  if (!slot) {
    return 'This date is not available for the selected slot.';
  }

  if (slot.remainingCapacity <= 0) {
    return `${selectedTimeSlot?.label || 'Selected slot'} is full`;
  }

  return `${selectedTimeSlot?.label || 'Selected slot'} is unavailable for this vehicle or booking right now`;
};

export const getBlockedBookingSlotCapacityLabel = (slot) => {
  if (!slot) {
    return 'Unavailable';
  }

  if (slot.remainingCapacity <= 0) {
    return `${slot.bookingCount}/${slot.capacity} booked`;
  }

  return 'Blocked by vehicle or booking conflict';
};

export const buildBookingDateCardItem = (availabilityDay, selectedTimeSlot) => {
  const parsedDate = parseDateOnly(availabilityDay?.scheduledDate);
  const matchingSlot = getBookingAvailabilitySlotForTime(availabilityDay, selectedTimeSlot?.id);
  const effectiveStatus =
    matchingSlot && !matchingSlot.isAvailable
      ? matchingSlot.remainingCapacity > 0
        ? 'blocked'
        : 'full'
      : availabilityDay?.status || 'full';
  const isSelectable = matchingSlot
    ? matchingSlot.isAvailable
    : Boolean(availabilityDay?.isBookable);
  const detailLabel = matchingSlot
    ? matchingSlot.isAvailable
      ? `${matchingSlot.remainingCapacity} left in ${
          selectedTimeSlot?.label || 'selected slot'
        }`
      : getBlockedBookingSlotMessage(matchingSlot, selectedTimeSlot)
    : availabilityDay?.status === 'closed'
      ? availabilityDay?.closureLabel ||
        availabilityDay?.closureReason ||
        'Shop closed for this date'
      : availabilityDay?.status === 'no_active_slots'
        ? 'No live slots'
        : `${availabilityDay?.availableSlotCount ?? 0} of ${
            availabilityDay?.activeSlotCount ?? 0
          } slots open`;
  const capacityLabel = matchingSlot
    ? matchingSlot.isAvailable
      ? `${matchingSlot.bookingCount}/${matchingSlot.capacity} booked`
      : getBlockedBookingSlotCapacityLabel(matchingSlot)
    : `${availabilityDay?.remainingCapacity ?? 0}/${
        availabilityDay?.totalCapacity ?? 0
      } capacity left`;

  return {
    key: availabilityDay?.scheduledDate || 'booking-date',
    scheduledDate: availabilityDay?.scheduledDate || '',
    accessibilityLabel: availabilityDay?.scheduledDate
      ? `Booking date ${formatBookingDateLabel(availabilityDay.scheduledDate)}`
      : 'Booking date',
    weekday: parsedDate ? parsedDate.toLocaleDateString('en-US', { weekday: 'short' }) : '--',
    day: parsedDate ? `${parsedDate.getDate()}` : '--',
    month: parsedDate ? parsedDate.toLocaleDateString('en-US', { month: 'short' }) : '--',
    statusLabel: formatBookingAvailabilityStatusLabel(effectiveStatus),
    statusTone: getBookingAvailabilityTone(effectiveStatus),
    capacityLabel,
    detailLabel,
    isSelectable,
  };
};
