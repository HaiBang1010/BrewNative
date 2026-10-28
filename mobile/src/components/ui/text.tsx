import { Text as RNText, type TextProps } from 'react-native';

/**
 * The app font is loaded as one font family per weight (BeVietnamPro-SemiBold...), so
 * `font-semibold` alone would ask iOS/Android for a bold version of the regular
 * family and fall back to the system font. This maps the weight class to the
 * matching family instead.
 */
const FAMILY_FOR_WEIGHT: Record<string, string> = {
  'font-light': 'font-app-light',
  'font-normal': 'font-app',
  'font-medium': 'font-app-medium',
  'font-semibold': 'font-app-semibold',
  'font-bold': 'font-app-bold',
  'font-extrabold': 'font-app-bold',
};

/**
 * Drop-in replacement for React Native's Text that renders in the app font.
 * Use it everywhere instead of importing Text from 'react-native'.
 */
export function Text({ className = '', ...props }: TextProps & { className?: string }) {
  const names = className.split(/\s+/);
  // The last weight class wins, as in CSS.
  const weight = names.findLast((name) => name in FAMILY_FOR_WEIGHT);
  const family = weight ? FAMILY_FOR_WEIGHT[weight] : 'font-app';
  const rest = names.filter((name) => !(name in FAMILY_FOR_WEIGHT)).join(' ');

  return <RNText className={`${family} ${rest}`} {...props} />;
}
