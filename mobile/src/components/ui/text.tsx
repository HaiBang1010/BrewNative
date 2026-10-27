import { Text as RNText, type TextProps } from 'react-native';

/**
 * Sora is loaded as one font family per weight (Sora-SemiBold...), so
 * `font-semibold` alone would ask iOS/Android for a bold version of the regular
 * family and fall back to the system font. This maps the weight class to the
 * matching family instead.
 */
const FAMILY_FOR_WEIGHT: Record<string, string> = {
  'font-light': 'font-sora-light',
  'font-normal': 'font-sora',
  'font-medium': 'font-sora-medium',
  'font-semibold': 'font-sora-semibold',
  'font-bold': 'font-sora-bold',
  'font-extrabold': 'font-sora-bold',
};

/**
 * Drop-in replacement for React Native's Text that renders in the app font.
 * Use it everywhere instead of importing Text from 'react-native'.
 */
export function Text({ className = '', ...props }: TextProps & { className?: string }) {
  let family = 'font-sora';
  const rest = className
    .split(/\s+/)
    .filter((name) => {
      const mapped = FAMILY_FOR_WEIGHT[name];
      if (mapped) family = mapped;
      return !mapped;
    })
    .join(' ');

  return <RNText className={`${family} ${rest}`} {...props} />;
}
