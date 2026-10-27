import { Pressable } from 'react-native';
import { Text } from './text';

type ChipProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
};

/**
 * A selectable box, used for options (size, sugar, topping) and for choosing a store.
 * Styled like the S / M / L size picker of the design.
 */
export function Chip({ label, selected, disabled, onPress, className = '' }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[41px] items-center justify-center rounded-xl border px-4 py-2 ${
        selected ? 'border-brand bg-brand-50' : 'border-line bg-white active:bg-surface'
      } ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      <Text className={`text-center text-sm ${selected ? 'text-brand' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
