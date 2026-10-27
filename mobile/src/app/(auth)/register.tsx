import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same rules as the backend, checked here first so the user gets instant feedback.
  const passwordError =
    password !== '' && password.length < 8 ? 'Mật khẩu cần ít nhất 8 ký tự' : undefined;
  const canSubmit =
    fullName.trim() !== '' && email.trim() !== '' && password.length >= 8 && !pending;

  async function submit() {
    setError(null);
    setPending(true);
    try {
      await register(fullName.trim(), email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        // iOS 26+: the native header floats over the content. "automatic" makes
        // iOS inset the content below the header (React Native defaults to "never").
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Họ tên"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          placeholder="Ít nhất 8 ký tự"
          secureTextEntry
          autoComplete="new-password"
          error={passwordError}
        />
        {error ? <Text className="text-center text-red-600">{error}</Text> : null}
        <Button
          title="Tạo tài khoản"
          onPress={submit}
          loading={pending}
          disabled={!canSubmit}
          className="mt-2"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
