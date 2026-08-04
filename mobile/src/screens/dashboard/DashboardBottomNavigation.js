import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { colors } from '../../theme';
import { tabs } from './dashboardNavigationModel.mjs';
import styles from './dashboardStyles';
import MotionPressable from './MotionPressable';

export default function DashboardBottomNavigation({
  activeTab,
  bottomInset,
  isCompactPhone,
  isVeryCompactPhone,
  itemInset,
  onTabPress,
}) {
  return (
    <View
      style={[
        styles.bottomNav,
        isVeryCompactPhone && styles.bottomNavCompact,
        { paddingBottom: 12 + bottomInset },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <MotionPressable
            key={tab.key}
            containerStyle={styles.tabButtonContainer}
            style={[
              styles.tabButton,
              isVeryCompactPhone && styles.tabButtonCompact,
              { marginHorizontal: itemInset },
            ]}
            onPress={() => onTabPress(tab.key)}
            scaleTo={0.94}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={isCompactPhone ? 18 : 21}
              color={isActive ? colors.primary : colors.mutedText}
            />
            <Text
              numberOfLines={1}
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
  );
}
