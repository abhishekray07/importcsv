/**
 * Color utility functions for theme customization
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));

  return rgbToHex(r, g, b);
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);

  return rgbToHex(r, g, b);
}

/**
 * Generate color palette from a base color
 */
export function generateColorPalette(baseColor: string) {
  return {
    50: lightenColor(baseColor, 95),
    100: lightenColor(baseColor, 90),
    200: lightenColor(baseColor, 80),
    300: lightenColor(baseColor, 60),
    400: lightenColor(baseColor, 40),
    500: baseColor,
    600: darkenColor(baseColor, 10),
    700: darkenColor(baseColor, 20),
    800: darkenColor(baseColor, 30),
    900: darkenColor(baseColor, 40),
  };
}

/**
 * Apply color palette to CSS variables
 */
export function applyColorPalette(primaryColor: string) {
  const palette = generateColorPalette(primaryColor);
  const root = document.documentElement;

  // Set primary color variations
  root.style.setProperty('--color-primary', primaryColor);
  root.style.setProperty('--color-primary-50', palette[50]);
  root.style.setProperty('--color-primary-100', palette[100]);
  root.style.setProperty('--color-primary-200', palette[200]);
  root.style.setProperty('--color-primary-300', palette[300]);
  root.style.setProperty('--color-primary-400', palette[400]);
  root.style.setProperty('--color-primary-500', palette[500]);
  root.style.setProperty('--color-primary-600', palette[600]);
  root.style.setProperty('--color-primary-700', palette[700]);
  root.style.setProperty('--color-primary-800', palette[800]);
  root.style.setProperty('--color-primary-900', palette[900]);
  
  // Set hover and focus states
  root.style.setProperty('--color-primary-hover', palette[700]);
  root.style.setProperty('--color-primary-focus', palette[600]);
  root.style.setProperty('--color-primary-disabled', palette[200]);
}