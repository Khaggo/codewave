// ─────────────────────────────────────────────────────────────────────────────
//  Design tokens — structured, theme-aware source of truth.
//  Mirrors the web frontend (frontend/src/app/globals.css + tailwind.config.js).
//  Two themes ship: dark (default, matches web) and light.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

// -- Static (non-theme) tokens -----------------------------------------------

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: '"Inter", "Inter Placeholder", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'System',
});

const fontFamilyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  web: '"Inter", "Inter Placeholder", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'System',
});

export const type = {
  display: { fontFamily: fontFamilyMedium, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h1:      { fontFamily: fontFamilyMedium, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  h2:      { fontFamily: fontFamilyMedium, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  h3:      { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body:    { fontFamily,                   fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodyStrong: { fontFamily,                fontSize: 14, fontWeight: '600', lineHeight: 20 },
  small:   { fontFamily,                   fontSize: 12, fontWeight: '400', lineHeight: 16 },
  smallStrong: { fontFamily,               fontSize: 12, fontWeight: '600', lineHeight: 16 },
  label: {
    fontFamily,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  button:  { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
};

// Elevation: cross-platform shadow helpers. Returned as style fragments.
export const elevation = {
  none: {},
  card: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.28, shadowRadius: 4 },
    android: { elevation: 1 },
    default: { boxShadow: '0 1px 4px rgba(0,0,0,0.28)' },
  }),
  raised: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 20 },
    android: { elevation: 4 },
    default: { boxShadow: '0 4px 20px rgba(0,0,0,0.28)' },
  }),
  glow: Platform.select({
    ios: { shadowColor: '#F07C00', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 18 },
    android: { elevation: 6 },
    default: { boxShadow: '0 6px 18px rgba(240,124,0,0.4)' },
  }),
};

// -- Color palettes ----------------------------------------------------------
//   Matches frontend/src/app/globals.css `[data-theme="dark"|"light"]`.

export const palettes = {
  dark: {
    brand: {
      orange: '#F07C00',
      orangeDark: '#C26000',
      gold: '#C9951A',
      orangeSoft: 'rgba(240, 124, 0, 0.14)',
      orangeGlow: 'rgba(240, 124, 0, 0.28)',
      goldSoft: 'rgba(201, 149, 26, 0.16)',
    },
    surface: {
      bg: '#09090B',
      card: '#111113',
      raised: '#18181B',
      hover: '#1C1C1F',
      input: '#141416',
      border: '#27272A',
      borderSoft: '#1F1F22',
      readonly: '#161618',
    },
    ink: {
      primary: '#F4F4F5',
      secondary: '#A1A1AA',
      muted: '#71717A',
      dim: '#3F3F46',
      onBrand: '#FFFFFF',
    },
    semantic: {
      success: '#10B981',
      successSoft: 'rgba(16, 185, 129, 0.16)',
      danger: '#EF4444',
      dangerSoft: 'rgba(239, 68, 68, 0.16)',
      warning: '#EAB308',
      warningSoft: 'rgba(234, 179, 8, 0.16)',
      info: '#3B82F6',
      infoSoft: 'rgba(59, 130, 246, 0.16)',
    },
    overlay: 'rgba(0, 0, 0, 0.72)',
    badge: {
      green:  { bg: 'rgba(16,185,129,0.16)', fg: '#34D399', border: 'rgba(16,185,129,0.28)' },
      orange: { bg: 'rgba(240,124,0,0.16)',  fg: '#F59E33', border: 'rgba(240,124,0,0.28)' },
      gold:   { bg: 'rgba(201,149,26,0.16)', fg: '#E0B53E', border: 'rgba(201,149,26,0.28)' },
      gray:   { bg: 'rgba(161,161,170,0.14)', fg: '#D4D4D8', border: 'rgba(161,161,170,0.24)' },
      red:    { bg: 'rgba(239,68,68,0.16)',  fg: '#F87171', border: 'rgba(239,68,68,0.28)' },
      blue:   { bg: 'rgba(59,130,246,0.16)', fg: '#60A5FA', border: 'rgba(59,130,246,0.28)' },
      purple: { bg: 'rgba(168,85,247,0.16)', fg: '#C084FC', border: 'rgba(168,85,247,0.28)' },
    },
  },
  light: {
    brand: {
      orange: '#E26000',
      orangeDark: '#B85000',
      gold: '#B47812',
      orangeSoft: 'rgba(226, 96, 0, 0.10)',
      orangeGlow: 'rgba(226, 96, 0, 0.18)',
      goldSoft: 'rgba(180, 120, 18, 0.12)',
    },
    surface: {
      bg: '#F7F8FB',
      card: '#FFFFFF',
      raised: '#F1F4F8',
      hover: '#EBEFF5',
      input: '#FFFFFF',
      border: '#D0D8E2',
      borderSoft: '#E4E9F0',
      readonly: '#F1F4F8',
    },
    ink: {
      primary: '#141821',
      secondary: '#485464',
      muted: '#6B7787',
      dim: '#949EAB',
      onBrand: '#FFFFFF',
    },
    semantic: {
      success: '#059669',
      successSoft: 'rgba(5, 150, 105, 0.12)',
      danger: '#DC2626',
      dangerSoft: 'rgba(220, 38, 38, 0.12)',
      warning: '#CA8A04',
      warningSoft: 'rgba(202, 138, 4, 0.12)',
      info: '#2563EB',
      infoSoft: 'rgba(37, 99, 235, 0.12)',
    },
    overlay: 'rgba(15, 23, 42, 0.5)',
    badge: {
      green:  { bg: 'rgba(5,150,105,0.12)',  fg: '#047857', border: 'rgba(5,150,105,0.24)' },
      orange: { bg: 'rgba(226,96,0,0.12)',   fg: '#B85000', border: 'rgba(226,96,0,0.24)' },
      gold:   { bg: 'rgba(180,120,18,0.14)', fg: '#8E5E0E', border: 'rgba(180,120,18,0.26)' },
      gray:   { bg: 'rgba(72,84,100,0.10)',  fg: '#3F4A5A', border: 'rgba(72,84,100,0.22)' },
      red:    { bg: 'rgba(220,38,38,0.12)',  fg: '#B91C1C', border: 'rgba(220,38,38,0.24)' },
      blue:   { bg: 'rgba(37,99,235,0.12)',  fg: '#1D4ED8', border: 'rgba(37,99,235,0.24)' },
      purple: { bg: 'rgba(124,58,237,0.12)', fg: '#6D28D9', border: 'rgba(124,58,237,0.24)' },
    },
  },
};

// Default snapshot used by non-hooked code (legacy `colors` import).
export const tokens = {
  mode: 'dark',
  colors: palettes.dark,
  spacing,
  radius,
  type,
  elevation,
};
