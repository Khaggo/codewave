import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius } from '../theme';

const LANDING_HEADER_HEIGHT = 64;
const LANDING_WEB_SCROLL_HEIGHT = `calc(100vh - ${LANDING_HEADER_HEIGHT}px)`;

const modules = [
  {
    key: 'booking',
    title: 'Service Booking',
    detail: 'Schedule appointments and monitor real-time status.',
    route: 'BookingScreen',
  },
  {
    key: 'lifecycle',
    title: 'Vehicle Lifecycle',
    detail: 'View your vehicle’s complete service and insurance timeline.',
    route: 'VehicleLifecycleScreen',
  },
  {
    key: 'store',
    title: 'E-commerce Store',
    detail: 'Browse and order genuine automotive parts and products.',
    route: 'StoreScreen',
  },
  {
    key: 'insurance',
    title: 'Insurance Inquiry',
    detail: 'Request quotations and track your insurance application status.',
    route: 'InsuranceInquiryScreen',
  },
];

const highlights = [
  { label: 'Live Tracking', value: 'Vehicle Status' },
  { label: 'Insurance', value: 'Inquiry Tracking' },
  { label: 'Rewards', value: 'Loyalty Points' },
];

export default function LandingPage({ navigation }) {
  const isWeb = Platform.OS === 'web';
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    contentOpacity.stopAnimation();
    contentTranslate.stopAnimation();
    contentOpacity.setValue(0);
    contentTranslate.setValue(20);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslate]);

  const landingContent = (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.brandMark}>CRUISERS CRIB</Text>
        <Text style={styles.heroTitle}>Integrated Service & Insurance Lifecycle Tracking.</Text>
        <Text style={styles.heroSubtitle}>
          A unified AutoCare experience for bookings, service updates, insurance inquiries,
          loyalty rewards, and product ordering.
        </Text>

        <View style={styles.highlightsRow}>
          {highlights.map((item) => (
            <View key={item.label} style={styles.highlightCard}>
              <Text style={styles.highlightValue}>{item.label}</Text>
              <Text style={styles.highlightLabel}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Modules</Text>
        <Text style={styles.sectionSubtitle}>
          The capstone objectives gathered into one professional mobile workflow.
        </Text>
      </View>

      <View style={styles.cardsWrapper}>
        {modules.map((module) => (
          <TouchableOpacity
            key={module.key}
            style={styles.moduleCard}
            activeOpacity={0.86}
            onPress={() => navigation.navigate(module.route)}
          >
            <Text style={styles.moduleTitle}>{module.title}</Text>
            <Text style={styles.moduleDetail}>{module.detail}</Text>
            <Text style={styles.moduleLink}>Open module {'>'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>CRUISERS CRIB</Text>
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
            contentContainerStyle={styles.content}
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
          style={styles.chatbotButton}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ChatbotScreen')}
        >
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
    paddingTop: 16,
    paddingBottom: 20,
  },
  topBar: {
    backgroundColor: colors.primary,
    minHeight: LANDING_HEADER_HEIGHT,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  topBarTitle: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: LANDING_HEADER_HEIGHT + 16,
    paddingBottom: 20,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  heroGlow: {
    position: 'absolute',
    top: -18,
    right: 8,
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: colors.primarySoft,
  },
  brandMark: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 10,
  },
  heroTitle: {
    color: colors.primary,
    fontSize: 31,
    fontWeight: '900',
    marginBottom: 12,
    lineHeight: 39,
  },
  heroSubtitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 22,
    maxWidth: 560,
  },
  highlightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlightCard: {
    flexGrow: 1,
    flexBasis: '31%',
    minWidth: 0,
    backgroundColor: colors.input,
    borderRadius: radius.medium,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  highlightValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  highlightLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  cardsWrapper: {
    gap: 14,
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  moduleTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },
  moduleDetail: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  moduleLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  buttonGroup: {
    marginTop: 32,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderRadius: radius.medium,
    borderWidth: 1.5,
    borderColor: colors.text,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chatbotButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
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
    fontSize: 14,
    fontWeight: '800',
  },
});
