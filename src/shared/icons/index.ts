/**
 * Shared Icons - Polly Graph UI Icons
 * Consolidated icons used across V1, V2, and demo
 */

// Import SVG files as raw strings for use in HTML/DOM
import fitIcon from './fit.svg?raw';
import resetIcon from './reset.svg?raw';
import plusIcon from './plus.svg?raw';
import minusIcon from './minus.svg?raw';
import caretIcon from './caret.svg?raw';

// Export icon content as strings
export const icons = {
  fit: fitIcon,
  reset: resetIcon,
  plus: plusIcon,
  minus: minusIcon,
  caret: caretIcon
} as const;

// Icon SVG content as strings for inline use
export const iconSvg = {
  fit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 9V5H9" />
    <path d="M19 9V5H15" />
    <path d="M5 15V19H9" />
    <path d="M19 15V19H15" />
  </svg>`,

  reset: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    <path d="M20 4.5v4h-4" />
  </svg>`,

  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 12h14m-7-7v14" />
  </svg>`,

  minus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 12h14" />
  </svg>`,

  caret: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>`
} as const;

// Type definitions
export type IconName = keyof typeof icons;
export type IconSvgName = keyof typeof iconSvg;

// Helper function to get icon by name
export function getIcon(name: IconName): string {
  return icons[name];
}

// Helper function to get icon SVG by name
export function getIconSvg(name: IconSvgName): string {
  return iconSvg[name];
}

// Default export for convenience
export default icons;