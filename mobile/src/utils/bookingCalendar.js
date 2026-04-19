const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BOOKING_SLOT_LABELS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
const BOOKING_DAY_OPEN_CYCLE = 6;
const BOOKING_DAY_CLOSED_OFFSET = 2;
const BOOKING_SLOT_UNAVAILABLE_CYCLE = 4;

function toLocalDate(dateLike) {
  const date = new Date(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatShortLabel(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function buildMonthDate(dateLike) {
  if (typeof dateLike === 'string') {
    const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.exec(dateLike);
    if (match) {
      const [, year, month] = match;
      return new Date(Number(year), Number(month) - 1, 1);
    }
  }

  const date = toLocalDate(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isValidMonthKey(monthKey) {
  return typeof monthKey === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}

function getMonthKeyOffset(monthKey, monthOffset) {
  if (!isValidMonthKey(monthKey)) {
    return null;
  }

  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(year, month - 1 + monthOffset, 1);
  return formatMonthKey(shifted);
}

function createEmptyMonthView() {
  return {
    monthKey: null,
    label: '',
    monthLabel: '',
    weekdayLabels: [],
    canGoPrev: false,
    canGoNext: false,
    prevMonthKey: null,
    nextMonthKey: null,
    weeks: [],
  };
}

function createDateRecord(current, offset, isOpen) {
  const key = formatDateKey(current);
  const monthKey = formatMonthKey(current);

  return {
    key,
    weekday: WEEKDAY_LABELS[current.getDay()],
    day: String(current.getDate()),
    month: MONTH_LABELS[current.getMonth()],
    monthKey,
    year: current.getFullYear(),
    monthIndex: current.getMonth(),
    fullLabel: formatShortLabel(current),
    isOpen,
    isSelectable: isOpen,
    isWindowDate: true,
    windowIndex: offset,
  };
}

function isBookingDayOpen(windowIndex) {
  return windowIndex % BOOKING_DAY_OPEN_CYCLE !== BOOKING_DAY_CLOSED_OFFSET;
}

function isBookingSlotAvailable(windowIndex, slotIndex) {
  return (windowIndex + slotIndex) % BOOKING_SLOT_UNAVAILABLE_CYCLE !== 0;
}

function getUnavailableSlotReason(slotIndex) {
  return slotIndex % 2 === 0 ? 'Booked' : 'Maxed';
}

export function buildBookingDates(startDate = new Date(), windowDays = 30) {
  const origin = toLocalDate(startDate);
  const bookingDates = [];

  for (let offset = 0; offset < windowDays; offset += 1) {
    const current = new Date(origin);
    current.setDate(origin.getDate() + offset);

    const isOpen = isBookingDayOpen(offset);

    bookingDates.push(createDateRecord(current, offset, isOpen));
  }

  return bookingDates;
}

export function findEarliestOpenBookingDate(bookingDates) {
  if (!Array.isArray(bookingDates) || bookingDates.length === 0) {
    return null;
  }

  const openDates = bookingDates.filter((date) => date?.isOpen && typeof date.key === 'string');
  if (openDates.length === 0) {
    return null;
  }

  return openDates.reduce((earliest, candidate) => (candidate.key < earliest.key ? candidate : earliest)).key;
}

function createCalendarCell(current, bookingDate, viewMonthIndex) {
  const isWindowDate = Boolean(bookingDate);
  const isSelectable = Boolean(bookingDate?.isSelectable);

  return {
    key: formatDateKey(current),
    label: String(current.getDate()),
    fullLabel: formatShortLabel(current),
    isSelectable,
    isCurrentMonth: current.getMonth() === viewMonthIndex,
    isWindowDate,
    monthKey: formatMonthKey(current),
    year: current.getFullYear(),
    monthIndex: current.getMonth(),
    isOpen: Boolean(bookingDate?.isOpen),
  };
}

export function buildBookingMonthView(bookingDatesOrOptions, maybeMonthKey) {
  const bookingDates = Array.isArray(bookingDatesOrOptions)
    ? bookingDatesOrOptions
    : bookingDatesOrOptions?.bookingDates;
  const monthKey = Array.isArray(bookingDatesOrOptions)
    ? maybeMonthKey
    : bookingDatesOrOptions?.monthKey;

  if (!Array.isArray(bookingDates) || !isValidMonthKey(monthKey)) {
    return createEmptyMonthView();
  }

  const bookingDateRecords = bookingDates.filter((date) => date && typeof date.key === 'string');

  const monthStart = buildMonthDate(`${monthKey}-01`);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
  const bookingDatesByKey = new Map(bookingDateRecords.map((date) => [date.key, date]));
  const prevMonthKey = getMonthKeyOffset(monthKey, -1);
  const nextMonthKey = getMonthKeyOffset(monthKey, 1);
  const canGoPrev = prevMonthKey ? bookingDateRecords.some((date) => date.isOpen && date.monthKey === prevMonthKey) : false;
  const canGoNext = nextMonthKey ? bookingDateRecords.some((date) => date.isOpen && date.monthKey === nextMonthKey) : false;
  const weeks = [];
  const weekdayLabels = [...WEEKDAY_LABELS];
  let current = new Date(gridStart);

  while (current <= gridEnd) {
    const week = [];

    for (let index = 0; index < 7; index += 1) {
      const currentKey = formatDateKey(current);
      week.push(createCalendarCell(new Date(current), bookingDatesByKey.get(currentKey), monthStart.getMonth()));
      current.setDate(current.getDate() + 1);
    }

    weeks.push(week);
  }

  return {
    monthKey,
    label: `${LONG_MONTH_LABELS[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
    monthLabel: `${LONG_MONTH_LABELS[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
    weekdayLabels,
    canGoPrev,
    canGoNext,
    prevMonthKey,
    nextMonthKey,
    weeks,
  };
}

export function createBookingSlotMap(bookingDates) {
  return bookingDates.reduce((slotMap, bookingDate) => {
    const isClosedDay = !bookingDate.isOpen;

    slotMap[bookingDate.key] = BOOKING_SLOT_LABELS.map((label, index) => {
      if (isClosedDay) {
        return {
          key: label,
          label,
          available: false,
          reason: 'Closed',
        };
      }

      const available = isBookingSlotAvailable(bookingDate.windowIndex, index);

      return {
        key: label,
        label,
        available,
        reason: available ? undefined : getUnavailableSlotReason(index),
      };
    });

    return slotMap;
  }, {});
}
