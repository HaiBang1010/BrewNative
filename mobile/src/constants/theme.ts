/**
 * Design tokens for props that take a value, not a className: icon colors,
 * RefreshControl tintColor, navigator options... Same values as the colors in
 * tailwind.config.js (keep both in sync).
 */
export const COLORS = {
  brand: '#C67C4E',
  brandLight: '#F9F2ED',
  ink: '#242424',
  inkSoft: '#313131',
  inkMuted: '#A2A2A2',
  line: '#E3E3E3',
  surface: '#F9F9F9',
  white: '#FFFFFF',
  /** Placeholder behind an image while it loads. */
  imagePlaceholder: '#EDEDED',
} as const;

/** Sora, loaded in app/_layout.tsx. One family per weight. */
export const FONTS = {
  light: 'Sora-Light',
  regular: 'Sora-Regular',
  medium: 'Sora-Medium',
  semibold: 'Sora-SemiBold',
  bold: 'Sora-Bold',
} as const;
