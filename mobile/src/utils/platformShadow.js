import { Platform } from 'react-native'

import { buildCssBoxShadow } from './platformShadowModel.mjs'

export function createPlatformShadow({
  color = '#000000',
  width = 0,
  height = 0,
  opacity = 0,
  radius = 0,
  elevation = 0,
} = {}) {
  if (Platform.OS === 'web') {
    return {
      boxShadow: buildCssBoxShadow({ color, width, height, opacity, radius }),
    }
  }
  if (Platform.OS === 'android') {
    return { elevation }
  }
  return {
    shadowColor: color,
    shadowOffset: { width, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  }
}
