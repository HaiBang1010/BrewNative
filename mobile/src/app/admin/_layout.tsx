import { Stack } from 'expo-router';
import { COLORS, FONTS } from '@/constants/theme';
import { useAuth } from '@/lib/auth-provider';

/**
 * Shop screens for staff and admins (/admin/...). Only reachable while signed in
 * with a staff or admin account; see the guards in app/_layout.tsx.
 */
export default function AdminLayout() {
  const { role } = useAuth();
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
      {/* Menu management: admins only, like the Menu tab. */}
      <Stack.Protected guard={role === 'admin'} redirectTo="/admin/orders">
        <Stack.Screen name="menu/categories/index" options={{ title: 'Danh mục' }} />
        <Stack.Screen name="menu/categories/[id]" options={{ title: 'Danh mục' }} />
        <Stack.Screen name="menu/products/[id]" options={{ title: 'Món' }} />
        <Stack.Screen name="menu/option-groups/[id]" options={{ title: 'Nhóm tuỳ chọn' }} />
      </Stack.Protected>
    </Stack>
  );
}
