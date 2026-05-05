import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../theme';

export default function ScreenShell({
  children,
  contentContainerStyle,
  keyboardVerticalOffset = 12,
  showsVerticalScrollIndicator = false,
  scrollEnabled = true,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : 0}
          style={styles.flex}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.content, contentContainerStyle]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            scrollEnabled={scrollEnabled}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
      },
    }),
  },
  screen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        minHeight: '100%',
        overflowY: 'visible',
        overflowX: 'hidden',
      },
    }),
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
    ...Platform.select({
      web: {
        minHeight: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      },
    }),
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
});
