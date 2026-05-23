import { Platform } from 'react-native';

export const lightPalette = {
  bg: '#EEF4F1',
  surface: 'rgba(255,255,255,0.88)',
  surfaceMuted: '#F4F7F5',
  surfaceTint: '#ECF6F0',
  ink: '#111315',
  inkSoft: '#66707A',
  line: '#DCE5E0',
  accent: '#34C759',
  accentMuted: '#DFF7EA',
  accentDark: '#1E9E56',
  skyMuted: '#E6F0FF',
  lilacMuted: '#F0ECFF',
  black: '#111318',
  white: '#FFFFFF',
  success: '#1EAF61',
  warning: '#F2A93B',
  danger: '#E95F5F',
};

export const darkPalette = {
  bg: '#121416',
  surface: '#1B1F24',
  surfaceMuted: '#20242C',
  surfaceTint: '#172019',
  ink: '#F0F2F4',
  inkSoft: '#78828F',
  line: 'rgba(255,255,255,0.06)',
  accent: '#2DBE6C',
  accentMuted: 'rgba(45,190,108,0.10)',
  accentDark: '#4ADE80',
  skyMuted: 'rgba(59,130,246,0.05)',
  lilacMuted: 'rgba(139,92,246,0.05)',
  black: '#F0F2F4',
  white: '#121416',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
};

// backward-compat alias
export const palette = lightPalette;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const typography = {
  display: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const shadows = {
  card: {
    shadowColor: '#0E1216',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#0E1216',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
};
