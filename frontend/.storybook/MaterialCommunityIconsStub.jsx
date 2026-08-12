import { Text } from 'react-native'
import glyphMap from '../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'
import './materialCommunityIcons.css'

const glyphs = {
  'car-outline': '▱',
  'clock-outline': '◷',
  'engine-outline': '◉',
  'refresh': '↻',
  'wrench-outline': '⌕',
}

const fallbackGlyph = glyphMap['help-circle-outline'] || glyphMap['circle-outline']

Object.keys(glyphMap).forEach((iconName) => {
  glyphs[iconName] = String.fromCodePoint(glyphMap[iconName])
})

Object.setPrototypeOf(
  glyphs,
  new Proxy(
    {},
    { get: () => String.fromCodePoint(fallbackGlyph) },
  ),
)

export default function MaterialCommunityIcons({
  color = 'currentColor',
  name,
  size = 18,
  style,
  ...props
}) {
  return (
    <Text
      {...props}
      accessibilityLabel={name}
      style={[
        {
          color,
          fontFamily: 'MaterialCommunityIcons',
          fontSize: size,
          lineHeight: size,
        },
        style,
      ]}
    >
      {glyphs[name] ?? '•'}
    </Text>
  )
}
