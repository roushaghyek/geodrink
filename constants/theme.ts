/**
 * Design system colors based on the Next.js version (globals.css)
 * Using oklch color space converted to RGB for React Native compatibility.
 * Theme supports both light and dark modes.
 */

import { Platform } from 'react-native';

/**
 * Color palette - oklch values converted to RGB hex
 * Light mode colors (default)
 */
const lightColors = {
  background: '#FAFFE8',           // oklch(0.98 0.01 120)
  brand: '#1F4D7A',                // Weathr deep blue (app icon / PWA theme colour)
  brandForeground: '#FFFFFF',
  success: '#2E8B57',
  foreground: '#2D2D4D',           // oklch(0.18 0.02 270)
  card: '#FFFFFF',                 // oklch(1 0 0)
  cardForeground: '#2D2D4D',       // oklch(0.18 0.02 270)
  popover: '#FFFFFF',              // oklch(1 0 0)
  popoverForeground: '#2D2D4D',    // oklch(0.18 0.02 270)
  primary: '#4A90E2',              // oklch(0.48 0.18 260)
  primaryForeground: '#FAFFE8',    // oklch(0.98 0.01 120)
  secondary: '#C85A7A',            // oklch(0.65 0.22 330)
  secondaryForeground: '#FAFFE8',  // oklch(0.98 0.01 120)
  muted: '#F2F8F2',                // oklch(0.95 0.01 120)
  mutedForeground: '#7F8080',      // oklch(0.5 0.02 270)
  accent: '#5BA3C7',               // oklch(0.55 0.2 190)
  accentForeground: '#FAFFE8',     // oklch(0.98 0.01 120)
  destructive: '#EB6B4D',          // oklch(0.577 0.245 27.325)
  destructiveForeground: '#FAFFE8',// oklch(0.98 0.01 120)
  border: '#E0E0F0',               // oklch(0.88 0.01 270)
  input: '#E0E0F0',                // oklch(0.88 0.01 270)
  ring: '#4A90E2',                 // oklch(0.48 0.18 260)
  chart1: '#4A90E2',               // oklch(0.48 0.18 260)
  chart2: '#C85A7A',               // oklch(0.65 0.22 330)
  chart3: '#5BA3C7',               // oklch(0.55 0.2 190)
  chart4: '#B8D455',               // oklch(0.7 0.18 80)
  chart5: '#F08966',               // oklch(0.6 0.2 40)
  sidebarBackground: '#FAFFE8',    // oklch(0.98 0.01 120)
  sidebarForeground: '#2D2D4D',    // oklch(0.18 0.02 270)
  sidebarPrimary: '#4A90E2',       // oklch(0.48 0.18 260)
  sidebarPrimaryForeground: '#FAFFE8', // oklch(0.98 0.01 120)
  sidebarAccent: '#F2F8F2',        // oklch(0.95 0.01 120)
  sidebarAccentForeground: '#2D2D4D',  // oklch(0.18 0.02 270)
  sidebarBorder: '#E0E0F0',        // oklch(0.88 0.01 270)
  sidebarRing: '#4A90E2',          // oklch(0.48 0.18 260)
};

/**
 * Dark mode colors (oklch values converted to RGB)
 */
const darkColors = {
  background: '#252527',           // oklch(0.145 0 0)
  brand: '#2C6AA6',                // deep blue, lifted for contrast on dark backgrounds
  brandForeground: '#FFFFFF',
  success: '#6CCB8F',
  foreground: '#FCFCFD',           // oklch(0.985 0 0)
  card: '#363639',                 // oklch(0.2 0 0)
  cardForeground: '#FCFCFD',       // oklch(0.985 0 0)
  popover: '#252527',              // oklch(0.145 0 0)
  popoverForeground: '#FCFCFD',    // oklch(0.985 0 0)
  primary: '#8CB4F0',              // oklch(0.65 0.22 260)
  primaryForeground: '#252527',    // oklch(0.145 0 0)
  secondary: '#E09BA8',            // oklch(0.7 0.24 330)
  secondaryForeground: '#252527',  // oklch(0.145 0 0)
  muted: '#515154',                // oklch(0.25 0 0)
  mutedForeground: '#A6A6A7',      // oklch(0.65 0 0)
  accent: '#7FB3D5',               // oklch(0.6 0.22 190)
  accentForeground: '#252527',     // oklch(0.145 0 0)
  destructive: '#C97B64',          // oklch(0.396 0.141 25.723)
  destructiveForeground: '#FCFCFD',// oklch(0.985 0 0)
  border: '#515154',               // oklch(0.25 0 0)
  input: '#515154',                // oklch(0.25 0 0)
  ring: '#8CB4F0',                 // oklch(0.65 0.22 260)
  chart1: '#8CB4F0',               // oklch(0.65 0.22 260)
  chart2: '#E09BA8',               // oklch(0.7 0.24 330)
  chart3: '#7FB3D5',               // oklch(0.6 0.22 190)
  chart4: '#CAD966',               // oklch(0.75 0.2 80)
  chart5: '#E8A580',               // oklch(0.65 0.22 40)
  sidebarBackground: '#363639',    // oklch(0.2 0 0)
  sidebarForeground: '#FCFCFD',    // oklch(0.985 0 0)
  sidebarPrimary: '#8CB4F0',       // oklch(0.65 0.22 260)
  sidebarPrimaryForeground: '#252527', // oklch(0.145 0 0)
  sidebarAccent: '#515154',        // oklch(0.25 0 0)
  sidebarAccentForeground: '#FCFCFD',  // oklch(0.985 0 0)
  sidebarBorder: '#515154',        // oklch(0.25 0 0)
  sidebarRing: '#8CB4F0',          // oklch(0.65 0.22 260)
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
