import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: '#7C4A2D',
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: '#fafaf9' },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Tạo tài khoản' }} />
    </Stack>
  );
}
