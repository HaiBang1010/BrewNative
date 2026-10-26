import { Text, TextInput, View, type TextInputProps } from 'react-native';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-stone-700">{label}</Text>
      <TextInput
        placeholderTextColor="#a8a29e"
        className={`h-12 rounded-xl border bg-white px-4 text-base text-stone-900 ${error ? 'border-red-500' : 'border-stone-300'}`}
        {...props}
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
