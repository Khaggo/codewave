import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, radius } from '../theme';
import ScreenShell from './ScreenShell';

export default function AuthFrame({
  children,
  title,
  subtitle,
  backLabel,
  onBack,
  contentContainerStyle,
  cardStyle,
  bodyStyle,
  centerContent = false,
}) {
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 720;
  const shouldAnimate = Platform.OS === 'web';
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!shouldAnimate) {
      cardOpacity.setValue(1);
      cardTranslate.setValue(0);
      return undefined;
    }

    cardOpacity.stopAnimation();
    cardTranslate.stopAnimation();
    cardOpacity.setValue(0);
    cardTranslate.setValue(16);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslate, shouldAnimate]);

  const cardWrapStyle = [
    styles.cardWrap,
    isCompactLayout && styles.cardWrapCompact,
    shouldAnimate && {
      opacity: cardOpacity,
      transform: [{ translateY: cardTranslate }],
    },
  ];

  return (
    <ScreenShell
      contentContainerStyle={[
        styles.content,
        centerContent && styles.contentCentered,
        isCompactLayout && styles.contentCompact,
        contentContainerStyle,
      ]}
    >
      <Animated.View style={cardWrapStyle}>
        <View style={[styles.card, isCompactLayout && styles.cardCompact, cardStyle]}>
          {onBack ? (
            <View style={styles.backRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={backLabel || 'Go back'}
              >
                <Feather name="arrow-left" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.heroBlock}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Feather name="settings" size={20} color={colors.onPrimary} />
              </View>

              <View style={{ marginLeft: 12 }}>
                <Text style={styles.brandEyebrow}>Auto Care Center</Text>
                <Text style={styles.brandTitle}>CRUISERS CRIB</Text>
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {!isCompactLayout ? <View style={styles.divider} /> : null}

          <View
            style={[styles.body, bodyStyle]}
            importantForAutofill={Platform.OS === 'android' ? 'noExcludeDescendants' : 'auto'}
          >
            {children}
          </View>
        </View>
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  contentCentered: {
    justifyContent: 'center',
  },
  contentCompact: {
    justifyContent: 'flex-start',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
  cardWrapCompact: {
    maxWidth: '100%',
    flexGrow: 1,
    flex: 1,
    alignSelf: 'stretch',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 4,
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
  cardCompact: {
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBlock: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEyebrow: {
    color: colors.labelText,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 420,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
});
