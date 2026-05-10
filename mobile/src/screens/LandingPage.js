import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '../theme';

const LANDING_HEADER_HEIGHT = 60;
const LANDING_WEB_SCROLL_HEIGHT = `calc(100vh - ${LANDING_HEADER_HEIGHT}px)`;

const modules = [
  {
    key: 'booking',
    title: 'Service Booking',
    detail: 'Schedule appointments and monitor real-time status.',
    icon: 'calendar',
    route: 'BookingScreen',
  },
  {
    key: 'lifecycle',
    title: 'Vehicle Lifecycle',
    detail: 'View your vehicle’s complete service and insurance timeline.',
    icon: 'activity',
    route: 'VehicleLifecycleScreen',
  },
  {
    key: 'store',
    title: 'E-commerce Store',
    detail: 'Browse and order genuine automotive parts and products.',
    icon: 'shopping-bag',
    route: 'StoreScreen',
  },
  {
    key: 'insurance',
    title: 'Insurance Inquiry',
    detail: 'Request quotations and track your insurance application status.',
    icon: 'shield',
    route: 'InsuranceInquiryScreen',
  },
];

const highlights = [
  { label: 'Live tracking', value: 'Vehicle status', icon: 'activity' },
  { label: 'Insurance', value: 'Inquiry tracking', icon: 'shield' },
  { label: 'Rewards', value: 'Loyalty points', icon: 'award' },
];

export default function LandingPage({ navigation }) {
  const isWeb = Platform.OS === 'web';
  const insets = useSafeAreaInsets();
  const topInset = isWeb ? 0 : insets.top;
  const bottomInset = isWeb ? 0 : insets.bottom;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    contentOpacity.stopAnimation();
    contentTranslate.stopAnimation();
    contentOpacity.setValue(0);
    contentTranslate.setValue(16);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslate]);

  const landingContent = (
    <>
      <View style={styles.heroCard}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Feather name="settings" size={18} color={colors.onPrimary} />
          </View>
          <View>
            <Text style={styles.brandEyebrow}>Auto Care Center</Text>
            <Text style={styles.brandMark}>CRUISERS CRIB</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Integrated service & insurance lifecycle tracking.</Text>
        <Text style={styles.heroSubtitle}>
          A unified AutoCare experience for bookings, service updates, insurance inquiries,
          loyalty rewards, and product ordering.
        </Text>

        <View style={styles.highlightsRow}>
          {highlights.map((item) => (
            <View key={item.label} style={styles.highlightCard}>
              <Feather name={item.icon} size={14} color={colors.primary} />
              <Text style={styles.highlightValue}>{item.label}</Text>
              <Text style={styles.highlightLabel}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured modules</Text>
        <Text style={styles.sectionSubtitle}>
          Capstone objectives gathered into one professional mobile workflow.
        </Text>
      </View>

      <View style={styles.cardsWrapper}>
        {modules.map((module) => (
          <TouchableOpacity
            key={module.key}
            style={styles.moduleCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(module.route)}
          >
            <View style={styles.moduleIcon}>
              <Feather name={module.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.moduleBody}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleDetail}>{module.detail}</Text>
              <View style={styles.moduleLinkRow}>
                <Text style={styles.moduleLink}>Open module</Text>
                <Feather name="chevron-right" size={14} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => navigation.replace('Register')}
        >
          <Text style={styles.primaryButtonText}>Create account</Text>
          <Feather name="arrow-right" size={16} color={colors.onPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.9}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.secondaryButtonText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: 14 + topInset, minHeight: LANDING_HEADER_HEIGHT + topInset }]}>
          <View style={styles.topBarBrand}>
            <View style={styles.topBarBadge}>
              <Feather name="settings" size={14} color={colors.onPrimary} />
            </View>
            <Text style={styles.topBarTitle}>CRUISERS CRIB</Text>
          </View>
        </View>

        {isWeb ? (
          <View style={styles.scrollRegion}>
            <Animated.View
              style={[
                styles.webContent,
                {
                  opacity: contentOpacity,
                  transform: [{ translateY: contentTranslate }],
                },
              ]}
            >
              {landingContent}
            </Animated.View>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: LANDING_HEADER_HEIGHT + topInset + 20,
                paddingBottom: 96 + bottomInset,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={{
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslate }],
              }}
            >
              {landingContent}
            </Animated.View>
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.chatbotButton, { bottom: 24 + bottomInset }]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ChatbotScreen')}
        >
          <Feather name="message-circle" size={16} color={colors.onPrimary} />
          <Text style={styles.chatbotButtonText}>Ask AutoCare</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
        minHeight: '100vh',
        overflow: 'hidden',
        overflowX: 'hidden',
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
        justifyContent: 'flex-start',
        height: LANDING_WEB_SCROLL_HEIGHT,
        maxHeight: LANDING_WEB_SCROLL_HEIGHT,
        overflowY: 'scroll',
        overflowX: 'hidden',
      },
    }),
  },
  webContent: {
    minHeight: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  topBar: {
    backgroundColor: colors.surface,
    minHeight: LANDING_HEADER_HEIGHT,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    zIndex: 1000,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
      },
      default: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
      },
    }),
  },
  topBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBarBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEyebrow: {
    color: colors.labelText,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  brandMark: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 30,
  },
  heroSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
    maxWidth: 560,
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 0,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'flex-start',
    gap: 4,
  },
  highlightValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  highlightLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  cardsWrapper: {
    gap: 12,
  },
  moduleCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  moduleIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleBody: {
    flex: 1,
  },
  moduleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  moduleDetail: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  moduleLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moduleLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonGroup: {
    marginTop: 24,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chatbotButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
    zIndex: 1000,
    ...Platform.select({
      web: {
        position: 'fixed',
        right: 20,
        bottom: 24,
      },
      default: {
        position: 'absolute',
        right: 20,
        bottom: 24,
      },
    }),
  },
  chatbotButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
