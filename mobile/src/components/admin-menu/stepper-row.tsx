import { View } from 'react-native';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Text } from '@/components/ui/text';

type StepperRowProps = {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
};

/** A small whole number set with − / +, e.g. "Thứ tự hiển thị" or how many options to pick. */
export function StepperRow({ label, hint, value, onChange, min, max }: StepperRowProps) {
  return (
    <View className="flex-row items-center gap-4">
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold text-ink">{label}</Text>
        <Text className="text-xs text-ink-muted">{hint}</Text>
      </View>
      <QuantityStepper value={value} onChange={onChange} min={min} max={max} size="sm" />
    </View>
  );
}

/** Highest "Thứ tự hiển thị" the forms offer (the menu lists smaller numbers first). */
export const SORT_ORDER_MAX = 999;
