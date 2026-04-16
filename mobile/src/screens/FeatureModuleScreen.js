import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export default function FeatureModuleScreen({ title, subtitle, bullets = [] }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>AUTOCARE MODULE</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Prototype Preview</Text>
            {bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletIcon}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        overflowX: 'hidden',
      },
    }),
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        overflowX: 'hidden',
      },
    }),
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 24,
    marginBottom: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 24,
  },
  detailCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 22,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletIcon: {
    color: colors.primary,
    fontSize: 20,
    lineHeight: 24,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
});
