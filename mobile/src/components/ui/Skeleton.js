import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

export default function Skeleton({ width = '100%', height = 14, radius: r, style }) {
  const { colors, radius } = useTheme();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: r ?? radius.sm,
          backgroundColor: colors.surface.raised,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {},
});
