import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'outline';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand active:bg-brand-700',
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
      className={`h-12 flex-row items-center justify-center rounded-xl px-5 ${CONTAINER[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#7C4A2D'} />
      ) : (
        <Text className={`text-base font-semibold ${LABEL[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
