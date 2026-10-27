import { TextInput, View, type TextInputProps } from 'react-native';
import { COLORS } from '@/constants/theme';
import { Text } from './text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** `dark` for fields on a dark background (login screen). */
  tone?: 'light' | 'dark';
};

const TONE = {
  light: { label: 'text-ink', input: 'bg-white text-ink', border: 'border-line' },
  dark: { label: 'text-line', input: 'bg-night-raised text-white', border: 'border-night-raised' },
};

export function TextField({ label, error, tone = 'light', ...props }: TextFieldProps) {
  const t = TONE[tone];
  return (
    <View className="gap-2">
      <Text className={`text-sm font-semibold ${t.label}`}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.inkMuted}
        className={`h-[52px] rounded-xl border px-4 font-sora text-sm ${t.input} ${error ? 'border-red-500' : t.border}`}
        {...props}
      />
      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
