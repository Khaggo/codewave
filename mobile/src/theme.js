// ─────────────────────────────────────────────────────────────────────────────
//  Mobile theme — aligned with the web frontend.
//  Color tokens mirror /frontend/src/app/globals.css `[data-theme="dark"]`.
//  All historical keys are preserved so existing screens render the new palette
//  without any per-file edits, then new screens consume the structured
//  `tokens` exported from /src/theme/index.js.
// ─────────────────────────────────────────────────────────────────────────────

// Brand
const BRAND_ORANGE = '#F07C00';            // rgb(240,124,0)
const BRAND_ORANGE_DARK = '#C26000';       // rgb(194, 96, 0)
const BRAND_GOLD = '#C9951A';              // rgb(201,149,26)
const BRAND_ORANGE_SOFT = 'rgba(240, 124, 0, 0.14)';
const BRAND_ORANGE_GLOW = 'rgba(240, 124, 0, 0.28)';
const BRAND_GOLD_SOFT = 'rgba(201, 149, 26, 0.16)';

// Surfaces (neutral near-black scale, matches web)
const SURFACE_BG = '#09090B';              // rgb(9,9,11)   — page background
const SURFACE_CARD = '#111113';            // rgb(17,17,19) — card surface
const SURFACE_RAISED = '#18181B';          // rgb(24,24,27) — raised surface
const SURFACE_INPUT = '#141416';           // rgb(20,20,22) — input bg
const SURFACE_HOVER = '#1C1C1F';           // rgb(28,28,31) — hover state
const SURFACE_BORDER = '#27272A';          // rgb(39,39,42)
const SURFACE_BORDER_SOFT = '#1F1F22';     // softer divider

// Ink (text)
const INK_PRIMARY = '#F4F4F5';             // rgb(244,244,245)
const INK_SECONDARY = '#A1A1AA';           // rgb(161,161,170)
const INK_MUTED = '#71717A';               // rgb(113,113,122)
const INK_DIM = '#3F3F46';                 // rgb(63,63,70)

// Semantic
const SUCCESS = '#10B981';                 // emerald-500
const SUCCESS_SOFT = 'rgba(16, 185, 129, 0.16)';
const DANGER = '#EF4444';                  // red-500
const DANGER_SOFT = 'rgba(239, 68, 68, 0.16)';
const WARNING = '#EAB308';                 // yellow-500
const WARNING_SOFT = 'rgba(234, 179, 8, 0.16)';
const INFO = '#3B82F6';                    // blue-500
const INFO_SOFT = 'rgba(59, 130, 246, 0.16)';

export const colors = {
  // Surfaces
  background: SURFACE_BG,
  surface: SURFACE_CARD,
  surfaceStrong: SURFACE_RAISED,
  surfaceMuted: SURFACE_HOVER,
  surfaceRaised: SURFACE_RAISED,
  cardBackground: SURFACE_CARD,

  // Brand
  primary: BRAND_ORANGE,
  primaryDark: BRAND_ORANGE_DARK,
  primarySoft: BRAND_ORANGE_SOFT,
  primaryGlow: BRAND_ORANGE_GLOW,
  accent: BRAND_GOLD,
  accentSoft: BRAND_GOLD_SOFT,

  // Text
  text: INK_PRIMARY,
  mutedText: INK_SECONDARY,
  labelText: INK_MUTED,
  dim: INK_DIM,

  // Lines & inputs
  border: SURFACE_BORDER,
  borderSoft: SURFACE_BORDER_SOFT,
  input: SURFACE_INPUT,
  readonly: SURFACE_RAISED,

  // Semantic
  success: SUCCESS,
  successSoft: SUCCESS_SOFT,
  danger: DANGER,
  dangerSoft: DANGER_SOFT,
  warning: WARNING,
  warningSoft: WARNING_SOFT,
  info: INFO,
  infoSoft: INFO_SOFT,

  // Misc
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.72)',
  onPrimary: '#FFFFFF',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  // Legacy aliases — mapped to the new scale
  medium: 12,
  large: 16,
};

// Re-export the new structured tokens so screens can migrate to a single source.
export { tokens, useTheme, ThemeProvider } from './theme/index';
