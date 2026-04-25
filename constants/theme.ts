/**
 * Design system tokens for the "Fluid Chronometer" design.
 * Single source of truth for colors, typography, spacing, and radii.
 */

// ---------------------------------------------------------------------------
// Colors — Material 3 tonal palette from the design spec
// ---------------------------------------------------------------------------
export const COLORS = {
  // Surfaces (light → dark layering)
  surface: '#f8f5ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1efff',
  surfaceContainer: '#e7e6ff',
  surfaceContainerHigh: '#e0e0ff',
  surfaceContainerHighest: '#d9daff',
  surfaceDim: '#cfd1ff',

  // On-surface text
  onSurface: '#282b51',
  onSurfaceVariant: '#555881',
  onBackground: '#282b51',

  // Primary
  primary: '#0050d4',
  primaryContainer: '#7b9cff',
  primaryDim: '#0046bb',
  primaryFixed: '#7b9cff',
  primaryFixedDim: '#658eff',
  onPrimary: '#f1f2ff',
  onPrimaryContainer: '#001e5a',
  onPrimaryFixed: '#000000',
  onPrimaryFixedVariant: '#00266e',
  inversePrimary: '#618bff',

  // Secondary (green accents)
  secondary: '#006948',
  secondaryContainer: '#7ff3be',
  secondaryDim: '#005b3e',
  secondaryFixed: '#7ff3be',
  secondaryFixedDim: '#71e4b1',
  onSecondary: '#c8ffe1',
  onSecondaryContainer: '#005a3d',
  onSecondaryFixed: '#00452e',
  onSecondaryFixedVariant: '#006545',

  // Tertiary (orange accents)
  tertiary: '#8c4a00',
  tertiaryContainer: '#ff9735',
  tertiaryDim: '#7b4000',
  tertiaryFixed: '#ff9735',
  tertiaryFixedDim: '#f08921',
  onTertiary: '#fff0e7',
  onTertiaryContainer: '#4d2600',
  onTertiaryFixed: '#291200',
  onTertiaryFixedVariant: '#5a2e00',

  // Error
  error: '#b31b25',
  errorContainer: '#fb5151',
  errorDim: '#9f0519',
  onError: '#ffefee',
  onErrorContainer: '#570008',

  // Outline
  outline: '#71749e',
  outlineVariant: '#a7aad7',

  // Inverse
  inverseSurface: '#06092f',
  inverseOnSurface: '#9799c6',

  // Gradient endpoints
  gradientStart: '#0050d4',
  gradientEnd: '#7b9cff',

  // Glass card
  glassBackground: 'rgba(217, 218, 255, 0.7)',
  glassInnerGlow: 'rgba(123, 156, 255, 0.2)',
} as const;

// ---------------------------------------------------------------------------
// Font family names (must match the keys used in useFonts)
// ---------------------------------------------------------------------------
export const FONTS = {
  // Manrope — headlines, display, titles
  manropeRegular: 'Manrope_400Regular',
  manropeMedium: 'Manrope_500Medium',
  manropeSemiBold: 'Manrope_600SemiBold',
  manropeBold: 'Manrope_700Bold',
  manropeExtraBold: 'Manrope_800ExtraBold',

  // Plus Jakarta Sans — labels, body, metadata
  jakartaRegular: 'PlusJakartaSans_400Regular',
  jakartaMedium: 'PlusJakartaSans_500Medium',
  jakartaSemiBold: 'PlusJakartaSans_600SemiBold',
  jakartaBold: 'PlusJakartaSans_700Bold',
} as const;

// ---------------------------------------------------------------------------
// Typography presets (use with StyleSheet spread)
// ---------------------------------------------------------------------------
export const TYPOGRAPHY = {
  /** Large timer display — 56px Manrope ExtraBold, tabular nums */
  timerDisplay: {
    fontFamily: FONTS.manropeExtraBold,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  /** Page/section title — 28px Manrope ExtraBold */
  headingXl: {
    fontFamily: FONTS.manropeExtraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  /** Section heading — 20px Manrope Bold */
  heading: {
    fontFamily: FONTS.manropeBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  /** Card title — 16px Manrope Bold */
  titleMd: {
    fontFamily: FONTS.manropeBold,
    fontSize: 16,
    lineHeight: 22,
  },
  /** Uppercase section label — 10px Jakarta Bold */
  labelUppercase: {
    fontFamily: FONTS.jakartaBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  /** Small label — 12px Jakarta SemiBold uppercase */
  labelSm: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  /** Body text — 14px Jakarta Medium */
  body: {
    fontFamily: FONTS.jakartaMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Small body — 12px Jakarta Regular */
  bodySmall: {
    fontFamily: FONTS.jakartaRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  /** Button text — 16px Manrope ExtraBold */
  button: {
    fontFamily: FONTS.manropeExtraBold,
    fontSize: 16,
    lineHeight: 22,
  },
} as const;

// ---------------------------------------------------------------------------
// Category / activity palette — picker swatches for category and activity
// override editors. Mirrors the preset category colors so user-picked
// activities stay visually consistent with the seeded set.
// ---------------------------------------------------------------------------
export const CATEGORY_PALETTE: readonly string[] = [
  '#4A90D9', // work blue
  '#3498DB', // travel blue
  '#5C6BC0', // indigo
  '#2ECC71', // learning green
  '#27AE60', // deep green
  '#1ABC9C', // personal care teal
  '#16A085', // deep teal
  '#F39C12', // meals orange
  '#D35400', // burnt orange
  '#D4AC0D', // mustard
  '#E74C3C', // health red
  '#E91E63', // social pink
  '#9B59B6', // entertainment purple
  '#8E44AD', // sleep purple
  '#34495E', // midnight slate
  '#95A5A6', // chores gray
];

// ---------------------------------------------------------------------------
// Spacing scale (4-point grid)
// ---------------------------------------------------------------------------
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ---------------------------------------------------------------------------
// Border radii
// ---------------------------------------------------------------------------
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  '3xl': 40,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Shadow presets (ambient style per design system)
// ---------------------------------------------------------------------------
export const SHADOWS = {
  ambient: {
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 4,
  },
  gradientButton: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
