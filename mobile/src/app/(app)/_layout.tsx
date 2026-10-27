import { Stack } from 'expo-router';
import { COLORS, FONTS } from '@/constants/theme';

/** Screens available after signing in. The tab bar is one screen of this stack. */
export default function AppLayout() {
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]" options={{ title: 'Chi tiết' }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Theo dõi đơn' }} />
      <Stack.Screen name="cart" options={{ title: 'Giỏ hàng' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat với quán' }} />
    </Stack>
  );
}
