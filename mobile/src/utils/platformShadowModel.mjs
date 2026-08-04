function clampOpacity(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 1
  }
  return Math.min(1, Math.max(0, parsed))
}

function expandHexColor(color) {
  const value = String(color ?? '').trim()
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return value
      .slice(1)
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return value.slice(1)
  }
  return null
}

export function toCssShadowColor(color, opacity) {
  const alpha = clampOpacity(opacity)
  const expandedHex = expandHexColor(color)
  if (expandedHex) {
    const red = Number.parseInt(expandedHex.slice(0, 2), 16)
    const green = Number.parseInt(expandedHex.slice(2, 4), 16)
    const blue = Number.parseInt(expandedHex.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }

  const value = String(color ?? '#000000').trim()
  const rgbMatch = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`
  }
  return value
}

export function buildCssBoxShadow({
  color = '#000000',
  width = 0,
  height = 0,
  opacity = 0,
  radius = 0,
} = {}) {
  if (clampOpacity(opacity) === 0) {
    return 'none'
  }
  return `${Number(width) || 0}px ${Number(height) || 0}px ${Math.max(0, Number(radius) || 0)}px ${toCssShadowColor(color, opacity)}`
}
