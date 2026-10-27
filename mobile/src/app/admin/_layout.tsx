import { Stack } from 'expo-router';
import { COLORS, FONTS } from '@/constants/theme';

/**
 * Shop screens for staff and admins (/admin/...). Only reachable while signed in
 * with a staff or admin account; see the guards in app/_layout.tsx.
 */
export default function AdminLayout() {
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
      <Stack.Screen name="orders/[id]" options={{ title: 'Đơn hàng' }} />
      <Stack.Screen name="chats/[id]" options={{ title: 'Khách hàng' }} />
    </Stack>
  );
}
