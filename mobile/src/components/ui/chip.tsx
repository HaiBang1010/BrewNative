import { Pressable, Text } from 'react-native';

type ChipProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** A selectable pill, used for options (size, sugar, topping) and for choosing a store. */
export function Chip({ label, selected, disabled, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-brand bg-brand' : 'border-stone-300 bg-white active:bg-stone-100'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className={selected ? 'font-semibold text-white' : 'text-stone-800'}>{label}</Text>
    </Pressable>
  );
}
