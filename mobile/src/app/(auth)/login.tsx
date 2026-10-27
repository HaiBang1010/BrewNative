import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth-provider';
import { errorMessage } from '@/utils/errors';
import { isGoogleSignInAvailable } from '@/services/google-sign-in';
import { useLightStatusBar } from '@/hooks/status-bar';

const HERO = require('../../../assets/images/figma/onboarding.jpg');

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useLightStatusBar();
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
    <>
      {/* Scrolls the focused field above the keyboard; no per-platform setup needed. */}
      <KeyboardAwareScrollView
        bottomOffset={24}
        className="flex-1 bg-night-black"
        contentContainerClassName="flex-grow justify-end gap-6 px-6"
        contentContainerStyle={{ paddingTop: height * 0.34, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo fading into black behind the text, as on the design's onboarding screen. */}
        <View className="absolute inset-x-0 top-0" style={{ height: height * 0.62 }}>
          <Image source={HERO} style={{ flex: 1 }} contentFit="cover" />
          <View
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ backgroundImage: "linear-gradient(180deg, rgba(5,5,5,0) 0%, #050505 85%)" }}
          />
        </View>

        <View className="items-center gap-2">
          <Text className="text-center text-[32px] font-semibold leading-[44px] text-white">
            Brew
          </Text>
          <Text className="text-center text-sm leading-[21px] tracking-wide text-ink-muted">
            Chọn món, thanh toán trong app, nhận ngay tại quán.
          </Text>
        </View>

        <View className="gap-4">
          <TextField
            tone="dark"
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="ban@vidu.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <TextField
            tone="dark"
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            placeholder="Ít nhất 8 ký tự"
            secureTextEntry
            autoComplete="password"
            onSubmitEditing={() =>
              canSubmit && run('password', () => signIn(email.trim(), password))
            }
          />
          {error ? <Text className="text-center text-red-400">{error}</Text> : null}
          <Button
            title="Đăng nhập"
            loading={pending === 'password'}
            disabled={!canSubmit || pending !== null}
            onPress={() => run('password', () => signIn(email.trim(), password))}
          />
          <Button
            title={
              isGoogleSignInAvailable ? 'Tiếp tục với Google' : 'Google (cần development build)'
            }
            variant="outline"
            loading={pending === 'google'}
            disabled={!isGoogleSignInAvailable || pending !== null}
            onPress={() => run('google', signInWithGoogle)}
          />
        </View>

        <View className="flex-row justify-center gap-1">
          <Text className="text-ink-muted">Chưa có tài khoản?</Text>
          <Link href="/register" asChild>
            <Text className="font-semibold text-brand">Đăng ký</Text>
          </Link>
        </View>
      </KeyboardAwareScrollView>
      {/* ‹ › to move between fields and a Done button, above the keyboard. */}
      <KeyboardToolbar />
    </>
  );
}
