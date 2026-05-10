import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export default function FeatureModuleScreen({ title, subtitle, bullets = [] }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>AutoCare module</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Prototype preview</Text>
            {bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletIcon}>
                  <Feather name="check" size={12} color={colors.primary} />
                </View>
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
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 22,
    marginBottom: 14,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  detailCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  bulletIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
});
