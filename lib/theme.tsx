// @ts-nocheck
/**
 * ============================================================
 *  VERRSA GLOBAL DESIGN SYSTEM  —  src/lib/theme.ts
 * ============================================================
 */

// ─────────────────────────────────────────────
//  PALETTE
// ─────────────────────────────────────────────
export const palette = {
  cyan400:  '#00bfff',
  cyan500:  '#00a8e0',
  cyan600:  '#0090c0',
  green400: '#00a419',
  green500: '#008f15',
  red400:   '#FF3B30',
  red500:   '#E91E63',
  amber400: '#FFCC00',
  amber500: '#FF9500',
  white:    '#ffffff',
  grey50:   '#f9f9f9',
  grey100:  '#f3f3f3',
  grey150:  '#ededed',
  grey200:  '#e0e0e0',
  grey300:  '#cccccc',
  grey400:  '#aaaaaa',
  grey500:  '#888888',
  grey600:  '#666666',
  grey700:  '#444444',
  grey800:  '#222222',
  black:    '#000000',
  dark50:   '#2a2a2a',
  dark100:  '#1e1e1e',
  dark200:  '#181818',
  dark300:  '#141414',
  dark400:  '#121212',
  dark500:  '#0d0d0d',
  transparent:     'transparent',
  scrim:           'rgba(0,0,0,0.5)',
  scrimLight:      'rgba(0,0,0,0.3)',
  scrimDark:       'rgba(0,0,0,0.7)',
  rippleLight:     'rgba(0,0,0,0.08)',
  rippleDark:      'rgba(255,255,255,0.08)',
} as const;

// ─────────────────────────────────────────────
//  SEMANTIC COLOUR TOKENS
// ─────────────────────────────────────────────
export interface ColorTokens {
  background:       string;
  backgroundAlt:    string;
  surface:          string;
  surfaceRaised:    string;
  surfaceOverlay:   string;
  border:           string;
  borderStrong:     string;
  textPrimary:      string;
  textSecondary:    string;
  textTertiary:     string;
  textDisabled:     string;
  textInverse:      string;
  textLink:         string;
  accent:           string;
  accentPressed:    string;
  accentSurface:    string;
  success:          string;
  successSurface:   string;
  error:            string;
  errorSurface:     string;
  warning:          string;
  warningSurface:   string;
  icon:             string;
  iconSecondary:    string;
  iconMuted:        string;
  tabBarBackground: string;
  tabBarActive:     string;
  tabBarInactive:   string;
  inputBackground:      string;
  inputPlaceholder:     string;
  inputBorder:          string;
  inputBorderFocused:   string;
  scrim:            string;
}

// Legacy Theme interface (backward compat)
export interface Theme {
  background:       string;
  cardBackground:   string;
  searchBackground: string;
  text:             string;
  secondaryText:    string;
  accent:           string;
  border:           string;
  tabBarBackground: string;
  tabBarInactive:   string;
  icon:             string;
  iconSecondary:    string;
}

export const lightColors: ColorTokens = {
  background:         palette.white,
  backgroundAlt:      palette.grey50,
  surface:            palette.grey100,
  surfaceRaised:      palette.white,
  surfaceOverlay:     palette.white,
  border:             palette.grey200,
  borderStrong:       palette.grey300,
  textPrimary:        palette.black,
  textSecondary:      palette.grey700,
  textTertiary:       palette.grey500,
  textDisabled:       palette.grey400,
  textInverse:        palette.white,
  textLink:           palette.cyan400,
  accent:             palette.cyan400,
  accentPressed:      palette.cyan600,
  accentSurface:      'rgba(0,191,255,0.10)',
  success:            palette.green400,
  successSurface:     'rgba(0,164,25,0.10)',
  error:              palette.red400,
  errorSurface:       'rgba(255,59,48,0.10)',
  warning:            palette.amber500,
  warningSurface:     'rgba(255,149,0,0.10)',
  icon:               palette.black,
  iconSecondary:      palette.grey600,
  iconMuted:          palette.grey400,
  tabBarBackground:   palette.white,
  tabBarActive:       palette.cyan400,
  tabBarInactive:     '#8e8e93',
  inputBackground:    palette.grey50,
  inputPlaceholder:   palette.grey400,
  inputBorder:        palette.grey200,
  inputBorderFocused: palette.cyan400,
  scrim:              palette.scrim,
};

export const darkColors: ColorTokens = {
  background:         palette.dark400,
  backgroundAlt:      palette.dark500,
  surface:            palette.dark100,
  surfaceRaised:      palette.dark200,
  surfaceOverlay:     palette.dark300,
  border:             '#333333',
  borderStrong:       '#444444',
  textPrimary:        palette.white,
  textSecondary:      '#a0a0a0',
  textTertiary:       '#666666',
  textDisabled:       '#4a4a4a',
  textInverse:        palette.black,
  textLink:           palette.cyan400,
  accent:             palette.cyan400,
  accentPressed:      palette.cyan500,
  accentSurface:      'rgba(0,191,255,0.12)',
  success:            '#34c759',
  successSurface:     'rgba(52,199,89,0.12)',
  error:              '#ff453a',
  errorSurface:       'rgba(255,69,58,0.12)',
  warning:            '#ffd60a',
  warningSurface:     'rgba(255,214,10,0.12)',
  icon:               palette.white,
  iconSecondary:      '#a0a0a0',
  iconMuted:          '#555555',
  tabBarBackground:   palette.dark100,
  tabBarActive:       palette.cyan400,
  tabBarInactive:     '#8e8e93',
  inputBackground:    palette.dark50,
  inputPlaceholder:   '#555555',
  inputBorder:        '#333333',
  inputBorderFocused: palette.cyan400,
  scrim:              palette.scrim,
};

// ─────────────────────────────────────────────
//  SPACING SCALE
// ─────────────────────────────────────────────
export const spacing = {
  px:    2,
  xs:    4,
  sm:    8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xl2:  32,
  xl3:  40,
  xl4:  48,
  xl5:  64,
} as const;

// ─────────────────────────────────────────────
//  TYPOGRAPHY SCALE
// ─────────────────────────────────────────────
export const fontFamily = {
  regular:  "'Instrument Sans', sans-serif",
  poppins:  "'Poppins', sans-serif",
} as const;

export const fontSize = {
  xs:   10,
  sm:   12,
  sm2:  13,
  md:   14,
  md2:  15,
  base: 16,
  lg:   18,
  xl:   20,
  xl2:  22,
  xl3:  24,
  xl4:  28,
  xl5:  32,
  xl6:  36,
} as const;

export const fontWeight = {
  light:     '300',
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
} as const;

export const lineHeight = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
} as const;

// ─────────────────────────────────────────────
//  BORDER RADIUS
// ─────────────────────────────────────────────
export const radius = {
  none:   0,
  xs:     4,
  sm:     6,
  md:     8,
  lg:    12,
  xl:    16,
  xl2:   20,
  xl3:   24,
  full: 9999,
} as const;

// ─────────────────────────────────────────────
//  SHADOWS (CSS box-shadow strings)
// ─────────────────────────────────────────────
export const shadows = {
  none: 'none',
  xs:   '0 1px 2px rgba(0,0,0,0.06)',
  sm:   '0 1px 4px rgba(0,0,0,0.08)',
  md:   '0 2px 8px rgba(0,0,0,0.10)',
  lg:   '0 4px 16px rgba(0,0,0,0.12)',
  xl:   '0 8px 32px rgba(0,0,0,0.16)',
} as const;

// ─────────────────────────────────────────────
//  Z-INDEX
// ─────────────────────────────────────────────
export const zIndex = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   200,
  toast:   300,
  tooltip: 400,
} as const;
