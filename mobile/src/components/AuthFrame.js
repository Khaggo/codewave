import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    cardOpacity.stopAnimation();
    cardTranslate.stopAnimation();
    cardOpacity.setValue(0);
    cardTranslate.setValue(20);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslate]);

  return (
    <ScreenShell
      contentContainerStyle={[
        styles.content,
        centerContent && styles.contentCentered,
        isCompactLayout && styles.contentCompact,
        contentContainerStyle,
      ]}
    >
      <Animated.View
        style={[
          styles.cardWrap,
          isCompactLayout && styles.cardWrapCompact,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslate }],
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.orbTopRight, isCompactLayout && styles.orbTopRightCompact]}
        />
        <View
          pointerEvents="none"
          style={[styles.orbBottomLeft, isCompactLayout && styles.orbBottomLeftCompact]}
        />

        <View style={[styles.card, isCompactLayout && styles.cardCompact, cardStyle]}>
          {backLabel && onBack ? (
            <TouchableOpacity style={styles.backLink} onPress={onBack} activeOpacity={0.8}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.mutedText} />
              <Text style={styles.backLinkText}>{backLabel}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.heroBlock}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <MaterialCommunityIcons name="wrench-outline" size={22} color={colors.onPrimary} />
              </View>

              <View>
                <Text style={styles.brandEyebrow}>Cruisers Crib</Text>
                <Text style={styles.brandTitle}>AUTOCARE</Text>
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.divider} />

          <View style={[styles.body, bodyStyle]}>{children}</View>
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
    maxWidth: 520,
    alignSelf: 'center',
    position: 'relative',
    minHeight: '100%',
  },
  cardWrapCompact: {
    maxWidth: '100%',
  },
  orbTopRight: {
    position: 'absolute',
    top: 18,
    right: -28,
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
  },
  orbTopRightCompact: {
    top: 10,
    right: -18,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: 20,
    left: -22,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 122, 0, 0.08)',
  },
  orbBottomLeftCompact: {
    bottom: 42,
    left: -12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 12,
    minHeight: '100%',
  },
  cardCompact: {
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  backLinkText: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '600',
  },
  heroBlock: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 6,
  },
  brandEyebrow: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 10,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 420,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
});
