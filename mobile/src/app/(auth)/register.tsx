import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        />
        {/* TEMPORARY: creates nothing yet, just signs in. */}
        <Button title="Tạo tài khoản" onPress={signIn} className="mt-2" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
