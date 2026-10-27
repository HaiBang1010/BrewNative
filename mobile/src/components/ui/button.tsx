import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { COLORS } from '@/constants/theme';
import { Text } from './text';

type Variant = 'primary' | 'outline';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand active:bg-brand-600',
  outline: 'border border-brand bg-white active:bg-brand-50',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  outline: 'text-brand',
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      // min-h (not h): a label too long for the width wraps to a second line
      // and the button grows, instead of the text overflowing off-center.
      className={`min-h-14 flex-row items-center justify-center rounded-2xl px-5 py-3 ${CONTAINER[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? COLORS.white : COLORS.brand} />
      ) : (
        // shrink lets the text wrap inside the row; text-center centers each line.
        <Text
          numberOfLines={2}
          className={`shrink text-center text-base font-semibold ${LABEL[variant]}`}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
