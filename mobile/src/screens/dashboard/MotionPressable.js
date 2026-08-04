import { useRef } from 'react'
import { Animated, Easing, Platform, Pressable } from 'react-native'

export default function MotionPressable({
  children,
  onPress,
  style,
  containerStyle,
  disabled = false,
  scaleTo = 0.97,
  ...pressableProps
}) {
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(1)).current

  const animateTo = (nextScale, nextOpacity) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: nextScale,
        stiffness: 320,
        damping: 24,
        mass: 0.7,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: nextOpacity,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start()
  }

  return (
    <Pressable
      {...pressableProps}
      style={containerStyle}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (!disabled) {
          animateTo(scaleTo, 0.96)
        }
      }}
      onPressOut={() => {
        animateTo(1, 1)
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
  )
}
