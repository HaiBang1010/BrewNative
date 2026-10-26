import { Stack } from 'expo-router';

/** Screens available after signing in. The tab bar is one screen of this stack. */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: '#7C4A2D',
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: '#fafaf9' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="products/[id]"
        options={{ presentation: 'modal', title: 'Chi tiết món' }}
      />
      <Stack.Screen name="orders/[id]" options={{ title: 'Theo dõi đơn' }} />
      <Stack.Screen name="cart" options={{ title: 'Giỏ hàng' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat với quán' }} />
    </Stack>
  );
}
