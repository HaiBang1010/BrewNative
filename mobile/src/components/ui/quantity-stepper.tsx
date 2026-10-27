import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { Text } from './text';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
};

/** − 2 + control. Going below `min` is left to the caller (e.g. 0 removes a cart line). */
export function QuantityStepper({ value, onChange, min = 1, max = 50, size = 'md' }: QuantityStepperProps) {
  const button = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  const icon = size === 'sm' ? 16 : 20;
  const gap = size === 'sm' ? 'gap-4' : 'gap-5';

  return (
    <View className={`flex-row items-center ${gap}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Giảm số lượng"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        hitSlop={6}
        className={`${button} items-center justify-center rounded-full border border-brand-50 bg-white active:bg-brand-50 ${value <= min ? 'opacity-40' : ''}`}
      >
        <Ionicons name="remove" size={icon} color={COLORS.inkMuted} />
      </Pressable>
      <Text className="min-w-4 text-center text-sm font-semibold text-ink">{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tăng số lượng"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        hitSlop={6}
        className={`${button} items-center justify-center rounded-full border border-brand-50 bg-white active:bg-brand-50 ${value >= max ? 'opacity-40' : ''}`}
      >
        <Ionicons name="add" size={icon} color={COLORS.ink} />
      </Pressable>
    </View>
  );
}
