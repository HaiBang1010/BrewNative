import { Switch, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { Text } from './text';

type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/** A label with an on/off switch on the right, e.g. "Còn hàng". */
export function SwitchRow({ label, description, value, onChange, disabled }: SwitchRowProps) {
  return (
    <View className="flex-row items-center gap-4">
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold text-ink">{label}</Text>
        {description ? <Text className="text-xs text-ink-muted">{description}</Text> : null}
      </View>
      <BrandSwitch value={value} onChange={onChange} disabled={disabled} accessibilityLabel={label} />
    </View>
  );
}

/** The platform switch in the brand color. */
export function BrandSwitch({
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ true: COLORS.brand, false: COLORS.line }}
      ios_backgroundColor={COLORS.line}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
