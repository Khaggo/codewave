import { ScrollView, View } from 'react-native'

import styles from './dashboardStyles'

export default function DashboardScrollRegion({
  contentStyle,
  isWeb,
  isVeryCompactPhone,
  children,
}) {
  const responsiveContentStyle = [
    contentStyle,
    isVeryCompactPhone && styles.scrollContentCompact,
  ]

  if (isWeb) {
    return (
      <View style={styles.scrollRegion}>
        <View style={[styles.webScrollContent, ...responsiveContentStyle]}>{children}</View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={responsiveContentStyle}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}

