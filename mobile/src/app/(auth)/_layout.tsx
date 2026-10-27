import { Stack } from 'expo-router';
import { COLORS, FONTS } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: COLORS.ink,
        headerTitleStyle: { fontFamily: FONTS.semibold, fontSize: 16 },
        headerTitleAlign: 'center',
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: COLORS.surface },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Tạo tài khoản' }} />
    </Stack>
  );
}
