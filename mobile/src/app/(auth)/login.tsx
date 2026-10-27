import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { isGoogleSignInAvailable } from '@/lib/google-sign-in';

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  // In development, prefill the demo account created by `npm run seed` in backend/.
  const [email, setEmail] = useState(__DEV__ ? 'customer@brew.local' : '');
  const [password, setPassword] = useState(__DEV__ ? 'Password@123' : '');
  const [pending, setPending] = useState<'password' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'password' | 'google', action: () => Promise<unknown>) {
    setError(null);
    setPending(kind);
    try {
      await action();
      // On success AuthProvider flips isSignedIn and the router leaves this screen.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(null);
    }
  }

  const canSubmit = email.trim() !== '' && password !== '';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-stone-50"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center gap-8 px-6"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-2">
          <Text className="text-4xl font-extrabold text-brand">Brew</Text>
          <Text className="text-base text-stone-500">Đặt cà phê, nhận ngay tại quán</Text>
        </View>

        <View className="gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="ban@vidu.com"
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
            autoComplete="password"
            onSubmitEditing={() => canSubmit && run('password', () => signIn(email.trim(), password))}
          />
          {error ? <Text className="text-center text-red-600">{error}</Text> : null}
          <Button
            title="Đăng nhập"
            loading={pending === 'password'}
            disabled={!canSubmit || pending !== null}
            onPress={() => run('password', () => signIn(email.trim(), password))}
          />
          <Button
            title={
              isGoogleSignInAvailable
                ? 'Tiếp tục với Google'
                : 'Google (cần development build)'
            }
            variant="outline"
            loading={pending === 'google'}
            disabled={!isGoogleSignInAvailable || pending !== null}
            onPress={() => run('google', signInWithGoogle)}
          />
        </View>

        <View className="flex-row justify-center gap-1">
          <Text className="text-stone-500">Chưa có tài khoản?</Text>
          <Link href="/register" asChild>
            <Text className="font-semibold text-brand">Đăng ký</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
