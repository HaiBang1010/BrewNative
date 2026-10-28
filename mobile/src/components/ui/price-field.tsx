import type { TextInputProps } from 'react-native';
import { TextField, type TextFieldProps } from './text-field';

/**
 * Props for a TextInput holding a VND amount: digits only, shown with thousands
 * separators ("45.000"). `value` is null while the input is empty.
 */
export function vndInputProps(
  value: number | null,
  onChange: (value: number | null) => void,
): Pick<TextInputProps, 'value' | 'onChangeText' | 'keyboardType' | 'placeholder'> {
  return {
    keyboardType: 'number-pad',
    placeholder: '0',
    value: value === null ? '' : value.toLocaleString('vi-VN'),
    onChangeText: (text) => {
      const digits = text.replace(/\D/g, '').slice(0, 9);
      onChange(digits ? Number(digits) : null);
    },
  };
}

type PriceFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'onChangeText' | 'keyboardType'> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

/** A labelled VND field. */
export function PriceField({ value, onChange, ...props }: PriceFieldProps) {
  return <TextField {...vndInputProps(value, onChange)} {...props} />;
}
