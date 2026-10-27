import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, Text, View } from 'react-native';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
};

/** − 2 + control. Going below `min` is left to the caller (e.g. 0 removes a cart line). */
export function QuantityStepper({ value, onChange, min = 1, max = 50, size = 'md' }: QuantityStepperProps) {
  const button = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  const icon = size === 'sm' ? 16 : 20;

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Giảm số lượng"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        className={`${button} items-center justify-center rounded-full border border-stone-300 bg-white active:bg-stone-100 ${value <= min ? 'opacity-40' : ''}`}
      >
        <Ionicons name="remove" size={icon} color="#44403c" />
      </Pressable>
      <Text className="min-w-6 text-center text-base font-semibold text-stone-900">{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tăng số lượng"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        className={`${button} items-center justify-center rounded-full bg-brand active:bg-brand-700 ${value >= max ? 'opacity-40' : ''}`}
      >
        <Ionicons name="add" size={icon} color="#fff" />
      </Pressable>
    </View>
  );
}
