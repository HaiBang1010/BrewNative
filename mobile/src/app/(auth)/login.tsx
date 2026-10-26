import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          />
          {/* TEMPORARY: signs in without checking anything. */}
          <Button title="Đăng nhập" onPress={signIn} />
          <Button title="Tiếp tục với Google" variant="outline" disabled />
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
