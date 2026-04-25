import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { ApiError } from '../lib/authClient';
import {
  buildOwnedVehicleLabel,
  createEmptyBookingAvailability,
  createCustomerBooking,
  formatBookingServiceDuration,
  formatBookingTimeSlotWindow,
  getBookingAvailability,
  getBookingById,
  listCustomerBookings,
  loadBookingDiscoverySnapshot,
  toBookingDateString,
} from '../lib/bookingDiscoveryClient';
import {
  createEmptyCustomerVehicleLifecycleSnapshot,
  loadCustomerVehicleLifecycleSnapshot,
} from '../lib/vehicleLifecycleClient';
import {
  buildDigitalGarageSnapshot,
  createEmptyCustomerDigitalGarageSnapshot,
  digitalGarageRoutes,
  digitalGarageUnsupportedActions,
  loadCustomerDigitalGarageSnapshot,
} from '../lib/digitalGarageClient';
import {
  createEmptyCustomerLoyaltySnapshot,
  customerLoyaltyTiers,
  loadCustomerLoyaltySnapshot,
  redeemCustomerReward,
} from '../lib/loyaltyClient';
import {
  createEmptyCustomerCatalogSnapshot,
  getEcommerceApiBaseUrl,
  loadCustomerCatalogProductDetail,
  loadCustomerCatalogSnapshot,
} from '../lib/catalogClient';
import {
  addCustomerCartItem,
  checkoutCustomerInvoice,
  createEmptyCustomerCartSnapshot,
  createEmptyCustomerOrderHistorySnapshot,
  formatEcommerceCurrency,
  getCustomerOrderDetail,
  getCustomerOrderInvoice,
  getCustomerCart,
  listCustomerOrders,
  loadCustomerCheckoutPreview,
  removeCustomerCartItem,
  updateCustomerCartItem,
} from '../lib/ecommerceCheckoutClient';
import {
  createEmptyCustomerNotificationSnapshot,
  loadCustomerNotificationSnapshot,
  updateCustomerNotificationPreferences,
} from '../lib/notificationClient';
import ShopCatalogSection from '../components/shop/ShopCatalogSection';
import DatePickerField from '../components/DatePickerField';
import DeleteAccountModal from '../components/DeleteAccountModal';
import FormField from '../components/FormField';
import PasswordChecklist from '../components/PasswordChecklist';
import { colors, radius } from '../theme';
import {
  formatDate,
  normalizeEmail,
  normalizePhoneNumber,
  validateBirthday,
  validateChangePasswordForm,
  validateEmail,
  validatePhoneNumber,
} from '../utils/validation';

const BOTTOM_NAV_HEIGHT = 82;
const DASHBOARD_WEB_SCROLL_HEIGHT = `calc(100vh - ${BOTTOM_NAV_HEIGHT}px)`;

const tabs = [
  { key: 'explore', label: 'Home', icon: 'home-outline' },
  { key: 'messages', label: 'Garage', icon: 'garage-variant' },
  { key: 'notifications', label: 'Book', icon: 'calendar-check-outline' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-outline' },
  { key: 'rewards', label: 'Rewards', icon: 'star-four-points-outline' },
  { key: 'store', label: 'Shop', icon: 'shopping-outline' },
  { key: 'menu', label: 'Profile', icon: 'account-outline' },
];

const genderOptions = ['Male', 'Female', 'Prefer not to say'];
const profileSections = [
  { key: 'rewards', label: 'Rewards', icon: 'star-four-points-outline' },
  { key: 'garage', label: 'Garage', icon: 'garage-variant' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-outline' },
  { key: 'backJobs', label: 'Back-Jobs', icon: 'information-outline' },
];
const storeSections = [
  { key: 'catalog', label: 'Catalog', icon: 'shopping-outline' },
  { key: 'orders', label: 'Orders', icon: 'receipt-text-outline' },
];
const notificationPreferenceOptions = [
  {
    key: 'emailEnabled',
    label: 'Email Delivery',
    description: 'Turn customer email notifications on or off for all operational updates.',
  },
  {
    key: 'bookingRemindersEnabled',
    label: 'Booking Reminders',
    description: 'Receive reminders when appointments are approaching or change schedule.',
  },
  {
    key: 'insuranceUpdatesEnabled',
    label: 'Insurance Updates',
    description: 'Get notified when insurance inquiries move through review or need more documents.',
  },
  {
    key: 'invoiceRemindersEnabled',
    label: 'Invoice Reminders',
    description: 'Keep invoice-aging and payment follow-up notices enabled for your account.',
  },
  {
    key: 'serviceFollowUpEnabled',
    label: 'Service Follow-ups',
    description: 'Receive service follow-up reminders tied to back-jobs and post-service outreach.',
  },
];
const shopCategories = ['All', 'Oils', 'Tires', 'Brakes', 'Electrical', 'Coolants'];

const createInitialBookingAvailabilityState = () => ({
  status: 'idle',
  errorMessage: '',
  ...createEmptyBookingAvailability(),
});

const createInitialBookingDiscoveryState = () => ({
  status: 'idle',
  services: [],
  timeSlots: [],
  vehicles: [],
  availability: createInitialBookingAvailabilityState(),
  errorMessage: '',
});

const isBookableService = (service) => Boolean(service?.isActive);
const isBookableTimeSlot = (timeSlot) => Boolean(timeSlot?.isActive);

const getBookingDiscoveryStateKey = (bookingDiscovery) => {
  if (bookingDiscovery.status === 'idle' || bookingDiscovery.status === 'loading') {
    return bookingDiscovery.status;
  }

  if (bookingDiscovery.status === 'unauthorized' || bookingDiscovery.status === 'error') {
    return bookingDiscovery.status;
  }

  if (!bookingDiscovery.vehicles.length) {
    return 'empty-vehicles';
  }

  if (!bookingDiscovery.services.some(isBookableService)) {
    return 'empty-services';
  }

  if (!bookingDiscovery.timeSlots.some(isBookableTimeSlot)) {
    return 'unavailable-slots';
  }

  return 'ready';
};

const createInitialBookingCreateState = () => ({
  status: 'idle',
  message: '',
  booking: null,
});

const createInitialBookingHistoryState = () => ({
  status: 'idle',
  bookings: [],
  errorMessage: '',
});

const createInitialBookingDetailState = () => ({
  status: 'idle',
  booking: null,
  errorMessage: '',
});

const createInitialVehicleLifecycleState = () => ({
  status: 'idle',
  errorMessage: '',
  ...createEmptyCustomerVehicleLifecycleSnapshot(),
});

const createInitialDigitalGarageState = () => ({
  ...createEmptyCustomerDigitalGarageSnapshot(),
  status: 'idle',
  errorMessage: '',
});

const createInitialLoyaltyState = () => ({
  status: 'idle',
  errorMessage: '',
  redeemingRewardId: null,
  ...createEmptyCustomerLoyaltySnapshot(),
});

const createInitialNotificationModuleState = () => ({
  status: 'idle',
  errorMessage: '',
  savingKey: null,
  ...createEmptyCustomerNotificationSnapshot(),
});

const createInitialCatalogState = () => ({
  status: 'idle',
  errorMessage: '',
  apiBaseUrl: getEcommerceApiBaseUrl(),
  ...createEmptyCustomerCatalogSnapshot(),
});

const createInitialCatalogDetailState = () => ({
  status: 'idle',
  product: null,
  previewProduct: null,
  errorMessage: '',
});

const createInitialCartState = () => ({
  status: 'idle',
  errorMessage: '',
  savingItemId: null,
  ...createEmptyCustomerCartSnapshot(),
});

const createInitialStoreOrderHistoryState = () => ({
  status: 'idle',
  errorMessage: '',
  ...createEmptyCustomerOrderHistorySnapshot(),
});

const createInitialStoreOrderTrackingState = () => ({
  status: 'idle',
  order: null,
  invoiceStatus: 'idle',
  invoice: null,
  errorMessage: '',
  invoiceErrorMessage: '',
});

const buildInvoiceCheckoutName = (account) =>
  `${account?.firstName || ''} ${account?.lastName || ''}`.trim() ||
  account?.username ||
  '';

const createInitialInvoiceCheckoutForm = (account) => ({
  recipientName: buildInvoiceCheckoutName(account),
  email: account?.email || '',
  contactPhone: account?.phoneNumber || '',
  addressLine1: account?.defaultAddress?.addressLine1 || '',
  addressLine2: account?.defaultAddress?.addressLine2 || '',
  city: account?.defaultAddress?.city || account?.city || '',
  province: account?.defaultAddress?.province || '',
  postalCode: account?.defaultAddress?.postalCode || '',
  notes: '',
});

const createInitialCheckoutState = (account) => ({
  stage: 'cart',
  previewStatus: 'idle',
  preview: null,
  submitting: false,
  order: null,
  errorMessage: '',
  form: createInitialInvoiceCheckoutForm(account),
  fieldErrors: {},
});

const trimCheckoutValue = (value) => String(value ?? '').trim();

const validateInvoiceCheckoutForm = (form) => {
  const errors = {};
  const normalizedPhoneNumber = normalizePhoneNumber(form.contactPhone || '');
  const normalizedPostalCode = String(form.postalCode ?? '').replace(/\D/g, '').slice(0, 4);

  if (!trimCheckoutValue(form.recipientName)) {
    errors.recipientName = 'Enter the billing recipient name.';
  }

  const emailError = validateEmail(form.email || '');
  if (emailError) {
    errors.email = emailError;
  }

  if (normalizedPhoneNumber) {
    const phoneError = validatePhoneNumber(normalizedPhoneNumber);
    if (phoneError) {
      errors.contactPhone = phoneError;
    }
  }

  if (!trimCheckoutValue(form.addressLine1)) {
    errors.addressLine1 = 'Enter the billing street address.';
  }

  if (!trimCheckoutValue(form.city)) {
    errors.city = 'Enter the billing city.';
  }

  if (!trimCheckoutValue(form.province)) {
    errors.province = 'Enter the billing province.';
  }

  if (normalizedPostalCode && normalizedPostalCode.length !== 4) {
    errors.postalCode = 'Use a 4-digit postal code.';
  }

  return errors;
};

const buildInvoiceCheckoutPayload = (form) => {
  const normalizedPhoneNumber = normalizePhoneNumber(form.contactPhone || '');
  const normalizedPostalCode = String(form.postalCode ?? '').replace(/\D/g, '').slice(0, 4);

  return {
    recipientName: trimCheckoutValue(form.recipientName),
    email: normalizeEmail(form.email || ''),
    contactPhone: normalizedPhoneNumber || undefined,
    addressLine1: trimCheckoutValue(form.addressLine1),
    addressLine2: trimCheckoutValue(form.addressLine2) || undefined,
    city: trimCheckoutValue(form.city),
    province: trimCheckoutValue(form.province),
    postalCode: normalizedPostalCode || undefined,
  };
};

const buildCheckoutAddressLabel = (address) =>
  [
    address?.addressLine1,
    address?.addressLine2,
    address?.city,
    address?.province,
    address?.postalCode,
  ]
    .map((value) => trimCheckoutValue(value))
    .filter(Boolean)
    .join(', ');

const normalizeNavigationId = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return normalizedValue.length ? normalizedValue : null;
};

const formatStoreDateLabel = (value) => {
  if (!value) {
    return '--';
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? '--' : formatDate(parsedDate);
};

const formatStoreDateTimeLabel = (value) => {
  if (!value) {
    return '--';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildStoreOrderTitle = (order) => {
  if (order?.items?.length === 1) {
    return order.items[0].productName || 'Order snapshot';
  }

  if (order?.items?.length > 1) {
    return `${order.items[0]?.productName || 'Order snapshot'} +${order.items.length - 1} more`;
  }

  return 'Order snapshot';
};

const buildStoreOrderSelectionState = (order = null) => ({
  status: order ? 'ready' : 'idle',
  order,
  invoiceStatus: 'idle',
  invoice: null,
  errorMessage: '',
  invoiceErrorMessage: '',
});

const parseDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());

  if (!match) {
    return null;
  }

  const parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatBookingDateLabel = (value) => {
  const parsedDate = parseDateOnly(value);

  return parsedDate ? formatDate(parsedDate) : String(value ?? '').trim() || '--';
};

const BOOKING_AVAILABILITY_PAGE_DAYS = 14;
const BOOKING_SERVICE_PAGE_SIZE = 6;

const addDaysToDate = (value, offsetDays) => {
  const parsedDate = value instanceof Date ? new Date(value) : parseDateOnly(value);

  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const nextDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  nextDate.setDate(nextDate.getDate() + offsetDays);
  return nextDate;
};

const clampDateKeyToRange = (dateKey, minimumDateKey, maximumDateKey) => {
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

const buildBookingAvailabilityWindow = ({
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
    addDaysToDate(clampedAnchorDateKey, Math.max(pageDays - 1, 0)) ?? parseDateOnly(clampedAnchorDateKey),
  );
  let endDateKey = maximumPageEndCandidate || clampedAnchorDateKey;
  let startDateKey = clampedAnchorDateKey;

  if (maximumDateKey && endDateKey > maximumDateKey) {
    endDateKey = maximumDateKey;
    const shiftedStartDate = toBookingDateString(
      addDaysToDate(endDateKey, -(Math.max(pageDays - 1, 0))) ?? parseDateOnly(endDateKey),
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

const getInitialBookingAvailabilityWindow = () =>
  buildBookingAvailabilityWindow({
    anchorDateKey: toBookingDateString(addDaysToDate(new Date(), 1) ?? new Date()),
  });

const getBookingAvailabilityDayByDate = (availability, scheduledDate) =>
  availability?.days?.find((day) => day.scheduledDate === scheduledDate) ?? null;

const getBookingAvailabilitySlotForTime = (availabilityDay, timeSlotId) =>
  availabilityDay?.slots?.find((slot) => slot.timeSlotId === timeSlotId) ?? null;

const getFirstBookableBookingDateKey = (availability, timeSlotId) => {
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

const formatBookingAvailabilityStatusLabel = (status) => {
  switch (status) {
    case 'bookable':
      return 'Open';
    case 'limited':
      return 'Limited';
    case 'full':
      return 'Full';
    case 'no_active_slots':
      return 'Closed';
    case 'outside_window':
      return 'Window';
    default:
      return 'Status';
  }
};

const getBookingAvailabilityTone = (status) => {
  switch (status) {
    case 'bookable':
      return 'success';
    case 'limited':
      return 'warning';
    case 'full':
      return 'danger';
    default:
      return 'muted';
  }
};

const getBookingAvailabilityWindowLabel = (availability) => {
  if (!availability?.startDate || !availability?.endDate) {
    return 'Live window unavailable';
  }

  return `${formatBookingDateLabel(availability.startDate)} to ${formatBookingDateLabel(
    availability.endDate,
  )}`;
};

const buildBookingDateCardItem = (availabilityDay, selectedTimeSlot) => {
  const parsedDate = parseDateOnly(availabilityDay?.scheduledDate);
  const matchingSlot = getBookingAvailabilitySlotForTime(availabilityDay, selectedTimeSlot?.id);
  const effectiveStatus =
    matchingSlot && !matchingSlot.isAvailable ? 'full' : availabilityDay?.status || 'full';
  const isSelectable = matchingSlot ? matchingSlot.isAvailable : Boolean(availabilityDay?.isBookable);
  const detailLabel = matchingSlot
    ? matchingSlot.isAvailable
      ? `${matchingSlot.remainingCapacity} left in ${selectedTimeSlot?.label || 'selected slot'}`
      : `${selectedTimeSlot?.label || 'Selected slot'} is full`
    : availabilityDay?.status === 'no_active_slots'
      ? 'No live slots'
      : `${availabilityDay?.availableSlotCount ?? 0} of ${availabilityDay?.activeSlotCount ?? 0} slots open`;
  const capacityLabel = matchingSlot
    ? `${matchingSlot.bookingCount}/${matchingSlot.capacity} booked`
    : `${availabilityDay?.remainingCapacity ?? 0}/${availabilityDay?.totalCapacity ?? 0} capacity left`;

  return {
    key: availabilityDay?.scheduledDate || 'booking-date',
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

const bookingStatusLabels = {
  pending: 'Pending staff review',
  confirmed: 'Confirmed by staff',
  declined: 'Declined',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const getBookingStatusLabel = (status) => bookingStatusLabels[status] || 'Unknown status';

const getBookingReference = (booking) =>
  booking?.id ? booking.id.slice(0, 8).toUpperCase() : '--------';

const getBookingServiceNames = (booking) => {
  const serviceNames = (booking?.requestedServices ?? [])
    .map((requestedService) => requestedService?.service?.name)
    .filter(Boolean);

  return serviceNames.length ? serviceNames.join(', ') : 'Service request';
};

const getBookingVehicleLabel = (booking, vehicles) => {
  const matchingVehicle = vehicles.find((vehicle) => vehicle.id === booking?.vehicleId);

  return matchingVehicle ? buildOwnedVehicleLabel(matchingVehicle) : `Vehicle ${String(booking?.vehicleId ?? '').slice(0, 8)}`;
};

const getBookingTimeLabel = (booking) => {
  if (!booking?.timeSlot) {
    return 'Time slot pending';
  }

  return `${booking.timeSlot.label} - ${formatBookingTimeSlotWindow(booking.timeSlot)}`;
};

const buildBookingTrackingSteps = (booking) => {
  if (!booking) {
    return [
      {
        label: 'Booking Request',
        status: 'No booking selected',
        state: 'inactive',
      },
      {
        label: 'Staff Review',
        status: 'Offline',
        state: 'inactive',
        note: 'Submit a booking request to see live status here.',
      },
      {
        label: 'Appointment Outcome',
        status: 'Offline',
        state: 'inactive',
      },
    ];
  }

  const status = booking.status;

  if (status === 'declined' || status === 'cancelled') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: status === 'declined' ? 'Declined By Staff' : 'Cancelled',
        status: getBookingStatusLabel(status),
        state: 'current',
      },
    ];
  }

  if (status === 'completed') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: 'Staff Review',
        status: 'Confirmed',
        state: 'done',
      },
      {
        label: 'Appointment Complete',
        status: 'Completed',
        state: 'current',
      },
    ];
  }

  if (status === 'confirmed' || status === 'rescheduled') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: status === 'rescheduled' ? 'Rescheduled By Staff' : 'Staff Confirmed',
        status: getBookingStatusLabel(status),
        state: 'current',
        note: 'Arrival, adviser assignment, and workshop progress stay separate from booking status.',
      },
      {
        label: 'Appointment Outcome',
        status: 'Upcoming',
        state: 'upcoming',
      },
    ];
  }

  return [
    {
      label: 'Booking Request',
      status: 'Submitted',
      state: 'done',
    },
    {
      label: 'Staff Review',
      status: 'Pending',
      state: 'current',
      note: 'Your request is recorded as pending until staff confirm, decline, or reschedule it.',
    },
    {
      label: 'Appointment Outcome',
      status: 'Upcoming',
      state: 'upcoming',
    },
  ];
};

const recentServiceHistory = [
  {
    key: 'svc-pms',
    icon: 'wrench-outline',
    title: 'PMS Service',
    dateLabel: 'Apr 8, 2026',
    status: 'Completed',
    summary: 'Periodic maintenance and filter replacement completed.',
    type: 'Service',
    priceLabel: '\u20B13,850',
    mechanic: 'Mech. Juan Ramos',
    statusTone: 'success',
  },
  {
    key: 'svc-oil',
    icon: 'flash-outline',
    title: 'Oil Change',
    dateLabel: 'Mar 15, 2026',
    status: 'Completed',
    summary: 'Synthetic oil, oil filter, and fluid top-up completed.',
    type: 'Service',
    priceLabel: '\u20B11,200',
    mechanic: 'Mech. Marco Lim',
    statusTone: 'success',
  },
  {
    key: 'svc-tire',
    icon: 'swap-horizontal',
    title: 'Tire Rotation',
    dateLabel: 'Feb 28, 2026',
    status: 'Completed',
    summary: 'Cross rotation and tire pressure balancing completed.',
    type: 'Service',
    priceLabel: '\u20B1650',
    mechanic: 'Mech. Rico Santos',
    statusTone: 'success',
  },
  {
    key: 'svc-brake',
    icon: 'shield-outline',
    title: 'Brake Inspection',
    dateLabel: 'Jan 21, 2026',
    status: 'Completed',
    summary: 'Brake pads inspected and fluid level checked.',
    type: 'Booking',
    priceLabel: '\u20B1800',
    mechanic: 'Mech. Rico Santos',
    statusTone: 'info',
  },
];

const shopProducts = [
  {
    key: 'oil-10w30',
    category: 'Oils',
    brand: 'Castrol GTX',
    name: 'Synthetic 10W-30 Engine Oil',
    description:
      'High-quality synthetic 10W-30 engine oil from Castrol GTX. Compatible with most Japanese and Korean vehicle models. Meets or exceeds OEM specifications and helps keep the engine clean under daily driving conditions.',
    price: 689,
    compareAtPrice: 850,
    rating: 4.8,
    reviews: 124,
    availability: 'In Stock',
    badge: 'SALE',
    badgeTone: 'sale',
    image:
      'https://images.unsplash.com/photo-1635764708683-8f2356c4f7b0?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'bridgestone-ecopia',
    category: 'Tires',
    brand: 'Bridgestone Ecopia',
    name: 'All-Season Performance Tire',
    description:
      'Reliable all-season tire designed for balanced grip, comfort, and fuel efficiency. Built for daily city driving and highway use with strong wet-road performance and stable handling.',
    price: 4200,
    rating: 4.6,
    reviews: 87,
    availability: 'In Stock',
    badge: null,
    badgeTone: 'neutral',
    image:
      'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'brembo-rotor',
    category: 'Brakes',
    brand: 'Brembo Street',
    name: 'Front Disc Brake Rotor',
    description:
      'Durable front disc brake rotor engineered for smoother braking response and dependable heat dissipation. A strong upgrade for drivers looking for safer and more confident stopping power.',
    price: 3150,
    rating: 4.9,
    reviews: 58,
    availability: 'In Stock',
    badge: 'POPULAR',
    badgeTone: 'featured',
    image:
      'https://images.unsplash.com/photo-1613214150384-a24eb8d0f0a6?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'gs-battery',
    category: 'Electrical',
    brand: 'GS Astra',
    name: 'Maintenance-Free Car Battery',
    description:
      'Maintenance-free battery built for dependable starts, stable voltage, and long service life. Ideal for everyday vehicles with standard electrical loads and consistent city use.',
    price: 5400,
    rating: 4.7,
    reviews: 42,
    availability: 'Low Stock',
    badge: 'LOW STOCK',
    badgeTone: 'warning',
    image:
      'https://images.unsplash.com/photo-1609592806596-b43c4df58ad7?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'coolant-red',
    category: 'Coolants',
    brand: 'Toyota Genuine',
    name: 'Long Life Engine Coolant',
    description:
      'Long-life coolant formulated to help maintain proper engine temperature and corrosion protection. Recommended for routine replacement intervals and dependable cooling system care.',
    price: 980,
    rating: 4.5,
    reviews: 31,
    availability: 'In Stock',
    badge: 'NEW',
    badgeTone: 'featured',
    image:
      'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'bosch-wiper',
    category: 'Electrical',
    brand: 'Bosch AeroTwin',
    name: 'Premium Wiper Blade Set',
    description:
      'Premium wiper blade set designed for quieter wiping, smoother contact, and improved visibility during rain. A practical upgrade for cleaner windshield performance in all weather.',
    price: 1250,
    rating: 4.8,
    reviews: 64,
    availability: 'In Stock',
    badge: null,
    badgeTone: 'neutral',
    image:
      'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=900&q=80',
  },
];

const formatCurrency = (amount) => `\u20B1${amount.toLocaleString()}`;

function RatingStars({ rating }) {
  return (
    <View style={styles.ratingStarsRow}>
      {[1, 2, 3, 4, 5].map((value) => {
        const iconName = rating >= value ? 'star' : rating >= value - 0.5 ? 'star-half-full' : 'star-outline';

        return (
          <MaterialCommunityIcons
            key={value}
            name={iconName}
            size={18}
            color="#FFD24A"
            style={styles.ratingStarIcon}
          />
        );
      })}
    </View>
  );
}

const createProfileForm = (account) => ({
  fullName: `${account?.firstName || ''} ${account?.lastName || ''}`.trim(),
  email: account?.email || '',
  phoneNumber: account?.phoneNumber || '',
  city: account?.city || '',
  gender: account?.gender || '',
  birthday: account?.birthday || null,
});

const splitFullName = (fullName) => {
  const trimmedName = fullName.trim();
  const nameParts = trimmedName.split(/\s+/).filter(Boolean);

  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' '),
  };
};

function MotionPressable({
  children,
  onPress,
  style,
  containerStyle,
  disabled = false,
  scaleTo = 0.97,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (nextScale, nextOpacity) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: nextScale,
        stiffness: 320,
        damping: 24,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: nextOpacity,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      style={containerStyle}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (!disabled) {
          animateTo(scaleTo, 0.96);
        }
      }}
      onPressOut={() => {
        animateTo(1, 1);
      }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function MenuRow({ icon, label, onPress, rightLabel, danger = false }) {
  return (
    <MotionPressable style={styles.menuRow} onPress={onPress} scaleTo={0.985}>
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIconWrap, danger && styles.menuIconWrapDanger]}>
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={danger ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.menuCopy}>
          <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
          {rightLabel ? <Text style={styles.menuMeta}>{rightLabel}</Text> : null}
        </View>
      </View>
      <Text style={[styles.menuArrow, danger && styles.menuArrowDanger]}>{'>'}</Text>
    </MotionPressable>
  );
}

function NotificationPreferenceToggleRow({
  label,
  description,
  value,
  disabled,
  onValueChange,
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{label}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        value={Boolean(value)}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{
          false: '#2D334A',
          true: colors.primary,
        }}
        thumbColor={Boolean(value) ? '#FFF5EB' : '#E6E9F5'}
      />
    </View>
  );
}

function ScreenBackHeader({ title, subtitle, onBack }) {
  return (
    <View style={styles.subHeader}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      <View style={styles.subHeaderCopy}>
        <Text style={styles.subHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function PasswordFieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  visible,
  onToggleVisibility,
}) {
  return (
    <View style={styles.passwordFieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.passwordInputWrap, error && styles.passwordInputWrapError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.passwordInput}
          selectionColor={colors.primary}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={onToggleVisibility}>
          <MaterialCommunityIcons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.mutedText}
          />
          <Text style={styles.eyeButtonText}>{visible ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function ComingSoonView({ label }) {
  return (
    <View style={styles.comingSoonWrap}>
      <MaterialCommunityIcons name="clock-outline" size={38} color={colors.primary} />
      <Text style={styles.comingSoonTitle}>{label}</Text>
      <Text style={styles.comingSoonSubtitle}>Coming Soon</Text>
    </View>
  );
}

function ActionIconButton({ icon, onPress }) {
  return (
    <MotionPressable style={styles.actionIconButton} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.labelText} />
    </MotionPressable>
  );
}

function NotificationIconButton({ count, onPress }) {
  return (
    <MotionPressable style={styles.actionIconButton} onPress={onPress}>
      <MaterialCommunityIcons name="bell-outline" size={20} color={colors.labelText} />
      {count > 0 ? (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>{count}</Text>
        </View>
      ) : null}
    </MotionPressable>
  );
}

function ProfileAvatarButton({
  account,
  onPress,
  onChangePhoto,
  showTooltip,
  onHoverIn,
  onHoverOut,
}) {
  const initials = `${account?.firstName?.[0] || 'J'}${account?.lastName?.[0] || 'D'}`;

  return (
    <View
      style={styles.profileAvatarAnchor}
      onMouseEnter={Platform.OS === 'web' ? onHoverIn : undefined}
      onMouseLeave={Platform.OS === 'web' ? onHoverOut : undefined}
    >
      <MotionPressable style={styles.homeAvatar} onPress={onPress}>
        {account?.profileImage ? (
          <Image source={{ uri: account.profileImage }} style={styles.homeAvatarImage} />
        ) : (
          <Text style={styles.homeAvatarText}>{initials}</Text>
        )}
      </MotionPressable>

      {showTooltip ? (
        <View style={styles.profileHoverCard}>
          <Text style={styles.profileHoverTitle}>Change Profile</Text>
          <Text style={styles.profileHoverText}>Upload a new photo from your gallery.</Text>
          <MotionPressable style={styles.profileHoverButton} onPress={onChangePhoto} scaleTo={0.985}>
            <Text style={styles.profileHoverButtonText}>Choose Photo</Text>
          </MotionPressable>
        </View>
      ) : null}
    </View>
  );
}

function NotificationRow({ item, onDismiss, onOpen }) {
  return (
    <View style={styles.notificationRow}>
      <View style={[styles.notificationIconWrap, { backgroundColor: item.bgColor }]}>
        <MaterialCommunityIcons name={item.icon} size={18} color={item.tint} />
      </View>

      <TouchableOpacity style={styles.notificationCopy} onPress={onOpen} activeOpacity={0.82}>
        <View style={styles.notificationTitleRow}>
          {item.unread ? <View style={styles.notificationUnreadDot} /> : null}
          <Text style={styles.notificationRowTitle}>{item.title}</Text>
        </View>
        <Text style={styles.notificationRowMessage}>{item.message}</Text>
        <Text style={styles.notificationRowTime}>{item.timeLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.notificationDismissButton} onPress={onDismiss} activeOpacity={0.82}>
        <MaterialCommunityIcons name="close" size={16} color={colors.mutedText} />
      </TouchableOpacity>
    </View>
  );
}

function ProfileSectionTab({ item, isActive, onPress }) {
  return (
    <MotionPressable
      containerStyle={styles.sectionTabContainer}
      style={[styles.sectionTab, isActive && styles.sectionTabActive]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={item.icon}
        size={16}
        color={isActive ? colors.onPrimary : colors.mutedText}
      />
      <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>{item.label}</Text>
    </MotionPressable>
  );
}

function RewardOfferCard({ item, onClaim }) {
  const progressRatio = Math.min(item.progress / item.target, 1);
  const buttonLabel = item.loading
    ? 'Claiming...'
    : item.buttonLabel ?? (item.available ? 'Claim' : 'Locked');
  const isButtonDisabled = !item.available || item.loading;

  return (
    <View style={styles.rewardCard}>
      <View style={styles.rewardCardHeader}>
        <View style={styles.rewardIconWrap}>
          <MaterialCommunityIcons name={item.icon} size={20} color={item.accent} />
        </View>

        <View style={styles.rewardCopy}>
          <Text style={styles.rewardTitle}>{item.title}</Text>
          <Text style={styles.rewardPoints}>{item.pointsLabel}</Text>
        </View>

        <TouchableOpacity
          style={[styles.claimButton, isButtonDisabled && styles.claimButtonLocked]}
          onPress={isButtonDisabled ? undefined : onClaim}
          activeOpacity={isButtonDisabled ? 1 : 0.86}
        >
          <Text style={[styles.claimButtonText, isButtonDisabled && styles.claimButtonTextLocked]}>
            {buttonLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rewardProgressMeta}>
        <Text style={styles.rewardProgressLabel}>Progress</Text>
        <Text style={[styles.rewardProgressValue, { color: item.accent }]}>
          {item.progress.toLocaleString()} / {item.target.toLocaleString()}
        </Text>
      </View>

      <View style={styles.rewardProgressTrack}>
        <View
          style={[
            styles.rewardProgressFill,
            {
              width: `${progressRatio * 100}%`,
              backgroundColor: item.accent,
            },
          ]}
        />
      </View>

      <Text style={styles.rewardHelperText}>{item.helperText}</Text>
    </View>
  );
}

function LoyaltyTransactionRow({ item }) {
  const isPositive = item.pointsDelta >= 0;

  return (
    <View style={styles.loyaltyTransactionRow}>
      <View style={styles.loyaltyTransactionCopy}>
        <Text style={styles.loyaltyTransactionTitle}>{item.sourceLabel}</Text>
        <Text style={styles.loyaltyTransactionMeta}>
          {item.dateLabel}
          {item.sourceReference ? ` - ${item.sourceReference}` : ''}
        </Text>
      </View>
      <View style={styles.loyaltyTransactionAmountWrap}>
        <Text
          style={[
            styles.loyaltyTransactionAmount,
            isPositive ? styles.loyaltyTransactionAmountPositive : styles.loyaltyTransactionAmountNegative,
          ]}
        >
          {item.pointsDeltaLabel}
        </Text>
        <Text style={styles.loyaltyTransactionBalance}>
          Balance {item.resultingBalance.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

function ShopCategoryChip({ label, isActive, onPress }) {
  return (
    <MotionPressable
      style={[styles.shopCategoryChip, isActive && styles.shopCategoryChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.shopCategoryChipText, isActive && styles.shopCategoryChipTextActive]}>
        {label}
      </Text>
    </MotionPressable>
  );
}

function ProductCard({ item, quantity, onAdd, onOpen }) {
  const hasQuantity = quantity > 0;
  const isLowStock = item.availability.toLowerCase() === 'low stock';

  return (
    <MotionPressable style={styles.productCard} onPress={onOpen} scaleTo={0.988}>
      <View style={styles.productImageWrap}>
        <Image source={{ uri: item.image }} style={styles.productImage} />

        {item.badge ? (
          <View
            style={[
              styles.productBadge,
              item.badgeTone === 'warning'
                ? styles.productBadgeWarning
                : item.badgeTone === 'featured'
                  ? styles.productBadgeFeatured
                  : styles.productBadgeSale,
            ]}
          >
            <Text
              style={[
                styles.productBadgeText,
                item.badgeTone === 'warning' && styles.productBadgeTextDark,
              ]}
            >
              {item.badge}
            </Text>
          </View>
        ) : null}

        <View style={styles.productRatingPill}>
          <MaterialCommunityIcons name="star" size={11} color="#FFD24A" />
          <Text style={styles.productRatingText}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.productBody}>
        <Text style={styles.productBrand}>{item.brand}</Text>
        <Text style={styles.productName}>{item.name}</Text>

        <View style={styles.productMetaRow}>
          <Text style={[styles.productAvailability, isLowStock && styles.productAvailabilityWarning]}>
            {item.availability}
          </Text>
          <Text style={styles.productReviews}>{item.reviews} reviews</Text>
        </View>

        <View style={styles.productFooter}>
          <View style={styles.productPriceWrap}>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            {item.compareAtPrice ? (
              <Text style={styles.productComparePrice}>{formatCurrency(item.compareAtPrice)}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.productAddButton, hasQuantity && styles.productAddButtonAdded]}
            onPress={onAdd}
            activeOpacity={0.86}
          >
            {hasQuantity ? (
              <Text style={styles.productAddCount}>{quantity}</Text>
            ) : (
              <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </MotionPressable>
  );
}

function CartLineItem({ item, onDecrease, onIncrease, disabled = false, isCompact = false }) {
  const isUnavailable = item.availabilityStatus !== 'available';

  return (
    <View style={[styles.cartItemCard, isCompact && styles.cartItemCardCompact]}>
      <View style={styles.cartItemImage}>
        <MaterialCommunityIcons
          name={isUnavailable ? 'package-variant-remove' : 'package-variant-closed'}
          size={22}
          color={isUnavailable ? '#FFB86B' : colors.primary}
        />
      </View>

      <View style={[styles.cartItemCopy, isCompact && styles.cartItemCopyCompact]}>
        <Text style={styles.cartItemName} numberOfLines={isCompact ? 3 : 2}>
          {item.productName}
        </Text>
        <Text style={styles.cartItemMeta}>
          {item.productSku ? `SKU ${item.productSku}` : 'Customer catalog item'}
        </Text>
        <View style={styles.cartItemPriceRow}>
          <Text style={styles.cartItemPrice}>{item.unitPriceLabel}</Text>
          <Text style={styles.cartItemLineTotal}>{item.lineTotalLabel}</Text>
        </View>
        {isUnavailable ? (
          <Text style={styles.cartItemWarning}>
            This item is unavailable for checkout until staff republishes it.
          </Text>
        ) : null}
      </View>

      <View style={[styles.cartQuantityControls, isCompact && styles.cartQuantityControlsCompact]}>
        <TouchableOpacity
          style={[styles.cartQuantityButton, disabled && styles.cartQuantityButtonDisabled]}
          onPress={onDecrease}
          activeOpacity={disabled ? 1 : 0.86}
          disabled={disabled}
        >
          <MaterialCommunityIcons
            name={item.quantity <= 1 ? 'trash-can-outline' : 'minus'}
            size={16}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.cartQuantityValue}>{item.quantity}</Text>
        <TouchableOpacity
          style={[styles.cartQuantityButton, disabled && styles.cartQuantityButtonDisabled]}
          onPress={onIncrease}
          activeOpacity={disabled ? 1 : 0.86}
          disabled={disabled}
        >
          {disabled ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <MaterialCommunityIcons name="plus" size={16} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StoreOrderCard({ order, isSelected, onPress, isCompact = false }) {
  const invoiceSummary = order.invoice
    ? `${order.invoice.invoiceNumber} - ${order.invoice.statusLabel}`
    : 'Invoice tracking is still being prepared.';

  return (
    <MotionPressable
      style={[styles.storeOrderCard, isSelected && styles.storeOrderCardActive]}
      onPress={onPress}
      scaleTo={0.986}
    >
      <View style={[styles.storeOrderCardHeader, isCompact && styles.storeOrderCardHeaderCompact]}>
        <View style={styles.storeOrderCardCopy}>
          <Text style={styles.storeOrderCardEyebrow}>{order.orderNumber}</Text>
          <Text style={styles.storeOrderCardTitle}>{buildStoreOrderTitle(order)}</Text>
          <Text style={styles.storeOrderCardMeta}>
            {formatStoreDateTimeLabel(order.createdAt)}
          </Text>
        </View>

        <View
          style={[
            styles.storeStatusPill,
            isCompact && styles.storeStatusPillCompact,
            isSelected && styles.storeStatusPillActive,
          ]}
        >
          <Text style={[styles.storeStatusPillText, isSelected && styles.storeStatusPillTextActive]}>
            {order.statusLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.storeOrderCardMetrics, isCompact && styles.storeOrderCardMetricsCompact]}>
        <Text style={styles.storeOrderCardMetric}>
          {order.items.length} item{order.items.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.storeOrderCardMetric}>{order.subtotalLabel}</Text>
      </View>

      <Text style={styles.storeOrderCardInvoiceMeta}>{invoiceSummary}</Text>
    </MotionPressable>
  );
}

function StoreOrderHistoryEntry({ item, isLast }) {
  return (
    <View style={styles.storeTimelineRow}>
      <View style={styles.storeTimelineRail}>
        <View style={styles.storeTimelineDot} />
        {!isLast ? <View style={styles.storeTimelineLine} /> : null}
      </View>

      <View style={styles.storeTimelineContent}>
        <View style={styles.storeTimelineHeader}>
          <Text style={styles.storeTimelineTitle}>{item.nextStatusLabel}</Text>
          <Text style={styles.storeTimelineTime}>{formatStoreDateTimeLabel(item.changedAt)}</Text>
        </View>

        <Text style={styles.storeTimelineBadge}>{item.transitionTypeLabel}</Text>

        {item.previousStatusLabel ? (
          <Text style={styles.storeTimelineCopy}>
            {item.previousStatusLabel} -> {item.nextStatusLabel}
          </Text>
        ) : null}

        <Text style={styles.storeTimelineCopy}>
          {item.reason || 'No transition note was recorded for this status change.'}
        </Text>
      </View>
    </View>
  );
}

function StorePaymentEntryRow({ item }) {
  return (
    <View style={styles.storePaymentEntryRow}>
      <View style={styles.storePaymentEntryCopy}>
        <Text style={styles.storePaymentEntryTitle}>{item.amountLabel}</Text>
        <Text style={styles.storePaymentEntryMeta}>
          {item.paymentMethodLabel}
          {item.reference ? ` - ${item.reference}` : ''}
        </Text>
        <Text style={styles.storePaymentEntryMeta}>{formatStoreDateTimeLabel(item.receivedAt)}</Text>
        {item.notes ? <Text style={styles.storePaymentEntryNotes}>{item.notes}</Text> : null}
      </View>

      <View style={styles.storePaymentEntryIconWrap}>
        <MaterialCommunityIcons name="cash-check" size={18} color={colors.primary} />
      </View>
    </View>
  );
}

function BookingModeTab({ label, isActive, onPress }) {
  return (
    <MotionPressable
      containerStyle={styles.bookingModeTabContainer}
      style={[styles.bookingModeTab, isActive && styles.bookingModeTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.bookingModeTabText, isActive && styles.bookingModeTabTextActive]}>
        {label}
      </Text>
    </MotionPressable>
  );
}

function BookingDiscoveryStatePanel({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  isLoading = false,
}) {
  return (
    <View style={styles.bookingStatePanel}>
      <View style={styles.bookingStatePanelHeader}>
        <View style={styles.bookingStatePanelIconWrap}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
          )}
        </View>
        <View style={styles.bookingStatePanelCopy}>
          <Text style={styles.bookingStatePanelTitle}>{title}</Text>
          <Text style={styles.bookingStatePanelText}>{message}</Text>
        </View>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.bookingStatePanelButton} onPress={onAction} activeOpacity={0.88}>
          <Text style={styles.bookingStatePanelButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function BookingVehicleCard({ item, isSelected, onPress, isCompact = false }) {
  return (
    <MotionPressable
      style={[
        styles.bookingServiceCard,
        isSelected && styles.bookingServiceCardSelected,
        isCompact && styles.bookingServiceCardCompact,
      ]}
      onPress={onPress}
      scaleTo={0.988}
    >
      <View style={styles.bookingServiceIconWrap}>
        <MaterialCommunityIcons
          name="car-outline"
          size={20}
          color={isSelected ? colors.primary : colors.labelText}
        />
      </View>

      <View style={[styles.bookingServiceBody, isCompact && styles.bookingServiceBodyCompact]}>
        <View style={[styles.bookingServiceCopy, isCompact && styles.bookingServiceCopyCompact]}>
          <View style={styles.bookingServiceTitleRow}>
            <Text style={styles.bookingServiceTitle}>{item.title}</Text>
            <View style={styles.bookingVehicleBadge}>
              <Text style={styles.bookingVehicleBadgeText}>OWNED</Text>
            </View>
          </View>
          <Text style={styles.bookingServiceSubtitle}>{item.subtitle}</Text>
        </View>

        <View style={[styles.bookingVehicleMeta, isCompact && styles.bookingVehicleMetaCompact]}>
          <Text style={styles.bookingVehicleMetaLabel}>PLATE</Text>
          <Text style={styles.bookingVehicleMetaValue}>{item.plateNumber}</Text>
        </View>
      </View>
    </MotionPressable>
  );
}

function BookingServiceCard({ item, isSelected, onPress, isCompact = false }) {
  return (
    <MotionPressable
      style={[
        styles.bookingServiceCard,
        isSelected && styles.bookingServiceCardSelected,
        !item.enabled && styles.bookingServiceCardDisabled,
        isCompact && styles.bookingServiceCardCompact,
      ]}
      onPress={item.enabled ? onPress : undefined}
      disabled={!item.enabled}
      scaleTo={0.988}
    >
      <View style={[styles.bookingServiceIconWrap, !item.enabled && styles.bookingServiceIconWrapDisabled]}>
        <MaterialCommunityIcons
          name={item.icon || 'wrench-outline'}
          size={20}
          color={!item.enabled ? colors.mutedText : isSelected ? colors.primary : colors.labelText}
        />
      </View>

      <View style={[styles.bookingServiceBody, isCompact && styles.bookingServiceBodyCompact]}>
        <View style={[styles.bookingServiceCopy, isCompact && styles.bookingServiceCopyCompact]}>
          <View style={styles.bookingServiceTitleRow}>
            <Text style={[styles.bookingServiceTitle, !item.enabled && styles.bookingDisabledText]}>
              {item.title}
            </Text>
            {item.badgeLabel ? (
              <View style={styles.bookingUnavailableBadge}>
                <Text style={styles.bookingUnavailableBadgeText}>{item.badgeLabel}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.bookingServiceSubtitle, !item.enabled && styles.bookingDisabledSubtext]}>
            {item.subtitle}
          </Text>
        </View>

        <View style={[styles.bookingServiceMeta, isCompact && styles.bookingServiceMetaCompact]}>
          {item.metaLabel ? (
            <Text style={[styles.bookingServicePrice, !item.enabled && styles.bookingDisabledText]}>
              {item.metaLabel}
            </Text>
          ) : null}
          <View style={styles.bookingServiceDurationRow}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={colors.mutedText} />
            <Text style={styles.bookingServiceDuration}>{item.durationLabel}</Text>
          </View>
        </View>
      </View>
    </MotionPressable>
  );
}

function BookingDateCard({ item, isSelected, onPress, isCompact, cardStyle }) {
  return (
    <MotionPressable
      style={[
        styles.bookingDateCard,
        cardStyle,
        isCompact && styles.bookingDateCardCompact,
        isSelected && styles.bookingDateCardActive,
        item.statusTone === 'success' && styles.bookingDateCardSuccess,
        item.statusTone === 'warning' && styles.bookingDateCardLimited,
        item.statusTone === 'danger' && styles.bookingDateCardDanger,
        !item.isSelectable && styles.bookingDateCardDisabled,
      ]}
      onPress={item.isSelectable ? onPress : undefined}
      disabled={!item.isSelectable}
    >
      <View style={styles.bookingDateCardHeader}>
        <Text
          style={[
            styles.bookingDateWeekday,
            isSelected && styles.bookingDateTextActive,
            !item.isSelectable && styles.bookingDisabledSubtext,
          ]}
        >
          {item.weekday}
        </Text>
        <View
          style={[
            styles.bookingDateStatusBadge,
            item.statusTone === 'success' && styles.bookingDateStatusBadgeSuccess,
            item.statusTone === 'warning' && styles.bookingDateStatusBadgeWarning,
            item.statusTone === 'danger' && styles.bookingDateStatusBadgeDanger,
            !item.isSelectable && styles.bookingDateStatusBadgeMuted,
          ]}
        >
          <Text style={styles.bookingDateStatusText}>{item.statusLabel}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.bookingDateDay,
          isSelected && styles.bookingDateTextActive,
          !item.isSelectable && styles.bookingDisabledText,
        ]}
      >
        {item.day}
      </Text>
      <Text
        style={[
          styles.bookingDateMonth,
          isSelected && styles.bookingDateTextActive,
          !item.isSelectable && styles.bookingDisabledSubtext,
        ]}
      >
        {item.month}
      </Text>
      <Text
        style={[
          styles.bookingDateCapacityText,
          isSelected && styles.bookingDateTextActive,
          !item.isSelectable && styles.bookingDisabledSubtext,
        ]}
      >
        {item.capacityLabel}
      </Text>
      <Text
        style={[
          styles.bookingDateDetailText,
          isSelected && styles.bookingDateTextActive,
          !item.isSelectable && styles.bookingDisabledSubtext,
        ]}
      >
        {item.detailLabel}
      </Text>
    </MotionPressable>
  );
}

function BookingTimeSlot({ item, isSelected, onPress, isCompact }) {
  return (
    <MotionPressable
      containerStyle={[
        styles.bookingTimeSlotContainer,
        isCompact && styles.bookingTimeSlotContainerCompact,
      ]}
      style={[
        styles.bookingTimeSlot,
        isCompact && styles.bookingTimeSlotCompact,
        isSelected && styles.bookingTimeSlotActive,
        !item.available && styles.bookingTimeSlotDisabled,
      ]}
      onPress={item.available ? onPress : undefined}
      disabled={!item.available}
    >
      <Text style={[styles.bookingTimeSlotText, isSelected && styles.bookingTimeSlotTextActive, !item.available && styles.bookingTimeSlotTextDisabled]}>
        {item.label}
      </Text>
      {item.timeRangeLabel ? (
        <Text style={[styles.bookingTimeSlotSubtext, isSelected && styles.bookingTimeSlotSubtextActive, !item.available && styles.bookingTimeSlotTextDisabled]}>
          {item.timeRangeLabel}
        </Text>
      ) : null}
      {item.capacityLabel ? (
        <Text style={[styles.bookingTimeSlotReason, isSelected && styles.bookingTimeSlotReasonActive]}>
          {item.capacityLabel}
        </Text>
      ) : null}
      {!item.available && item.reason ? (
        <Text style={styles.bookingTimeSlotReason}>{item.reason}</Text>
      ) : null}
    </MotionPressable>
  );
}

function BookingHistoryCard({ booking, vehicles, isSelected, onPress }) {
  return (
    <MotionPressable
      style={[styles.bookingHistoryCard, isSelected && styles.bookingHistoryCardActive]}
      onPress={onPress}
      scaleTo={0.988}
    >
      <View style={styles.bookingHistoryCardHeader}>
        <Text style={styles.bookingHistoryReference}>#{getBookingReference(booking)}</Text>
        <View style={styles.bookingHistoryStatusPill}>
          <Text style={styles.bookingHistoryStatusText}>{getBookingStatusLabel(booking.status)}</Text>
        </View>
      </View>

      <Text style={styles.bookingHistoryTitle}>{getBookingServiceNames(booking)}</Text>
      <Text style={styles.bookingHistoryMeta}>
        {formatBookingDateLabel(booking.scheduledDate)} - {getBookingTimeLabel(booking)}
      </Text>
      <Text style={styles.bookingHistoryMeta}>{getBookingVehicleLabel(booking, vehicles)}</Text>
    </MotionPressable>
  );
}

function TrackingStep({ item, isLast }) {
  const isDone = item.state === 'done';
  const isCurrent = item.state === 'current';
  const isDim = item.state === 'upcoming' || item.state === 'inactive';

  return (
    <View style={styles.trackingStepRow}>
      <View style={styles.trackingRail}>
        <View
          style={[
            styles.trackingStepDot,
            isDone && styles.trackingStepDotDone,
            isCurrent && styles.trackingStepDotCurrent,
            isDim && styles.trackingStepDotIdle,
          ]}
        >
          {isDone ? (
            <MaterialCommunityIcons name="check" size={14} color={colors.text} />
          ) : isCurrent ? (
            <View style={styles.trackingStepDotCurrentCore} />
          ) : null}
        </View>
        {!isLast ? (
          <View
            style={[
              styles.trackingStepLine,
              (isDone || isCurrent) && styles.trackingStepLineActive,
              item.state === 'inactive' && styles.trackingStepLineIdle,
            ]}
          />
        ) : null}
      </View>

      <View style={styles.trackingStepContent}>
        <Text
          style={[
            styles.trackingStepTitle,
            isCurrent && styles.trackingStepTitleCurrent,
            item.state === 'inactive' && styles.trackingStepTitleInactive,
          ]}
        >
          {item.label}
        </Text>
        <Text style={[styles.trackingStepStatus, item.state === 'inactive' && styles.trackingStepStatusInactive]}>
          {item.status}
        </Text>
        {item.note ? (
          <View style={[styles.trackingStepNoteCard, item.state === 'inactive' && styles.trackingStepNoteCardInactive]}>
            <Text style={[styles.trackingStepNoteText, item.state === 'inactive' && styles.trackingStepNoteTextInactive]}>
              {item.note}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function QuickActionCard({ item, onPress, isCompact = false }) {
  return (
    <MotionPressable
      containerStyle={[
        styles.quickActionCardContainer,
        isCompact && styles.quickActionCardContainerCompact,
      ]}
      style={styles.quickActionCard}
      onPress={onPress}
    >
      <View
        style={[
          styles.quickActionIconWrap,
          isCompact && styles.quickActionIconWrapCompact,
          { backgroundColor: item.bgColor },
        ]}
      >
        <View style={[styles.quickActionIconInner, { backgroundColor: item.iconColor }]}>
          <MaterialCommunityIcons name={item.icon} size={20} color={colors.text} />
        </View>
      </View>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </MotionPressable>
  );
}

function HomeServiceRow({ item, isCompact = false }) {
  return (
    <View style={[styles.homeServiceRow, isCompact && styles.homeServiceRowCompact]}>
      <View style={[styles.homeServiceRowLeft, isCompact && styles.homeServiceRowLeftCompact]}>
        <View style={styles.homeServiceIconWrap}>
          <MaterialCommunityIcons name={item.icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.homeServiceCopy}>
          <Text style={styles.homeServiceTitle}>{item.title}</Text>
          <Text style={styles.homeServiceDate}>{item.dateLabel}</Text>
        </View>
      </View>

      <View style={styles.homeServiceStatusPill}>
        <Text style={styles.homeServiceStatusText}>{item.status}</Text>
      </View>
    </View>
  );
}

function TimelineEventCard({ item }) {
  const statusToneStyle =
    item.statusTone === 'verified'
      ? styles.timelineStatusPillSuccess
      : styles.timelineStatusPillDefault;
  const statusTextToneStyle =
    item.statusTone === 'verified'
      ? styles.timelineStatusTextSuccess
      : styles.timelineStatusTextDefault;
  const typeToneStyle =
    item.typeTone === 'summary'
      ? styles.timelineTypePillSummary
      : item.typeTone === 'verified'
        ? styles.timelineTypePillVerified
        : styles.timelineTypePillAdministrative;

  return (
    <View style={styles.timelineEventCard}>
      <View style={styles.timelineEventRail}>
        <View style={styles.timelineEventDot}>
          <MaterialCommunityIcons name={item.icon} size={15} color={colors.primary} />
        </View>
        <View style={styles.timelineEventLine} />
      </View>

      <View style={styles.timelineEventContent}>
        <View style={styles.timelineEventHeader}>
          <Text style={styles.timelineEventTitle}>{item.title}</Text>
          <View style={[styles.timelineStatusPill, statusToneStyle]}>
            <Text style={[styles.timelineStatusText, statusTextToneStyle]}>
              {item.statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.timelineEventSummary}>{item.summary}</Text>
        {item.metaLabel ? (
          <Text style={styles.timelineEventMechanic}>{`\u2022 ${item.metaLabel}`}</Text>
        ) : null}
        <View style={styles.timelineEventFooter}>
          <View style={styles.timelineEventMetaRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.mutedText} />
            <Text style={styles.timelineEventDate}>{item.dateLabel}</Text>
          </View>
          <Text style={styles.timelineEventPrice}>{item.sourceLabel}</Text>
        </View>
        <View style={[styles.timelineTypePill, typeToneStyle]}>
          <Text style={styles.timelineTypeText}>{item.typeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function TimelineStateCard({ icon, title, message }) {
  return (
    <View style={styles.timelineStateCard}>
      <View style={styles.timelineStateIconWrap}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.timelineStateTitle}>{title}</Text>
      <Text style={styles.timelineStateText}>{message}</Text>
    </View>
  );
}

function LifecycleSummaryCard({ summaryCard }) {
  const pillStyle =
    summaryCard.state === 'reviewed_summary_visible'
      ? styles.timelineSummaryPillVisible
      : summaryCard.state === 'pending_summary_hidden'
        ? styles.timelineSummaryPillPending
        : styles.timelineSummaryPillHidden;
  const pillTextStyle =
    summaryCard.state === 'reviewed_summary_visible'
      ? styles.timelineSummaryPillTextVisible
      : summaryCard.state === 'pending_summary_hidden'
        ? styles.timelineSummaryPillTextPending
        : styles.timelineSummaryPillTextHidden;

  return (
    <View style={styles.timelineSummaryCard}>
      <View style={styles.timelineSummaryHeader}>
        <View>
          <Text style={styles.bookingEyebrow}>REVIEWED SUMMARY</Text>
          <Text style={styles.timelineSummaryTitle}>{summaryCard.title}</Text>
        </View>
        <View style={[styles.timelineSummaryPill, pillStyle]}>
          <Text style={[styles.timelineSummaryPillText, pillTextStyle]}>
            {summaryCard.stateLabel}
          </Text>
        </View>
      </View>

      {summaryCard.summaryText ? (
        <Text style={styles.timelineSummaryBody}>{summaryCard.summaryText}</Text>
      ) : null}

      <Text style={styles.timelineSummaryHelperText}>{summaryCard.helperText}</Text>

      {summaryCard.reviewedAt ? (
        <Text style={styles.timelineSummaryMeta}>
          {`Updated ${formatDate(new Date(summaryCard.reviewedAt))}`}
        </Text>
      ) : null}
    </View>
  );
}

export default function Dashboard({
  account,
  navigation,
  route,
  onSignOut,
  onSaveProfile,
  onStartDeleteAccountOtp,
}) {
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const isTinyPhone = !isWeb && windowWidth < 340;
  const isVeryCompactPhone = !isWeb && windowWidth < 360;
  const isCompactPhone = !isWeb && windowWidth < 390;
  const bookingDateCardStyle = isVeryCompactPhone
    ? { flexBasis: '100%', maxWidth: '100%' }
    : isCompactPhone
      ? { flexBasis: '47%', maxWidth: '47%' }
      : { flexBasis: '31%', maxWidth: '31%' };
  const [activeTab, setActiveTab] = useState('explore');
  const [menuScreen, setMenuScreen] = useState('root');
  const [bookingMode, setBookingMode] = useState('book');
  const [bookingDiscovery, setBookingDiscovery] = useState(createInitialBookingDiscoveryState);
  const [selectedBookingServiceKey, setSelectedBookingServiceKey] = useState(null);
  const [selectedBookingTimeKey, setSelectedBookingTimeKey] = useState(null);
  const [selectedBookingVehicleId, setSelectedBookingVehicleId] = useState(null);
  const [selectedBookingDateKey, setSelectedBookingDateKey] = useState(null);
  const [bookingServicePage, setBookingServicePage] = useState(0);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingCreateState, setBookingCreateState] = useState(createInitialBookingCreateState);
  const [bookingHistory, setBookingHistory] = useState(createInitialBookingHistoryState);
  const [selectedHistoryBookingId, setSelectedHistoryBookingId] = useState(null);
  const [bookingDetailState, setBookingDetailState] = useState(createInitialBookingDetailState);
  const [notificationsFeed, setNotificationsFeed] = useState([]);
  const [notificationModuleState, setNotificationModuleState] = useState(
    createInitialNotificationModuleState,
  );
  const [catalogState, setCatalogState] = useState(createInitialCatalogState);
  const [catalogDetailState, setCatalogDetailState] = useState(createInitialCatalogDetailState);
  const [cartState, setCartState] = useState(createInitialCartState);
  const [checkoutState, setCheckoutState] = useState(() => createInitialCheckoutState(account));
  const [storeSection, setStoreSection] = useState('catalog');
  const [storeOrderHistoryState, setStoreOrderHistoryState] = useState(
    createInitialStoreOrderHistoryState,
  );
  const [selectedStoreOrderId, setSelectedStoreOrderId] = useState(null);
  const [storeOrderTrackingState, setStoreOrderTrackingState] = useState(
    createInitialStoreOrderTrackingState,
  );
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [isProfileTooltipVisible, setIsProfileTooltipVisible] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('All');
  const [digitalGarageState, setDigitalGarageState] = useState(
    createInitialDigitalGarageState,
  );
  const [selectedGarageVehicleId, setSelectedGarageVehicleId] = useState(
    account?.primaryVehicleId ?? null,
  );
  const [garageReloadKey, setGarageReloadKey] = useState(0);
  const [vehicleLifecycleState, setVehicleLifecycleState] = useState(
    createInitialVehicleLifecycleState,
  );
  const [loyaltyState, setLoyaltyState] = useState(createInitialLoyaltyState);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [profileSection, setProfileSection] = useState('rewards');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(createProfileForm(account));
  const primaryVehicleLabel =
    account?.primaryVehicle?.displayName ||
    account?.vehicleDisplayName ||
    account?.vehicleModel ||
    'No vehicle selected';
  const primaryVehicleMetaLabel = [
    account?.licensePlate,
    account?.vehicleYear ? `${account.vehicleYear} Model` : null,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' - ') || 'Add vehicle details to personalize this card.';
  const loyaltyPointsBalance = loyaltyState.account?.pointsBalance ?? 0;
  const loyaltyTier = loyaltyState.tier ?? {
    key: customerLoyaltyTiers[0].key,
    label: customerLoyaltyTiers[0].label,
    nextTierLabel: customerLoyaltyTiers[1]?.label ?? null,
    pointsToNext: customerLoyaltyTiers[1]?.minPoints ?? 0,
    progressRatio: 0,
  };
  const loyaltyRewards = loyaltyState.rewards ?? [];
  const loyaltyTransactions = loyaltyState.transactions ?? [];
  const featuredReward = loyaltyState.featuredReward ?? null;
  const recentHomeServices = bookingHistory.bookings.length
    ? bookingHistory.bookings.slice(0, 3).map((booking) => ({
        key: booking.id ?? getBookingReference(booking),
        icon:
          booking.status === 'completed'
            ? 'check-decagram-outline'
            : booking.status === 'declined' || booking.status === 'cancelled'
              ? 'close-circle-outline'
              : 'calendar-check-outline',
        title: getBookingServiceNames(booking),
        dateLabel: `${formatBookingDateLabel(booking.scheduledDate)} - ${getBookingTimeLabel(booking)}`,
        status: getBookingStatusLabel(booking.status),
      }))
    : recentServiceHistory.slice(0, 3);
  const featuredRewardEyebrow = featuredReward
    ? featuredReward.available
      ? 'READY TO REDEEM'
      : 'LIVE LOYALTY REWARD'
    : 'LOYALTY REWARDS';
  const featuredRewardTitle = featuredReward?.title ?? 'Loyalty rewards are now live';
  const featuredRewardSubtitle = featuredReward
    ? featuredReward.available
      ? `${featuredReward.description} Redeem now for ${featuredReward.pointsLabel}.`
      : `${featuredReward.description} ${featuredReward.remainingPoints.toLocaleString()} more points needed to unlock it.`
    : 'Your points wallet is connected. Active rewards will appear here once staff publish the customer catalog.';
  const featuredRewardButtonLabel =
    featuredReward && featuredReward.available ? 'Claim Reward' : 'Open Rewards';
  const lastHandledSupportJumpRef = useRef(null);
  const activeStoreOrderRequestRef = useRef(null);
  const [profileErrors, setProfileErrors] = useState({});
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [securityErrors, setSecurityErrors] = useState({});
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenTranslateAnim = useRef(new Animated.Value(0)).current;
  const cartOverlayAnim = useRef(new Animated.Value(0)).current;
  const productOverlayAnim = useRef(new Animated.Value(0)).current;
  const notificationPanelAnim = useRef(new Animated.Value(0)).current;
  const bottomNavIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setProfileForm(createProfileForm(account));
  }, [account]);

  useEffect(() => {
    setBookingDiscovery(createInitialBookingDiscoveryState());
    setSelectedBookingServiceKey(null);
    setSelectedBookingTimeKey(null);
    setSelectedBookingVehicleId(null);
    setSelectedBookingDateKey(null);
    setBookingServicePage(0);
    setBookingNotes('');
    setBookingCreateState(createInitialBookingCreateState());
    setBookingHistory(createInitialBookingHistoryState());
    setSelectedHistoryBookingId(null);
    setBookingDetailState(createInitialBookingDetailState());
    setNotificationsFeed([]);
    setNotificationModuleState(createInitialNotificationModuleState());
    setTimelineFilter('All');
    setDigitalGarageState(createInitialDigitalGarageState());
    setSelectedGarageVehicleId(account?.primaryVehicleId ?? null);
    setGarageReloadKey(0);
    setVehicleLifecycleState(createInitialVehicleLifecycleState());
    setLoyaltyState(createInitialLoyaltyState());
    setCatalogState(createInitialCatalogState());
    setCatalogDetailState(createInitialCatalogDetailState());
    setCartState(createInitialCartState());
    setCheckoutState(createInitialCheckoutState(account));
    setStoreSection('catalog');
    setStoreOrderHistoryState(createInitialStoreOrderHistoryState());
    setSelectedStoreOrderId(null);
    setStoreOrderTrackingState(createInitialStoreOrderTrackingState());
    activeStoreOrderRequestRef.current = null;
  }, [account?.accessToken, account?.userId]);

  useEffect(() => {
    const supportJump = route?.params?.supportJump;

    if (!supportJump?.id || lastHandledSupportJumpRef.current === supportJump.id) {
      return;
    }

    lastHandledSupportJumpRef.current = supportJump.id;

    if (supportJump.activeTab) {
      setActiveTab(supportJump.activeTab);
    }

    if (supportJump.bookingMode) {
      setBookingMode(supportJump.bookingMode);
    }

    if (supportJump.menuScreen) {
      setMenuScreen(supportJump.menuScreen);
    }

    if (supportJump.profileSection) {
      setProfileSection(supportJump.profileSection);
    }

    if (Object.prototype.hasOwnProperty.call(supportJump, 'selectedHistoryBookingId')) {
      setSelectedHistoryBookingId(supportJump.selectedHistoryBookingId ?? null);
    }

    setIsProfileTooltipVisible(false);
  }, [route?.params?.supportJump]);

  const loadNotificationModuleState = async () => {
    if (!account?.accessToken || !account?.userId) {
      setNotificationsFeed([]);
      setNotificationModuleState(createInitialNotificationModuleState());
      return;
    }

    setNotificationModuleState((currentState) => ({
      ...currentState,
      status: 'loading',
      errorMessage: '',
    }));

    try {
      const notificationSnapshot = await loadCustomerNotificationSnapshot({
        userId: account.userId,
        accessToken: account.accessToken,
      });

      setNotificationsFeed(notificationSnapshot.notifications);
      setNotificationModuleState({
        status: 'ready',
        preferences: notificationSnapshot.preferences,
        notifications: notificationSnapshot.notifications,
        errorMessage: '',
        savingKey: null,
      });
    } catch (error) {
      const nextMessage =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load your notification settings right now.';

      setNotificationsFeed([]);
      setNotificationModuleState({
        status: 'error',
        preferences: null,
        notifications: [],
        errorMessage: nextMessage,
        savingKey: null,
      });
    }
  };

  const loadLoyaltyModuleState = async () => {
    if (!account?.accessToken || !account?.userId) {
      setLoyaltyState(createInitialLoyaltyState());
      return;
    }

    setLoyaltyState((currentState) => ({
      ...currentState,
      status: 'loading',
      errorMessage: '',
    }));

    try {
      const loyaltySnapshot = await loadCustomerLoyaltySnapshot({
        userId: account.userId,
        accessToken: account.accessToken,
      });

      setLoyaltyState({
        status: 'ready',
        ...loyaltySnapshot,
        errorMessage: '',
        redeemingRewardId: null,
      });
    } catch (error) {
      const nextMessage =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load your loyalty data right now.';

      setLoyaltyState((currentState) => ({
        ...currentState,
        status: currentState.account ? 'ready' : 'error',
        errorMessage: nextMessage,
        redeemingRewardId: null,
      }));
    }
  };

  const loadCatalogModuleState = async () => {
    setCatalogState((currentState) => ({
      ...currentState,
      status: 'loading',
      errorMessage: '',
    }));

    try {
      const snapshot = await loadCustomerCatalogSnapshot({
        accessToken: account?.accessToken,
      });

      setCatalogState({
        status: snapshot.products.length > 0 ? 'ready' : 'empty',
        categories: snapshot.categories,
        products: snapshot.products,
        errorMessage: '',
        apiBaseUrl: getEcommerceApiBaseUrl(),
      });
    } catch (error) {
      const message =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load the live product catalog right now.';

      setCatalogState((currentState) => ({
        ...currentState,
        status: 'error',
        errorMessage: message,
        categories: [],
        products: [],
        apiBaseUrl: getEcommerceApiBaseUrl(),
      }));
    }
  };

  const applyCartSnapshot = (snapshot, options = {}) => {
    const nextSnapshot = snapshot ?? createEmptyCustomerCartSnapshot();

    setCartState({
      status: nextSnapshot.totalQuantity > 0 ? 'ready' : 'empty',
      errorMessage: options.errorMessage ?? '',
      savingItemId: options.savingItemId ?? null,
      ...nextSnapshot,
    });
  };

  const applyStoreOrderHistorySnapshot = (snapshot, options = {}) => {
    const nextSnapshot = snapshot ?? createEmptyCustomerOrderHistorySnapshot();
    const preferredOrderId = String(options.preferredOrderId ?? '').trim();

    setStoreOrderHistoryState({
      status: nextSnapshot.orders.length > 0 ? 'ready' : 'empty',
      errorMessage: options.errorMessage ?? '',
      ...nextSnapshot,
    });
    setSelectedStoreOrderId((currentOrderId) => {
      if (nextSnapshot.orders.some((order) => order.id === currentOrderId)) {
        return currentOrderId;
      }

      if (preferredOrderId && nextSnapshot.orders.some((order) => order.id === preferredOrderId)) {
        return preferredOrderId;
      }

      return nextSnapshot.orders[0]?.id ?? null;
    });
  };

  const loadCartModuleState = async () => {
    if (!account?.userId) {
      setCartState({
        ...createInitialCartState(),
        status: 'error',
        errorMessage: 'Sign in again to load your ecommerce cart.',
      });
      return;
    }

    setCartState((currentState) => ({
      ...currentState,
      status: currentState.totalQuantity > 0 ? 'ready' : 'loading',
      errorMessage: '',
    }));

    try {
      const snapshot = await getCustomerCart({
        customerUserId: account.userId,
        accessToken: account.accessToken,
      });

      applyCartSnapshot(snapshot);
    } catch (error) {
      const message =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load your ecommerce cart right now.';

      setCartState((currentState) => ({
        ...currentState,
        status: 'error',
        errorMessage: message,
        savingItemId: null,
      }));
    }
  };

  const loadStoreOrderHistoryState = async (options = {}) => {
    if (!account?.userId) {
      setStoreOrderHistoryState({
        ...createInitialStoreOrderHistoryState(),
        status: 'error',
        errorMessage: 'Sign in again to load your order history.',
      });
      return;
    }

    setStoreOrderHistoryState((currentState) => ({
      ...currentState,
      status: currentState.orders.length > 0 ? 'ready' : 'loading',
      errorMessage: '',
    }));

    try {
      const snapshot = await listCustomerOrders({
        customerUserId: account.userId,
        accessToken: account.accessToken,
      });

      applyStoreOrderHistorySnapshot(snapshot, {
        preferredOrderId: options.preferredOrderId,
      });
    } catch (error) {
      const message =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load your order history right now.';

      setStoreOrderHistoryState((currentState) => ({
        ...currentState,
        status: 'error',
        errorMessage: message,
      }));
    }
  };

  const loadStoreOrderTrackingState = async (orderId, options = {}) => {
    const normalizedOrderId = String(orderId ?? '').trim();

    if (!normalizedOrderId) {
      setStoreOrderTrackingState(createInitialStoreOrderTrackingState());
      return;
    }

    const seededOrder =
      options.seedOrder && options.seedOrder.id === normalizedOrderId ? options.seedOrder : null;
    activeStoreOrderRequestRef.current = normalizedOrderId;

    setStoreOrderTrackingState((currentState) => ({
      status:
        currentState.order?.id === normalizedOrderId && currentState.status === 'ready' && !options.force
          ? 'ready'
          : seededOrder
            ? 'ready'
            : 'loading',
      order:
        seededOrder ||
        (currentState.order?.id === normalizedOrderId ? currentState.order : null),
      invoiceStatus:
        currentState.order?.id === normalizedOrderId && currentState.invoiceStatus === 'ready' && !options.force
          ? 'ready'
          : 'loading',
      invoice:
        currentState.order?.id === normalizedOrderId && !options.force
          ? currentState.invoice
          : null,
      errorMessage: '',
      invoiceErrorMessage: '',
    }));

    try {
      const order = await getCustomerOrderDetail({
        orderId: normalizedOrderId,
        accessToken: account?.accessToken,
      });

      if (activeStoreOrderRequestRef.current !== normalizedOrderId) {
        return;
      }

      setStoreOrderTrackingState((currentState) => ({
        ...currentState,
        status: 'ready',
        order,
        errorMessage: '',
      }));
      setStoreOrderHistoryState((currentState) => {
        if (!currentState.orders.length) {
          return currentState;
        }

        return {
          ...currentState,
          orders: currentState.orders.map((currentOrder) =>
            currentOrder.id === order.id ? order : currentOrder
          ),
        };
      });

      try {
        const invoice = await getCustomerOrderInvoice({
          orderId: normalizedOrderId,
          accessToken: account?.accessToken,
        });

        if (activeStoreOrderRequestRef.current !== normalizedOrderId) {
          return;
        }

        setStoreOrderTrackingState((currentState) => ({
          ...currentState,
          status: 'ready',
          order,
          invoiceStatus: 'ready',
          invoice,
          invoiceErrorMessage: '',
        }));
      } catch (error) {
        if (activeStoreOrderRequestRef.current !== normalizedOrderId) {
          return;
        }

        const isMissingInvoice = error instanceof ApiError && error.status === 404;
        const invoiceMessage = isMissingInvoice
          ? 'No invoice tracking record was returned for this order yet.'
          : error instanceof ApiError && error.message
            ? error.message
            : 'We could not load invoice tracking for this order right now.';

        setStoreOrderTrackingState((currentState) => ({
          ...currentState,
          status: 'ready',
          order,
          invoiceStatus: isMissingInvoice ? 'not_found' : 'error',
          invoice: null,
          invoiceErrorMessage: invoiceMessage,
        }));
      }
    } catch (error) {
      if (activeStoreOrderRequestRef.current !== normalizedOrderId) {
        return;
      }

      const message =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load order tracking right now.';
      const nextStatus =
        error instanceof ApiError && [401, 403].includes(error.status) ? 'unauthorized' : 'error';

      setStoreOrderTrackingState({
        ...buildStoreOrderSelectionState(seededOrder),
        status: nextStatus,
        errorMessage: message,
      });
    }
  };

  useEffect(() => {
    screenFadeAnim.stopAnimation();
    screenTranslateAnim.stopAnimation();
    screenFadeAnim.setValue(0);
    screenTranslateAnim.setValue(14);

    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, menuScreen, bookingMode, profileSection, screenFadeAnim, screenTranslateAnim]);

  useEffect(() => {
    if (isCartVisible) {
      cartOverlayAnim.stopAnimation();
      cartOverlayAnim.setValue(0);
      Animated.timing(cartOverlayAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isCartVisible, cartOverlayAnim]);

  useEffect(() => {
    if (catalogDetailState.status !== 'idle') {
      productOverlayAnim.stopAnimation();
      productOverlayAnim.setValue(0);
      Animated.timing(productOverlayAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [catalogDetailState.status, productOverlayAnim]);

  useEffect(() => {
    if (activeTab !== 'messages') {
      return undefined;
    }

    const fallbackGarageSnapshot = buildDigitalGarageSnapshot({
      vehicles: account?.ownedVehicles ?? [],
      preferredVehicleId: selectedGarageVehicleId ?? account?.primaryVehicleId,
    });

    if (!account?.accessToken || !account?.userId) {
      setDigitalGarageState({
        ...createEmptyCustomerDigitalGarageSnapshot(),
        status: 'garage_unauthorized',
        errorMessage: 'Sign in again to load your Digital Garage.',
      });
      setSelectedGarageVehicleId(null);
      return undefined;
    }

    let isCancelled = false;

    const loadGarage = async () => {
      setDigitalGarageState({
        ...fallbackGarageSnapshot,
        status: 'garage_loading',
        errorMessage: '',
      });

      try {
        const garageSnapshot = await loadCustomerDigitalGarageSnapshot({
          userId: account.userId,
          accessToken: account.accessToken,
          preferredVehicleId: selectedGarageVehicleId ?? account.primaryVehicleId,
        });

        if (isCancelled) {
          return;
        }

        setDigitalGarageState({
          ...garageSnapshot,
          status: garageSnapshot.status,
          errorMessage: '',
        });
        setSelectedGarageVehicleId((currentVehicleId) =>
          garageSnapshot.vehicles.some((vehicle) => vehicle.id === currentVehicleId)
            ? currentVehicleId
            : garageSnapshot.primaryVehicleId,
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : 'We could not load your owned vehicles right now.';
        const statusCode = error instanceof ApiError ? error.status : null;

        setDigitalGarageState({
          ...fallbackGarageSnapshot,
          status:
            statusCode === 401 || statusCode === 403
              ? 'garage_forbidden'
              : 'garage_failed',
          errorMessage: message,
        });
        setSelectedGarageVehicleId((currentVehicleId) =>
          fallbackGarageSnapshot.vehicles.some((vehicle) => vehicle.id === currentVehicleId)
            ? currentVehicleId
            : fallbackGarageSnapshot.primaryVehicleId,
        );
      }
    };

    loadGarage();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, account?.accessToken, account?.userId, account?.primaryVehicleId, garageReloadKey]);

  useEffect(() => {
    if (activeTab !== 'messages') {
      return undefined;
    }

    if (!account?.accessToken) {
      const emptyLifecycleSnapshot = createEmptyCustomerVehicleLifecycleSnapshot();
      setVehicleLifecycleState({
        status: 'timeline_forbidden',
        errorMessage: 'Sign in again to view your vehicle lifecycle history.',
        ...emptyLifecycleSnapshot,
      });
      return undefined;
    }

    if (!selectedGarageVehicleId) {
      const emptyLifecycleSnapshot = createEmptyCustomerVehicleLifecycleSnapshot();
      setVehicleLifecycleState({
        status: 'timeline_empty',
        errorMessage: 'Add a vehicle first to unlock lifecycle history.',
        ...emptyLifecycleSnapshot,
      });
      return undefined;
    }

    let isCancelled = false;

    const loadVehicleLifecycle = async () => {
      setVehicleLifecycleState((currentState) => ({
        ...currentState,
        status: 'timeline_loading',
        errorMessage: '',
      }));

      try {
        const lifecycleSnapshot = await loadCustomerVehicleLifecycleSnapshot({
          vehicleId: selectedGarageVehicleId,
          accessToken: account.accessToken,
        });

        if (isCancelled) {
          return;
        }

        setVehicleLifecycleState({
          status: lifecycleSnapshot.timelineState,
          errorMessage: '',
          ...lifecycleSnapshot,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const emptyLifecycleSnapshot = createEmptyCustomerVehicleLifecycleSnapshot();
        let nextStatus = 'timeline_load_failed';
        let nextMessage =
          'We could not load your lifecycle history right now. Please try again in a moment.';

        if (error instanceof ApiError) {
          if (error.status === 401 || error.status === 403) {
            nextStatus = 'timeline_forbidden';
            nextMessage = 'Your customer session cannot access lifecycle history right now.';
          } else if (error.status === 404) {
            nextStatus = 'timeline_not_found';
            nextMessage = 'We could not find lifecycle history for the selected vehicle.';
          } else if (error.message) {
            nextMessage = error.message;
          }
        }

        setVehicleLifecycleState({
          status: nextStatus,
          errorMessage: nextMessage,
          ...emptyLifecycleSnapshot,
        });
      }
    };

    loadVehicleLifecycle();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, account?.accessToken, selectedGarageVehicleId]);

  useEffect(() => {
    let isCancelled = false;

    const loadCustomerEngagementModules = async () => {
      if (isCancelled) {
        return;
      }

      await loadNotificationModuleState();

      if (isCancelled) {
        return;
      }

      await loadLoyaltyModuleState();
    };

    loadCustomerEngagementModules();

    return () => {
      isCancelled = true;
    };
  }, [account?.accessToken, account?.userId]);

  useEffect(() => {
    if (activeTab !== 'store') {
      return;
    }

    if (catalogState.status !== 'idle') {
      return;
    }

    void loadCatalogModuleState();
  }, [activeTab, catalogState.status]);

  useEffect(() => {
    if (activeTab !== 'store') {
      return;
    }

    if (cartState.status !== 'idle') {
      return;
    }

    void loadCartModuleState();
  }, [activeTab, cartState.status]);

  useEffect(() => {
    if (activeTab !== 'store' || storeSection !== 'orders') {
      return;
    }

    if (storeOrderHistoryState.status !== 'idle') {
      return;
    }

    void loadStoreOrderHistoryState();
  }, [activeTab, storeOrderHistoryState.status, storeSection]);

  useEffect(() => {
    if (activeTab !== 'store' || storeSection !== 'orders') {
      return;
    }

    if (!selectedStoreOrderId) {
      activeStoreOrderRequestRef.current = null;
      setStoreOrderTrackingState(createInitialStoreOrderTrackingState());
      return;
    }

    if (
      storeOrderTrackingState.order?.id === selectedStoreOrderId &&
      storeOrderTrackingState.status === 'ready' &&
      storeOrderTrackingState.invoiceStatus !== 'idle'
    ) {
      return;
    }

    const seededOrder =
      storeOrderHistoryState.orders.find((order) => order.id === selectedStoreOrderId) ?? null;

    void loadStoreOrderTrackingState(selectedStoreOrderId, {
      seedOrder: seededOrder,
    });
  }, [
    activeTab,
    selectedStoreOrderId,
    storeOrderHistoryState.orders,
    storeOrderTrackingState.invoiceStatus,
    storeOrderTrackingState.order?.id,
    storeOrderTrackingState.status,
    storeSection,
  ]);

  useEffect(() => {
    if (activeTab !== 'notifications' || bookingMode !== 'book') {
      return;
    }

    if (bookingDiscovery.status !== 'idle') {
      return;
    }

    let isCancelled = false;

    const loadBookingDiscovery = async () => {
      setBookingDiscovery((currentState) => ({
        ...currentState,
        status: 'loading',
        availability:
          currentState.availability.status === 'ready'
            ? {
                ...currentState.availability,
                status: 'loading',
                errorMessage: '',
              }
            : currentState.availability,
        errorMessage: '',
      }));

      try {
        const nextSnapshot = await loadBookingDiscoverySnapshot({
          userId: account?.userId,
          accessToken: account?.accessToken,
          availabilityWindow: getInitialBookingAvailabilityWindow(),
        });

        if (isCancelled) {
          return;
        }

        setBookingDiscovery({
          status: 'ready',
          services: nextSnapshot.services,
          timeSlots: nextSnapshot.timeSlots,
          vehicles: nextSnapshot.vehicles,
          availability: {
            status: 'ready',
            errorMessage: '',
            ...nextSnapshot.availability,
          },
          errorMessage: '',
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Unable to load booking discovery right now.';
        const isUnauthorized = error instanceof ApiError && [401, 403].includes(error.status);

        setBookingDiscovery((currentState) => ({
          ...currentState,
          status: isUnauthorized ? 'unauthorized' : 'error',
          availability: {
            ...currentState.availability,
            status: isUnauthorized ? 'unauthorized' : 'error',
            errorMessage: message,
          },
          errorMessage: message,
        }));
      }
    };

    void loadBookingDiscovery();

    return () => {
      isCancelled = true;
    };
  }, [
    account?.accessToken,
    account?.userId,
    activeTab,
    bookingMode,
  ]);

  useEffect(() => {
    const matchingVehicle = bookingDiscovery.vehicles.find(
      (vehicle) => vehicle.id === selectedBookingVehicleId,
    );
    if (!matchingVehicle) {
      setSelectedBookingVehicleId(bookingDiscovery.vehicles[0]?.id ?? null);
    }

    const matchingService = bookingDiscovery.services.find(
      (service) => service.id === selectedBookingServiceKey && service.isActive,
    );
    if (!matchingService) {
      setSelectedBookingServiceKey(
        bookingDiscovery.services.find(isBookableService)?.id ?? bookingDiscovery.services[0]?.id ?? null,
      );
    }

    const matchingTimeSlot = bookingDiscovery.timeSlots.find(
      (timeSlot) => timeSlot.id === selectedBookingTimeKey && timeSlot.isActive,
    );
    if (!matchingTimeSlot) {
      setSelectedBookingTimeKey(
        bookingDiscovery.timeSlots.find(isBookableTimeSlot)?.id ?? bookingDiscovery.timeSlots[0]?.id ?? null,
      );
    }
  }, [
    bookingDiscovery.services,
    bookingDiscovery.timeSlots,
    bookingDiscovery.vehicles,
    selectedBookingServiceKey,
    selectedBookingTimeKey,
    selectedBookingVehicleId,
  ]);

  useEffect(() => {
    if (bookingDiscovery.availability.status !== 'ready') {
      return;
    }

    const nextDateKey =
      selectedBookingDateKey &&
      getBookingAvailabilityDayByDate(bookingDiscovery.availability, selectedBookingDateKey)
        ? selectedBookingDateKey
        : getFirstBookableBookingDateKey(bookingDiscovery.availability, selectedBookingTimeKey);

    if (nextDateKey && nextDateKey !== selectedBookingDateKey) {
      setSelectedBookingDateKey(nextDateKey);
    }
  }, [
    bookingDiscovery.availability,
    selectedBookingDateKey,
    selectedBookingTimeKey,
  ]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((bookingDiscovery.services?.length || 0) / BOOKING_SERVICE_PAGE_SIZE),
    );

    setBookingServicePage((currentPage) => Math.min(currentPage, totalPages - 1));
  }, [bookingDiscovery.services]);

  useEffect(() => {
    const shouldLoadBookingHistory =
      activeTab === 'explore' || (activeTab === 'notifications' && bookingMode === 'track');

    if (!shouldLoadBookingHistory) {
      return;
    }

    if (bookingHistory.status !== 'idle') {
      return;
    }

    let isCancelled = false;

    const loadBookingHistory = async () => {
      setBookingHistory((currentState) => ({
        ...currentState,
        status: 'loading',
        errorMessage: '',
      }));

      try {
        const bookings = await listCustomerBookings({
          userId: account?.userId,
          accessToken: account?.accessToken,
        });

        if (isCancelled) {
          return;
        }

        setBookingHistory({
          status: 'ready',
          bookings,
          errorMessage: '',
        });
        setSelectedHistoryBookingId((currentBookingId) =>
          bookings.some((booking) => booking.id === currentBookingId)
            ? currentBookingId
            : bookings[0]?.id ?? null,
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Unable to load booking history right now.';
        const isUnauthorized = error instanceof ApiError && [401, 403].includes(error.status);

        setBookingHistory((currentState) => ({
          ...currentState,
          status: isUnauthorized ? 'unauthorized' : 'error',
          errorMessage: message,
        }));
      }
    };

    void loadBookingHistory();

    return () => {
      isCancelled = true;
    };
  }, [
    account?.accessToken,
    account?.userId,
    activeTab,
    bookingMode,
  ]);

  useEffect(() => {
    if (activeTab !== 'notifications' || bookingMode !== 'track') {
      return;
    }

    if (!selectedHistoryBookingId) {
      setBookingDetailState(createInitialBookingDetailState());
      return;
    }

    let isCancelled = false;

    const loadBookingDetail = async () => {
      setBookingDetailState((currentState) => ({
        ...currentState,
        status: 'loading',
        errorMessage: '',
      }));

      try {
        const booking = await getBookingById({
          bookingId: selectedHistoryBookingId,
          accessToken: account?.accessToken,
        });

        if (isCancelled) {
          return;
        }

        setBookingDetailState({
          status: 'ready',
          booking,
          errorMessage: '',
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Unable to load booking detail right now.';
        const isUnauthorized = error instanceof ApiError && [401, 403].includes(error.status);

        setBookingDetailState({
          status: isUnauthorized ? 'unauthorized' : 'error',
          booking: null,
          errorMessage: message,
        });
      }
    };

    void loadBookingDetail();

    return () => {
      isCancelled = true;
    };
  }, [
    account?.accessToken,
    activeTab,
    bookingMode,
    selectedHistoryBookingId,
  ]);

  useEffect(() => {
    if (isNotificationsVisible) {
      notificationPanelAnim.stopAnimation();
      notificationPanelAnim.setValue(0);
      Animated.timing(notificationPanelAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isNotificationsVisible, notificationPanelAnim]);

  useEffect(() => {
    setIsNotificationsVisible(false);
    setIsProfileTooltipVisible(false);
  }, [activeTab, menuScreen]);

  useEffect(() => {
    const activeIndex = Math.max(
      tabs.findIndex((tab) => tab.key === activeTab),
      0
    );
    const slotWidth = windowWidth / tabs.length;
    const itemInset = isTinyPhone ? 0 : isVeryCompactPhone ? 1 : isCompactPhone ? 3 : 6;

    bottomNavIndicatorAnim.stopAnimation();
    Animated.spring(bottomNavIndicatorAnim, {
      toValue: activeIndex * slotWidth + itemInset,
      stiffness: 220,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [activeTab, isCompactPhone, isTinyPhone, isVeryCompactPhone, windowWidth, bottomNavIndicatorAnim]);

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);

    if (tabKey === 'menu') {
      setMenuScreen('root');
    } else if (tabKey === 'insurance') {
      setMenuScreen('root');
      setProfileSection('insurance');
    } else if (tabKey === 'rewards') {
      setMenuScreen('root');
      setProfileSection('rewards');
    }
  };

  const handleOpenCart = () => {
    setIsCartVisible(true);

    if (cartState.status === 'idle') {
      void loadCartModuleState();
    }
  };

  const handleAddToCart = async (product) => {
    if (!product?.id) {
      return;
    }

    setCartState((currentState) => ({
      ...currentState,
      savingItemId: product.id,
      errorMessage: '',
    }));

    try {
      const snapshot = await addCustomerCartItem({
        customerUserId: account?.userId,
        productId: product.id,
        quantity: 1,
        accessToken: account?.accessToken,
      });

      applyCartSnapshot(snapshot);
      resetCheckoutFlow();
    } catch (error) {
      const message =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not add this product to your cart right now.';

      setCartState((currentState) => ({
        ...currentState,
        status: currentState.totalQuantity > 0 ? 'ready' : 'error',
        errorMessage: message,
        savingItemId: null,
      }));
    }
  };

  const handleOpenProduct = async (product) => {
    setCatalogDetailState({
      status: 'loading',
      product: null,
      previewProduct: product,
      errorMessage: '',
    });

    try {
      const nextProduct = await loadCustomerCatalogProductDetail({
        productId: product?.id,
        accessToken: account?.accessToken,
      });

      setCatalogDetailState({
        status: 'ready',
        product: nextProduct,
        previewProduct: product,
        errorMessage: '',
      });
    } catch (error) {
      const isHiddenProduct = error instanceof ApiError && error.status === 404;
      const nextMessage = isHiddenProduct
        ? 'This product is no longer published in the customer catalog.'
        : error instanceof ApiError && error.message
          ? error.message
          : 'We could not load this product right now.';

      setCatalogDetailState({
        status: isHiddenProduct ? 'hidden' : 'error',
        product: null,
        previewProduct: product,
        errorMessage: nextMessage,
      });
    }
  };

  const handleCloseProduct = () => {
    setCatalogDetailState(createInitialCatalogDetailState());
  };

  const handleRetrySelectedProduct = () => {
    if (!catalogDetailState.previewProduct) {
      return;
    }

    void handleOpenProduct(catalogDetailState.previewProduct);
  };

  const handleCheckoutFieldChange = (key, value) => {
    let nextValue = value;

    if (key === 'contactPhone') {
      nextValue = normalizePhoneNumber(value);
    }

    if (key === 'postalCode') {
      nextValue = String(value ?? '').replace(/\D/g, '').slice(0, 4);
    }

    if (key === 'email') {
      nextValue = value.trimStart();
    }

    setCheckoutState((currentState) => ({
      ...currentState,
      form: {
        ...currentState.form,
        [key]: nextValue,
      },
      fieldErrors: {
        ...currentState.fieldErrors,
        [key]: '',
      },
      errorMessage: '',
    }));
  };

  const resetCheckoutFlow = () => {
    setCheckoutState((currentState) => ({
      ...currentState,
      stage: 'cart',
      previewStatus: 'idle',
      preview: null,
      submitting: false,
      order: null,
      errorMessage: '',
      fieldErrors: {},
    }));
  };

  const handleSelectStoreOrder = (order) => {
    if (!order?.id) {
      return;
    }

    activeStoreOrderRequestRef.current = order.id;
    setSelectedStoreOrderId(order.id);
    setStoreOrderTrackingState(buildStoreOrderSelectionState(order));
  };

  const handleOpenStoreOrders = (order = null) => {
    setActiveTab('store');
    setStoreSection('orders');

    if (order?.id) {
      activeStoreOrderRequestRef.current = order.id;
      setSelectedStoreOrderId(order.id);
      setStoreOrderTrackingState(buildStoreOrderSelectionState(order));
    }
  };

  const handleRefreshStoreOrders = async () => {
    await loadStoreOrderHistoryState({
      preferredOrderId: selectedStoreOrderId,
    });

    if (selectedStoreOrderId) {
      const seededOrder =
        storeOrderHistoryState.orders.find((order) => order.id === selectedStoreOrderId) ?? null;

      await loadStoreOrderTrackingState(selectedStoreOrderId, {
        force: true,
        seedOrder: seededOrder,
      });
    }
  };

  const handleStartCheckoutPreview = async () => {
    if (!account?.userId || checkoutState.previewStatus === 'loading' || cartState.totalQuantity === 0) {
      return;
    }

    setCheckoutState((currentState) => ({
      ...currentState,
      stage: 'preview',
      previewStatus: 'loading',
      preview: null,
      order: null,
      errorMessage: '',
      fieldErrors: {},
    }));

    try {
      const preview = await loadCustomerCheckoutPreview({
        customerUserId: account.userId,
        accessToken: account.accessToken,
      });

      setCheckoutState((currentState) => ({
        ...currentState,
        stage: 'preview',
        previewStatus: 'ready',
        preview,
        errorMessage: '',
      }));
    } catch (error) {
      const nextMessage =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load the invoice preview right now.';

      setCheckoutState((currentState) => ({
        ...currentState,
        stage: 'preview',
        previewStatus: 'error',
        preview: null,
        errorMessage: nextMessage,
      }));
    }
  };

  const handleSubmitInvoiceCheckout = async () => {
    if (!account?.userId || checkoutState.submitting) {
      return;
    }

    const fieldErrors = validateInvoiceCheckoutForm(checkoutState.form);

    if (Object.keys(fieldErrors).length > 0) {
      setCheckoutState((currentState) => ({
        ...currentState,
        stage: 'preview',
        previewStatus: currentState.previewStatus === 'ready' ? 'ready' : currentState.previewStatus,
        fieldErrors,
        errorMessage: 'Complete the billing address details before creating the invoice checkout.',
      }));
      return;
    }

    setCheckoutState((currentState) => ({
      ...currentState,
      submitting: true,
      errorMessage: '',
    }));

    try {
      const order = await checkoutCustomerInvoice({
        customerUserId: account.userId,
        billingAddress: buildInvoiceCheckoutPayload(checkoutState.form),
        notes: trimCheckoutValue(checkoutState.form.notes),
        accessToken: account.accessToken,
      });

      setStoreOrderHistoryState((currentState) => {
        const nextOrders = [order, ...currentState.orders.filter((currentOrder) => currentOrder.id !== order.id)];

        return {
          status: 'ready',
          errorMessage: '',
          orders: nextOrders,
        };
      });
      activeStoreOrderRequestRef.current = order.id;
      setSelectedStoreOrderId(order.id);
      setStoreOrderTrackingState(buildStoreOrderSelectionState(order));
      setCartState({
        status: 'empty',
        errorMessage: '',
        savingItemId: null,
        ...createEmptyCustomerCartSnapshot(),
      });
      setCheckoutState((currentState) => ({
        ...currentState,
        stage: 'complete',
        previewStatus: 'ready',
        preview: null,
        submitting: false,
        order,
        errorMessage: '',
        fieldErrors: {},
      }));
    } catch (error) {
      const nextMessage =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not create the invoice checkout right now.';

      setCheckoutState((currentState) => ({
        ...currentState,
        stage: 'preview',
        previewStatus: currentState.previewStatus === 'ready' ? 'ready' : currentState.previewStatus,
        submitting: false,
        errorMessage: nextMessage,
      }));
    }
  };

  const getCurrentBookingAvailabilityWindow = () => {
    if (bookingDiscovery.availability.startDate && bookingDiscovery.availability.endDate) {
      return {
        startDate: bookingDiscovery.availability.startDate,
        endDate: bookingDiscovery.availability.endDate,
      };
    }

    return getInitialBookingAvailabilityWindow();
  };

  const loadBookingAvailabilityWindow = async (
    windowQuery,
    { selectedDateKey = null, conflictRecovery = false } = {},
  ) => {
    setBookingDiscovery((currentState) => ({
      ...currentState,
      availability: {
        ...currentState.availability,
        status: 'loading',
        errorMessage: '',
      },
    }));

    try {
      const availability = await getBookingAvailability({
        ...windowQuery,
        accessToken: account?.accessToken,
      });

      setBookingDiscovery((currentState) => ({
        ...currentState,
        status: 'ready',
        errorMessage: '',
        availability: {
          status: 'ready',
          errorMessage: '',
          ...availability,
        },
      }));

      if (selectedDateKey) {
        setSelectedBookingDateKey(
          clampDateKeyToRange(
            selectedDateKey,
            availability.minBookableDate,
            availability.maxBookableDate,
          ),
        );
      }

      if (conflictRecovery) {
        setBookingCreateState((currentState) =>
          currentState.status === 'conflict'
            ? {
                ...currentState,
                message: 'That slot is no longer available. Live availability has been refreshed below.',
              }
            : currentState,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to refresh live booking availability right now.';
      const isUnauthorized = error instanceof ApiError && [401, 403].includes(error.status);

      if (isUnauthorized) {
        setBookingDiscovery((currentState) => ({
          ...currentState,
          status: 'unauthorized',
          errorMessage: message,
          availability: {
            ...currentState.availability,
            status: 'unauthorized',
            errorMessage: message,
          },
        }));
        return;
      }

      setBookingDiscovery((currentState) => ({
        ...currentState,
        availability: {
          ...currentState.availability,
          status: 'error',
          errorMessage: message,
        },
      }));

      if (conflictRecovery) {
        setBookingCreateState((currentState) =>
          currentState.status === 'conflict'
            ? {
                ...currentState,
                message:
                  'That slot is no longer available, and live availability could not be refreshed automatically. Use refresh and retry.',
              }
            : currentState,
        );
      }
    }
  };

  const handleRefreshBookingDiscovery = async () => {
    setBookingDiscovery((currentState) => ({
      ...currentState,
      status: 'loading',
      availability: {
        ...currentState.availability,
        status: currentState.availability.status === 'ready' ? 'loading' : currentState.availability.status,
        errorMessage: '',
      },
      errorMessage: '',
    }));

    try {
      const nextSnapshot = await loadBookingDiscoverySnapshot({
        userId: account?.userId,
        accessToken: account?.accessToken,
        availabilityWindow: getCurrentBookingAvailabilityWindow(),
      });

      setBookingDiscovery({
        status: 'ready',
        services: nextSnapshot.services,
        timeSlots: nextSnapshot.timeSlots,
        vehicles: nextSnapshot.vehicles,
        availability: {
          status: 'ready',
          errorMessage: '',
          ...nextSnapshot.availability,
        },
        errorMessage: '',
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to refresh booking discovery right now.';
      const isUnauthorized = error instanceof ApiError && [401, 403].includes(error.status);

      setBookingDiscovery((currentState) => ({
        ...currentState,
        status: isUnauthorized ? 'unauthorized' : 'error',
        availability: {
          ...currentState.availability,
          status: isUnauthorized ? 'unauthorized' : 'error',
          errorMessage: message,
        },
        errorMessage: message,
      }));
    }
  };

  const handleShiftBookingAvailabilityWindow = async (direction) => {
    if (bookingDiscovery.availability.status === 'loading') {
      return;
    }

    const currentWindow = getCurrentBookingAvailabilityWindow();
    const anchorDate =
      direction === 'next'
        ? toBookingDateString(addDaysToDate(currentWindow.endDate, 1) ?? parseDateOnly(currentWindow.endDate))
        : toBookingDateString(addDaysToDate(currentWindow.startDate, -BOOKING_AVAILABILITY_PAGE_DAYS) ?? parseDateOnly(currentWindow.startDate));
    const nextWindow = buildBookingAvailabilityWindow({
      anchorDateKey: anchorDate,
      minimumDateKey: bookingDiscovery.availability.minBookableDate,
      maximumDateKey: bookingDiscovery.availability.maxBookableDate,
    });

    await loadBookingAvailabilityWindow(nextWindow);
  };

  const handleChangeBookingDate = async (nextDate) => {
    const nextDateKey = toBookingDateString(nextDate);

    if (!nextDateKey) {
      return;
    }

    if (bookingCreateState.status !== 'submitting') {
      setBookingCreateState(createInitialBookingCreateState());
    }

    if (getBookingAvailabilityDayByDate(bookingDiscovery.availability, nextDateKey)) {
      setSelectedBookingDateKey(nextDateKey);
      return;
    }

    const nextWindow = buildBookingAvailabilityWindow({
      anchorDateKey: nextDateKey,
      minimumDateKey: bookingDiscovery.availability.minBookableDate,
      maximumDateKey: bookingDiscovery.availability.maxBookableDate,
    });

    await loadBookingAvailabilityWindow(nextWindow, {
      selectedDateKey: nextDateKey,
    });
  };

  const handleRefreshBookingHistory = async () => {
    setBookingHistory((currentState) => ({
      ...currentState,
      status: 'loading',
      errorMessage: '',
    }));

    try {
      const bookings = await listCustomerBookings({
        userId: account?.userId,
        accessToken: account?.accessToken,
      });

      setBookingHistory({
        status: 'ready',
        bookings,
        errorMessage: '',
      });
      setSelectedHistoryBookingId((currentBookingId) =>
        bookings.some((booking) => booking.id === currentBookingId)
          ? currentBookingId
          : bookings[0]?.id ?? null,
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to refresh booking history right now.';
      const isUnauthorized = error instanceof ApiError && [401, 403].includes(error.status);

      setBookingHistory((currentState) => ({
        ...currentState,
        status: isUnauthorized ? 'unauthorized' : 'error',
        errorMessage: message,
      }));
    }
  };

  const handleSubmitBooking = async () => {
    if (bookingCreateState.status === 'submitting') {
      return;
    }

    const selectedVehicle = bookingDiscovery.vehicles.find(
      (vehicle) => vehicle.id === selectedBookingVehicleId,
    );
    const selectedService = bookingDiscovery.services.find(
      (service) => service.id === selectedBookingServiceKey,
    );
    const selectedTimeSlot = bookingDiscovery.timeSlots.find(
      (timeSlot) => timeSlot.id === selectedBookingTimeKey,
    );
    const selectedAvailabilityDay = getBookingAvailabilityDayByDate(
      bookingDiscovery.availability,
      selectedBookingDateKey,
    );
    const selectedAvailabilitySlot = getBookingAvailabilitySlotForTime(
      selectedAvailabilityDay,
      selectedTimeSlot?.id,
    );
    const isSelectedDateAvailable = selectedAvailabilitySlot
      ? selectedAvailabilitySlot.isAvailable
      : Boolean(selectedAvailabilityDay?.isBookable);

    if (!account?.userId) {
      setBookingCreateState({
        status: 'unauthorized',
        message: 'Sign in again before submitting a booking request.',
        booking: null,
      });
      return;
    }

    if (
      !selectedVehicle ||
      !selectedService?.isActive ||
      !selectedTimeSlot?.isActive ||
      !selectedBookingDateKey ||
      !isSelectedDateAvailable
    ) {
      setBookingCreateState({
        status: 'validation-error',
        message:
          'Choose an owned vehicle, active service, active time slot, and a live available appointment date.',
        booking: null,
      });
      return;
    }

    setBookingCreateState({
      status: 'submitting',
      message: 'Submitting your booking request. Duplicate taps are locked while this is in progress.',
      booking: null,
    });

    try {
      const createdBooking = await createCustomerBooking({
        userId: account.userId,
        vehicleId: selectedVehicle.id,
        timeSlotId: selectedTimeSlot.id,
        scheduledDate: selectedBookingDateKey,
        serviceIds: [selectedService.id],
        notes: bookingNotes.trim() || undefined,
        accessToken: account?.accessToken,
      });

      setBookingCreateState({
        status: 'success',
        message: 'Booking request submitted. It remains pending until staff review it.',
        booking: createdBooking,
      });
      setBookingHistory((currentState) => ({
        status: 'ready',
        errorMessage: '',
        bookings: [
          createdBooking,
          ...currentState.bookings.filter((booking) => booking.id !== createdBooking.id),
        ],
      }));
      setSelectedHistoryBookingId(createdBooking.id);
      setBookingDetailState({
        status: 'ready',
        booking: createdBooking,
        errorMessage: '',
      });
      setBookingMode('track');
      setBookingNotes('');
    } catch (error) {
      const statusCode = error instanceof ApiError ? error.status : null;
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to submit booking right now.';
      let status = 'error';
      let message = fallbackMessage;

      if (statusCode === 400) {
        status = 'validation-error';
        message = 'The booking request is missing or has invalid fields. Check the date and service selection.';
      } else if (statusCode === 401 || statusCode === 403) {
        status = 'unauthorized';
        message = 'Your session could not submit this booking. Sign in again and retry.';
      } else if (statusCode === 404) {
        status = 'not-found';
        message = 'The user, owned vehicle, service, or time slot could not be found.';
      } else if (statusCode === 409) {
        status = 'conflict';
        message = 'That slot is no longer available or another booking conflict exists. Refreshing live availability now.';
      }

      setBookingCreateState({
        status,
        message,
        booking: null,
      });

      if (statusCode === 409) {
        await loadBookingAvailabilityWindow(getCurrentBookingAvailabilityWindow(), {
          conflictRecovery: true,
        });
      }
    }
  };

  const navigateToTimeline = () => {
    setActiveTab('messages');
  };

  const navigateToGarage = (vehicleId = null) => {
    if (vehicleId) {
      setSelectedGarageVehicleId(vehicleId);
    }

    setActiveTab('messages');
  };

  const navigateToBooking = (mode = 'book') => {
    setActiveTab('notifications');
    setBookingMode(mode);
  };

  const navigateToBookingForVehicle = (vehicleId) => {
    if (vehicleId) {
      setSelectedBookingVehicleId(vehicleId);
    }

    navigateToBooking('book');
  };

  const navigateToProfileSection = (sectionKey) => {
    setActiveTab(sectionKey === 'rewards' || sectionKey === 'insurance' ? sectionKey : 'menu');
    setMenuScreen('root');
    setProfileSection(sectionKey);
    setIsProfileTooltipVisible(false);
  };

  const navigateToInsuranceInquiry = (vehicleId = null) => {
    const selectedVehicleId =
      normalizeNavigationId(vehicleId) ??
      normalizeNavigationId(selectedGarageVehicleId) ??
      normalizeNavigationId(account?.primaryVehicleId);

    navigation.navigate('InsuranceInquiryScreen', {
      vehicleId: selectedVehicleId,
    });
  };

  const navigateToSupport = () => {
    navigation.navigate('ChatbotScreen');
  };

  const navigateToProfileModule = () => {
    setActiveTab('menu');
    setMenuScreen('root');
    setIsProfileTooltipVisible(false);
  };

  const handleUpdateNotificationPreference = async (preferenceKey, value) => {
    const currentPreferences = notificationModuleState.preferences;

    if (!account?.accessToken || !account?.userId || !currentPreferences) {
      Alert.alert(
        'Notification Preferences',
        'Sign in again before changing customer notification settings.',
      );
      return;
    }

    setNotificationModuleState((currentState) => ({
      ...currentState,
      status: 'ready',
      errorMessage: '',
      savingKey: preferenceKey,
      preferences: {
        ...currentState.preferences,
        [preferenceKey]: value,
      },
    }));

    try {
      const updatedPreferences = await updateCustomerNotificationPreferences({
        userId: account.userId,
        accessToken: account.accessToken,
        preferences: {
          [preferenceKey]: value,
        },
      });

      setNotificationModuleState((currentState) => ({
        ...currentState,
        status: 'ready',
        preferences: updatedPreferences,
        errorMessage: '',
        savingKey: null,
      }));
    } catch (error) {
      const nextMessage =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not save your notification preferences right now.';

      setNotificationModuleState((currentState) => ({
        ...currentState,
        status: currentState.notifications?.length ? 'ready' : 'error',
        preferences: currentPreferences,
        errorMessage: nextMessage,
        savingKey: null,
      }));
      Alert.alert('Notification Preferences', nextMessage);
    }
  };

  const handleRedeemReward = async (reward) => {
    if (!account?.accessToken || !account?.userId) {
      Alert.alert('Rewards', 'Sign in again before redeeming rewards.');
      return;
    }

    if (!reward?.id || !reward.available) {
      return;
    }

    setLoyaltyState((currentState) => ({
      ...currentState,
      redeemingRewardId: reward.id,
      errorMessage: '',
    }));

    try {
      const redemption = await redeemCustomerReward({
        userId: account.userId,
        rewardId: reward.id,
        note: `Redeemed from mobile rewards screen: ${reward.title}`,
        accessToken: account.accessToken,
      });

      await loadLoyaltyModuleState();

      const remainingBalance = Number(redemption?.pointsBalanceAfter ?? 0);
      Alert.alert(
        'Reward Claimed',
        `${reward.title} has been redeemed. Remaining balance: ${remainingBalance.toLocaleString()} points.`,
      );
    } catch (error) {
      const nextMessage =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not redeem that reward right now.';

      setLoyaltyState((currentState) => ({
        ...currentState,
        redeemingRewardId: null,
        errorMessage: nextMessage,
      }));
      Alert.alert('Rewards', nextMessage);
    }
  };

  const handleToggleNotifications = () => {
    setIsNotificationsVisible((current) => !current);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotificationsFeed((current) =>
      current.map((item) => ({
        ...item,
        unread: false,
      }))
    );
  };

  const handleDismissNotification = (notificationKey) => {
    setNotificationsFeed((current) => current.filter((item) => item.key !== notificationKey));
  };

  const handleOpenNotification = (item) => {
    setNotificationsFeed((current) =>
      current.map((notification) =>
        notification.key === item.key
          ? {
              ...notification,
              unread: false,
            }
          : notification
      )
    );

    if (item.action === 'booking' || item.category === 'booking_reminder') {
      navigateToBooking('track');
    } else if (item.action === 'insurance' || item.category === 'insurance_update') {
      navigateToInsuranceInquiry();
    } else if (item.action === 'rewards' || item.category === 'invoice_aging') {
      navigateToProfileSection('rewards');
    } else if (item.action === 'timeline') {
      navigateToTimeline();
    }

    setIsNotificationsVisible(false);
  };

  const handleSelectProfileImage = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Profile Photo', 'Gallery upload is available on web for this prototype.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onSaveProfile?.({
            profileImage: reader.result,
          });
          setIsProfileTooltipVisible(false);
          Alert.alert('Profile Updated', 'Your profile picture has been updated.');
        }
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };

  const handleUpdateCartQuantity = (productKey, nextQuantity) => {
    const existingItem = cartState.items.find((item) => item.id === productKey);

    if (!existingItem || !account?.userId) {
      return;
    }

    setCartState((currentState) => ({
      ...currentState,
      savingItemId: existingItem.id,
      errorMessage: '',
    }));

    void (async () => {
      try {
        const snapshot =
          nextQuantity <= 0
            ? await removeCustomerCartItem({
                itemId: existingItem.id,
                customerUserId: account.userId,
                accessToken: account.accessToken,
              })
            : await updateCustomerCartItem({
                itemId: existingItem.id,
                customerUserId: account.userId,
                quantity: nextQuantity,
                accessToken: account.accessToken,
              });

        applyCartSnapshot(snapshot);
        resetCheckoutFlow();
      } catch (error) {
        const nextMessage =
          error instanceof ApiError && error.message
            ? error.message
            : 'We could not update that cart item right now.';

        setCartState((currentState) => ({
          ...currentState,
          status: currentState.totalQuantity > 0 ? 'ready' : 'error',
          errorMessage: nextMessage,
          savingItemId: null,
        }));
      }
    })();
  };

  const handleSignOut = () => {
    onSignOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  };

  const handleDeleteAccount = () => {
    setDeletePassword('');
    setDeletePasswordError('');
    setIsDeleteModalVisible(true);
  };

  const handleCancelDeleteAccount = () => {
    if (deleteSubmitting) {
      return;
    }

    setDeletePassword('');
    setDeletePasswordError('');
    setIsDeleteModalVisible(false);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeletePasswordError('Enter your current password to continue.');
      return;
    }

    if (!onStartDeleteAccountOtp) {
      setDeletePasswordError('Delete account is unavailable right now. Please try again later.');
      return;
    }

    setDeleteSubmitting(true);
    setDeletePasswordError('');

    try {
      const enrollment = await onStartDeleteAccountOtp({
        currentPassword: deletePassword,
      });

      setIsDeleteModalVisible(false);
      setDeletePassword('');
      setDeletePasswordError('');
      navigation.navigate('OTP', {
        email: account?.email,
        maskedEmail: enrollment?.maskedEmail ?? account?.email,
        enrollmentId: enrollment?.enrollmentId,
        otpExpiresAt: enrollment?.otpExpiresAt,
        otpPurpose: 'deleteAccount',
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'We could not start account deletion right now. Please try again.';

      setDeletePasswordError(message);
      Alert.alert('Delete Account', message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleProfileFieldChange = (key, value) => {
    let nextValue = value;

    if (key === 'phoneNumber') {
      nextValue = normalizePhoneNumber(value);
    }

    if (key === 'email') {
      nextValue = value.trimStart();
    }

    setProfileForm((currentForm) => ({
      ...currentForm,
      [key]: nextValue,
    }));

    setProfileErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
    }));
  };

  const handleSaveProfile = () => {
    const nextErrors = {};
    const emailError = validateEmail(profileForm.email);
    const phoneError = validatePhoneNumber(profileForm.phoneNumber);
    const birthdayError = validateBirthday(profileForm.birthday);

    if (!profileForm.fullName.trim()) {
      nextErrors.fullName = 'Enter your full name.';
    }

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (phoneError) {
      nextErrors.phoneNumber = phoneError;
    }

    if (!profileForm.city.trim()) {
      nextErrors.city = 'Enter your city.';
    }

    if (!profileForm.gender) {
      nextErrors.gender = 'Select your gender.';
    }

    if (birthdayError) {
      nextErrors.birthday = birthdayError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    const { firstName, lastName } = splitFullName(profileForm.fullName);

    onSaveProfile({
      firstName,
      lastName,
      email: normalizeEmail(profileForm.email),
      phoneNumber: normalizePhoneNumber(profileForm.phoneNumber),
      city: profileForm.city.trim(),
      gender: profileForm.gender,
      birthday: profileForm.birthday,
      address: `${profileForm.city.trim()}, Metro Manila`,
    });

    Alert.alert('Profile Saved', 'Your personal information has been updated.');
    setIsProfileEditing(false);
    setMenuScreen('settings');
  };

  const handleSecurityFieldChange = (key, value) => {
    const nextForm = {
      ...securityForm,
      [key]: value,
    };

    setSecurityForm(nextForm);
    setSecurityErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
      ...(key === 'newPassword' || key === 'confirmPassword'
        ? {
            confirmPassword:
              nextForm.confirmPassword && nextForm.newPassword !== nextForm.confirmPassword
                ? 'Passwords do not match.'
                : '',
          }
        : {}),
    }));
  };

  const handleSavePassword = () => {
    const nextErrors = validateChangePasswordForm({
      ...securityForm,
      savedPassword: account?.password || '',
    });

    if (Object.keys(nextErrors).length > 0) {
      setSecurityErrors(nextErrors);
      return;
    }

    navigation.navigate('OTP', {
      email: account?.email,
      otpPurpose: 'passwordChange',
      pendingPassword: securityForm.newPassword,
    });
  };

  const renderScrollableContent = (contentStyle, children) => {
    const responsiveContentStyle = [
      contentStyle,
      isVeryCompactPhone && styles.scrollContentCompact,
    ];

    if (isWeb) {
      return (
        <View style={styles.scrollRegion}>
          <View style={[styles.webScrollContent, ...responsiveContentStyle]}>{children}</View>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={responsiveContentStyle}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  };

  const renderMenuRoot = () =>
    renderScrollableContent(styles.menuRootContent, (
      <>
      <View style={styles.profileHomeHeader}>
        <Text style={styles.profileHomeTitle}>My Profile</Text>
        <View style={styles.profileHomeActions}>
          <NotificationIconButton
            count={notificationsFeed.filter((item) => item.unread).length}
            onPress={handleToggleNotifications}
          />
          <ActionIconButton icon="cog-outline" onPress={() => setMenuScreen('settings')} />
        </View>
      </View>

      <View style={styles.profileHero}>
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {account?.profileImage ? (
              <Image source={{ uri: account.profileImage }} style={styles.profileImage} />
            ) : (
              <Text style={styles.avatarInitials}>
                {`${account?.firstName?.[0] || ''}${account?.lastName?.[0] || ''}`}
              </Text>
            )}
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="account-check-outline" size={12} color={colors.primary} />
            </View>
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>
              {account?.firstName} {account?.lastName}
            </Text>
            <Text style={styles.profileSubline}>{account?.email}</Text>
            <Text style={styles.profileSubline}>+63 {account?.phoneNumber?.slice(1, 4)}-{account?.phoneNumber?.slice(4, 7)}-{account?.phoneNumber?.slice(7)}</Text>
          </View>

          <View style={styles.loyaltyBadge}>
            <Text style={styles.loyaltyBadgeText}>{loyaltyTier.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.loyaltyCard}>
        <View style={styles.loyaltyCardHeader}>
          <View style={styles.loyaltyCardTitleRow}>
            <MaterialCommunityIcons name="trophy-outline" size={19} color="#FFCC33" />
            <Text style={styles.loyaltyCardTitle}>Loyalty Rewards</Text>
          </View>

          <View style={styles.loyaltyPointsWrap}>
            <Text style={styles.loyaltyPointsValue}>{loyaltyPointsBalance.toLocaleString()}</Text>
            <Text style={styles.loyaltyPointsLabel}>Total Points</Text>
          </View>
        </View>

        <View style={styles.loyaltyMetaRow}>
          <Text style={styles.currentTierText}>{loyaltyTier.label}</Text>
          <Text style={styles.nextTierText}>
            {loyaltyTier.nextTierLabel
              ? `${loyaltyTier.pointsToNext.toLocaleString()} pts to ${loyaltyTier.nextTierLabel}`
              : 'Top loyalty tier reached'}
          </Text>
        </View>

        <View style={styles.loyaltyTrack}>
          <View
            style={[
              styles.loyaltyFill,
              {
                width: `${Math.max(loyaltyTier.progressRatio, 0.08) * 100}%`,
              },
            ]}
          />
        </View>

        <View style={styles.loyaltyTierRow}>
          {customerLoyaltyTiers.map((tier) => {
            const isReached = loyaltyPointsBalance >= tier.minPoints;
            const isCurrent = tier.key === loyaltyTier.key;

            return (
              <View key={tier.key} style={styles.loyaltyTierItem}>
                <View
                  style={[
                    styles.loyaltyTierIconWrap,
                    isReached && styles.loyaltyTierIconWrapReached,
                    isCurrent && styles.loyaltyTierIconWrapCurrent,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="medal-outline"
                    size={15}
                    color={isCurrent ? '#FFCC33' : isReached ? colors.text : colors.mutedText}
                  />
                </View>
                <Text
                  style={[
                    styles.loyaltyTierLabel,
                    isReached && styles.loyaltyTierLabelReached,
                    isCurrent && styles.loyaltyTierLabelCurrent,
                  ]}
                >
                  {tier.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionTabsWrap}>
        {profileSections.map((section) => (
          <ProfileSectionTab
            key={section.key}
            item={section}
            isActive={profileSection === section.key}
            onPress={() => setProfileSection(section.key)}
          />
        ))}
      </View>

      <Text style={styles.sectionHeading}>
        {profileSection === 'rewards'
          ? 'Available Rewards'
          : profileSection === 'garage'
            ? 'Digital Garage'
          : profileSection === 'insurance'
            ? 'Insurance Tools'
            : 'Back-Jobs'}
      </Text>

      {profileSection === 'rewards' ? (
        <>
          {loyaltyState.status === 'loading' && !loyaltyRewards.length ? (
            <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Loading loyalty rewards</Text>
          <Text style={styles.infoPanelText}>
                We are syncing your loyalty balance, service-earned points, and reward catalog from the live backend.
          </Text>
        </View>
          ) : null}

          {loyaltyState.errorMessage ? (
            <View style={styles.infoPanel}>
              <Text style={styles.infoPanelTitle}>Loyalty data unavailable</Text>
              <Text style={styles.infoPanelText}>{loyaltyState.errorMessage}</Text>
            </View>
          ) : null}

          {loyaltyRewards.length ? (
            loyaltyRewards.map((item) => (
              <RewardOfferCard
                key={item.key}
                item={{
                  ...item,
                  loading: loyaltyState.redeemingRewardId === item.id,
                }}
                onClaim={() => handleRedeemReward(item)}
              />
            ))
          ) : loyaltyState.status !== 'loading' ? (
            <View style={styles.infoPanel}>
              <Text style={styles.infoPanelTitle}>Reward catalog is empty</Text>
              <Text style={styles.infoPanelText}>
                Live loyalty points are now connected. Rewards will appear here once staff publish active catalog entries for service-earned points.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {profileSection === 'garage' ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Digital Garage</Text>
          <Text style={styles.infoPanelText}>
            Open your owned vehicle list, choose the vehicle context for bookings and insurance,
            and review lifecycle history from one customer-only surface.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, styles.editProfileButton]}
            onPress={() => navigateToGarage()}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryButtonText}>Open Digital Garage</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {profileSection === 'insurance' ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Insurance inquiry tracking</Text>
          <Text style={styles.infoPanelText}>
            Submit a customer insurance inquiry, keep the selected vehicle aligned with backend
            ownership rules, and check customer-safe claim-status updates from one screen.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, styles.editProfileButton]}
            onPress={() => navigateToInsuranceInquiry()}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryButtonText}>Open Insurance Inquiry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {profileSection === 'backJobs' ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Previous service back-jobs</Text>
          <Text style={styles.infoPanelText}>
            Review repeat jobs, past PMS history, and service follow-ups tied to your vehicle.
          </Text>
        </View>
      ) : null}

      <View style={styles.profileSettingsList}>
        <MenuRow
          icon="cog-outline"
          label="Account Settings"
          onPress={() => setMenuScreen('settings')}
        />
        <MenuRow
          icon="bell-outline"
          label="Notification Preferences"
          onPress={() => setMenuScreen('notificationPreferences')}
        />
      </View>

      <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.86}>
        <View style={styles.signOutRowLeft}>
          <MaterialCommunityIcons name="logout-variant" size={18} color={colors.danger} />
          <Text style={styles.signOutRowText}>Sign Out</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.danger} />
      </TouchableOpacity>
      </>
    ));

  const renderSettingsMenu = () =>
    renderScrollableContent(styles.scrollContent, (
      <>
      <ScreenBackHeader
        title="Account & Profile Settings"
        subtitle="Manage your profile, security, and rewards."
        onBack={() => setMenuScreen('root')}
      />

      <MenuRow
        icon="account-outline"
        label="Personal Information"
        onPress={() => setMenuScreen('personal')}
      />
      <MenuRow
        icon="lock-outline"
        label="Login / Security"
        onPress={() => setMenuScreen('security')}
      />
      <MenuRow
        icon="gift-outline"
        label="Gift Center"
        onPress={() => setMenuScreen('gift')}
      />
      </>
    ));

  const renderPersonalInformation = () =>
    renderScrollableContent(styles.scrollContent, (
      <>
      <ScreenBackHeader
        title="Personal Information"
        subtitle="Update the details connected to your AutoCare account."
        onBack={() => setMenuScreen('settings')}
      />

      <View style={styles.profileImageSection}>
        <View style={styles.largeAvatarWrap}>
          {account?.profileImage ? (
            <Image source={{ uri: account.profileImage }} style={styles.largeProfileImage} />
          ) : (
            <Text style={styles.largeAvatarInitials}>
              {`${account?.firstName?.[0] || ''}${account?.lastName?.[0] || ''}`}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleSelectProfileImage}>
          <Text style={styles.changeImageLink}>Change Profile Image</Text>
        </TouchableOpacity>
      </View>

      {!isProfileEditing ? (
        <TouchableOpacity
          style={[styles.secondaryButton, styles.editProfileButton]}
          onPress={() => setIsProfileEditing(true)}
        >
          <Text style={styles.secondaryButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      ) : null}

      <FormField
        label="Full Name"
        value={profileForm.fullName}
        onChangeText={(value) => handleProfileFieldChange('fullName', value)}
        placeholder="Jasper Sanchez"
        autoCapitalize="words"
        error={profileErrors.fullName}
        editable={isProfileEditing}
      />

      <FormField
        label="Email"
        value={profileForm.email}
        onChangeText={(value) => handleProfileFieldChange('email', value)}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={profileErrors.email}
        editable={isProfileEditing}
      />

      <FormField
        label="Phone"
        value={profileForm.phoneNumber}
        onChangeText={(value) => handleProfileFieldChange('phoneNumber', value)}
        placeholder="09XXXXXXXXX"
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={11}
        error={profileErrors.phoneNumber}
        editable={isProfileEditing}
      />

      <FormField
        label="City"
        value={profileForm.city}
        onChangeText={(value) => handleProfileFieldChange('city', value)}
        placeholder="Quezon City"
        autoCapitalize="words"
        error={profileErrors.city}
        editable={isProfileEditing}
      />

      {isProfileEditing ? (
        <View style={styles.genderSection}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {genderOptions.map((option) => {
              const isSelected = profileForm.gender === option;

              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.genderChip, isSelected && styles.genderChipSelected]}
                  onPress={() => handleProfileFieldChange('gender', option)}
                >
                  <Text style={[styles.genderChipText, isSelected && styles.genderChipTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {profileErrors.gender ? <Text style={styles.errorText}>{profileErrors.gender}</Text> : null}
        </View>
      ) : (
        <FormField
          label="Gender"
          value={profileForm.gender}
          onChangeText={() => null}
          placeholder=""
          editable={false}
        />
      )}

      <DatePickerField
        label="Birthdate"
        value={profileForm.birthday}
        onChange={(value) => handleProfileFieldChange('birthday', value)}
        placeholder="Select your birthdate"
        error={profileErrors.birthday}
        helperText="Use the quick Year -> Month -> Day picker."
        editable={isProfileEditing}
      />

      {isProfileEditing ? (
        <>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProfile}>
            <Text style={styles.primaryButtonText}>Save Information</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setProfileForm(createProfileForm(account));
              setProfileErrors({});
              setIsProfileEditing(false);
            }}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.deleteSection}>
        <Text style={styles.deleteTitle}>Delete your data and account</Text>
        <Text style={styles.deleteDescription}>
          This archives your account, signs you out, and frees the same email so it can be used
          again later. Workshop history stays preserved on the backend.
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
      </>
    ));

  const renderSecurity = () =>
    renderScrollableContent(styles.scrollContent, (
      <>
      <ScreenBackHeader
        title="Login / Security"
        subtitle="Change your password and verify it with OTP before saving."
        onBack={() => setMenuScreen('settings')}
      />

      <PasswordFieldRow
        label="Current Password"
        value={securityForm.currentPassword}
        onChangeText={(value) => handleSecurityFieldChange('currentPassword', value)}
        placeholder="Enter your current password"
        error={securityErrors.currentPassword}
        visible={passwordVisibility.currentPassword}
        onToggleVisibility={() =>
          setPasswordVisibility((current) => ({
            ...current,
            currentPassword: !current.currentPassword,
          }))
        }
      />

      <PasswordFieldRow
        label="New Password"
        value={securityForm.newPassword}
        onChangeText={(value) => handleSecurityFieldChange('newPassword', value)}
        placeholder="Create a new password"
        error={securityErrors.newPassword}
        visible={passwordVisibility.newPassword}
        onToggleVisibility={() =>
          setPasswordVisibility((current) => ({
            ...current,
            newPassword: !current.newPassword,
          }))
        }
      />

      <PasswordChecklist password={securityForm.newPassword} />

      <PasswordFieldRow
        label="Confirm New Password"
        value={securityForm.confirmPassword}
        onChangeText={(value) => handleSecurityFieldChange('confirmPassword', value)}
        placeholder="Re-enter your new password"
        error={securityErrors.confirmPassword}
        visible={passwordVisibility.confirmPassword}
        onToggleVisibility={() =>
          setPasswordVisibility((current) => ({
            ...current,
            confirmPassword: !current.confirmPassword,
          }))
        }
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSavePassword}>
        <Text style={styles.primaryButtonText}>Save Password</Text>
      </TouchableOpacity>
      </>
    ));

  const renderGiftCenter = () =>
    renderScrollableContent(styles.scrollContent, (
      <>
      <ScreenBackHeader
        title="Gift Center"
        subtitle="Rewards and gift redemptions from Cruisers Crib."
        onBack={() => {
          setMenuScreen('root');
          navigation.navigate('Menu');
        }}
      />

      {loyaltyTransactions.length ? (
        <View style={styles.loyaltyActivityCard}>
          <Text style={styles.loyaltyActivityTitle}>Recent Loyalty Activity</Text>
          <Text style={styles.loyaltyActivitySubtitle}>
            Derived ledger updates from your customer loyalty account.
          </Text>
          {loyaltyTransactions.slice(0, 5).map((item) => (
            <LoyaltyTransactionRow key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>No loyalty activity yet</Text>
          <Text style={styles.infoText}>
            Earn points from completed paid service work, then come back here to track your loyalty ledger.
          </Text>
        </View>
      )}
      </>
    ));

  const renderNotificationPreferences = () =>
    renderScrollableContent(styles.scrollContent, (
      <>
      <ScreenBackHeader
        title="Notification Preferences"
        subtitle="Choose which live customer updates should reach your account."
        onBack={() => setMenuScreen('root')}
      />

      <View style={styles.infoBlock}>
        <Text style={styles.infoTitle}>Async reminder sync</Text>
        <Text style={styles.infoText}>
          Booking, insurance, back-job, follow-up, and invoice reminders appear here after the notification service processes the latest source-domain fact.
        </Text>
      </View>

      {notificationModuleState.errorMessage ? (
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Notification sync issue</Text>
          <Text style={styles.infoText}>{notificationModuleState.errorMessage}</Text>
        </View>
      ) : null}

      {notificationModuleState.status === 'loading' && !notificationModuleState.preferences ? (
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Loading preferences</Text>
          <Text style={styles.infoText}>
            Pulling your current customer notification settings from the backend.
          </Text>
        </View>
      ) : null}

      {notificationModuleState.preferences ? (
        <View style={styles.preferenceCard}>
          {notificationPreferenceOptions.map((item) => (
            <NotificationPreferenceToggleRow
              key={item.key}
              label={item.label}
              description={item.description}
              value={notificationModuleState.preferences?.[item.key]}
              disabled={notificationModuleState.savingKey === item.key}
              onValueChange={(value) => handleUpdateNotificationPreference(item.key, value)}
            />
          ))}
        </View>
      ) : null}
      </>
    ));

  const renderSavedItems = () =>
    renderScrollableContent(styles.scrollContent, (
      <>
      <ScreenBackHeader
        title="Saved Items"
        subtitle="Saved services and bookmarks will appear here."
        onBack={() => setMenuScreen('root')}
      />

      <View style={styles.infoBlock}>
        <Text style={styles.infoTitle}>No saved items yet</Text>
        <Text style={styles.infoText}>
          Save services and offers from Explore once that section goes live.
        </Text>
      </View>
      </>
    ));

  const renderStoreContent = () => {
    const selectedStoreOrder =
      storeOrderTrackingState.order ||
      storeOrderHistoryState.orders.find((order) => order.id === selectedStoreOrderId) ||
      null;
    const selectedStoreInvoice = storeOrderTrackingState.invoice;
    const isStoreRefreshBusy =
      storeOrderHistoryState.status === 'loading' ||
      storeOrderTrackingState.status === 'loading' ||
      storeOrderTrackingState.invoiceStatus === 'loading';

    return renderScrollableContent(styles.scrollContent, (
      <>
      <View style={styles.storeHeroCard}>
        <Text style={styles.storeHeroEyebrow}>ECOMMERCE</Text>
        <Text style={styles.storeHeroTitle}>Shop, Track, And Reconcile</Text>
        <Text style={styles.storeHeroText}>
          Product browse, cart mutation, invoice preview, order history, invoice aging, and payment
          entries all stay inside the customer app while staff settlement remains a separate backend
          truth.
        </Text>
      </View>

      <View style={[styles.sectionTabsWrap, isCompactPhone && styles.sectionTabsWrapCompact]}>
        {storeSections.map((item) => (
          <ProfileSectionTab
            key={item.key}
            item={item}
            isActive={storeSection === item.key}
            onPress={() => setStoreSection(item.key)}
          />
        ))}
      </View>

      {storeSection === 'catalog' ? (
        <>
          <ShopCatalogSection
            status={catalogState.status}
            categories={catalogState.categories}
            products={catalogState.products}
            errorMessage={catalogState.errorMessage}
            cartCount={cartState.totalQuantity}
            onOpenProduct={(product) => {
              void handleOpenProduct(product);
            }}
            onOpenCart={handleOpenCart}
            onRefresh={() => {
              void loadCatalogModuleState();
            }}
          />

          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Catalog and checkout boundary</Text>
            <Text style={styles.infoText}>
              Product browse, cart mutation, invoice preview, and invoice checkout all use the ecommerce
              service on the same host as your main API, but on port 3001.
            </Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Need post-checkout tracking?</Text>
            <Text style={styles.infoText}>
              Open the Orders tab to review direct ecommerce order and invoice truth without mixing that state into your live cart, notifications, or loyalty history.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStoreSection('orders')}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryButtonText}>Open Orders</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.storeOrdersToolbar, isCompactPhone && styles.storeOrdersToolbarCompact]}>
            <View style={styles.storeOrdersToolbarCopy}>
              <Text style={styles.bookingSectionLabel}>Order History</Text>
              <Text style={styles.storeOrdersToolbarText}>
                Read-only customer order and invoice truth from ecommerce routes. Notifications and loyalty refresh separately.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bookingDiscoveryRefreshButton}
              onPress={() => {
                void handleRefreshStoreOrders();
              }}
              activeOpacity={isStoreRefreshBusy ? 1 : 0.86}
              disabled={isStoreRefreshBusy}
            >
              {isStoreRefreshBusy ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {storeOrderHistoryState.status === 'loading' && !storeOrderHistoryState.orders.length ? (
            <View style={styles.checkoutStateCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.checkoutStateTitle}>Loading order history</Text>
              <Text style={styles.checkoutStateText}>
                Fetching your invoice-backed ecommerce orders and tracking summaries now.
              </Text>
            </View>
          ) : null}

          {storeOrderHistoryState.status === 'error' && !storeOrderHistoryState.orders.length ? (
            <View style={styles.checkoutStateCard}>
              <MaterialCommunityIcons name="receipt-text-remove-outline" size={30} color="#FFB86B" />
              <Text style={styles.checkoutStateTitle}>Order history unavailable</Text>
              <Text style={styles.checkoutStateText}>
                {storeOrderHistoryState.errorMessage || 'We could not load your order history right now.'}
              </Text>
              <TouchableOpacity
                style={styles.productDetailRetryButton}
                onPress={() => {
                  void handleRefreshStoreOrders();
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.productDetailRetryButtonText}>Retry orders</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {storeOrderHistoryState.status !== 'loading' &&
          storeOrderHistoryState.status !== 'error' &&
          !storeOrderHistoryState.orders.length ? (
            <View style={styles.checkoutStateCard}>
              <MaterialCommunityIcons name="receipt-text-clock-outline" size={30} color={colors.primary} />
              <Text style={styles.checkoutStateTitle}>No ecommerce orders yet</Text>
              <Text style={styles.checkoutStateText}>
                Invoice-backed orders will appear here after you complete checkout from the catalog.
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStoreSection('catalog')}
                activeOpacity={0.88}
              >
                <Text style={styles.secondaryButtonText}>Back to Catalog</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {storeOrderHistoryState.orders.length ? (
            <View style={styles.storeOrderList}>
              {storeOrderHistoryState.orders.map((order) => (
                <StoreOrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedStoreOrderId === order.id}
                  isCompact={isCompactPhone}
                  onPress={() => handleSelectStoreOrder(order)}
                />
              ))}
            </View>
          ) : null}

          {storeOrderTrackingState.status === 'loading' && selectedStoreOrderId ? (
            <View style={styles.checkoutStateCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.checkoutStateTitle}>Refreshing order tracking</Text>
              <Text style={styles.checkoutStateText}>
                Pulling the selected order snapshot and invoice tracking detail now.
              </Text>
            </View>
          ) : null}

          {(storeOrderTrackingState.status === 'error' ||
            storeOrderTrackingState.status === 'unauthorized') &&
          selectedStoreOrderId ? (
            <View style={styles.checkoutStateCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#FF8B8B" />
              <Text style={styles.checkoutStateTitle}>Tracking unavailable</Text>
              <Text style={styles.checkoutStateText}>
                {storeOrderTrackingState.errorMessage || 'We could not load the selected order right now.'}
              </Text>
            </View>
          ) : null}

          {selectedStoreOrder ? (
            <>
              <View style={styles.checkoutSummaryCard}>
                <Text style={styles.checkoutSummaryTitle}>Selected Order</Text>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Order</Text>
                  <Text style={styles.checkoutSummaryValue}>{selectedStoreOrder.orderNumber}</Text>
                </View>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Created</Text>
                  <Text style={styles.checkoutSummaryValue}>
                    {formatStoreDateTimeLabel(selectedStoreOrder.createdAt)}
                  </Text>
                </View>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Status</Text>
                  <Text style={styles.checkoutSummaryValue}>{selectedStoreOrder.statusLabel}</Text>
                </View>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Subtotal</Text>
                  <Text style={styles.checkoutSummaryValue}>{selectedStoreOrder.subtotalLabel}</Text>
                </View>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Notes</Text>
                    <Text style={styles.checkoutSummaryValue}>
                      {selectedStoreOrder.notes || 'No checkout notes were attached.'}
                    </Text>
                </View>

                <Text style={styles.checkoutSummaryNote}>{selectedStoreOrder.crossServiceHint}</Text>
              </View>

              <View style={styles.checkoutFormCard}>
                <Text style={styles.checkoutCardTitle}>Invoice Tracking</Text>

                {selectedStoreInvoice ? (
                  <>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Invoice</Text>
                      <Text style={styles.checkoutSummaryValue}>{selectedStoreInvoice.invoiceNumber}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Status</Text>
                      <Text style={styles.checkoutSummaryValue}>{selectedStoreInvoice.statusLabel}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Aging</Text>
                      <Text style={styles.checkoutSummaryValue}>{selectedStoreInvoice.agingBucketLabel}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Amount Due</Text>
                      <Text style={styles.checkoutSummaryValue}>{selectedStoreInvoice.amountDueLabel}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Amount Paid</Text>
                      <Text style={styles.checkoutSummaryValue}>{selectedStoreInvoice.amountPaidLabel}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Issued</Text>
                      <Text style={styles.checkoutSummaryValue}>
                        {formatStoreDateLabel(selectedStoreInvoice.issuedAt)}
                      </Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Due</Text>
                      <Text style={styles.checkoutSummaryValue}>
                        {formatStoreDateLabel(selectedStoreInvoice.dueAt)}
                      </Text>
                    </View>

                    <Text style={styles.checkoutSummaryNote}>{selectedStoreInvoice.agingSummary}</Text>
                    <Text style={styles.checkoutSummaryNote}>{selectedStoreInvoice.crossServiceHint}</Text>

                    {selectedStoreInvoice.paymentEntries.length ? (
                      <View style={styles.storePaymentEntryList}>
                        {selectedStoreInvoice.paymentEntries.map((paymentEntry) => (
                          <StorePaymentEntryRow key={paymentEntry.id} item={paymentEntry} />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.checkoutStateText}>
                        No payment entries have been recorded yet. This screen only reflects manual backend
                        records and never assumes gateway settlement.
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.checkoutStateText}>
                      {storeOrderTrackingState.invoiceErrorMessage ||
                        'Invoice tracking has not been published for this order yet.'}
                    </Text>
                    {selectedStoreOrder.invoice ? (
                      <Text style={styles.checkoutSummaryNote}>
                        Summary invoice status: {selectedStoreOrder.invoice.invoiceNumber} -{' '}
                        {selectedStoreOrder.invoice.statusLabel}
                      </Text>
                    ) : null}
                    <Text style={styles.checkoutSummaryNote}>{selectedStoreOrder.crossServiceHint}</Text>
                  </>
                )}
              </View>

              <View style={styles.checkoutFormCard}>
                <Text style={styles.checkoutCardTitle}>Billing Address Snapshot</Text>
                <Text style={styles.checkoutAddressText}>
                  {buildCheckoutAddressLabel(
                    selectedStoreOrder.addresses?.find((address) => address.addressType === 'billing'),
                  ) || 'No billing address was returned in the order snapshot.'}
                </Text>
              </View>

              <View style={styles.checkoutFormCard}>
                <Text style={styles.checkoutCardTitle}>Ordered Items</Text>
                {selectedStoreOrder.items.map((item) => (
                  <View key={item.id} style={styles.checkoutPreviewItem}>
                    <View style={styles.checkoutPreviewItemCopy}>
                      <Text style={styles.checkoutPreviewItemTitle}>{item.productName}</Text>
                      <Text style={styles.checkoutPreviewItemMeta}>
                        Qty {item.quantity}
                        {item.productSku ? ` | SKU ${item.productSku}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.checkoutPreviewItemValue}>{item.lineTotalLabel}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.checkoutFormCard}>
                <Text style={styles.checkoutCardTitle}>Order Status Timeline</Text>
                {selectedStoreOrder.statusHistory.length ? (
                  selectedStoreOrder.statusHistory.map((historyEntry, index) => (
                    <StoreOrderHistoryEntry
                      key={historyEntry.id}
                      item={historyEntry}
                      isLast={index === selectedStoreOrder.statusHistory.length - 1}
                    />
                  ))
                ) : (
                  <Text style={styles.checkoutStateText}>
                    No order status transitions have been recorded beyond the initial checkout yet.
                  </Text>
                )}
              </View>
            </>
          ) : null}
        </>
      )}
      </>
    ));
  };

  const renderBookingContent = () => {
    const bookingDiscoveryStateKey = getBookingDiscoveryStateKey(bookingDiscovery);
    const selectedVehicle = bookingDiscovery.vehicles.find(
      (vehicle) => vehicle.id === selectedBookingVehicleId,
    );
    const selectedService = bookingDiscovery.services.find(
      (service) => service.id === selectedBookingServiceKey,
    );
    const selectedTimeSlot = bookingDiscovery.timeSlots.find(
      (timeSlot) => timeSlot.id === selectedBookingTimeKey,
    );
    const bookingAvailability = bookingDiscovery.availability;
    const selectedBookingDay = getBookingAvailabilityDayByDate(
      bookingAvailability,
      selectedBookingDateKey,
    );
    const selectedBookingSlotAvailability = getBookingAvailabilitySlotForTime(
      selectedBookingDay,
      selectedTimeSlot?.id,
    );
    const minimumDate = parseDateOnly(bookingAvailability.minBookableDate);
    const maximumDate = parseDateOnly(bookingAvailability.maxBookableDate);
    const selectedBookingDateValue =
      parseDateOnly(selectedBookingDateKey) ||
      minimumDate ||
      parseDateOnly(bookingAvailability.startDate) ||
      new Date();
    const bookingVehicleOptions = bookingDiscovery.vehicles.map((vehicle) => ({
      id: vehicle.id,
      title: buildOwnedVehicleLabel(vehicle),
      subtitle: `${vehicle.make} ${vehicle.model} - ${vehicle.year}`,
      plateNumber: vehicle.plateNumber,
    }));
    const bookingServiceOptions = bookingDiscovery.services.map((service) => ({
      key: service.id,
      icon: 'wrench-outline',
      title: service.name,
      subtitle: service.description || 'No service description has been published for this offering yet.',
      enabled: service.isActive,
      badgeLabel: service.isActive ? null : 'Inactive',
      metaLabel: service.categoryId ? 'Categorized' : null,
      durationLabel: formatBookingServiceDuration(service.durationMinutes),
    }));
    const totalServicePages = Math.max(
      1,
      Math.ceil(bookingServiceOptions.length / BOOKING_SERVICE_PAGE_SIZE),
    );
    const paginatedBookingServiceOptions = bookingServiceOptions.slice(
      bookingServicePage * BOOKING_SERVICE_PAGE_SIZE,
      (bookingServicePage + 1) * BOOKING_SERVICE_PAGE_SIZE,
    );
    const bookingTimeSlotOptions = bookingDiscovery.timeSlots.map((timeSlot) => ({
      key: timeSlot.id,
      label: timeSlot.label,
      timeRangeLabel: formatBookingTimeSlotWindow(timeSlot),
      capacityLabel: `Capacity ${timeSlot.capacity}`,
      available: timeSlot.isActive,
      reason: timeSlot.isActive ? null : 'Unavailable',
    }));
    const bookingDateOptions = bookingAvailability.days.map((day) =>
      buildBookingDateCardItem(day, selectedTimeSlot),
    );
    const hasPreviousAvailabilityWindow =
      bookingAvailability.status === 'ready' &&
      Boolean(bookingAvailability.startDate) &&
      Boolean(bookingAvailability.minBookableDate) &&
      bookingAvailability.startDate > bookingAvailability.minBookableDate;
    const hasNextAvailabilityWindow =
      bookingAvailability.status === 'ready' &&
      Boolean(bookingAvailability.endDate) &&
      Boolean(bookingAvailability.maxBookableDate) &&
      bookingAvailability.endDate < bookingAvailability.maxBookableDate;
    const isBookingReady =
      bookingDiscoveryStateKey === 'ready' &&
      Boolean(selectedVehicle) &&
      Boolean(selectedService?.isActive) &&
      Boolean(selectedTimeSlot?.isActive) &&
      Boolean(selectedBookingDateKey) &&
      Boolean(selectedBookingSlotAvailability ? selectedBookingSlotAvailability.isAvailable : selectedBookingDay?.isBookable) &&
      bookingCreateState.status !== 'submitting';
    const selectedHistoryBooking = bookingHistory.bookings.find(
      (booking) => booking.id === selectedHistoryBookingId,
    );
    const selectedBookingDetail = bookingDetailState.booking ?? selectedHistoryBooking ?? null;
    const trackingSteps = buildBookingTrackingSteps(selectedBookingDetail);

    return renderScrollableContent(styles.bookingScrollContent, (
      <>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingEyebrow}>SERVICE CENTER</Text>
        <Text style={styles.bookingTitle}>Discover & Track</Text>
      </View>

      <View style={styles.bookingModeWrap}>
        <BookingModeTab
          label="Discover Options"
          isActive={bookingMode === 'book'}
          onPress={() => setBookingMode('book')}
        />
        <BookingModeTab
          label="Track Progress"
          isActive={bookingMode === 'track'}
          onPress={() => setBookingMode('track')}
        />
      </View>

      {bookingMode === 'book' ? (
        <>
          <View style={[styles.bookingDiscoveryBanner, isCompactPhone && styles.bookingDiscoveryBannerCompact]}>
            <View
              style={[
                styles.bookingDiscoveryBannerCopyWrap,
                isCompactPhone && styles.bookingDiscoveryBannerCopyWrapCompact,
              ]}
            >
              <View style={styles.bookingDiscoveryBannerIconWrap}>
                <MaterialCommunityIcons name="source-branch-sync" size={18} color={colors.primary} />
              </View>
              <View style={styles.bookingDiscoveryBannerCopy}>
                <Text style={styles.bookingDiscoveryBannerTitle}>Live booking discovery</Text>
                <Text style={styles.bookingDiscoveryBannerText}>
                  Services, slot definitions, and appointment-date availability come from live backend routes. Choosing a slot here does not hold capacity until booking create.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bookingDiscoveryRefreshButton}
              onPress={handleRefreshBookingDiscovery}
              activeOpacity={bookingDiscovery.status === 'loading' ? 1 : 0.86}
              disabled={bookingDiscovery.status === 'loading'}
            >
              {bookingDiscovery.status === 'loading' ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {bookingDiscoveryStateKey === 'loading' ? (
            <BookingDiscoveryStatePanel
              icon="timer-sand"
              title="Loading booking discovery"
              message="Fetching live services, time-slot definitions, your eligible vehicles, and the current booking window now."
              isLoading
            />
          ) : bookingDiscoveryStateKey === 'unauthorized' ? (
            <BookingDiscoveryStatePanel
              icon="lock-outline"
              title="Your session needs attention"
              message={bookingDiscovery.errorMessage || 'Sign in again to read your eligible vehicle list before booking.'}
              actionLabel="Retry"
              onAction={handleRefreshBookingDiscovery}
            />
          ) : bookingDiscoveryStateKey === 'error' ? (
            <BookingDiscoveryStatePanel
              icon="alert-circle-outline"
              title="Booking discovery is unavailable"
              message={bookingDiscovery.errorMessage || 'We could not refresh the discovery data right now.'}
              actionLabel="Retry"
              onAction={handleRefreshBookingDiscovery}
            />
          ) : (
            <>
              <Text style={styles.bookingSectionLabel}>Select Vehicle</Text>
              {bookingVehicleOptions.length ? (
                bookingVehicleOptions.map((vehicle) => (
                  <BookingVehicleCard
                    key={vehicle.id}
                    item={vehicle}
                    isSelected={selectedBookingVehicleId === vehicle.id}
                    isCompact={isCompactPhone}
                    onPress={() => {
                      setSelectedBookingVehicleId(vehicle.id);
                      if (bookingCreateState.status !== 'submitting') {
                        setBookingCreateState(createInitialBookingCreateState());
                      }
                    }}
                  />
                ))
              ) : (
                <BookingDiscoveryStatePanel
                  icon="car-off"
                  title="No eligible vehicles found"
                  message="Only vehicles already attached to your account can be used for booking discovery. Add one from your profile flow to continue."
                />
              )}

              <Text style={styles.bookingSectionLabel}>Available Services</Text>
              <View style={[styles.bookingPagerRow, isCompactPhone && styles.bookingPagerRowCompact]}>
                <Text style={styles.bookingPagerText}>
                  Page {Math.min(bookingServicePage + 1, totalServicePages)} of {totalServicePages}
                </Text>
                <View style={[styles.bookingPagerActions, isCompactPhone && styles.bookingPagerActionsCompact]}>
                  <TouchableOpacity
                    style={[
                      styles.bookingPagerButton,
                      bookingServicePage === 0 && styles.bookingPagerButtonDisabled,
                    ]}
                    disabled={bookingServicePage === 0}
                    onPress={() => setBookingServicePage((currentPage) => Math.max(0, currentPage - 1))}
                    activeOpacity={bookingServicePage === 0 ? 1 : 0.86}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={16} color={colors.text} />
                    <Text style={styles.bookingPagerButtonText}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bookingPagerButton,
                      bookingServicePage >= totalServicePages - 1 && styles.bookingPagerButtonDisabled,
                    ]}
                    disabled={bookingServicePage >= totalServicePages - 1}
                    onPress={() =>
                      setBookingServicePage((currentPage) => Math.min(totalServicePages - 1, currentPage + 1))
                    }
                    activeOpacity={bookingServicePage >= totalServicePages - 1 ? 1 : 0.86}
                  >
                    <Text style={styles.bookingPagerButtonText}>Next</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              {!bookingDiscovery.services.some(isBookableService) ? (
                <BookingDiscoveryStatePanel
                  icon="wrench-clock"
                  title="No services are available right now"
                  message="The live services route returned no active booking services. Keep this state explicit instead of filling the list with placeholders."
                />
              ) : null}
              {paginatedBookingServiceOptions.map((service) => (
                <BookingServiceCard
                  key={service.key}
                  item={service}
                  isSelected={selectedBookingServiceKey === service.key}
                  isCompact={isCompactPhone}
                  onPress={() => {
                    setSelectedBookingServiceKey(service.key);
                    if (bookingCreateState.status !== 'submitting') {
                      setBookingCreateState(createInitialBookingCreateState());
                    }
                  }}
                />
              ))}

              <Text style={styles.bookingSectionLabel}>Slot Definitions</Text>
              <Text style={styles.bookingDateHint}>
                Pick the shop window that works best. Staff can accept, decline, cancel, or complete the request from the admin schedule.
              </Text>
              {!bookingDiscovery.timeSlots.some(isBookableTimeSlot) ? (
                <BookingDiscoveryStatePanel
                  icon="calendar-remove-outline"
                  title="No bookable time slots are open"
                  message="The live time-slot route returned no active slots. Keep this visible to the customer instead of pretending a slot is available."
                />
              ) : null}
              {bookingTimeSlotOptions.length ? (
                <View style={styles.bookingTimeGrid}>
                  {bookingTimeSlotOptions.map((slot) => (
                    <BookingTimeSlot
                      key={slot.key}
                      item={slot}
                      isSelected={selectedBookingTimeKey === slot.key}
                      isCompact={isCompactPhone}
                      onPress={() => {
                        setSelectedBookingTimeKey(slot.key);
                        if (bookingCreateState.status !== 'submitting') {
                          setBookingCreateState(createInitialBookingCreateState());
                        }
                      }}
                    />
                  ))}
                </View>
              ) : (
                <BookingDiscoveryStatePanel
                  icon="clock-remove-outline"
                  title="No slot definitions returned"
                  message="Time-slot definitions will appear here once the backend publishes them."
                />
              )}

              <Text style={styles.bookingSectionLabel}>Appointment Date</Text>
              <Text style={styles.bookingDateHint}>
                Page through the live booking window and choose a date that is still available for your selected slot.
              </Text>
              <View style={styles.bookingAvailabilityWindowCard}>
                <View style={[styles.bookingAvailabilityToolbar, isCompactPhone && styles.bookingAvailabilityToolbarCompact]}>
                  <View style={styles.bookingAvailabilityCopy}>
                    <Text style={styles.bookingAvailabilityTitle}>Live Availability Window</Text>
                    <Text style={styles.bookingAvailabilityText}>
                      {getBookingAvailabilityWindowLabel(bookingAvailability)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.bookingAvailabilityActions,
                      isCompactPhone && styles.bookingAvailabilityActionsCompact,
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.bookingPagerButton,
                        !hasPreviousAvailabilityWindow && styles.bookingPagerButtonDisabled,
                      ]}
                      disabled={!hasPreviousAvailabilityWindow || bookingAvailability.status === 'loading'}
                      onPress={() => void handleShiftBookingAvailabilityWindow('prev')}
                      activeOpacity={
                        !hasPreviousAvailabilityWindow || bookingAvailability.status === 'loading'
                          ? 1
                          : 0.86
                      }
                    >
                      <MaterialCommunityIcons name="chevron-left" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.bookingPagerButton,
                        !hasNextAvailabilityWindow && styles.bookingPagerButtonDisabled,
                      ]}
                      disabled={!hasNextAvailabilityWindow || bookingAvailability.status === 'loading'}
                      onPress={() => void handleShiftBookingAvailabilityWindow('next')}
                      activeOpacity={
                        !hasNextAvailabilityWindow || bookingAvailability.status === 'loading'
                          ? 1
                          : 0.86
                      }
                    >
                      <MaterialCommunityIcons name="chevron-right" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {bookingAvailability.status === 'loading' && !bookingAvailability.days.length ? (
                  <BookingDiscoveryStatePanel
                    icon="calendar-sync"
                    title="Refreshing live availability"
                    message="Loading backend-approved appointment dates for this booking window."
                    isLoading
                  />
                ) : null}

                {bookingAvailability.status === 'error' ? (
                  <BookingDiscoveryStatePanel
                    icon="calendar-alert"
                    title="Date availability is unavailable"
                    message={bookingAvailability.errorMessage || 'We could not refresh the booking availability window right now.'}
                    actionLabel="Retry"
                    onAction={() => void loadBookingAvailabilityWindow(getCurrentBookingAvailabilityWindow())}
                  />
                ) : null}

                {bookingAvailability.days.length ? (
                  <View
                    style={[
                      styles.bookingAvailabilityGrid,
                      isVeryCompactPhone && styles.bookingAvailabilityGridCompact,
                    ]}
                  >
                    {bookingDateOptions.map((dateOption) => (
                      <BookingDateCard
                        key={dateOption.key}
                        item={dateOption}
                        isSelected={selectedBookingDateKey === dateOption.key}
                        isCompact={isCompactPhone}
                        cardStyle={bookingDateCardStyle}
                        onPress={() => {
                          setSelectedBookingDateKey(dateOption.key);
                          if (bookingCreateState.status !== 'submitting') {
                            setBookingCreateState(createInitialBookingCreateState());
                          }
                        }}
                      />
                    ))}
                  </View>
                ) : null}

                <DatePickerField
                  label="Jump To A Date"
                  value={selectedBookingDateValue}
                  onChange={(nextDate) => void handleChangeBookingDate(nextDate)}
                  placeholder="Choose an appointment date"
                  helperText={
                    minimumDate && maximumDate
                      ? `Supported booking horizon: ${formatDate(minimumDate)} to ${formatDate(maximumDate)}. The live cards above remain the source of truth.`
                      : 'Choose a date inside the live booking horizon.'
                  }
                  title="Jump To A Booking Date"
                  subtitle="Pick a farther date inside the backend-supported booking horizon."
                  trailingLabel="Jump"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  initialPickerStep="day"
                />

                {selectedBookingDay ? (
                  <View style={styles.bookingAvailabilitySelectionCard}>
                    <View
                      style={[
                        styles.bookingAvailabilitySelectionHeader,
                        isCompactPhone && styles.bookingAvailabilitySelectionHeaderCompact,
                      ]}
                    >
                      <Text style={styles.bookingAvailabilitySelectionTitle}>
                        {formatBookingDateLabel(selectedBookingDay.scheduledDate)}
                      </Text>
                      <View
                        style={[
                          styles.bookingDateStatusBadge,
                          selectedBookingSlotAvailability?.isAvailable
                            ? selectedBookingDay.status === 'limited'
                              ? styles.bookingDateStatusBadgeWarning
                              : styles.bookingDateStatusBadgeSuccess
                            : styles.bookingDateStatusBadgeDanger,
                        ]}
                      >
                        <Text style={styles.bookingDateStatusText}>
                          {formatBookingAvailabilityStatusLabel(
                            selectedBookingSlotAvailability?.isAvailable
                              ? selectedBookingDay.status
                              : 'full',
                          )}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.bookingAvailabilitySelectionMeta}>
                      {selectedBookingSlotAvailability
                        ? `${selectedBookingSlotAvailability.label}: ${selectedBookingSlotAvailability.remainingCapacity} of ${selectedBookingSlotAvailability.capacity} spots left.`
                        : `${selectedBookingDay.availableSlotCount} of ${selectedBookingDay.activeSlotCount} live slots are still available on this day.`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.bookingSectionLabel}>Special Notes</Text>
              <View style={styles.bookingNotesCard}>
                <TextInput
                  value={bookingNotes}
                  onChangeText={(value) => {
                    setBookingNotes(value);
                    if (bookingCreateState.status !== 'submitting') {
                      setBookingCreateState(createInitialBookingCreateState());
                    }
                  }}
                  placeholder="Optional concerns for staff review..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  textAlignVertical="top"
                  style={styles.bookingNotesInput}
                  selectionColor={colors.primary}
                />
              </View>

              <View style={styles.bookingSummaryCard}>
                <Text style={styles.bookingSummaryTitle}>Discovery Summary</Text>

                <View style={styles.bookingSummaryRow}>
                  <Text style={styles.bookingSummaryLabel}>Vehicle</Text>
                  <Text style={styles.bookingSummaryValue}>
                    {selectedVehicle ? buildOwnedVehicleLabel(selectedVehicle) : 'Choose an owned vehicle'}
                  </Text>
                </View>

                <View style={styles.bookingSummaryRow}>
                  <Text style={styles.bookingSummaryLabel}>Service</Text>
                  <Text style={styles.bookingSummaryValue}>
                    {selectedService?.name || 'Choose a service'}
                  </Text>
                </View>

                <View style={styles.bookingSummaryRow}>
                  <Text style={styles.bookingSummaryLabel}>Slot</Text>
                  <Text style={styles.bookingSummaryValue}>
                    {selectedTimeSlot
                      ? `${selectedTimeSlot.label} - ${formatBookingTimeSlotWindow(selectedTimeSlot)}`
                      : 'Choose a live slot definition'}
                  </Text>
                </View>

                <View style={styles.bookingSummaryRow}>
                  <Text style={styles.bookingSummaryLabel}>Date</Text>
                  <Text style={styles.bookingSummaryValue}>
                    {selectedBookingDateKey ? formatBookingDateLabel(selectedBookingDateKey) : 'Choose a date'}
                  </Text>
                </View>

                <Text style={styles.bookingSummaryNote}>
                  Submitting creates a pending booking request. Staff confirmation, decline, or reschedule decisions remain separate later booking states.
                </Text>
              </View>

              {bookingCreateState.status !== 'idle' ? (
                <BookingDiscoveryStatePanel
                  icon={
                    bookingCreateState.status === 'success'
                      ? 'check-circle-outline'
                      : bookingCreateState.status === 'conflict'
                        ? 'calendar-alert'
                        : bookingCreateState.status === 'submitting'
                          ? 'timer-sand'
                          : 'alert-circle-outline'
                  }
                  title={
                    bookingCreateState.status === 'success'
                      ? 'Booking request submitted'
                      : bookingCreateState.status === 'conflict'
                        ? 'Slot conflict'
                        : bookingCreateState.status === 'submitting'
                          ? 'Submitting request'
                          : bookingCreateState.status === 'unauthorized'
                            ? 'Session required'
                            : 'Booking request needs attention'
                  }
                  message={bookingCreateState.message}
                  isLoading={bookingCreateState.status === 'submitting'}
                  actionLabel={bookingCreateState.status === 'conflict' ? 'Refresh Options' : undefined}
                  onAction={
                    bookingCreateState.status === 'conflict'
                      ? () => void loadBookingAvailabilityWindow(getCurrentBookingAvailabilityWindow())
                      : undefined
                  }
                />
              ) : null}

              <TouchableOpacity
                style={[styles.bookingConfirmButton, !isBookingReady && styles.bookingConfirmButtonDisabled]}
                onPress={isBookingReady ? handleSubmitBooking : undefined}
                activeOpacity={isBookingReady ? 0.88 : 1}
                disabled={!isBookingReady}
              >
                <Text
                  style={[
                    styles.bookingConfirmButtonText,
                    !isBookingReady && styles.bookingConfirmButtonTextDisabled,
                  ]}
                >
                  {bookingCreateState.status === 'submitting'
                    ? 'Submitting...'
                    : isBookingReady
                      ? 'Submit Booking Request'
                      : 'Select Vehicle, Service, Slot, And Date'}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={isBookingReady ? colors.onPrimary : colors.mutedText}
                />
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <>
          <View style={styles.bookingHistoryToolbar}>
            <View>
              <Text style={styles.bookingSectionLabel}>Booking History</Text>
              <Text style={styles.bookingHistoryToolbarText}>
                Customer-visible records from your booking history endpoint.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bookingDiscoveryRefreshButton}
              onPress={handleRefreshBookingHistory}
              activeOpacity={bookingHistory.status === 'loading' ? 1 : 0.86}
              disabled={bookingHistory.status === 'loading'}
            >
              {bookingHistory.status === 'loading' ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {bookingHistory.status === 'loading' && !bookingHistory.bookings.length ? (
            <BookingDiscoveryStatePanel
              icon="timer-sand"
              title="Loading booking history"
              message="Fetching your customer booking history now."
              isLoading
            />
          ) : bookingHistory.status === 'unauthorized' ? (
            <BookingDiscoveryStatePanel
              icon="lock-outline"
              title="Session required"
              message={bookingHistory.errorMessage || 'Sign in again to load booking history.'}
              actionLabel="Retry"
              onAction={handleRefreshBookingHistory}
            />
          ) : bookingHistory.status === 'error' ? (
            <BookingDiscoveryStatePanel
              icon="alert-circle-outline"
              title="History unavailable"
              message={bookingHistory.errorMessage || 'Unable to load booking history right now.'}
              actionLabel="Retry"
              onAction={handleRefreshBookingHistory}
            />
          ) : bookingHistory.bookings.length ? (
            <View style={styles.bookingHistoryList}>
              {bookingHistory.bookings.map((booking) => (
                <BookingHistoryCard
                  key={booking.id}
                  booking={booking}
                  vehicles={bookingDiscovery.vehicles}
                  isSelected={selectedHistoryBookingId === booking.id}
                  onPress={() => setSelectedHistoryBookingId(booking.id)}
                />
              ))}
            </View>
          ) : (
            <BookingDiscoveryStatePanel
              icon="calendar-blank-outline"
              title="No bookings yet"
              message="Submitted bookings will appear here after the create endpoint returns a booking record."
            />
          )}

          {bookingDetailState.status === 'loading' && selectedHistoryBookingId ? (
            <BookingDiscoveryStatePanel
              icon="timer-sand"
              title="Refreshing booking detail"
              message="Loading the selected booking detail from the live detail endpoint."
              isLoading
            />
          ) : null}

          {bookingDetailState.status === 'unauthorized' || bookingDetailState.status === 'error' ? (
            <BookingDiscoveryStatePanel
              icon="alert-circle-outline"
              title="Detail unavailable"
              message={bookingDetailState.errorMessage || 'Unable to load selected booking detail right now.'}
            />
          ) : null}

          {selectedBookingDetail ? (
            <>
              <View style={styles.trackingSummaryCard}>
                <View style={styles.trackingSummaryHeader}>
                  <Text style={styles.trackingReferenceText}>
                    Booking #{getBookingReference(selectedBookingDetail)}
                  </Text>
                  <View style={[styles.trackingStatusPill, styles.trackingStatusPillActive]}>
                    <Text style={styles.trackingStatusPillText}>
                      {getBookingStatusLabel(selectedBookingDetail.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.trackingSummaryTitle}>
                  {getBookingServiceNames(selectedBookingDetail)}
                </Text>

                <View style={styles.trackingMetaGrid}>
                  <View style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}>
                    <Text style={styles.trackingMetaLabel}>Vehicle</Text>
                    <Text style={styles.trackingMetaValue}>
                      {getBookingVehicleLabel(selectedBookingDetail, bookingDiscovery.vehicles)}
                    </Text>
                  </View>
                  <View style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}>
                    <Text style={styles.trackingMetaLabel}>Date</Text>
                    <Text style={styles.trackingMetaValue}>
                      {formatBookingDateLabel(selectedBookingDetail.scheduledDate)}
                    </Text>
                  </View>
                  <View style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}>
                    <Text style={styles.trackingMetaLabel}>Time</Text>
                    <Text style={styles.trackingMetaValue}>
                      {getBookingTimeLabel(selectedBookingDetail)}
                    </Text>
                  </View>
                  <View style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}>
                    <Text style={styles.trackingMetaLabel}>Status</Text>
                    <Text style={styles.trackingMetaValue}>
                      {getBookingStatusLabel(selectedBookingDetail.status)}
                    </Text>
                  </View>
                  <View style={styles.trackingMetaItemWide}>
                    <Text style={styles.trackingMetaLabel}>Notes</Text>
                    <Text style={styles.trackingMetaValue}>
                      {selectedBookingDetail.notes || 'No notes submitted.'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.trackingProgressCard}>
                <Text style={styles.bookingSectionLabel}>Booking Status</Text>
                {trackingSteps.map((step, index) => (
                  <TrackingStep
                    key={step.label}
                    item={step}
                    isLast={index === trackingSteps.length - 1}
                  />
                ))}
              </View>

              {selectedBookingDetail.statusHistory?.length ? (
                <View style={styles.bookingStatusHistoryCard}>
                  <Text style={styles.bookingSectionLabel}>Recorded Status Changes</Text>
                  {selectedBookingDetail.statusHistory.slice(0, 4).map((historyItem) => (
                    <View key={historyItem.id} style={styles.bookingStatusHistoryRow}>
                      <Text style={styles.bookingStatusHistoryTitle}>
                        {getBookingStatusLabel(historyItem.nextStatus)}
                      </Text>
                      <Text style={styles.bookingStatusHistoryMeta}>
                        {historyItem.reason || 'No reason provided'} - {historyItem.changedAt}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </>
      )}
      </>
    ));
  };

  const renderHomeContent = () => {
    const currentHour = new Date().getHours();
    const greeting =
      currentHour < 12 ? 'Good morning,' : currentHour < 18 ? 'Good afternoon,' : 'Good evening,';
    const firstName = account?.firstName || 'Juan';
    const lastName = account?.lastName || 'dela Cruz';
    const unreadCount = notificationsFeed.filter((item) => item.unread).length;
    const pinnedNotification = notificationsFeed[0] || null;
    const latestCustomerBooking = bookingHistory.bookings[0] ?? bookingCreateState.booking ?? null;
    const totalBookingCount = bookingHistory.bookings.length;
    const latestBookingProgress =
      latestCustomerBooking?.status === 'completed' ||
      latestCustomerBooking?.status === 'declined' ||
      latestCustomerBooking?.status === 'cancelled'
        ? '100%'
        : latestCustomerBooking?.status === 'confirmed' ||
            latestCustomerBooking?.status === 'rescheduled'
          ? '55%'
          : latestCustomerBooking
            ? '25%'
            : '0%';
    const topStatus = latestCustomerBooking
      ? {
          badge: getBookingStatusLabel(latestCustomerBooking.status).toUpperCase(),
          title: getBookingServiceNames(latestCustomerBooking),
          subtitle: `${getBookingVehicleLabel(latestCustomerBooking, bookingDiscovery.vehicles)} - ${getBookingTimeLabel(latestCustomerBooking)} - ${formatBookingDateLabel(latestCustomerBooking.scheduledDate)}`,
          progressWidth: latestBookingProgress,
          steps: ['Submitted', 'Staff Review', 'Appointment', 'Outcome'],
        }
      : {
          badge: 'NO ACTIVE SERVICE',
          title: 'Vehicle standing by',
          subtitle: 'No ongoing service right now. Book anytime when a slot is available.',
          progressWidth: '0%',
          steps: ['Book', 'Check-In', 'Service', 'Ready'],
        };
    const quickActions = [
      {
        key: 'book',
        label: 'Book Service',
        icon: 'wrench-outline',
        bgColor: 'rgba(255, 122, 0, 0.14)',
        iconColor: colors.primary,
        onPress: () => navigateToBooking('book'),
      },
      {
        key: 'insurance',
        label: 'Insurance',
        icon: 'shield-outline',
        bgColor: 'rgba(52, 127, 255, 0.14)',
        iconColor: '#347FFF',
        onPress: () => navigateToInsuranceInquiry(),
      },
      {
        key: 'rewards',
        label: 'Rewards',
        icon: 'star-outline',
        bgColor: 'rgba(255, 197, 0, 0.14)',
        iconColor: '#FFC500',
        onPress: () => navigateToProfileSection('rewards'),
      },
      {
        key: 'garage',
        label: 'Garage',
        icon: 'garage-variant',
        bgColor: 'rgba(18, 215, 100, 0.14)',
        iconColor: '#12D764',
        onPress: () => navigateToGarage(),
      },
      {
        key: 'support',
        label: 'Support',
        icon: 'message-processing-outline',
        bgColor: 'rgba(157, 139, 255, 0.16)',
        iconColor: '#9D8BFF',
        onPress: navigateToSupport,
      },
    ];
    const handleFeaturedRewardPress = () => {
      if (featuredReward?.available) {
        handleRedeemReward(featuredReward);
        return;
      }

      navigateToProfileSection('rewards');
    };

    return renderScrollableContent(styles.homeScrollContent, (
      <>
      <View style={styles.homeHeader}>
        <View style={styles.homeBrandRow}>
          <View style={styles.homeBrandBadge}>
            <MaterialCommunityIcons name="wrench-outline" size={18} color={colors.text} />
          </View>
          <View>
            <Text style={styles.homeBrandEyebrow}>CRUISERS CRIB</Text>
            <Text style={styles.homeBrandTitle}>AUTOCARE</Text>
          </View>
        </View>

        <View style={styles.homeHeaderActions}>
          <NotificationIconButton count={unreadCount} onPress={handleToggleNotifications} />
          <ProfileAvatarButton
            account={account}
            onPress={navigateToProfileModule}
            onChangePhoto={handleSelectProfileImage}
            showTooltip={isProfileTooltipVisible}
            onHoverIn={() => setIsProfileTooltipVisible(true)}
            onHoverOut={() => setIsProfileTooltipVisible(false)}
          />
        </View>
      </View>

      {pinnedNotification ? (
        <View style={styles.homeNotificationBanner}>
          <View style={[styles.homeNotificationIconWrap, { backgroundColor: pinnedNotification.bgColor }]}>
            <MaterialCommunityIcons name={pinnedNotification.icon} size={18} color={pinnedNotification.tint} />
          </View>
          <View style={styles.homeNotificationCopy}>
            <Text style={styles.homeNotificationMeta}>
              {pinnedNotification.brand} <Text style={styles.homeNotificationTime}>{pinnedNotification.timeLabel}</Text>
            </Text>
            <Text style={styles.homeNotificationTitle}>{pinnedNotification.title}</Text>
            <Text style={styles.homeNotificationText}>{pinnedNotification.message}</Text>
          </View>
          <TouchableOpacity
            style={styles.homeNotificationClose}
            onPress={() => handleDismissNotification(pinnedNotification.key)}
            activeOpacity={0.82}
          >
            <MaterialCommunityIcons name="close" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.homeGreeting}>{greeting}</Text>
      <View style={styles.homeNameRow}>
        <Text style={styles.homeName}>
          {firstName} {lastName}
        </Text>
        <Text style={styles.homeWave}>👋</Text>
      </View>

      <View style={[styles.homeStatusCard, !latestCustomerBooking && styles.homeStatusCardIdle]}>
        <View style={styles.homeStatusHeader}>
          <View style={styles.homeStatusCopy}>
            <Text style={[styles.homeStatusBadge, !latestCustomerBooking && styles.homeStatusBadgeIdle]}>
              {topStatus.badge}
            </Text>
            <Text style={styles.homeStatusTitle}>{topStatus.title}</Text>
            <Text style={styles.homeStatusSubtitle}>{topStatus.subtitle}</Text>
          </View>

          <TouchableOpacity
            style={[styles.homeTrackButton, !latestCustomerBooking && styles.homeTrackButtonIdle]}
            onPress={() => navigateToBooking('track')}
            activeOpacity={0.86}
          >
            <Text style={[styles.homeTrackButtonText, !latestCustomerBooking && styles.homeTrackButtonTextIdle]}>
              {latestCustomerBooking ? 'Track' : 'Open'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.homeProgressLabels}>
          {topStatus.steps.map((step) => (
            <Text key={step} style={styles.homeProgressLabel}>
              {step}
            </Text>
          ))}
        </View>
        <View style={styles.homeProgressTrack}>
          <View style={[styles.homeProgressFill, { width: topStatus.progressWidth }]} />
        </View>
      </View>

      <MotionPressable style={styles.homeVehicleCard} onPress={() => navigateToGarage(account?.primaryVehicleId)}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
          }}
          style={styles.homeVehicleImage}
        />
        <View style={styles.homeVehicleShade} />
        <View style={styles.homeVehicleTopCopy}>
          <Text style={styles.homeVehicleTitle}>{primaryVehicleLabel}</Text>
          <Text style={styles.homeVehicleMeta}>{primaryVehicleMetaLabel}</Text>
        </View>

        <View style={styles.homeVehicleStats}>
          <View style={styles.homeVehicleStatItem}>
            <Text style={styles.homeVehicleStatValue}>{totalBookingCount.toLocaleString()}</Text>
            <Text style={styles.homeVehicleStatLabel}>Bookings</Text>
          </View>
          <View style={styles.homeVehicleStatDivider} />
          <View style={styles.homeVehicleStatItem}>
            <Text style={styles.homeVehicleStatValue}>{loyaltyPointsBalance.toLocaleString()}</Text>
            <Text style={styles.homeVehicleStatLabel}>Points</Text>
          </View>
          <View style={styles.homeVehicleStatDivider} />
          <View style={styles.homeVehicleStatItem}>
            <Text style={[styles.homeVehicleStatValue, styles.homeVehicleTierValue]}>{loyaltyTier.label}</Text>
            <Text style={styles.homeVehicleStatLabel}>Tier</Text>
          </View>
        </View>
      </MotionPressable>

      <Text style={styles.homeSectionLabel}>Quick Actions</Text>
      <View style={[styles.quickActionsRow, isVeryCompactPhone && styles.quickActionsRowCompact]}>
        {quickActions.map((action) => (
          <QuickActionCard
            key={action.key}
            item={action}
            isCompact={isVeryCompactPhone}
            onPress={action.onPress}
          />
        ))}
      </View>

      <View style={styles.homePmsCard}>
        <View style={styles.homePmsIconWrap}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.homePmsCopy}>
          <Text style={styles.homePmsTitle}>Next PMS Due</Text>
          <Text style={styles.homePmsSubtitle}>In 2,750 km or by May 2026</Text>
        </View>
        <TouchableOpacity style={styles.homePmsButton} onPress={() => navigateToBooking('book')} activeOpacity={0.86}>
          <Text style={styles.homePmsButtonText}>Book</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.homeSectionHeader}>
        <Text style={styles.homeSectionLabel}>Recent Services</Text>
        <TouchableOpacity style={styles.homeViewAllButton} onPress={navigateToTimeline} activeOpacity={0.86}>
          <Text style={styles.homeViewAllText}>View All</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {recentHomeServices.map((item) => (
        <HomeServiceRow key={item.key} item={item} isCompact={isCompactPhone} />
      ))}

      <View style={styles.homeOfferCard}>
        <Text style={styles.homeOfferEyebrow}>{featuredRewardEyebrow}</Text>
        <Text style={styles.homeOfferTitle}>{featuredRewardTitle}</Text>
        <Text style={[styles.homeOfferSubtitle, isVeryCompactPhone && styles.homeOfferSubtitleCompact]}>
          {featuredRewardSubtitle}
        </Text>
        <TouchableOpacity style={styles.homeOfferButton} onPress={handleFeaturedRewardPress} activeOpacity={0.86}>
          <Text style={styles.homeOfferButtonText}>{featuredRewardButtonLabel}</Text>
        </TouchableOpacity>
        <View style={styles.homeOfferCircle} />
      </View>
      </>
    ));
  };

  const renderTimelineContent = () => {
    const visibleTimelineItems = vehicleLifecycleState.events.filter((item) =>
      timelineFilter === 'All' ? true : item.filter === timelineFilter,
    );
    const garageVehicleSummaries = digitalGarageState.vehicleSummaries ?? [];
    const selectedGarageVehicle =
      digitalGarageState.vehicles.find((vehicle) => vehicle.id === selectedGarageVehicleId) ??
      digitalGarageState.vehicles[0] ??
      null;
    const selectedGarageVehicleSummary =
      garageVehicleSummaries.find((vehicle) => vehicle.id === selectedGarageVehicle?.id) ??
      null;

    const renderGarageVehicleState = () => {
      if (digitalGarageState.status === 'garage_loading' && !garageVehicleSummaries.length) {
        return (
          <View style={styles.timelineStateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.timelineStateTitle}>Loading your Digital Garage</Text>
            <Text style={styles.timelineStateText}>
              We are reading your customer-owned vehicles from the live backend route.
            </Text>
          </View>
        );
      }

      if (digitalGarageState.status === 'garage_unauthorized' || digitalGarageState.status === 'garage_forbidden') {
        return (
          <TimelineStateCard
            icon="lock-outline"
            title="Digital Garage unavailable"
            message={digitalGarageState.errorMessage || 'Sign in again before opening your vehicle garage.'}
          />
        );
      }

      if (digitalGarageState.status === 'garage_failed' && !garageVehicleSummaries.length) {
        return (
          <TimelineStateCard
            icon="wifi-strength-alert-outline"
            title="Garage vehicles failed to load"
            message={digitalGarageState.errorMessage || 'We could not load your owned vehicles right now.'}
          />
        );
      }

      if (!garageVehicleSummaries.length) {
        return (
          <TimelineStateCard
            icon="car-off"
            title="No owned vehicles yet"
            message="Add your first vehicle during onboarding or profile updates before booking, insurance, and lifecycle history can share one garage context."
          />
        );
      }

      return (
        <View style={styles.garageVehicleList}>
          {garageVehicleSummaries.map((vehicle) => {
            const isSelected = vehicle.id === selectedGarageVehicle?.id;

            return (
              <MotionPressable
                key={vehicle.id ?? vehicle.plateNumber}
                style={[styles.garageVehicleCard, isSelected && styles.garageVehicleCardSelected]}
                onPress={() => setSelectedGarageVehicleId(vehicle.id)}
                scaleTo={0.99}
              >
                <View style={styles.garageVehicleHeader}>
                  <View style={styles.garageVehicleIconWrap}>
                    <MaterialCommunityIcons name="car-side" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.garageVehicleCopy}>
                    <View style={styles.garageVehicleTitleRow}>
                      <Text style={styles.garageVehicleTitle}>{vehicle.title}</Text>
                      {vehicle.isPrimary ? (
                        <View style={styles.garagePrimaryPill}>
                          <Text style={styles.garagePrimaryPillText}>Primary</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.garageVehicleMeta}>{vehicle.subtitle}</Text>
                    <Text style={styles.garageVehicleRoute}>{vehicle.routeTruth}</Text>
                  </View>
                </View>

                <View style={styles.garageActionGrid}>
                  <TouchableOpacity
                    style={styles.garageActionButton}
                    onPress={() => navigateToBookingForVehicle(vehicle.id)}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.garageActionText}>Book</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.garageActionButton}
                    onPress={() => {
                      setSelectedGarageVehicleId(vehicle.id);
                      navigation.navigate('VehicleLifecycleScreen', { vehicleId: vehicle.id });
                    }}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.garageActionText}>Lifecycle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.garageActionButton}
                    onPress={() => navigateToInsuranceInquiry(vehicle.id)}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.garageActionText}>Insurance</Text>
                  </TouchableOpacity>
                </View>
              </MotionPressable>
            );
          })}
        </View>
      );
    };

    const renderTimelineState = () => {
      if (vehicleLifecycleState.status === 'timeline_loading') {
        return (
          <View style={styles.timelineStateCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.timelineStateTitle}>Loading lifecycle history</Text>
            <Text style={styles.timelineStateText}>
              We are pulling the latest normalized vehicle history for your account.
            </Text>
          </View>
        );
      }

      if (vehicleLifecycleState.status === 'timeline_forbidden') {
        return (
          <TimelineStateCard
            icon="lock-outline"
            title="Lifecycle history unavailable"
            message={vehicleLifecycleState.errorMessage}
          />
        );
      }

      if (vehicleLifecycleState.status === 'timeline_not_found') {
        return (
          <TimelineStateCard
            icon="car-off"
            title="Vehicle history not found"
            message={vehicleLifecycleState.errorMessage}
          />
        );
      }

      if (vehicleLifecycleState.status === 'timeline_load_failed') {
        return (
          <TimelineStateCard
            icon="wifi-strength-alert-outline"
            title="Lifecycle history failed to load"
            message={vehicleLifecycleState.errorMessage}
          />
        );
      }

      if (vehicleLifecycleState.status === 'timeline_empty') {
        return (
          <TimelineStateCard
            icon="timeline-clock-outline"
            title="No lifecycle events yet"
            message={
              vehicleLifecycleState.errorMessage ||
              'This vehicle does not have customer-visible lifecycle history yet.'
            }
          />
        );
      }

      if (!visibleTimelineItems.length) {
        return (
          <TimelineStateCard
            icon="filter-outline"
            title="No events in this filter"
            message="Try a different lifecycle filter to reveal other verified or administrative milestones."
          />
        );
      }

      return visibleTimelineItems.map((item) => (
        <View key={item.id} style={styles.timelineEventWrap}>
          <Text style={styles.timelineDateMarker}>{item.dateLabel}</Text>
          <TimelineEventCard item={item} />
        </View>
      ));
    };

    return renderScrollableContent(styles.timelineScrollContent, (
      <>
        <View style={styles.timelineHeaderRow}>
          <View>
            <Text style={styles.bookingEyebrow}>CUSTOMER DIGITAL GARAGE</Text>
            <Text style={styles.timelineTitle}>Garage</Text>
            <Text style={styles.timelineSubtitle}>
              {digitalGarageState.vehicleCount
                ? `${digitalGarageState.vehicleCount} owned vehicle${digitalGarageState.vehicleCount === 1 ? '' : 's'} connected`
                : 'Owned vehicles, bookings, insurance, and lifecycle history in one place'}
            </Text>
          </View>

          <MotionPressable
            style={styles.timelineFilterIconButton}
            onPress={() => {
              setTimelineFilter('All');
              setGarageReloadKey((value) => value + 1);
            }}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={colors.labelText} />
          </MotionPressable>
        </View>

        <View style={styles.garageHeroCard}>
          <View style={styles.garageHeroCopy}>
            <Text style={styles.garageHeroEyebrow}>Live vehicle owner route</Text>
            <Text style={styles.garageHeroTitle}>
              {selectedGarageVehicleSummary?.title ?? primaryVehicleLabel}
            </Text>
            <Text style={styles.garageHeroText}>
              {selectedGarageVehicleSummary?.subtitle ??
                'Select an owned vehicle to connect booking, insurance, and timeline actions.'}
            </Text>
          </View>
          <View style={styles.garageHeroBadge}>
            <Text style={styles.garageHeroBadgeText}>
              {selectedGarageVehicleSummary?.ordinalLabel ?? 'Garage'}
            </Text>
          </View>
        </View>

        {renderGarageVehicleState()}

        <View style={styles.garagePlannedActionsCard}>
          <Text style={styles.garagePlannedTitle}>Planned garage actions</Text>
          <Text style={styles.garagePlannedText}>
            These actions are intentionally labeled as future API work so the app does not invent vehicle ownership truth locally.
          </Text>
          {digitalGarageUnsupportedActions.map((action) => (
            <View key={action.key} style={styles.garagePlannedRow}>
              <View style={styles.garagePlannedRowCopy}>
                <Text style={styles.garagePlannedActionLabel}>{action.label}</Text>
                <Text style={styles.garagePlannedRoute}>{action.route}</Text>
              </View>
              <View style={styles.garagePlannedPill}>
                <Text style={styles.garagePlannedPillText}>Planned</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.garageRouteCard}>
          <Text style={styles.garagePlannedTitle}>Connected live routes</Text>
          <Text style={styles.garagePlannedText}>
            Garage cards reuse existing vehicle, booking, insurance, and lifecycle contracts.
          </Text>
          <Text style={styles.garageRouteText}>
            {digitalGarageRoutes.listOwnedVehicles.method} {digitalGarageRoutes.listOwnedVehicles.path}
          </Text>
          <Text style={styles.garageRouteText}>
            {digitalGarageRoutes.vehicleTimeline.method} {digitalGarageRoutes.vehicleTimeline.path}
          </Text>
          <Text style={styles.garageRouteText}>
            {digitalGarageRoutes.createBooking.method} {digitalGarageRoutes.createBooking.path}
          </Text>
          <Text style={styles.garageRouteText}>
            {digitalGarageRoutes.createInsuranceInquiry.method} {digitalGarageRoutes.createInsuranceInquiry.path}
          </Text>
        </View>

        <View style={styles.garageSectionHeader}>
          <View>
            <Text style={styles.bookingEyebrow}>SELECTED VEHICLE LIFECYCLE</Text>
            <Text style={styles.timelineTitle}>Timeline</Text>
            <Text style={styles.timelineSubtitle}>
              {selectedGarageVehicleSummary?.title ?? 'Select a vehicle above'}
            </Text>
          </View>
        </View>

        <LifecycleSummaryCard summaryCard={vehicleLifecycleState.summaryCard} />

        <View style={styles.timelineStatsRow}>
          <View style={styles.timelineStatCard}>
            <Text style={[styles.timelineStatValue, styles.timelineStatValueWarm]}>
              {vehicleLifecycleState.stats.totalEvents}
            </Text>
            <Text style={styles.timelineStatLabel}>Total Events</Text>
          </View>
          <View style={styles.timelineStatCard}>
            <Text style={[styles.timelineStatValue, styles.timelineStatValueHighlight]}>
              {vehicleLifecycleState.stats.verifiedEvents}
            </Text>
            <Text style={styles.timelineStatLabel}>Verified</Text>
          </View>
          <View style={styles.timelineStatCard}>
            <Text style={styles.timelineStatValue}>
              {vehicleLifecycleState.stats.administrativeEvents}
            </Text>
            <Text style={styles.timelineStatLabel}>Administrative</Text>
          </View>
        </View>

        <View style={styles.timelineFilterRow}>
          {vehicleLifecycleState.filters.map((filterLabel) => (
            <MotionPressable
              key={filterLabel}
              style={[
                styles.timelineFilterChip,
                timelineFilter === filterLabel && styles.timelineFilterChipActive,
              ]}
              onPress={() => setTimelineFilter(filterLabel)}
            >
              <Text
                style={[
                  styles.timelineFilterChipText,
                  timelineFilter === filterLabel && styles.timelineFilterChipTextActive,
                ]}
              >
                {filterLabel}
              </Text>
            </MotionPressable>
          ))}
        </View>

        {renderTimelineState()}
      </>
    ));
  };

  const renderMenuContent = () => {
    if (menuScreen === 'settings') {
      return renderSettingsMenu();
    }

    if (menuScreen === 'notificationPreferences') {
      return renderNotificationPreferences();
    }

    if (menuScreen === 'personal') {
      return renderPersonalInformation();
    }

    if (menuScreen === 'security') {
      return renderSecurity();
    }

    if (menuScreen === 'gift') {
      return renderGiftCenter();
    }

    if (menuScreen === 'saved') {
      return renderSavedItems();
    }

    return renderMenuRoot();
  };

  const renderContent = () => {
    if (activeTab === 'explore') {
      return renderHomeContent();
    }

    if (activeTab === 'messages') {
      return renderTimelineContent();
    }

    if (activeTab === 'notifications') {
      return renderBookingContent();
    }

    if (activeTab === 'store') {
      return renderStoreContent();
    }

    if (activeTab === 'insurance' || activeTab === 'rewards') {
      return renderMenuRoot();
    }

    return renderMenuContent();
  };

  const cartEntries = cartState.items;
  const cartCount = cartState.totalQuantity;
  const cartTotalLabel = cartState.subtotalLabel;
  const checkoutPreviewItems = checkoutState.preview?.items ?? [];
  const isCatalogDetailVisible = catalogDetailState.status !== 'idle';
  const selectedCatalogProduct = catalogDetailState.product ?? catalogDetailState.previewProduct;
  const unreadNotificationCount = notificationsFeed.filter((item) => item.unread).length;
  const bottomNavSlotWidth = windowWidth / tabs.length;
  const bottomNavItemInset = isTinyPhone ? 0 : isVeryCompactPhone ? 1 : isCompactPhone ? 3 : 6;
  const bottomNavIndicatorWidth = Math.max(
    bottomNavSlotWidth - bottomNavItemInset * 2,
    isTinyPhone ? 38 : isVeryCompactPhone ? 40 : isCompactPhone ? 42 : 46,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.flex}
      >
        <View style={styles.screen}>
          <Animated.View
            style={[
              styles.contentArea,
              {
                opacity: screenFadeAnim,
                transform: [{ translateY: screenTranslateAnim }],
              },
            ]}
          >
            {renderContent()}
          </Animated.View>

          {isNotificationsVisible ? (
            <Animated.View
              style={[
                styles.notificationsPanel,
                {
                  opacity: notificationPanelAnim,
                  transform: [
                    {
                      translateY: notificationPanelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.notificationsPanelHeader}>
                <View>
                  <Text style={styles.notificationsPanelTitle}>Notifications</Text>
                  <Text style={styles.notificationsPanelSubtitle}>
                    {unreadNotificationCount} unread
                  </Text>
                </View>

                <View style={styles.notificationsPanelActions}>
                  <TouchableOpacity
                    style={styles.notificationsHeaderButton}
                    onPress={handleMarkAllNotificationsRead}
                    activeOpacity={0.82}
                  >
                    <MaterialCommunityIcons name="check-all" size={16} color={colors.labelText} />
                    <Text style={styles.notificationsHeaderButtonText}>Mark all</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.notificationsPanelClose}
                    onPress={() => setIsNotificationsVisible(false)}
                    activeOpacity={0.82}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={colors.mutedText} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.notificationsList}
                contentContainerStyle={styles.notificationsListContent}
                showsVerticalScrollIndicator={false}
              >
                {notificationsFeed.length > 0 ? (
                  notificationsFeed.map((item) => (
                    <NotificationRow
                      key={item.key}
                      item={item}
                      onOpen={() => handleOpenNotification(item)}
                      onDismiss={() => handleDismissNotification(item.key)}
                    />
                  ))
                ) : (
                  <View style={styles.notificationsEmptyState}>
                    <MaterialCommunityIcons name="bell-outline" size={28} color={colors.border} />
                    <Text style={styles.notificationsEmptyTitle}>No notifications</Text>
                    <Text style={styles.notificationsEmptyText}>
                      Alerts and service updates will appear here after the notification sync catches up.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          ) : null}

          {isCatalogDetailVisible ? (
            <Animated.View
              style={[
                styles.productOverlay,
                {
                  opacity: productOverlayAnim,
                  transform: [
                    {
                      translateY: productOverlayAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ScrollView
                style={styles.productOverlayScroll}
                contentContainerStyle={styles.productOverlayContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.productHero}>
                  <View style={styles.productHeroImagePlaceholder}>
                    <MaterialCommunityIcons
                      name="package-variant-closed"
                      size={56}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.productHeroShade} />

                  <TouchableOpacity
                    style={styles.productBackButton}
                    onPress={handleCloseProduct}
                    activeOpacity={0.86}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.productDetailPanel}>
                  {catalogDetailState.status === 'loading' ? (
                    <View style={styles.productDetailStateCard}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.productDetailStateTitle}>Refreshing product details</Text>
                      <Text style={styles.productDetailStateText}>
                        Loading the latest customer-visible product data from ecommerce-service.
                      </Text>
                    </View>
                  ) : null}

                  {catalogDetailState.status === 'ready' && selectedCatalogProduct ? (
                    <>
                      <View style={styles.productDetailStatusRow}>
                        <View style={styles.productDetailStatusBadge}>
                          <Text style={styles.productDetailStatusBadgeText}>
                            {selectedCatalogProduct.visibilityLabel}
                          </Text>
                        </View>
                        <Text style={styles.productDetailUpdatedText}>
                          Updated {selectedCatalogProduct.updatedLabel}
                        </Text>
                      </View>

                      <Text style={styles.productDetailTitle}>{selectedCatalogProduct.name}</Text>
                      <Text style={styles.productDetailBrand}>
                        {selectedCatalogProduct.categoryName}
                      </Text>
                      <Text style={styles.productDetailPrice}>
                        {selectedCatalogProduct.priceLabel}
                      </Text>

                      <View style={styles.productInfoCard}>
                        <View style={styles.productDetailInfoRow}>
                          <Text style={styles.productDetailInfoLabel}>SKU</Text>
                          <Text style={styles.productDetailInfoValue}>
                            {selectedCatalogProduct.sku}
                          </Text>
                        </View>
                        <View style={styles.productDetailInfoRow}>
                          <Text style={styles.productDetailInfoLabel}>Category</Text>
                          <Text style={styles.productDetailInfoValue}>
                            {selectedCatalogProduct.categoryName}
                          </Text>
                        </View>
                        <View style={styles.productDetailInfoRow}>
                          <Text style={styles.productDetailInfoLabel}>Product ID</Text>
                          <Text numberOfLines={1} style={styles.productDetailInfoValue}>
                            {selectedCatalogProduct.id}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.productDetailSectionLabel}>Product Details</Text>
                      <Text style={styles.productDetailDescription}>
                        {selectedCatalogProduct.description}
                      </Text>

                      <View style={styles.productDetailStateCard}>
                        <MaterialCommunityIcons
                          name="receipt-text-outline"
                          size={22}
                          color={colors.primary}
                        />
                        <Text style={styles.productDetailStateTitle}>Invoice checkout ready</Text>
                        <Text style={styles.productDetailStateText}>
                          Adding this product creates a live ecommerce cart entry. Checkout still
                          creates an unpaid invoice order, not immediate payment settlement.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.productDetailCartButton,
                          cartState.savingItemId === selectedCatalogProduct.id && styles.productDetailCartButtonDisabled,
                        ]}
                        onPress={() => {
                          void handleAddToCart(selectedCatalogProduct);
                        }}
                        activeOpacity={cartState.savingItemId === selectedCatalogProduct.id ? 1 : 0.88}
                        disabled={cartState.savingItemId === selectedCatalogProduct.id}
                      >
                        {cartState.savingItemId === selectedCatalogProduct.id ? (
                          <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                          <MaterialCommunityIcons name="cart-plus" size={18} color={colors.onPrimary} />
                        )}
                        <Text style={styles.productDetailCartButtonText}>
                          {cartState.savingItemId === selectedCatalogProduct.id ? 'Adding to Cart' : 'Add to Cart'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleOpenCart}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.secondaryButtonText}>Open Cart</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {catalogDetailState.status === 'hidden' ? (
                    <View style={styles.productDetailStateCard}>
                      <MaterialCommunityIcons
                        name="eye-off-outline"
                        size={28}
                        color="#FFB86B"
                      />
                      <Text style={styles.productDetailStateTitle}>
                        {selectedCatalogProduct?.name || 'Product hidden'}
                      </Text>
                      <Text style={styles.productDetailStateText}>
                        {catalogDetailState.errorMessage}
                      </Text>
                      <TouchableOpacity
                        style={styles.productDetailRetryButton}
                        onPress={() => {
                          void loadCatalogModuleState();
                        }}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.productDetailRetryButtonText}>Refresh catalog</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {catalogDetailState.status === 'error' ? (
                    <View style={styles.productDetailStateCard}>
                      <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={28}
                        color="#FF8B8B"
                      />
                      <Text style={styles.productDetailStateTitle}>Product unavailable</Text>
                      <Text style={styles.productDetailStateText}>
                        {catalogDetailState.errorMessage}
                      </Text>
                      <TouchableOpacity
                        style={styles.productDetailRetryButton}
                        onPress={handleRetrySelectedProduct}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.productDetailRetryButtonText}>Retry detail</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </Animated.View>
          ) : null}

          {isCartVisible ? (
            <Animated.View
              style={[
                styles.cartOverlay,
                {
                  opacity: cartOverlayAnim,
                  transform: [
                    {
                      translateY: cartOverlayAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.cartHeader}>
                <TouchableOpacity
                  style={styles.cartCloseButton}
                  onPress={() => setIsCartVisible(false)}
                  activeOpacity={0.86}
                >
                  <MaterialCommunityIcons name="close" size={22} color={colors.mutedText} />
                </TouchableOpacity>

                <View style={styles.cartHeaderCopy}>
                  <Text style={styles.cartTitle}>
                    {checkoutState.stage === 'complete'
                      ? 'Checkout Complete'
                      : checkoutState.stage === 'preview'
                        ? 'Invoice Checkout'
                        : 'Your Cart'}
                  </Text>
                  <Text style={styles.cartSubtitle}>
                    {checkoutState.stage === 'complete'
                      ? checkoutState.order?.orderNumber || 'Invoice order created'
                      : checkoutState.stage === 'preview'
                        ? 'Review the immutable order snapshot before staff payment tracking begins.'
                        : `${cartCount} item${cartCount === 1 ? '' : 's'}`}
                  </Text>
                </View>
              </View>

              <View style={styles.cartBody}>
                {checkoutState.stage === 'complete' && checkoutState.order ? (
                  <ScrollView
                    style={styles.cartItemsScroll}
                    contentContainerStyle={styles.cartItemsContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={[styles.checkoutStateCard, styles.checkoutStateCardSuccess]}>
                      <MaterialCommunityIcons
                        name="check-decagram-outline"
                        size={34}
                        color="#4FD89A"
                      />
                      <Text style={styles.checkoutStateTitle}>Invoice order created</Text>
                      <Text style={styles.checkoutStateText}>
                        Staff can now track invoice payment and fulfillment separately from your
                        product cart. The order snapshot below will not change if the catalog later
                        updates.
                      </Text>
                    </View>

                    <View style={styles.checkoutSummaryCard}>
                      <Text style={styles.checkoutSummaryTitle}>Order Summary</Text>
                      <View style={styles.checkoutSummaryRow}>
                        <Text style={styles.checkoutSummaryLabel}>Order</Text>
                        <Text style={styles.checkoutSummaryValue}>
                          {checkoutState.order.orderNumber}
                        </Text>
                      </View>
                      <View style={styles.checkoutSummaryRow}>
                        <Text style={styles.checkoutSummaryLabel}>Status</Text>
                        <Text style={styles.checkoutSummaryValue}>
                          {checkoutState.order.statusLabel}
                        </Text>
                      </View>
                      <View style={styles.checkoutSummaryRow}>
                        <Text style={styles.checkoutSummaryLabel}>Invoice</Text>
                        <Text style={styles.checkoutSummaryValue}>
                          {checkoutState.order.invoice?.invoiceNumber || 'Pending'}
                        </Text>
                      </View>
                      <View style={styles.checkoutSummaryRow}>
                        <Text style={styles.checkoutSummaryLabel}>Amount Due</Text>
                        <Text style={styles.checkoutSummaryValue}>
                          {checkoutState.order.invoice?.amountDueLabel || checkoutState.order.subtotalLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.checkoutFormCard}>
                      <Text style={styles.checkoutCardTitle}>Billing Address Snapshot</Text>
                      <Text style={styles.checkoutAddressText}>
                        {buildCheckoutAddressLabel(
                          checkoutState.order.addresses?.find(
                            (address) => address.addressType === 'billing',
                          ),
                        ) || 'No billing address was returned in the order snapshot.'}
                      </Text>
                    </View>

                    <View style={styles.checkoutFormCard}>
                      <Text style={styles.checkoutCardTitle}>Ordered Items</Text>
                      {checkoutState.order.items.map((item) => (
                        <View key={item.id} style={styles.checkoutPreviewItem}>
                          <View style={styles.checkoutPreviewItemCopy}>
                            <Text style={styles.checkoutPreviewItemTitle}>{item.productName}</Text>
                            <Text style={styles.checkoutPreviewItemMeta}>
                              Qty {item.quantity}
                              {item.productSku ? ` | SKU ${item.productSku}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.checkoutPreviewItemValue}>{item.lineTotalLabel}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.cartFooter}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                          handleOpenStoreOrders(checkoutState.order);
                          resetCheckoutFlow();
                          setIsCartVisible(false);
                        }}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.secondaryButtonText}>View Order History</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cartCheckoutButton}
                        onPress={() => {
                          resetCheckoutFlow();
                          setIsCartVisible(false);
                        }}
                        activeOpacity={0.88}
                      >
                        <MaterialCommunityIcons name="shopping-outline" size={18} color={colors.onPrimary} />
                        <Text style={styles.cartCheckoutText}>Continue Shopping</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                ) : (
                  <ScrollView
                    style={styles.cartItemsScroll}
                    contentContainerStyle={styles.cartItemsContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {cartState.errorMessage ? (
                      <View style={styles.checkoutStateCard}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={28}
                          color="#FF8B8B"
                        />
                        <Text style={styles.checkoutStateTitle}>Cart sync issue</Text>
                        <Text style={styles.checkoutStateText}>{cartState.errorMessage}</Text>
                      </View>
                    ) : null}

                    {checkoutState.errorMessage &&
                    !(checkoutState.stage === 'preview' && checkoutState.previewStatus === 'error') ? (
                      <View style={styles.checkoutInlineAlert}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={18}
                          color="#FFB86B"
                        />
                        <Text style={styles.checkoutInlineAlertText}>{checkoutState.errorMessage}</Text>
                      </View>
                    ) : null}

                    {checkoutState.stage === 'preview' ? (
                      <>
                        {checkoutState.previewStatus === 'loading' ? (
                          <View style={styles.checkoutStateCard}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.checkoutStateTitle}>Loading invoice preview</Text>
                            <Text style={styles.checkoutStateText}>
                              Confirming your live cart snapshot before the order is created.
                            </Text>
                          </View>
                        ) : null}

                        {checkoutState.previewStatus === 'error' ? (
                          <View style={styles.checkoutStateCard}>
                            <MaterialCommunityIcons
                              name="cart-off"
                              size={30}
                              color="#FFB86B"
                            />
                            <Text style={styles.checkoutStateTitle}>Preview unavailable</Text>
                            <Text style={styles.checkoutStateText}>
                              {checkoutState.errorMessage || 'We could not load the invoice preview right now.'}
                            </Text>
                            <TouchableOpacity
                              style={styles.productDetailRetryButton}
                              onPress={() => {
                                void handleStartCheckoutPreview();
                              }}
                              activeOpacity={0.88}
                            >
                              <Text style={styles.productDetailRetryButtonText}>Retry preview</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        {checkoutState.previewStatus === 'ready' ? (
                          <>
                            <View style={styles.checkoutSummaryCard}>
                              <Text style={styles.checkoutSummaryTitle}>Invoice Preview</Text>
                              <View style={styles.checkoutSummaryRow}>
                                <Text style={styles.checkoutSummaryLabel}>Checkout Mode</Text>
                                <Text style={styles.checkoutSummaryValue}>Invoice only</Text>
                              </View>
                              <View style={styles.checkoutSummaryRow}>
                                <Text style={styles.checkoutSummaryLabel}>Items</Text>
                                <Text style={styles.checkoutSummaryValue}>
                                  {checkoutState.preview.totalQuantity}
                                </Text>
                              </View>
                              <View style={styles.checkoutSummaryRow}>
                                <Text style={styles.checkoutSummaryLabel}>Subtotal</Text>
                                <Text style={styles.checkoutSummaryValue}>
                                  {checkoutState.preview.subtotalLabel}
                                </Text>
                              </View>
                              <Text style={styles.checkoutSummaryNote}>
                                Creating this checkout issues an unpaid invoice order. Staff payment
                                recording and fulfillment continue afterward.
                              </Text>
                            </View>

                            <View style={styles.checkoutFormCard}>
                              <Text style={styles.checkoutCardTitle}>Cart Snapshot</Text>
                              {checkoutPreviewItems.map((item) => (
                                <View key={item.id} style={styles.checkoutPreviewItem}>
                                  <View style={styles.checkoutPreviewItemCopy}>
                                    <Text style={styles.checkoutPreviewItemTitle}>
                                      {item.productName}
                                    </Text>
                                    <Text style={styles.checkoutPreviewItemMeta}>
                                      Qty {item.quantity}
                                      {item.productSku ? ` | SKU ${item.productSku}` : ''}
                                    </Text>
                                  </View>
                                  <Text style={styles.checkoutPreviewItemValue}>
                                    {item.lineTotalLabel}
                                  </Text>
                                </View>
                              ))}
                            </View>

                            <View style={styles.checkoutFormCard}>
                              <Text style={styles.checkoutCardTitle}>Billing Details</Text>
                              <FormField
                                label="Recipient Name"
                                value={checkoutState.form.recipientName}
                                onChangeText={(value) => handleCheckoutFieldChange('recipientName', value)}
                                placeholder="Billing recipient name"
                                autoCapitalize="words"
                                error={checkoutState.fieldErrors.recipientName}
                              />
                              <FormField
                                label="Email"
                                value={checkoutState.form.email}
                                onChangeText={(value) => handleCheckoutFieldChange('email', value)}
                                placeholder="name@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={checkoutState.fieldErrors.email}
                              />
                              <FormField
                                label="Contact Phone"
                                value={checkoutState.form.contactPhone}
                                onChangeText={(value) => handleCheckoutFieldChange('contactPhone', value)}
                                placeholder="09123456789"
                                keyboardType="phone-pad"
                                helperText="Optional, but useful for invoice follow-up."
                                error={checkoutState.fieldErrors.contactPhone}
                              />
                              <FormField
                                label="Address Line 1"
                                value={checkoutState.form.addressLine1}
                                onChangeText={(value) => handleCheckoutFieldChange('addressLine1', value)}
                                placeholder="Street address"
                                autoCapitalize="words"
                                error={checkoutState.fieldErrors.addressLine1}
                              />
                              <FormField
                                label="Address Line 2"
                                value={checkoutState.form.addressLine2}
                                onChangeText={(value) => handleCheckoutFieldChange('addressLine2', value)}
                                placeholder="Unit, building, or landmark"
                                autoCapitalize="words"
                              />
                              <FormField
                                label="City"
                                value={checkoutState.form.city}
                                onChangeText={(value) => handleCheckoutFieldChange('city', value)}
                                placeholder="City"
                                autoCapitalize="words"
                                error={checkoutState.fieldErrors.city}
                              />
                              <FormField
                                label="Province"
                                value={checkoutState.form.province}
                                onChangeText={(value) => handleCheckoutFieldChange('province', value)}
                                placeholder="Province"
                                autoCapitalize="words"
                                error={checkoutState.fieldErrors.province}
                              />
                              <FormField
                                label="Postal Code"
                                value={checkoutState.form.postalCode}
                                onChangeText={(value) => handleCheckoutFieldChange('postalCode', value)}
                                placeholder="1200"
                                keyboardType="number-pad"
                                error={checkoutState.fieldErrors.postalCode}
                              />
                              <FormField
                                label="Checkout Notes"
                                value={checkoutState.form.notes}
                                onChangeText={(value) => handleCheckoutFieldChange('notes', value)}
                                placeholder="Optional notes for staff invoice handling"
                                autoCapitalize="sentences"
                                multiline
                                numberOfLines={4}
                              />
                            </View>

                            <View style={styles.cartFooter}>
                              <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={resetCheckoutFlow}
                                activeOpacity={0.88}
                              >
                                <Text style={styles.secondaryButtonText}>Back to Cart</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.cartCheckoutButton,
                                  checkoutState.submitting && styles.cartCheckoutButtonDisabled,
                                ]}
                                onPress={() => {
                                  void handleSubmitInvoiceCheckout();
                                }}
                                activeOpacity={checkoutState.submitting ? 1 : 0.88}
                                disabled={checkoutState.submitting}
                              >
                                {checkoutState.submitting ? (
                                  <ActivityIndicator size="small" color={colors.onPrimary} />
                                ) : (
                                  <MaterialCommunityIcons name="receipt-text-check-outline" size={18} color={colors.onPrimary} />
                                )}
                                <Text style={styles.cartCheckoutText}>
                                  {checkoutState.submitting ? 'Creating Invoice Order' : 'Create Invoice Checkout'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : null}
                      </>
                    ) : cartState.status === 'loading' && cartEntries.length === 0 ? (
                      <View style={styles.checkoutStateCard}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.checkoutStateTitle}>Loading cart</Text>
                        <Text style={styles.checkoutStateText}>
                          Pulling your live ecommerce cart from the checkout service now.
                        </Text>
                      </View>
                    ) : cartEntries.length === 0 ? (
                      <View style={styles.cartEmptyState}>
                        <MaterialCommunityIcons
                          name="cart-outline"
                          size={42}
                          color={colors.border}
                        />
                        <Text style={styles.cartEmptyText}>Your cart is empty</Text>
                        <Text style={styles.checkoutStateText}>
                          Add items from the catalog first, then come back here to create an invoice
                          checkout.
                        </Text>
                      </View>
                    ) : (
                      <>
                        {cartEntries.map((item) => (
                          <CartLineItem
                            key={item.key}
                            item={item}
                            isCompact={isCompactPhone}
                            disabled={cartState.savingItemId === item.id}
                            onDecrease={() =>
                              handleUpdateCartQuantity(item.id, item.quantity - 1)
                            }
                            onIncrease={() =>
                              handleUpdateCartQuantity(item.id, item.quantity + 1)
                            }
                          />
                        ))}

                        <View style={styles.checkoutSummaryCard}>
                          <Text style={styles.checkoutSummaryTitle}>Cart Totals</Text>
                          <View style={styles.checkoutSummaryRow}>
                            <Text style={styles.checkoutSummaryLabel}>Items</Text>
                            <Text style={styles.checkoutSummaryValue}>{cartCount}</Text>
                          </View>
                          <View style={styles.checkoutSummaryRow}>
                            <Text style={styles.checkoutSummaryLabel}>Subtotal</Text>
                            <Text style={styles.checkoutSummaryValue}>{cartTotalLabel}</Text>
                          </View>
                          <Text style={styles.checkoutSummaryNote}>
                            Invoice checkout creates the order and invoice record, but it does not
                            mark the order as paid.
                          </Text>
                        </View>

                        <View style={styles.cartFooter}>
                          <TouchableOpacity
                            style={styles.cartCheckoutButton}
                            onPress={() => {
                              void handleStartCheckoutPreview();
                            }}
                            activeOpacity={0.88}
                          >
                            <MaterialCommunityIcons name="arrow-right-circle-outline" size={18} color={colors.onPrimary} />
                            <Text style={styles.cartCheckoutText}>Review Invoice Checkout</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </ScrollView>
                )}
              </View>
            </Animated.View>
          ) : null}

          <View style={[styles.bottomNav, isVeryCompactPhone && styles.bottomNavCompact]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bottomNavIndicator,
                {
                  width: bottomNavIndicatorWidth,
                  transform: [{ translateX: bottomNavIndicatorAnim }],
                },
              ]}
            />
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <MotionPressable
                  key={tab.key}
                  containerStyle={styles.tabButtonContainer}
                  style={[
                    styles.tabButton,
                    isVeryCompactPhone && styles.tabButtonCompact,
                    { marginHorizontal: bottomNavItemInset },
                    isActive && styles.tabButtonActive,
                  ]}
                  onPress={() => handleTabPress(tab.key)}
                  scaleTo={0.94}
                >
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={isCompactPhone ? 18 : 21}
                    color={isActive ? colors.primary : colors.mutedText}
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.tabLabel,
                      isCompactPhone && styles.tabLabelCompact,
                      isActive && styles.tabLabelActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </MotionPressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>

      <DeleteAccountModal
        visible={isDeleteModalVisible}
        onCancel={handleCancelDeleteAccount}
        onConfirm={handleConfirmDeleteAccount}
        password={deletePassword}
        submitting={deleteSubmitting}
        onPasswordChange={(value) => {
          setDeletePassword(value);
          if (deletePasswordError) {
            setDeletePasswordError('');
          }
        }}
        error={deletePasswordError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
  },
  safeArea: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        height: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        overflowX: 'hidden',
      },
    }),
  },
  screen: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
    backgroundColor: colors.background,
    position: 'relative',
    ...Platform.select({
      web: {
        height: '100%',
        overflow: 'hidden',
        overflowX: 'hidden',
      },
    }),
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
    backgroundColor: colors.background,
    paddingBottom: Platform.OS === 'web' ? 0 : BOTTOM_NAV_HEIGHT,
    ...Platform.select({
      web: {
        overflow: 'hidden',
      },
    }),
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
  },
  scrollRegion: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
    ...Platform.select({
      web: {
        display: 'flex',
        flexDirection: 'column',
        height: DASHBOARD_WEB_SCROLL_HEIGHT,
        maxHeight: DASHBOARD_WEB_SCROLL_HEIGHT,
        overflowY: 'scroll',
        overflowX: 'hidden',
      },
    }),
  },
  webScrollContent: {
    minHeight: '100%',
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 88 : BOTTOM_NAV_HEIGHT + 88,
  },
  scrollContentCompact: {
    paddingHorizontal: 14,
  },
  menuRootContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 88 : BOTTOM_NAV_HEIGHT + 88,
  },
  homeScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 104 : BOTTOM_NAV_HEIGHT + 104,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingRight: 4,
  },
  homeBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeBrandBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  homeBrandEyebrow: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  homeBrandTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  homeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  homeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  homeAvatarText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  homeNotificationBanner: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  homeNotificationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homeNotificationCopy: {
    flex: 1,
    paddingRight: 10,
  },
  homeNotificationMeta: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  homeNotificationTime: {
    color: colors.mutedText,
    fontWeight: '600',
  },
  homeNotificationTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  homeNotificationText: {
    color: '#A9B1D2',
    fontSize: 14,
    lineHeight: 21,
  },
  homeNotificationClose: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeGreeting: {
    color: colors.labelText,
    fontSize: 16,
    marginBottom: 4,
  },
  homeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  homeName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    flexShrink: 1,
  },
  homeWave: {
    fontSize: 22,
    marginLeft: 8,
  },
  homeStatusCard: {
    backgroundColor: '#132C59',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(84, 147, 255, 0.32)',
    padding: 16,
    marginBottom: 18,
    overflow: 'hidden',
  },
  homeStatusCardIdle: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
  },
  homeStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  homeStatusCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeStatusBadge: {
    color: '#7FB4FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  homeStatusBadgeIdle: {
    color: colors.mutedText,
  },
  homeStatusTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 20,
  },
  homeStatusSubtitle: {
    color: '#A2B4D7',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '100%',
  },
  homeTrackButton: {
    flexShrink: 0,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(65, 124, 230, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(132, 179, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTrackButtonIdle: {
    backgroundColor: '#1C2233',
    borderColor: colors.borderSoft,
  },
  homeTrackButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  homeTrackButtonTextIdle: {
    color: colors.labelText,
  },
  homeProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  homeProgressLabel: {
    color: '#90A3CB',
    fontSize: 12,
  },
  homeProgressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  homeProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: '#63A5FF',
  },
  homeVehicleCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 18,
  },
  homeVehicleImage: {
    width: '100%',
    height: 170,
  },
  homeVehicleShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 78,
    height: 92,
    backgroundColor: 'rgba(10, 13, 20, 0.55)',
  },
  homeVehicleTopCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 76,
  },
  homeVehicleTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 23,
  },
  homeVehicleMeta: {
    color: '#A1A9C6',
    fontSize: 14,
    lineHeight: 19,
  },
  homeVehicleStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  homeVehicleStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  homeVehicleStatDivider: {
    width: 1,
    backgroundColor: colors.borderSoft,
  },
  homeVehicleStatValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 24,
  },
  homeVehicleStatLabel: {
    color: colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
  },
  homeVehicleTierValue: {
    color: '#FFC500',
  },
  homeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  homeSectionLabel: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  quickActionsRowCompact: {
    flexWrap: 'wrap',
    rowGap: 14,
  },
  quickActionCardContainer: {
    width: '22.8%',
    alignItems: 'center',
  },
  quickActionCardContainerCompact: {
    width: '48%',
  },
  quickActionCard: {
    alignItems: 'center',
    width: '100%',
  },
  quickActionIconWrap: {
    width: 74,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionIconWrapCompact: {
    width: '100%',
    minHeight: 50,
  },
  quickActionIconInner: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
    minHeight: 34,
  },
  homePmsCard: {
    backgroundColor: 'rgba(96, 52, 14, 0.35)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.25)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  homePmsIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 122, 0, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homePmsCopy: {
    flex: 1,
    paddingRight: 10,
  },
  homePmsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 21,
  },
  homePmsSubtitle: {
    color: '#C3A78F',
    fontSize: 14,
    lineHeight: 20,
  },
  homePmsButton: {
    minWidth: 58,
    minHeight: 30,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homePmsButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  homeViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeViewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginRight: 2,
  },
  homeServiceRow: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  homeServiceRowCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  homeServiceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  homeServiceRowLeftCompact: {
    paddingRight: 0,
  },
  homeServiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#242A40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homeServiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeServiceTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  homeServiceDate: {
    color: colors.mutedText,
    fontSize: 14,
  },
  homeServiceStatusPill: {
    flexShrink: 0,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(18, 215, 100, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeServiceStatusText: {
    color: '#12D764',
    fontSize: 12,
    fontWeight: '800',
  },
  homeOfferCard: {
    backgroundColor: '#202443',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#383E64',
    padding: 18,
    marginTop: 10,
    overflow: 'hidden',
  },
  homeOfferEyebrow: {
    color: '#FFC500',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  homeOfferTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },
  homeOfferSubtitle: {
    color: '#A9B1D2',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: '78%',
    marginBottom: 16,
  },
  homeOfferSubtitleCompact: {
    maxWidth: '100%',
  },
  homeOfferButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeOfferButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  homeOfferCircle: {
    position: 'absolute',
    right: -34,
    top: -10,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
  },
  timelineScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 100 : BOTTOM_NAV_HEIGHT + 100,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  timelineSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
  },
  timelineFilterIconButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garageHeroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: '#17233F',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(84, 147, 255, 0.28)',
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  garageHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  garageHeroEyebrow: {
    color: '#7FB4FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  garageHeroTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 8,
  },
  garageHeroText: {
    color: '#A9B8DA',
    fontSize: 14,
    lineHeight: 21,
  },
  garageHeroBadge: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(84, 147, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(132, 179, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  garageHeroBadgeText: {
    color: '#BBD3FF',
    fontSize: 12,
    fontWeight: '800',
  },
  garageVehicleList: {
    gap: 12,
    marginBottom: 16,
  },
  garageVehicleCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
  },
  garageVehicleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#211F2F',
  },
  garageVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  garageVehicleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garageVehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  garageVehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  garageVehicleTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  garageVehicleMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  garageVehicleRoute: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  garagePrimaryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  garagePrimaryPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  garageActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  garageActionButton: {
    flexGrow: 1,
    minWidth: 86,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  garageActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  garagePlannedActionsCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  garageRouteCard: {
    backgroundColor: '#1B2133',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  garagePlannedTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  garagePlannedText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  garagePlannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  garagePlannedRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  garagePlannedActionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  garagePlannedRoute: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  garagePlannedPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 197, 0, 0.12)',
  },
  garagePlannedPillText: {
    color: '#FFC500',
    fontSize: 11,
    fontWeight: '900',
  },
  garageRouteText: {
    color: colors.labelText,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 20,
  },
  garageSectionHeader: {
    marginTop: 4,
    marginBottom: 14,
  },
  timelineSummaryCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
  },
  timelineSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timelineSummaryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  timelineSummaryBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 10,
  },
  timelineSummaryHelperText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  timelineSummaryMeta: {
    color: colors.labelText,
    fontSize: 12,
    marginTop: 10,
  },
  timelineSummaryPill: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineSummaryPillVisible: {
    backgroundColor: colors.successSoft,
  },
  timelineSummaryPillPending: {
    backgroundColor: 'rgba(255, 197, 0, 0.12)',
  },
  timelineSummaryPillHidden: {
    backgroundColor: colors.primarySoft,
  },
  timelineSummaryPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timelineSummaryPillTextVisible: {
    color: colors.success,
  },
  timelineSummaryPillTextPending: {
    color: '#FFC500',
  },
  timelineSummaryPillTextHidden: {
    color: colors.primary,
  },
  timelineStateCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  timelineStateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  timelineStateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  timelineStateText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  timelineStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  timelineStatCard: {
    width: '31.5%',
    backgroundColor: colors.surfaceStrong,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  timelineStatValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  timelineStatValueWarm: {
    color: colors.primary,
  },
  timelineStatValueHighlight: {
    color: '#FFC500',
  },
  timelineStatLabel: {
    color: colors.mutedText,
    fontSize: 12,
    textAlign: 'center',
  },
  timelineFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  timelineFilterChip: {
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timelineFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineFilterChipText: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
  },
  timelineFilterChipTextActive: {
    color: colors.onPrimary,
  },
  timelineEventWrap: {
    marginBottom: 6,
  },
  timelineDateMarker: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 40,
    marginBottom: 10,
  },
  timelineEventCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineEventRail: {
    width: 42,
    alignItems: 'center',
  },
  timelineEventDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#242A40',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  timelineEventLine: {
    width: 2,
    flex: 1,
    minHeight: 92,
    backgroundColor: '#2B3250',
    marginTop: 6,
  },
  timelineEventContent: {
    flex: 1,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  timelineEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineEventTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    paddingRight: 12,
  },
  timelineStatusPill: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineStatusPillSuccess: {
    backgroundColor: 'rgba(18, 215, 100, 0.12)',
  },
  timelineStatusPillInfo: {
    backgroundColor: 'rgba(52, 127, 255, 0.12)',
  },
  timelineStatusPillDefault: {
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
  },
  timelineStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timelineStatusTextSuccess: {
    color: '#12D764',
  },
  timelineStatusTextInfo: {
    color: '#63A5FF',
  },
  timelineStatusTextDefault: {
    color: colors.primary,
  },
  timelineEventDate: {
    color: colors.mutedText,
    fontSize: 13,
    marginLeft: 6,
  },
  timelineEventSummary: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  timelineEventMechanic: {
    color: colors.labelText,
    fontSize: 13,
    marginBottom: 12,
  },
  timelineEventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  timelineEventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineEventPrice: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  timelineTypePill: {
    alignSelf: 'flex-end',
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  timelineTypePillAdministrative: {
    backgroundColor: colors.primarySoft,
  },
  timelineTypePillVerified: {
    backgroundColor: colors.successSoft,
  },
  timelineTypePillSummary: {
    backgroundColor: 'rgba(99, 165, 255, 0.12)',
  },
  timelineTypeText: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
  },
  bookingScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 104 : BOTTOM_NAV_HEIGHT + 104,
  },
  bookingHeader: {
    marginBottom: 18,
  },
  bookingEyebrow: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  bookingTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  bookingModeWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 4,
    marginBottom: 22,
  },
  bookingModeTabContainer: {
    flex: 1,
  },
  bookingModeTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingModeTabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  bookingModeTabText: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '800',
  },
  bookingModeTabTextActive: {
    color: colors.onPrimary,
  },
  bookingSectionLabel: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  bookingDiscoveryBanner: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingDiscoveryBannerCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  bookingDiscoveryBannerCopyWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 12,
  },
  bookingDiscoveryBannerCopyWrapCompact: {
    minWidth: '100%',
    paddingRight: 0,
  },
  bookingDiscoveryBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookingDiscoveryBannerCopy: {
    flex: 1,
  },
  bookingDiscoveryBannerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  bookingDiscoveryBannerText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  bookingDiscoveryRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingStatePanel: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
  },
  bookingStatePanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bookingStatePanelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookingStatePanelCopy: {
    flex: 1,
  },
  bookingStatePanelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  bookingStatePanelText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  bookingStatePanelButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  bookingStatePanelButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bookingServiceCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingServiceCardCompact: {
    alignItems: 'flex-start',
  },
  bookingServiceCardSelected: {
    borderColor: '#5A4608',
    backgroundColor: '#1E2232',
  },
  bookingServiceCardDisabled: {
    opacity: 0.52,
  },
  bookingServiceIconWrap: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 16,
    backgroundColor: '#252B42',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bookingServiceIconWrapDisabled: {
    backgroundColor: '#1D2233',
  },
  bookingServiceCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  bookingServiceCopyCompact: {
    paddingRight: 0,
  },
  bookingServiceBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingServiceBodyCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  bookingServiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  bookingServiceTitle: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
    minWidth: 0,
  },
  bookingPopularBadge: {
    minHeight: 20,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: '#6C3B07',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingPopularBadgeText: {
    color: '#FFB067',
    fontSize: 10,
    fontWeight: '800',
  },
  bookingUnavailableBadge: {
    minHeight: 20,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: '#262A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingUnavailableBadgeText: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  bookingServiceSubtitle: {
    color: colors.mutedText,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bookingDisabledText: {
    color: '#7981A2',
  },
  bookingDisabledSubtext: {
    color: '#666D89',
  },
  bookingServiceMeta: {
    alignItems: 'flex-end',
  },
  bookingServiceMetaCompact: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  bookingServicePrice: {
    color: colors.labelText,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  bookingServiceDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingServiceDuration: {
    color: colors.mutedText,
    fontSize: 12,
    marginLeft: 4,
  },
  bookingVehicleBadge: {
    minHeight: 20,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingVehicleBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  bookingVehicleMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bookingVehicleMetaCompact: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  bookingVehicleMetaLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  bookingVehicleMetaValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  bookingDateScroller: {
    flexGrow: 0,
    marginBottom: 22,
  },
  bookingDateRow: {
    paddingRight: 12,
  },
  bookingDateCard: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 148,
    borderRadius: 20,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bookingDateCardCompact: {
    minHeight: 138,
  },
  bookingDateCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  bookingDateCardSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  bookingDateCardLimited: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  bookingDateCardDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  bookingDateCardDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
  },
  bookingDateCardHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  bookingDateWeekday: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '700',
  },
  bookingDateDay: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 30,
  },
  bookingDateMonth: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  bookingDateStatusBadge: {
    flexShrink: 1,
    minHeight: 24,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  bookingDateStatusBadgeSuccess: {
    backgroundColor: colors.success,
  },
  bookingDateStatusBadgeWarning: {
    backgroundColor: colors.primary,
  },
  bookingDateStatusBadgeDanger: {
    backgroundColor: colors.danger,
  },
  bookingDateStatusBadgeMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  bookingDateStatusText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingDateCapacityText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  bookingDateDetailText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  bookingDateTextActive: {
    color: colors.onPrimary,
  },
  bookingDateClosedLabel: {
    color: '#666D89',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  bookingDateHint: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 12,
  },
  bookingAvailabilityWindowCard: {
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  bookingAvailabilityToolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  bookingAvailabilityToolbarCompact: {
    flexWrap: 'wrap',
  },
  bookingAvailabilityCopy: {
    flex: 1,
    gap: 4,
  },
  bookingAvailabilityTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  bookingAvailabilityText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  bookingAvailabilityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bookingAvailabilityActionsCompact: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bookingAvailabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
  },
  bookingAvailabilityGridCompact: {
    gap: 8,
  },
  bookingAvailabilitySelectionCard: {
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  bookingAvailabilitySelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bookingAvailabilitySelectionHeaderCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  bookingAvailabilitySelectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  bookingAvailabilitySelectionMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  bookingPagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -4,
    marginBottom: 12,
    gap: 12,
  },
  bookingPagerRowCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  bookingPagerText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  bookingPagerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingPagerActionsCompact: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bookingPagerButton: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingPagerButtonDisabled: {
    opacity: 0.45,
  },
  bookingPagerButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  bookingTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  bookingTimeSlotContainer: {
    width: '48.6%',
  },
  bookingTimeSlotContainerCompact: {
    width: '100%',
  },
  bookingTimeSlot: {
    minHeight: 38,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingVertical: 8,
  },
  bookingTimeSlotCompact: {
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bookingTimeSlotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bookingTimeSlotDisabled: {
    backgroundColor: '#1B2030',
    borderColor: colors.borderSoft,
  },
  bookingTimeSlotText: {
    color: colors.labelText,
    fontSize: 16,
    fontWeight: '800',
  },
  bookingTimeSlotSubtext: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 4,
  },
  bookingTimeSlotTextActive: {
    color: colors.onPrimary,
  },
  bookingTimeSlotSubtextActive: {
    color: colors.onPrimary,
  },
  bookingTimeSlotTextDisabled: {
    color: '#6E7594',
  },
  bookingTimeSlotReason: {
    color: '#6E7594',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  bookingTimeSlotReasonActive: {
    color: colors.onPrimary,
  },
  bookingInfoPanel: {
    width: '100%',
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
  },
  bookingInfoPanelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  bookingInfoPanelText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  bookingSummaryCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 20,
  },
  bookingSummaryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  bookingSummaryRow: {
    marginBottom: 12,
  },
  bookingSummaryLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bookingSummaryValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  bookingSummaryNote: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 4,
  },
  bookingHistoryToolbar: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingHistoryToolbarText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 250,
  },
  bookingHistoryList: {
    marginBottom: 16,
  },
  bookingHistoryCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  bookingHistoryCardActive: {
    borderColor: '#5A4608',
    backgroundColor: '#1E2232',
  },
  bookingHistoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bookingHistoryReference: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  bookingHistoryStatusPill: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingHistoryStatusText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  bookingHistoryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  bookingHistoryMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  bookingNotesCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 24,
  },
  bookingNotesInput: {
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bookingConfirmButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 4,
  },
  bookingConfirmButtonDisabled: {
    backgroundColor: '#7C420C',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookingConfirmButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
  },
  bookingConfirmButtonTextDisabled: {
    color: '#B88D63',
  },
  trackingSummaryCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  trackingSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trackingReferenceText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  trackingStatusPill: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingStatusPillActive: {
    backgroundColor: 'rgba(57, 129, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(57, 129, 255, 0.35)',
  },
  trackingStatusPillIdle: {
    backgroundColor: '#1C2233',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  trackingStatusPillText: {
    color: '#6CA9FF',
    fontSize: 13,
    fontWeight: '800',
  },
  trackingStatusPillTextIdle: {
    color: colors.mutedText,
  },
  trackingSummaryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
  },
  trackingMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  trackingMetaItem: {
    width: '48%',
    marginBottom: 14,
  },
  trackingMetaItemWide: {
    width: '100%',
    marginBottom: 14,
  },
  trackingMetaLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  trackingMetaValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  trackingProgressCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  trackingStepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  trackingRail: {
    width: 44,
    alignItems: 'center',
  },
  trackingStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2A324B',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  trackingStepDotDone: {
    borderColor: '#12D764',
    backgroundColor: '#12D764',
  },
  trackingStepDotCurrent: {
    borderColor: '#347FFF',
    backgroundColor: '#347FFF',
    shadowColor: '#347FFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  trackingStepDotCurrentCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text,
  },
  trackingStepDotIdle: {
    borderColor: '#2F354A',
    backgroundColor: '#131826',
  },
  trackingStepLine: {
    width: 2,
    flex: 1,
    minHeight: 54,
    backgroundColor: '#2A324B',
    marginTop: 2,
  },
  trackingStepLineActive: {
    backgroundColor: colors.primary,
  },
  trackingStepLineIdle: {
    backgroundColor: '#252C3E',
  },
  trackingStepContent: {
    flex: 1,
    paddingBottom: 18,
  },
  trackingStepTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 4,
  },
  trackingStepTitleCurrent: {
    color: '#F6F9FF',
  },
  trackingStepTitleInactive: {
    color: '#6E7594',
  },
  trackingStepStatus: {
    color: colors.mutedText,
    fontSize: 14,
    marginBottom: 8,
  },
  trackingStepStatusInactive: {
    color: '#676E8B',
  },
  trackingStepNoteCard: {
    backgroundColor: 'rgba(52, 127, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 127, 255, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  trackingStepNoteCardInactive: {
    backgroundColor: '#181D2C',
    borderColor: colors.borderSoft,
  },
  trackingStepNoteText: {
    color: '#9BC1FF',
    fontSize: 14,
    lineHeight: 21,
  },
  trackingStepNoteTextInactive: {
    color: '#78809D',
  },
  trackingRecommendationCard: {
    backgroundColor: 'rgba(98, 70, 10, 0.3)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 210, 74, 0.18)',
    padding: 16,
    marginBottom: 12,
  },
  trackingRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackingRecommendationTitle: {
    color: '#FFD24A',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  trackingRecommendationText: {
    color: '#D0C49E',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  trackingRecommendationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingApproveButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  trackingApproveButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  trackingDeclineButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingDeclineButtonText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '800',
  },
  bookingStatusHistoryCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
  },
  bookingStatusHistoryRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
    marginTop: 12,
  },
  bookingStatusHistoryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  bookingStatusHistoryMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  shopScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 104 : BOTTOM_NAV_HEIGHT + 104,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  shopHeaderCopy: {
    flex: 1,
    paddingRight: 16,
  },
  shopEyebrow: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  shopTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  shopCartButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCartBadgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  shopSearchWrap: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  shopSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    marginLeft: 10,
    paddingVertical: 12,
  },
  shopCategoryScroller: {
    flexGrow: 0,
  },
  shopCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    paddingRight: 12,
  },
  shopCategoryChip: {
    height: 38,
    paddingHorizontal: 17,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    alignSelf: 'center',
  },
  shopCategoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shopCategoryChipText: {
    color: colors.labelText,
    fontSize: 14,
    fontWeight: '700',
  },
  shopCategoryChipTextActive: {
    color: colors.onPrimary,
  },
  shopToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 14,
  },
  shopProductCount: {
    color: colors.mutedText,
    fontSize: 14,
  },
  shopFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopFilterText: {
    color: colors.labelText,
    fontSize: 14,
    marginLeft: 6,
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shopEmptyState: {
    width: '100%',
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 34,
  },
  shopEmptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  shopEmptyText: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  shopGridItem: {
    width: '48.2%',
    marginBottom: 14,
  },
  productCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  productImageWrap: {
    height: 190,
    backgroundColor: colors.surfaceMuted,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBadgeSale: {
    backgroundColor: '#FF4D5D',
  },
  productBadgeFeatured: {
    backgroundColor: colors.primary,
  },
  productBadgeWarning: {
    backgroundColor: '#FFD24A',
  },
  productBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  productBadgeTextDark: {
    color: '#241D00',
  },
  productRatingPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(34, 39, 55, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  productRatingText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  productBody: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  productBrand: {
    color: colors.mutedText,
    fontSize: 12,
    marginBottom: 6,
  },
  productName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    minHeight: 40,
    marginBottom: 8,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  productAvailability: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
    marginRight: 8,
  },
  productAvailabilityWarning: {
    color: '#FFD24A',
  },
  productReviews: {
    color: colors.mutedText,
    fontSize: 12,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  productPriceWrap: {
    flex: 1,
    paddingRight: 10,
  },
  productPrice: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  productComparePrice: {
    color: colors.mutedText,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  productAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productAddButtonAdded: {
    backgroundColor: '#18D765',
  },
  productAddCount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStarIcon: {
    marginRight: 2,
  },
  productOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 2300,
  },
  productOverlayScroll: {
    flex: 1,
  },
  productOverlayContent: {
    paddingBottom: 36,
  },
  productHero: {
    height: 340,
    position: 'relative',
    backgroundColor: '#D8D8D8',
  },
  productHeroImage: {
    width: '100%',
    height: '100%',
  },
  productHeroImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productHeroShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    backgroundColor: 'rgba(15, 18, 28, 0.72)',
  },
  productBackButton: {
    position: 'absolute',
    top: 22,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(38, 38, 38, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetailPanel: {
    marginTop: -18,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  productDetailBadge: {
    alignSelf: 'flex-start',
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  productDetailTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 31,
    marginBottom: 6,
  },
  productDetailBrand: {
    color: colors.labelText,
    fontSize: 15,
    marginBottom: 12,
  },
  productDetailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  productDetailStatusBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(36, 227, 122, 0.12)',
    borderColor: 'rgba(36, 227, 122, 0.28)',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 12,
  },
  productDetailStatusBadgeText: {
    color: '#24E37A',
    fontSize: 12,
    fontWeight: '800',
  },
  productDetailUpdatedText: {
    color: colors.mutedText,
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  productDetailRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  productDetailRatingValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
  productDetailReviewCount: {
    color: colors.mutedText,
    fontSize: 15,
    marginLeft: 8,
  },
  productInfoCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 20,
  },
  productDetailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  productDetailInfoLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  productDetailInfoValue: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  productInfoPrimary: {
    flex: 1,
    paddingRight: 10,
  },
  productDetailPrice: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  productDetailComparePrice: {
    color: colors.mutedText,
    fontSize: 15,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  productInfoMeta: {
    alignItems: 'flex-end',
  },
  productInfoStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productInfoStatusText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },
  productInfoCategory: {
    color: colors.mutedText,
    fontSize: 14,
  },
  productDetailSectionLabel: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  productDetailDescription: {
    color: '#B6BDD8',
    fontSize: 16,
    lineHeight: 29,
    marginBottom: 26,
  },
  productDetailStateCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  productDetailStateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  productDetailStateText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  productDetailRetryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  productDetailRetryButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  productDetailCartButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 5,
  },
  productDetailCartButtonDisabled: {
    opacity: 0.72,
  },
  productDetailCartButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
  profileHomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  profileHomeTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  profileHomeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  profileAvatarAnchor: {
    position: 'relative',
    marginLeft: 10,
    zIndex: 12,
  },
  profileHoverCard: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 210,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 5,
  },
  profileHoverTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  profileHoverText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  profileHoverButton: {
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHoverButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  profileHero: {
    marginBottom: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#5B4700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: colors.onPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileSubline: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  loyaltyBadge: {
    marginLeft: 12,
    paddingHorizontal: 14,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#6A5300',
    backgroundColor: 'rgba(255, 199, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyBadgeText: {
    color: '#FFCC33',
    fontSize: 13,
    fontWeight: '800',
  },
  loyaltyCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: '#5A4608',
    padding: 18,
    marginBottom: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 4,
  },
  loyaltyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  loyaltyCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loyaltyCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  loyaltyPointsWrap: {
    alignItems: 'flex-end',
  },
  loyaltyPointsValue: {
    color: '#FFCC33',
    fontSize: 16,
    fontWeight: '800',
  },
  loyaltyPointsLabel: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  loyaltyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  currentTierText: {
    color: '#FFCC33',
    fontSize: 14,
    fontWeight: '800',
  },
  nextTierText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  loyaltyTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#2B3043',
    overflow: 'hidden',
    marginBottom: 16,
  },
  loyaltyFill: {
    width: '74%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  loyaltyTierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loyaltyTierItem: {
    alignItems: 'center',
    flex: 1,
  },
  loyaltyTierIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  loyaltyTierIconWrapReached: {
    borderColor: '#6A5300',
  },
  loyaltyTierIconWrapCurrent: {
    backgroundColor: 'rgba(255, 199, 0, 0.12)',
    borderColor: '#6A5300',
  },
  loyaltyTierLabel: {
    color: colors.mutedText,
    fontSize: 12,
  },
  loyaltyTierLabelReached: {
    color: colors.text,
  },
  loyaltyTierLabelCurrent: {
    color: '#FFCC33',
    fontWeight: '800',
  },
  loyaltyActivityCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  loyaltyActivityTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  loyaltyActivitySubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  loyaltyTransactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  loyaltyTransactionCopy: {
    flex: 1,
    paddingRight: 14,
  },
  loyaltyTransactionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  loyaltyTransactionMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  loyaltyTransactionAmountWrap: {
    alignItems: 'flex-end',
  },
  loyaltyTransactionAmount: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  loyaltyTransactionAmountPositive: {
    color: '#24E37A',
  },
  loyaltyTransactionAmountNegative: {
    color: '#FF8B8B',
  },
  loyaltyTransactionBalance: {
    color: colors.mutedText,
    fontSize: 12,
  },
  preferenceCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  preferenceCopy: {
    flex: 1,
    paddingRight: 14,
  },
  preferenceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  preferenceDescription: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTabsWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 16,
  },
  sectionTabsWrapCompact: {
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionTabContainer: {
    flex: 1,
  },
  sectionTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: colors.primary,
  },
  sectionTabText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTabTextActive: {
    color: colors.onPrimary,
  },
  storeHeroCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  storeHeroEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  storeHeroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  storeHeroText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  storeOrdersToolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  storeOrdersToolbarCompact: {
    flexWrap: 'wrap',
  },
  storeOrdersToolbarCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeOrdersToolbarText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  storeOrderList: {
    marginBottom: 16,
  },
  storeOrderCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  storeOrderCardActive: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 2,
  },
  storeOrderCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  storeOrderCardHeaderCompact: {
    flexWrap: 'wrap',
  },
  storeOrderCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeOrderCardEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  storeOrderCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  storeOrderCardMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  storeStatusPill: {
    flexShrink: 0,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeStatusPillCompact: {
    alignSelf: 'flex-start',
  },
  storeStatusPillActive: {
    backgroundColor: colors.primary,
  },
  storeStatusPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  storeStatusPillTextActive: {
    color: colors.onPrimary,
  },
  storeOrderCardMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  storeOrderCardMetricsCompact: {
    justifyContent: 'flex-start',
  },
  storeOrderCardMetric: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
  },
  storeOrderCardInvoiceMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  storeTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 8,
  },
  storeTimelineRail: {
    width: 20,
    alignItems: 'center',
  },
  storeTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  storeTimelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 6,
    borderRadius: radius.pill,
  },
  storeTimelineContent: {
    flex: 1,
    paddingLeft: 6,
  },
  storeTimelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  storeTimelineTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  storeTimelineTime: {
    color: colors.mutedText,
    flexShrink: 1,
    fontSize: 12,
  },
  storeTimelineBadge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  storeTimelineCopy: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  storePaymentEntryList: {
    marginTop: 12,
  },
  storePaymentEntryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
    marginTop: 12,
    gap: 12,
  },
  storePaymentEntryCopy: {
    flex: 1,
  },
  storePaymentEntryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  storePaymentEntryMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  storePaymentEntryNotes: {
    color: colors.labelText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  storePaymentEntryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  rewardCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  rewardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rewardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardCopy: {
    flex: 1,
  },
  rewardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  rewardPoints: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  claimButton: {
    minWidth: 74,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 3,
  },
  claimButtonLocked: {
    backgroundColor: '#272D43',
    shadowOpacity: 0,
    elevation: 0,
  },
  claimButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  claimButtonTextLocked: {
    color: colors.mutedText,
  },
  rewardProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingLeft: 54,
  },
  rewardProgressLabel: {
    color: colors.mutedText,
    fontSize: 12,
  },
  rewardProgressValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  rewardProgressTrack: {
    height: 7,
    marginLeft: 54,
    borderRadius: radius.pill,
    backgroundColor: '#2B3043',
    overflow: 'hidden',
  },
  rewardProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  rewardHelperText: {
    marginTop: 10,
    marginLeft: 54,
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  infoPanel: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
  },
  infoPanelTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoPanelText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  profileSettingsList: {
    marginTop: 6,
    marginBottom: 14,
  },
  menuRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceStrong,
    marginBottom: 12,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginRight: 14,
  },
  menuIconWrapDanger: {
    backgroundColor: '#FEE2E2',
  },
  menuCopy: {
    flex: 1,
  },
  menuLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  menuLabelDanger: {
    color: colors.danger,
  },
  menuMeta: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  menuArrow: {
    color: colors.mutedText,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  menuArrowDanger: {
    color: colors.danger,
  },
  signOutRow: {
    minHeight: 62,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.55)',
    backgroundColor: colors.surfaceStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  signOutRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutRowText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subHeaderCopy: {
    flex: 1,
  },
  subHeaderTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  subHeaderSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  largeAvatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  largeProfileImage: {
    width: '100%',
    height: '100%',
  },
  largeAvatarInitials: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '800',
  },
  changeImageLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  genderSection: {
    marginBottom: 18,
  },
  fieldLabel: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genderChip: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  genderChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  genderChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  genderChipTextSelected: {
    color: colors.primary,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: colors.background,
  },
  editProfileButton: {
    marginBottom: 18,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteSection: {
    marginTop: 34,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  deleteTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  deleteDescription: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  deleteButton: {
    minHeight: 50,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  passwordFieldContainer: {
    marginBottom: 18,
  },
  passwordInputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    paddingLeft: 14,
    paddingRight: 10,
    backgroundColor: colors.input,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInputWrapError: {
    borderColor: colors.danger,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  eyeButtonText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  infoBlock: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  comingSoonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  comingSoonTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
  },
  comingSoonSubtitle: {
    color: colors.mutedText,
    fontSize: 16,
  },
  notificationsPanel: {
    position: 'absolute',
    top: 86,
    right: 12,
    width: Platform.OS === 'web' ? 388 : undefined,
    left: Platform.OS === 'web' ? 12 : 12,
    maxHeight: 600,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 2200,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  notificationsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  notificationsPanelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  notificationsPanelSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: 4,
  },
  notificationsPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationsHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  notificationsHeaderButtonText: {
    color: colors.labelText,
    fontSize: 13,
    marginLeft: 4,
  },
  notificationsPanelClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsList: {
    maxHeight: 520,
  },
  notificationsListContent: {
    paddingBottom: 12,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  notificationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationCopy: {
    flex: 1,
    paddingRight: 10,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  notificationRowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  notificationRowMessage: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  notificationRowTime: {
    color: '#6E7594',
    fontSize: 12,
  },
  notificationDismissButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  notificationsEmptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  notificationsEmptyText: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  cartOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 2400,
  },
  cartBody: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  cartCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartHeaderCopy: {
    flex: 1,
  },
  cartTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  cartSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    marginTop: 4,
  },
  cartEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 84,
  },
  cartEmptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 10,
  },
  cartItemsScroll: {
    flex: 1,
  },
  cartItemsContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 36 : 42,
  },
  cartItemCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartItemCardCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  cartItemImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginRight: 12,
  },
  cartItemCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  cartItemCopyCompact: {
    paddingRight: 0,
  },
  cartItemMeta: {
    color: colors.mutedText,
    fontSize: 12,
    marginBottom: 6,
  },
  cartItemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 4,
  },
  cartItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cartItemPrice: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  cartItemLineTotal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  cartItemWarning: {
    color: '#FFB86B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  cartQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartQuantityControlsCompact: {
    justifyContent: 'flex-end',
    marginTop: 12,
    width: '100%',
  },
  cartQuantityButton: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: '#262C41',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQuantityButtonDisabled: {
    opacity: 0.72,
  },
  cartQuantityValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginHorizontal: 12,
    minWidth: 10,
    textAlign: 'center',
  },
  checkoutStateCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 20,
    marginBottom: 16,
  },
  checkoutStateCardSuccess: {
    borderColor: 'rgba(79, 216, 154, 0.3)',
    backgroundColor: 'rgba(27, 41, 35, 0.96)',
  },
  checkoutStateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  checkoutStateText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  checkoutInlineAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 184, 107, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 107, 0.24)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  checkoutInlineAlertText: {
    color: '#FFD6A6',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    marginLeft: 10,
  },
  checkoutSummaryCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  checkoutSummaryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  checkoutSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 12,
  },
  checkoutSummaryLabel: {
    color: colors.mutedText,
    fontSize: 14,
    flexShrink: 0,
  },
  checkoutSummaryValue: {
    color: colors.text,
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  checkoutSummaryNote: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  checkoutFormCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    marginBottom: 16,
  },
  checkoutCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  checkoutPreviewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  checkoutPreviewItemCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  checkoutPreviewItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  checkoutPreviewItemMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  checkoutPreviewItemValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 0,
  },
  checkoutAddressText: {
    color: '#B6BDD8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  cartFooter: {
    paddingHorizontal: 2,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 6 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: 'transparent',
  },
  cartTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  cartTotalLabel: {
    color: colors.labelText,
    fontSize: 16,
  },
  cartTotalValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cartCheckoutButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
  },
  cartCheckoutButtonDisabled: {
    opacity: 0.72,
  },
  cartCheckoutText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
    paddingTop: 9,
    paddingBottom: 12,
    minHeight: BOTTOM_NAV_HEIGHT,
    zIndex: 1000,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
      },
      default: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  bottomNavCompact: {
    paddingBottom: 10,
    paddingTop: 8,
  },
  bottomNavIndicator: {
    position: 'absolute',
    top: 7,
    bottom: 9,
    left: 0,
    borderRadius: 18,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tabButtonContainer: {
    flex: 1,
    minWidth: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginHorizontal: 3,
    minWidth: 0,
    borderRadius: 18,
    zIndex: 1,
  },
  tabButtonCompact: {
    minHeight: 50,
    borderRadius: 15,
  },
  tabButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  tabLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelCompact: {
    fontSize: 8,
    maxWidth: 50,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
