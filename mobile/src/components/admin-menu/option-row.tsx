import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { vndInputProps } from '@/components/ui/price-field';
import { BrandSwitch } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import type { OptionDraft } from '@/utils/admin-menu';

type OptionRowProps = {
  option: OptionDraft;
  /** Shown red when saving was refused because the name is empty. */
  showErrors: boolean;
  onChange: (changes: Partial<OptionDraft>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
};

const INPUT = 'h-11 rounded-xl border bg-white px-3 font-sora text-sm text-ink';

/** One choice of an option group: name, extra price, in stock, order, remove. */
export function OptionRow({ option, showErrors, onChange, onMoveUp, onMoveDown, onRemove }: OptionRowProps) {
  const nameMissing = showErrors && !option.name.trim();
  const label = option.name.trim() || 'lựa chọn mới';

  return (
    <View className="gap-3 rounded-xl border border-line-light bg-surface p-3">
      <View className="flex-row gap-2">
        <TextInput
          value={option.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Tên, ví dụ: Size L"
          placeholderTextColor={COLORS.inkMuted}
          maxLength={100}
          accessibilityLabel="Tên lựa chọn"
          className={`${INPUT} flex-1 ${nameMissing ? 'border-red-500' : 'border-line'}`}
        />
        <View className="w-32 flex-row items-center">
          <View pointerEvents="none" className="absolute inset-y-0 left-3 z-10 justify-center">
            <Text className="text-base text-ink-soft">+</Text>
          </View>
          <TextInput
            {...vndInputProps(option.priceDelta, (priceDelta) => onChange({ priceDelta }))}
            accessibilityLabel={`Giá cộng thêm của ${label}`}
            className={`${INPUT} flex-1 border-line pl-6 text-right`}
          />
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <BrandSwitch
          value={option.isAvailable}
          onChange={(isAvailable) => onChange({ isAvailable })}
          accessibilityLabel={`${label}: còn hàng`}
        />
        <Text className={`flex-1 text-xs ${option.isAvailable ? 'text-success' : 'text-ink-muted'}`}>
          {option.isAvailable ? 'Còn hàng' : 'Hết hàng'}
        </Text>
        <IconButton icon="chevron-up" label={`Đưa ${label} lên trên`} onPress={onMoveUp} />
        <IconButton icon="chevron-down" label={`Đưa ${label} xuống dưới`} onPress={onMoveDown} />
        <IconButton icon="trash-outline" label={`Xoá ${label}`} onPress={onRemove} danger />
      </View>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  /** Missing = disabled (e.g. moving the first row up). */
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={4}
      className={`h-9 w-9 items-center justify-center rounded-full bg-white active:bg-line-light ${onPress ? '' : 'opacity-30'}`}
    >
      <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.ink} />
    </Pressable>
  );
}
