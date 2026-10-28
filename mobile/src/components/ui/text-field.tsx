import { TextInput, View, type TextInputProps } from 'react-native';
import { COLORS } from '@/constants/theme';
import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** Small grey text under the field, hidden while there is an error. */
  hint?: string;
  /** `dark` for fields on a dark background (login screen). */
  tone?: 'light' | 'dark';
};

const TONE = {
  light: { label: 'text-ink', input: 'bg-white text-ink', border: 'border-line' },
  dark: { label: 'text-line', input: 'bg-night-raised text-white', border: 'border-night-raised' },
};

export function TextField({ label, error, hint, tone = 'light', multiline, ...props }: TextFieldProps) {
  const t = TONE[tone];
  // A multiline field grows with its text instead of keeping one line's height.
  const size = multiline ? 'min-h-[104px] py-3' : 'h-[52px]';
  return (
    <View className="gap-2">
      <Text className={`text-sm font-semibold ${t.label}`}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.inkMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`${size} rounded-xl border px-4 font-sora text-sm ${t.input} ${error ? 'border-red-500' : t.border}`}
        {...props}
      />
      {error ? (
        <Text className="text-sm text-red-500">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-ink-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
