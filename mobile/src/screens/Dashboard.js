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
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { ApiError } from '../lib/authClient';
import {
  buildOwnedVehicleLabel,
  createCustomerBooking,
  formatBookingServiceDuration,
  formatBookingTimeSlotWindow,
  getBookingById,
  listCustomerBookings,
  loadBookingDiscoverySnapshot,
  toBookingDateString,
} from '../lib/bookingDiscoveryClient';
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

const BOTTOM_NAV_HEIGHT = 74;
const DASHBOARD_WEB_SCROLL_HEIGHT = `calc(100vh - ${BOTTOM_NAV_HEIGHT}px)`;

const tabs = [
  { key: 'explore', label: 'Home', icon: 'home-outline' },
  { key: 'messages', label: 'Timeline', icon: 'clock-outline' },
  { key: 'notifications', label: 'Book', icon: 'calendar-check-outline' },
  { key: 'store', label: 'Shop', icon: 'shopping-outline' },
  { key: 'menu', label: 'Profile', icon: 'account-outline' },
];

const genderOptions = ['Male', 'Female', 'Prefer not to say'];
const loyaltyPoints = 1240;
const tierThresholds = [
  { key: 'silver', label: 'Silver', minPoints: 0 },
  { key: 'gold', label: 'Gold', minPoints: 500 },
  { key: 'platinum', label: 'Platinum', minPoints: 1500 },
  { key: 'diamond', label: 'Diamond', minPoints: 2500 },
];
const profileSections = [
  { key: 'rewards', label: 'Rewards', icon: 'star-four-points-outline' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-outline' },
  { key: 'backJobs', label: 'Back-Jobs', icon: 'information-outline' },
];
const rewardOffers = [
  {
    key: 'oil',
    icon: 'flash-outline',
    title: '10% Off Next Oil Change',
    pointsLabel: '300 points',
    progress: 300,
    target: 300,
    accent: '#24E37A',
    available: true,
  },
  {
    key: 'rotation',
    icon: 'wrench-outline',
    title: 'Free Tire Rotation',
    pointsLabel: '650 points',
    progress: 650,
    target: 650,
    accent: '#24E37A',
    available: true,
  },
  {
    key: 'pms',
    icon: 'gift-outline',
    title: 'Free PMS Package',
    pointsLabel: '1,500 points',
    progress: loyaltyPoints,
    target: 1500,
    accent: colors.primary,
    available: false,
  },
  {
    key: 'voucher',
    icon: 'star-outline',
    title: '₱500 Shop Voucher',
    pointsLabel: '1,000 points',
    progress: 1000,
    target: 1000,
    accent: '#24E37A',
    available: true,
  },
];

const shopCategories = ['All', 'Oils', 'Tires', 'Brakes', 'Electrical', 'Coolants'];

const createInitialBookingDiscoveryState = () => ({
  status: 'idle',
  services: [],
  timeSlots: [],
  vehicles: [],
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

const BOOKING_DATE_WINDOW_DAYS = 31;

const buildBookingDateOptions = () => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  return Array.from({ length: BOOKING_DATE_WINDOW_DAYS }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index);
    const dateKey = toBookingDateString(date);

    return {
      key: dateKey,
      label: formatDate(date),
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      day: `${date.getDate()}`,
      month: date.toLocaleDateString(undefined, { month: 'short' }),
    };
  });
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

const defaultNotifications = [
  {
    key: 'notif-service-complete',
    brand: 'AUTOCARE',
    title: 'Service Complete!',
    message: 'Your Toyota Vios oil change is done. Ready for pickup at Cruisers Crib!',
    timeLabel: 'just now',
    icon: 'wrench-outline',
    tint: colors.primary,
    bgColor: 'rgba(255, 122, 0, 0.14)',
    unread: true,
  },
  {
    key: 'notif-service-progress',
    brand: 'AUTOCARE',
    title: 'Service In Progress',
    message: 'Your Brake Inspection is now being worked on. Estimated completion in 45 minutes.',
    timeLabel: '5 min ago',
    icon: 'hammer-wrench',
    tint: '#347FFF',
    bgColor: 'rgba(52, 127, 255, 0.14)',
    unread: true,
  },
  {
    key: 'notif-points-earned',
    brand: 'AUTOCARE',
    title: 'Points Earned! 🎉',
    message: 'You earned 120 points from your recent PMS service. You are 360 points away from Platinum tier.',
    timeLabel: '2 hours ago',
    icon: 'star-outline',
    tint: '#FFC500',
    bgColor: 'rgba(255, 197, 0, 0.14)',
    unread: false,
  },
  {
    key: 'notif-member-offer',
    brand: 'AUTOCARE',
    title: 'Exclusive Gold Member Offer',
    message: '15% off your next PMS! Valid until April 30. Use code: GOLD15',
    timeLabel: '1 day ago',
    icon: 'arrow-top-right',
    tint: '#12D764',
    bgColor: 'rgba(18, 215, 100, 0.14)',
    unread: false,
  },
  {
    key: 'notif-booking',
    brand: 'AUTOCARE',
    title: 'Booking Request Received',
    message: 'Your Oil Change request is pending staff review for April 20, 2026 at 10:00 AM.',
    timeLabel: '2 days ago',
    icon: 'calendar-check-outline',
    tint: '#12D764',
    bgColor: 'rgba(18, 215, 100, 0.14)',
    unread: false,
  },
  {
    key: 'notif-pms-reminder',
    brand: 'AUTOCARE',
    title: 'PMS Reminder',
    message: 'Your next PMS is due in 2,750 km or by May 2026.',
    timeLabel: '3 days ago',
    icon: 'clock-outline',
    tint: '#9B5CF6',
    bgColor: 'rgba(155, 92, 246, 0.14)',
    unread: false,
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
          style={[styles.claimButton, !item.available && styles.claimButtonLocked]}
          onPress={item.available ? onClaim : undefined}
          activeOpacity={item.available ? 0.86 : 1}
        >
          <Text style={[styles.claimButtonText, !item.available && styles.claimButtonTextLocked]}>
            {item.available ? 'Claim' : 'Locked'}
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

function CartLineItem({ item, onDecrease, onIncrease }) {
  return (
    <View style={styles.cartItemCard}>
      <Image source={{ uri: item.image }} style={styles.cartItemImage} />

      <View style={styles.cartItemCopy}>
        <Text style={styles.cartItemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.cartItemPrice}>{formatCurrency(item.price)}</Text>
      </View>

      <View style={styles.cartQuantityControls}>
        <TouchableOpacity style={styles.cartQuantityButton} onPress={onDecrease} activeOpacity={0.86}>
          <MaterialCommunityIcons name="minus" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.cartQuantityValue}>{item.quantity}</Text>
        <TouchableOpacity style={styles.cartQuantityButton} onPress={onIncrease} activeOpacity={0.86}>
          <MaterialCommunityIcons name="plus" size={16} color={colors.text} />
        </TouchableOpacity>
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

function BookingVehicleCard({ item, isSelected, onPress }) {
  return (
    <MotionPressable
      style={[
        styles.bookingServiceCard,
        isSelected && styles.bookingServiceCardSelected,
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

      <View style={styles.bookingServiceCopy}>
        <View style={styles.bookingServiceTitleRow}>
          <Text style={styles.bookingServiceTitle}>{item.title}</Text>
          <View style={styles.bookingVehicleBadge}>
            <Text style={styles.bookingVehicleBadgeText}>OWNED</Text>
          </View>
        </View>
        <Text style={styles.bookingServiceSubtitle}>{item.subtitle}</Text>
      </View>

      <View style={styles.bookingVehicleMeta}>
        <Text style={styles.bookingVehicleMetaLabel}>PLATE</Text>
        <Text style={styles.bookingVehicleMetaValue}>{item.plateNumber}</Text>
      </View>
    </MotionPressable>
  );
}

function BookingServiceCard({ item, isSelected, onPress }) {
  return (
    <MotionPressable
      style={[
        styles.bookingServiceCard,
        isSelected && styles.bookingServiceCardSelected,
        !item.enabled && styles.bookingServiceCardDisabled,
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

      <View style={styles.bookingServiceCopy}>
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

      <View style={styles.bookingServiceMeta}>
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
    </MotionPressable>
  );
}

function BookingDateCard({ item, isSelected, onPress, isCompact }) {
  return (
    <MotionPressable
      style={[
        styles.bookingDateCard,
        isCompact && styles.bookingDateCardCompact,
        isSelected && styles.bookingDateCardActive,
        !item.isOpen && styles.bookingDateCardDisabled,
      ]}
      onPress={item.isOpen ? onPress : undefined}
      disabled={!item.isOpen}
    >
      <Text style={[styles.bookingDateWeekday, isSelected && styles.bookingDateTextActive, !item.isOpen && styles.bookingDisabledSubtext]}>
        {item.weekday}
      </Text>
      <Text style={[styles.bookingDateDay, isSelected && styles.bookingDateTextActive, !item.isOpen && styles.bookingDisabledText]}>
        {item.day}
      </Text>
      <Text style={[styles.bookingDateMonth, isSelected && styles.bookingDateTextActive, !item.isOpen && styles.bookingDisabledSubtext]}>
        {item.month}
      </Text>
      {!item.isOpen ? <Text style={styles.bookingDateClosedLabel}>Off</Text> : null}
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

function QuickActionCard({ item, onPress }) {
  return (
    <MotionPressable containerStyle={styles.quickActionCardContainer} style={styles.quickActionCard} onPress={onPress}>
      <View style={[styles.quickActionIconWrap, { backgroundColor: item.bgColor }]}>
        <View style={[styles.quickActionIconInner, { backgroundColor: item.iconColor }]}>
          <MaterialCommunityIcons name={item.icon} size={20} color={colors.text} />
        </View>
      </View>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </MotionPressable>
  );
}

function HomeServiceRow({ item }) {
  return (
    <View style={styles.homeServiceRow}>
      <View style={styles.homeServiceRowLeft}>
        <View style={styles.homeServiceIconWrap}>
          <MaterialCommunityIcons name={item.icon} size={18} color={colors.primary} />
        </View>
        <View>
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
    item.statusTone === 'success'
      ? styles.timelineStatusPillSuccess
      : item.statusTone === 'info'
        ? styles.timelineStatusPillInfo
        : styles.timelineStatusPillDefault;
  const statusTextToneStyle =
    item.statusTone === 'success'
      ? styles.timelineStatusTextSuccess
      : item.statusTone === 'info'
        ? styles.timelineStatusTextInfo
        : styles.timelineStatusTextDefault;
  const typeToneStyle =
    item.type === 'Insurance'
      ? styles.timelineTypePillInsurance
      : item.type === 'Booking'
        ? styles.timelineTypePillBooking
        : styles.timelineTypePillService;

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
            <Text style={[styles.timelineStatusText, statusTextToneStyle]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.timelineEventSummary}>{item.summary}</Text>
        <Text style={styles.timelineEventMechanic}>• {item.mechanic}</Text>
        <View style={styles.timelineEventFooter}>
          <View style={styles.timelineEventMetaRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.mutedText} />
            <Text style={styles.timelineEventDate}>{item.dateLabel}</Text>
          </View>
          <Text style={styles.timelineEventPrice}>{item.priceLabel}</Text>
        </View>
        <View style={[styles.timelineTypePill, typeToneStyle]}>
          <Text style={styles.timelineTypeText}>{item.type}</Text>
        </View>
      </View>
    </View>
  );
}

export default function Dashboard({ account, navigation, onSignOut, onSaveProfile, onDeleteAccount }) {
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const isCompactPhone = !isWeb && windowWidth < 390;
  const [activeTab, setActiveTab] = useState('explore');
  const [menuScreen, setMenuScreen] = useState('root');
  const [bookingMode, setBookingMode] = useState('book');
  const [bookingDiscovery, setBookingDiscovery] = useState(createInitialBookingDiscoveryState);
  const [selectedBookingServiceKey, setSelectedBookingServiceKey] = useState(null);
  const [selectedBookingTimeKey, setSelectedBookingTimeKey] = useState(null);
  const [selectedBookingVehicleId, setSelectedBookingVehicleId] = useState(null);
  const [selectedBookingDateKey, setSelectedBookingDateKey] = useState(
    () => buildBookingDateOptions()[0]?.key ?? '',
  );
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingCreateState, setBookingCreateState] = useState(createInitialBookingCreateState);
  const [bookingHistory, setBookingHistory] = useState(createInitialBookingHistoryState);
  const [selectedHistoryBookingId, setSelectedHistoryBookingId] = useState(null);
  const [bookingDetailState, setBookingDetailState] = useState(createInitialBookingDetailState);
  const [notificationsFeed, setNotificationsFeed] = useState(defaultNotifications);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [isProfileTooltipVisible, setIsProfileTooltipVisible] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('All');
  const [activeShopCategory, setActiveShopCategory] = useState('All');
  const [shopSearch, setShopSearch] = useState('');
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [profileSection, setProfileSection] = useState('rewards');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(createProfileForm(account));
  const primaryVehicleLabel = account?.vehicleDisplayName || account?.vehicleModel || 'Toyota Vios 1.3 E';
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
    setSelectedBookingDateKey(buildBookingDateOptions()[0]?.key ?? '');
    setBookingNotes('');
    setBookingCreateState(createInitialBookingCreateState());
    setBookingHistory(createInitialBookingHistoryState());
    setSelectedHistoryBookingId(null);
    setBookingDetailState(createInitialBookingDetailState());
  }, [account?.accessToken, account?.userId]);

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
    if (selectedProduct) {
      productOverlayAnim.stopAnimation();
      productOverlayAnim.setValue(0);
      Animated.timing(productOverlayAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [selectedProduct, productOverlayAnim]);

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
        errorMessage: '',
      }));

      try {
        const nextSnapshot = await loadBookingDiscoverySnapshot({
          userId: account?.userId,
          accessToken: account?.accessToken,
        });

        if (isCancelled) {
          return;
        }

        setBookingDiscovery({
          status: 'ready',
          services: nextSnapshot.services,
          timeSlots: nextSnapshot.timeSlots,
          vehicles: nextSnapshot.vehicles,
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
    if (activeTab !== 'notifications' || bookingMode !== 'track') {
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
    const itemInset = isCompactPhone ? 3 : 6;

    bottomNavIndicatorAnim.stopAnimation();
    Animated.spring(bottomNavIndicatorAnim, {
      toValue: activeIndex * slotWidth + itemInset,
      stiffness: 220,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [activeTab, isCompactPhone, windowWidth, bottomNavIndicatorAnim]);

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);

    if (tabKey === 'menu') {
      setMenuScreen('root');
    }
  };

  const handleAddToCart = (product) => {
    setCartItems((currentItems) => ({
      ...currentItems,
      [product.key]: {
        ...product,
        quantity: (currentItems[product.key]?.quantity || 0) + 1,
      },
    }));
  };

  const handleOpenProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseProduct = () => {
    setSelectedProduct(null);
  };

  const handleRefreshBookingDiscovery = async () => {
    setBookingDiscovery((currentState) => ({
      ...currentState,
      status: 'loading',
      errorMessage: '',
    }));

    try {
      const nextSnapshot = await loadBookingDiscoverySnapshot({
        userId: account?.userId,
        accessToken: account?.accessToken,
      });

      setBookingDiscovery({
        status: 'ready',
        services: nextSnapshot.services,
        timeSlots: nextSnapshot.timeSlots,
        vehicles: nextSnapshot.vehicles,
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
        errorMessage: message,
      }));
    }
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

    if (!account?.userId) {
      setBookingCreateState({
        status: 'unauthorized',
        message: 'Sign in again before submitting a booking request.',
        booking: null,
      });
      return;
    }

    if (!selectedVehicle || !selectedService?.isActive || !selectedTimeSlot?.isActive || !selectedBookingDateKey) {
      setBookingCreateState({
        status: 'validation-error',
        message: 'Choose an owned vehicle, active service, active time slot, and appointment date.',
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
        message = 'That slot is no longer available or another booking conflict exists. Refresh options and retry.';
      }

      setBookingCreateState({
        status,
        message,
        booking: null,
      });
    }
  };

  const navigateToTimeline = () => {
    setActiveTab('messages');
  };

  const navigateToBooking = (mode = 'book') => {
    setActiveTab('notifications');
    setBookingMode(mode);
  };

  const navigateToProfileSection = (sectionKey) => {
    setActiveTab('menu');
    setMenuScreen('root');
    setProfileSection(sectionKey);
    setIsProfileTooltipVisible(false);
  };

  const navigateToProfileModule = () => {
    setActiveTab('menu');
    setMenuScreen('root');
    setIsProfileTooltipVisible(false);
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

    if (
      item.key === 'notif-service-progress' ||
      item.key === 'notif-service-complete' ||
      item.key === 'notif-booking'
    ) {
      navigateToBooking('track');
    } else if (item.key === 'notif-points-earned' || item.key === 'notif-member-offer') {
      navigateToProfileSection('rewards');
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
    setCartItems((currentItems) => {
      if (nextQuantity <= 0) {
        const nextItems = { ...currentItems };
        delete nextItems[productKey];
        return nextItems;
      }

      return {
        ...currentItems,
        [productKey]: {
          ...currentItems[productKey],
          quantity: nextQuantity,
        },
      };
    });
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
    setDeletePassword('');
    setDeletePasswordError('');
    setIsDeleteModalVisible(false);
  };

  const handleConfirmDeleteAccount = () => {
    if (!deletePassword.trim()) {
      setDeletePasswordError('Enter your current password to continue.');
      return;
    }

    if (deletePassword !== account?.password) {
      setDeletePasswordError('Current password is incorrect.');
      return;
    }

    setIsDeleteModalVisible(false);
    setDeletePassword('');
    setDeletePasswordError('');
    navigation.navigate('OTP', {
      email: account?.email,
      otpPurpose: 'deleteAccount',
    });
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
    if (isWeb) {
      return (
        <View style={styles.scrollRegion}>
          <View style={[styles.webScrollContent, contentStyle]}>{children}</View>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={contentStyle}
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
            <Text style={styles.loyaltyBadgeText}>Gold</Text>
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
            <Text style={styles.loyaltyPointsValue}>{loyaltyPoints.toLocaleString()}</Text>
            <Text style={styles.loyaltyPointsLabel}>Total Points</Text>
          </View>
        </View>

        <View style={styles.loyaltyMetaRow}>
          <Text style={styles.currentTierText}>Gold</Text>
          <Text style={styles.nextTierText}>260 pts to Platinum</Text>
        </View>

        <View style={styles.loyaltyTrack}>
          <View style={styles.loyaltyFill} />
        </View>

        <View style={styles.loyaltyTierRow}>
          {tierThresholds.map((tier) => {
            const isReached = loyaltyPoints >= tier.minPoints;
            const isCurrent = tier.key === 'gold';

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
          : profileSection === 'insurance'
            ? 'Insurance Tools'
            : 'Back-Jobs'}
      </Text>

      {profileSection === 'rewards' ? (
        <>
          {rewardOffers.map((item) => (
            <RewardOfferCard
              key={item.key}
              item={item}
              onClaim={() => Alert.alert('Reward Claimed', `${item.title} has been added to your account.`)}
            />
          ))}
        </>
      ) : null}

      {profileSection === 'insurance' ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Insurance inquiry tracking</Text>
          <Text style={styles.infoPanelText}>
            Monitor quotations, submitted policies, and follow-up requests in one place once the
            insurance module goes live.
          </Text>
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
          onPress={() => Alert.alert('Notifications', 'Notification preferences are coming soon.')}
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
          This permanently removes your AutoCare profile, stored details, and saved settings from
          this prototype flow.
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

      <View style={styles.infoBlock}>
        <Text style={styles.infoTitle}>Claim Your Gift</Text>
        <Text style={styles.infoText}>
          Your next loyalty reward is being prepared. Gift Center redemption flow is coming soon.
        </Text>
      </View>
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
    const searchTerm = shopSearch.trim().toLowerCase();
    const filteredProducts = shopProducts.filter((product) => {
      const matchesCategory =
        activeShopCategory === 'All' || product.category === activeShopCategory;
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });
    const cartEntries = Object.values(cartItems);
    const cartCount = cartEntries.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cartEntries.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return renderScrollableContent(styles.shopScrollContent, (
      <>
      <View style={styles.shopHeader}>
        <View style={styles.shopHeaderCopy}>
          <Text style={styles.shopEyebrow}>CRUISERS CRIB</Text>
          <Text style={styles.shopTitle}>Auto Shop</Text>
        </View>

        <TouchableOpacity
          style={styles.shopCartButton}
          onPress={() => setIsCartVisible(true)}
          activeOpacity={0.86}
        >
          <MaterialCommunityIcons name="cart-outline" size={24} color={colors.labelText} />
          {cartCount > 0 ? (
            <View style={styles.shopCartBadge}>
              <Text style={styles.shopCartBadgeText}>{cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.shopSearchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedText} />
        <TextInput
          value={shopSearch}
          onChangeText={setShopSearch}
          placeholder="Search parts, products, brands..."
          placeholderTextColor={colors.mutedText}
          style={styles.shopSearchInput}
          selectionColor={colors.primary}
        />
      </View>

      <ScrollView
        horizontal
        style={styles.shopCategoryScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shopCategoryRow}
      >
        {shopCategories.map((category) => (
          <ShopCategoryChip
            key={category}
            label={category}
            isActive={activeShopCategory === category}
            onPress={() => setActiveShopCategory(category)}
          />
        ))}
      </ScrollView>

      <View style={styles.shopToolbar}>
        <Text style={styles.shopProductCount}>
          {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
        </Text>

        <TouchableOpacity
          style={styles.shopFilterButton}
          onPress={() => Alert.alert('Filters', 'Advanced filters can be added next.')}
          activeOpacity={0.86}
        >
          <MaterialCommunityIcons name="tune-variant" size={16} color={colors.labelText} />
          <Text style={styles.shopFilterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.shopGrid}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <View key={product.key} style={styles.shopGridItem}>
            <ProductCard
              item={product}
              quantity={cartItems[product.key]?.quantity || 0}
              onAdd={() => handleAddToCart(product)}
              onOpen={() => handleOpenProduct(product)}
            />
          </View>
        ))
        ) : (
          <View style={styles.shopEmptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={34} color={colors.border} />
            <Text style={styles.shopEmptyTitle}>No products found</Text>
            <Text style={styles.shopEmptyText}>Try a different search or switch categories.</Text>
          </View>
        )}
      </View>
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
    const bookingDateOptions = buildBookingDateOptions();
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
    const bookingTimeSlotOptions = bookingDiscovery.timeSlots.map((timeSlot) => ({
      key: timeSlot.id,
      label: timeSlot.label,
      timeRangeLabel: formatBookingTimeSlotWindow(timeSlot),
      capacityLabel: `Capacity ${timeSlot.capacity}`,
      available: timeSlot.isActive,
      reason: timeSlot.isActive ? null : 'Unavailable',
    }));
    const isBookingReady =
      bookingDiscoveryStateKey === 'ready' &&
      Boolean(selectedVehicle) &&
      Boolean(selectedService?.isActive) &&
      Boolean(selectedTimeSlot?.isActive) &&
      Boolean(selectedBookingDateKey) &&
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
          <View style={styles.bookingDiscoveryBanner}>
            <View style={styles.bookingDiscoveryBannerCopyWrap}>
              <View style={styles.bookingDiscoveryBannerIconWrap}>
                <MaterialCommunityIcons name="source-branch-sync" size={18} color={colors.primary} />
              </View>
              <View style={styles.bookingDiscoveryBannerCopy}>
                <Text style={styles.bookingDiscoveryBannerTitle}>Live booking discovery</Text>
                <Text style={styles.bookingDiscoveryBannerText}>
                  Services and slot definitions come from live backend routes. Choosing a slot here does not hold capacity until booking create.
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
              message="Fetching live services, time-slot definitions, and your eligible vehicles now."
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
              {!bookingDiscovery.services.some(isBookableService) ? (
                <BookingDiscoveryStatePanel
                  icon="wrench-clock"
                  title="No services are available right now"
                  message="The live services route returned no active booking services. Keep this state explicit instead of filling the list with placeholders."
                />
              ) : null}
              {bookingServiceOptions.map((service) => (
                <BookingServiceCard
                  key={service.key}
                  item={service}
                  isSelected={selectedBookingServiceKey === service.key}
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
                Showing the next month of available appointment dates, starting tomorrow.
              </Text>
              <ScrollView
                horizontal
                style={styles.bookingDateScroller}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bookingDateRow}
              >
                {bookingDateOptions.map((dateOption) => (
                  <BookingDateCard
                    key={dateOption.key}
                    item={{
                      ...dateOption,
                      isOpen: true,
                    }}
                    isSelected={selectedBookingDateKey === dateOption.key}
                    isCompact={isCompactPhone}
                    onPress={() => {
                      setSelectedBookingDateKey(dateOption.key);
                      if (bookingCreateState.status !== 'submitting') {
                        setBookingCreateState(createInitialBookingCreateState());
                      }
                    }}
                  />
                ))}
              </ScrollView>

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
                  onAction={bookingCreateState.status === 'conflict' ? handleRefreshBookingDiscovery : undefined}
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
                  <View style={styles.trackingMetaItem}>
                    <Text style={styles.trackingMetaLabel}>Vehicle</Text>
                    <Text style={styles.trackingMetaValue}>
                      {getBookingVehicleLabel(selectedBookingDetail, bookingDiscovery.vehicles)}
                    </Text>
                  </View>
                  <View style={styles.trackingMetaItem}>
                    <Text style={styles.trackingMetaLabel}>Date</Text>
                    <Text style={styles.trackingMetaValue}>
                      {formatBookingDateLabel(selectedBookingDetail.scheduledDate)}
                    </Text>
                  </View>
                  <View style={styles.trackingMetaItem}>
                    <Text style={styles.trackingMetaLabel}>Time</Text>
                    <Text style={styles.trackingMetaValue}>
                      {getBookingTimeLabel(selectedBookingDetail)}
                    </Text>
                  </View>
                  <View style={styles.trackingMetaItem}>
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
        onPress: () => navigateToProfileSection('insurance'),
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
        key: 'history',
        label: 'History',
        icon: 'arrow-top-right',
        bgColor: 'rgba(18, 215, 100, 0.14)',
        iconColor: '#12D764',
        onPress: navigateToTimeline,
      },
    ];

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
          <View>
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

      <View style={styles.homeVehicleCard}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
          }}
          style={styles.homeVehicleImage}
        />
        <View style={styles.homeVehicleShade} />
        <View style={styles.homeVehicleTopCopy}>
          <Text style={styles.homeVehicleTitle}>{primaryVehicleLabel}</Text>
          <Text style={styles.homeVehicleMeta}>ABC-1234 • 2021 Model</Text>
        </View>

        <View style={styles.homeVehicleStats}>
          <View style={styles.homeVehicleStatItem}>
            <Text style={styles.homeVehicleStatValue}>12</Text>
            <Text style={styles.homeVehicleStatLabel}>Services</Text>
          </View>
          <View style={styles.homeVehicleStatDivider} />
          <View style={styles.homeVehicleStatItem}>
            <Text style={styles.homeVehicleStatValue}>{loyaltyPoints.toLocaleString()}</Text>
            <Text style={styles.homeVehicleStatLabel}>Points</Text>
          </View>
          <View style={styles.homeVehicleStatDivider} />
          <View style={styles.homeVehicleStatItem}>
            <Text style={[styles.homeVehicleStatValue, styles.homeVehicleTierValue]}>Gold</Text>
            <Text style={styles.homeVehicleStatLabel}>Tier</Text>
          </View>
        </View>
      </View>

      <Text style={styles.homeSectionLabel}>Quick Actions</Text>
      <View style={styles.quickActionsRow}>
        {quickActions.map((action) => (
          <QuickActionCard key={action.key} item={action} onPress={action.onPress} />
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

      {recentServiceHistory.slice(0, 3).map((item) => (
        <HomeServiceRow key={item.key} item={item} />
      ))}

      <View style={styles.homeOfferCard}>
        <Text style={styles.homeOfferEyebrow}>GOLD MEMBER OFFER</Text>
        <Text style={styles.homeOfferTitle}>Get 15% off your next PMS!</Text>
        <Text style={styles.homeOfferSubtitle}>Valid until April 30, 2026. Use code: GOLD15</Text>
        <TouchableOpacity style={styles.homeOfferButton} onPress={() => navigateToProfileSection('rewards')} activeOpacity={0.86}>
          <Text style={styles.homeOfferButtonText}>Claim Offer</Text>
        </TouchableOpacity>
        <View style={styles.homeOfferCircle} />
      </View>
      </>
    ));
  };

  const renderTimelineContent = () =>
    {
      const visibleTimelineItems = recentServiceHistory.filter((item) =>
        timelineFilter === 'All' ? true : item.type === timelineFilter
      );

      return renderScrollableContent(styles.timelineScrollContent, (
        <>
        <View style={styles.timelineHeaderRow}>
          <View>
            <Text style={styles.bookingEyebrow}>VEHICLE LIFECYCLE</Text>
            <Text style={styles.timelineTitle}>Timeline</Text>
          </View>

          <MotionPressable style={styles.timelineFilterIconButton} onPress={() => null}>
            <MaterialCommunityIcons name="filter-variant" size={18} color={colors.labelText} />
          </MotionPressable>
        </View>

        <View style={styles.timelineStatsRow}>
          <View style={styles.timelineStatCard}>
            <Text style={[styles.timelineStatValue, styles.timelineStatValueWarm]}>12</Text>
            <Text style={styles.timelineStatLabel}>Total Services</Text>
          </View>
          <View style={styles.timelineStatCard}>
            <Text style={styles.timelineStatValue}>{'\u20B1'}24.5k</Text>
            <Text style={styles.timelineStatLabel}>Spent</Text>
          </View>
          <View style={styles.timelineStatCard}>
            <Text style={[styles.timelineStatValue, styles.timelineStatValueHighlight]}>
              {loyaltyPoints.toLocaleString()}
            </Text>
            <Text style={styles.timelineStatLabel}>Points Earned</Text>
          </View>
        </View>

        <View style={styles.timelineFilterRow}>
          {['All', 'Service', 'Insurance', 'Booking'].map((filterLabel) => (
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

        {visibleTimelineItems.map((item) => (
          <View key={item.key} style={styles.timelineEventWrap}>
            <Text style={styles.timelineDateMarker}>{item.dateLabel}</Text>
            <TimelineEventCard item={item} />
          </View>
        ))}
        </>
      ));
    };

  const renderMenuContent = () => {
    if (menuScreen === 'settings') {
      return renderSettingsMenu();
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

    return renderMenuContent();
  };

  const cartEntries = Object.values(cartItems);
  const cartCount = cartEntries.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartEntries.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedProductQuantity = selectedProduct ? cartItems[selectedProduct.key]?.quantity || 0 : 0;
  const unreadNotificationCount = notificationsFeed.filter((item) => item.unread).length;
  const bottomNavSlotWidth = windowWidth / tabs.length;
  const bottomNavItemInset = isCompactPhone ? 3 : 6;
  const bottomNavIndicatorWidth = Math.max(
    bottomNavSlotWidth - bottomNavItemInset * 2,
    isCompactPhone ? 44 : 58,
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
                      Alerts and service updates will appear here.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          ) : null}

          {selectedProduct ? (
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
                  <Image source={{ uri: selectedProduct.image }} style={styles.productHeroImage} />
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
                  {selectedProduct.badge ? (
                    <View
                      style={[
                        styles.productDetailBadge,
                        selectedProduct.badgeTone === 'warning'
                          ? styles.productBadgeWarning
                          : selectedProduct.badgeTone === 'featured'
                            ? styles.productBadgeFeatured
                            : styles.productBadgeSale,
                      ]}
                    >
                      <Text
                        style={[
                          styles.productBadgeText,
                          selectedProduct.badgeTone === 'warning' && styles.productBadgeTextDark,
                        ]}
                      >
                        {selectedProduct.badge}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.productDetailTitle}>{selectedProduct.name}</Text>
                  <Text style={styles.productDetailBrand}>{selectedProduct.brand}</Text>

                  <View style={styles.productDetailRatingRow}>
                    <RatingStars rating={selectedProduct.rating} />
                    <Text style={styles.productDetailRatingValue}>
                      {selectedProduct.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.productDetailReviewCount}>
                      ({selectedProduct.reviews} reviews)
                    </Text>
                  </View>

                  <View style={styles.productInfoCard}>
                    <View style={styles.productInfoPrimary}>
                      <Text style={styles.productDetailPrice}>
                        {formatCurrency(selectedProduct.price)}
                      </Text>
                      {selectedProduct.compareAtPrice ? (
                        <Text style={styles.productDetailComparePrice}>
                          {formatCurrency(selectedProduct.compareAtPrice)}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.productInfoMeta}>
                      <View style={styles.productInfoStatusRow}>
                        <MaterialCommunityIcons
                          name="cube-outline"
                          size={15}
                          color={
                            selectedProduct.availability.toLowerCase() === 'low stock'
                              ? '#FFD24A'
                              : colors.success
                          }
                        />
                        <Text
                          style={[
                            styles.productInfoStatusText,
                            selectedProduct.availability.toLowerCase() === 'low stock' &&
                              styles.productAvailabilityWarning,
                          ]}
                        >
                          {selectedProduct.availability}
                        </Text>
                      </View>
                      <Text style={styles.productInfoCategory}>
                        Category: {selectedProduct.category}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.productDetailSectionLabel}>Product Details</Text>
                  <Text style={styles.productDetailDescription}>{selectedProduct.description}</Text>

                  <TouchableOpacity
                    style={styles.productDetailCartButton}
                    onPress={() => handleAddToCart(selectedProduct)}
                    activeOpacity={0.88}
                  >
                    <MaterialCommunityIcons name="cart-outline" size={19} color={colors.onPrimary} />
                    <Text style={styles.productDetailCartButtonText}>
                      {selectedProductQuantity > 0 ? `Add Another (${selectedProductQuantity})` : 'Add to Cart'}
                    </Text>
                  </TouchableOpacity>
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
                  <Text style={styles.cartTitle}>Your Cart</Text>
                  <Text style={styles.cartSubtitle}>
                    {cartCount} item{cartCount === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              {cartEntries.length === 0 ? (
                <View style={styles.cartEmptyState}>
                  <MaterialCommunityIcons
                    name="cart-outline"
                    size={42}
                    color={colors.border}
                  />
                  <Text style={styles.cartEmptyText}>Your cart is empty</Text>
                </View>
              ) : (
                <>
                  <ScrollView
                    style={styles.cartItemsScroll}
                    contentContainerStyle={styles.cartItemsContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {cartEntries.map((item) => (
                      <CartLineItem
                        key={item.key}
                        item={item}
                        onDecrease={() =>
                          handleUpdateCartQuantity(item.key, item.quantity - 1)
                        }
                        onIncrease={() =>
                          handleUpdateCartQuantity(item.key, item.quantity + 1)
                        }
                      />
                    ))}
                  </ScrollView>

                  <View style={styles.cartFooter}>
                    <View style={styles.cartTotalRow}>
                      <Text style={styles.cartTotalLabel}>Total</Text>
                      <Text style={styles.cartTotalValue}>{formatCurrency(cartTotal)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.cartCheckoutButton}
                      onPress={() => Alert.alert('Checkout', 'Checkout flow can be connected next.')}
                      activeOpacity={0.88}
                    >
                      <MaterialCommunityIcons name="check" size={18} color={colors.onPrimary} />
                      <Text style={styles.cartCheckoutText}>Checkout Now</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          ) : null}

          <View style={styles.bottomNav}>
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
                    { marginHorizontal: bottomNavItemInset },
                    isActive && styles.tabButtonActive,
                  ]}
                  onPress={() => handleTabPress(tab.key)}
                  scaleTo={0.94}
                >
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={isCompactPhone ? 20 : 22}
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
    marginBottom: 16,
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
    maxWidth: 230,
  },
  homeTrackButton: {
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
  quickActionCardContainer: {
    width: '22.8%',
    alignItems: 'center',
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
  homeServiceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
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
    fontSize: 18,
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
  timelineTypePillService: {
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
  },
  timelineTypePillInsurance: {
    backgroundColor: 'rgba(52, 127, 255, 0.12)',
  },
  timelineTypePillBooking: {
    backgroundColor: 'rgba(155, 92, 246, 0.14)',
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
  bookingDiscoveryBannerCopyWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 12,
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
    paddingRight: 10,
  },
  bookingServiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  bookingServiceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
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
    width: 68,
    minHeight: 92,
    borderRadius: 20,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    paddingVertical: 12,
  },
  bookingDateCardCompact: {
    width: 60,
    minHeight: 86,
    marginRight: 9,
  },
  bookingDateCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bookingDateCardDisabled: {
    backgroundColor: '#1B2030',
    borderColor: colors.borderSoft,
  },
  bookingDateWeekday: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  bookingDateDay: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '800',
    lineHeight: 30,
  },
  bookingDateMonth: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  sectionTabsWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 16,
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
    color: colors.mutedText,
    fontSize: 18,
    marginTop: 14,
  },
  cartItemsScroll: {
    flex: 1,
  },
  cartItemsContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 120,
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
  cartItemImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginRight: 12,
  },
  cartItemCopy: {
    flex: 1,
    paddingRight: 10,
  },
  cartItemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 4,
  },
  cartItemPrice: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  cartQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartQuantityButton: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: '#262C41',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQuantityValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginHorizontal: 12,
    minWidth: 10,
    textAlign: 'center',
  },
  cartFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 22 : 26,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: '#141824',
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
  cartCheckoutText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
    paddingTop: 10,
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
  bottomNavIndicator: {
    position: 'absolute',
    top: 8,
    bottom: 10,
    left: 0,
    borderRadius: 20,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tabButtonContainer: {
    flex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginHorizontal: 6,
    borderRadius: 18,
    zIndex: 1,
  },
  tabButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  tabLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  tabLabelCompact: {
    fontSize: 9,
    maxWidth: 58,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
