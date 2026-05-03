export const COLORS = {
  bg: '#0A0A0F',
  bgElevated: '#0F0F17',
  surface: '#16161D',
  surfaceElevated: '#1C1C26',
  surfacePressed: '#22222B',

  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  borderGlow: 'rgba(127, 90, 240, 0.3)',

  primary: '#7F5AF0',
  primaryDark: '#6B46E0',
  primaryLight: '#9B7FF5',
  primaryGlow: 'rgba(127, 90, 240, 0.4)',

  accent: '#2CB67D',
  accentLight: '#4FCC95',
  accentGlow: 'rgba(44, 182, 125, 0.4)',

  income: '#2CB67D',
  incomeBg: 'rgba(44, 182, 125, 0.10)',
  incomeBorder: 'rgba(44, 182, 125, 0.25)',
  expense: '#EF4444',
  expenseBg: 'rgba(239, 68, 68, 0.10)',
  expenseBorder: 'rgba(239, 68, 68, 0.25)',

  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.10)',
  danger: '#EF4444',
  success: '#2CB67D',

  textPrimary: '#FFFFFE',
  textSecondary: '#A1A1AA',
  textMuted: '#6B7280',
  textOnPrimary: '#FFFFFE',

  shimmer: 'rgba(255, 255, 255, 0.04)',
  overlay: 'rgba(10, 10, 15, 0.7)',

  white: '#FFFFFE',
  black: '#000000',
  transparent: 'transparent',
};

export const GRADIENTS = {
  hero: ['#7F5AF0', '#6B46E0', '#2CB67D'],
  heroAngles: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  bgGlow: ['rgba(127, 90, 240, 0.18)', 'rgba(127, 90, 240, 0.04)', 'transparent'],
  income: ['rgba(44, 182, 125, 0.15)', 'rgba(44, 182, 125, 0.05)'],
  expense: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)'],
  buttonPrimary: ['#7F5AF0', '#6B46E0'],
  fab: ['#9B7FF5', '#7F5AF0'],
  glass: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'],
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: '#7F5AF0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  glowAccent: {
    shadowColor: '#2CB67D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const TEXT_STYLES = {
  displayLarge: { fontSize: 44, fontFamily: FONT.semibold, letterSpacing: -1.5, lineHeight: 50, color: COLORS.textPrimary },
  displayMedium: { fontSize: 36, fontFamily: FONT.semibold, letterSpacing: -1, lineHeight: 42, color: COLORS.textPrimary },

  amountLarge: { fontSize: 28, fontFamily: FONT.semibold, letterSpacing: -0.5, color: COLORS.textPrimary },
  amountMedium: { fontSize: 20, fontFamily: FONT.semibold, letterSpacing: -0.3, color: COLORS.textPrimary },
  amountSmall: { fontSize: 16, fontFamily: FONT.medium, color: COLORS.textPrimary },

  h1: { fontSize: 28, fontFamily: FONT.semibold, letterSpacing: -0.5, color: COLORS.textPrimary },
  h2: { fontSize: 22, fontFamily: FONT.semibold, letterSpacing: -0.3, color: COLORS.textPrimary },
  h3: { fontSize: 17, fontFamily: FONT.medium, color: COLORS.textPrimary },

  bodyLarge: { fontSize: 16, fontFamily: FONT.regular, lineHeight: 24, color: COLORS.textPrimary },
  body: { fontSize: 14, fontFamily: FONT.regular, lineHeight: 20, color: COLORS.textPrimary },
  bodySmall: { fontSize: 13, fontFamily: FONT.regular, lineHeight: 18, color: COLORS.textSecondary },

  label: { fontSize: 11, fontFamily: FONT.medium, letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary },
  caption: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.textMuted },
};

export default { COLORS, GRADIENTS, SHADOWS, SPACING, RADIUS, FONT, TEXT_STYLES };
