import { useColorScheme } from 'react-native';

export type ColorSchemeName = 'light' | 'dark';

export interface Palette {
  scheme: ColorSchemeName;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  border: string;
}

export const PALETTES: Record<ColorSchemeName, Palette> = {
  light: {
    scheme: 'light',
    background: '#FAFAF7',
    surface: '#FFFFFF',
    textPrimary: '#18181B',
    textSecondary: '#52525B',
    accent: '#4F46E5',
    border: '#E4E4E7',
  },
  dark: {
    scheme: 'dark',
    background: '#0E0F13',
    surface: '#1A1B21',
    textPrimary: '#ECEDF1',
    textSecondary: '#A1A1AA',
    accent: '#818CF8',
    border: '#2E2F36',
  },
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24 } as const;

// Follows the system appearance; RN re-renders when the user switches it.
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? PALETTES.dark : PALETTES.light;
}
