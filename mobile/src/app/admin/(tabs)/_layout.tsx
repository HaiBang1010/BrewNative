import { Tabs } from 'expo-router/js-tabs';
import { FloatingTabBar, tabBarIcon } from '@/components/floating-tab-bar';
import { useStaffConversations, useStaffOrders } from '@/hooks/staff';
import { COLORS } from '@/constants/theme';

export default function AdminTabsLayout() {
  // Badges: paid orders nobody has accepted yet, and customers waiting for a reply.
  const { data: orders } = useStaffOrders();
  const { data: conversations } = useStaffConversations();
  const newOrders = orders?.items.filter((o) => o.status === 'paid').length ?? 0;
  const unreadChats = conversations?.items.filter((c) => c.unreadCount > 0).length ?? 0;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.inkMuted,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: COLORS.surface },
      }}
    >
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: tabBarIcon('receipt'),
          tabBarBadge: newOrders || undefined,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: tabBarIcon('chatbubbles'),
          tabBarBadge: unreadChats || undefined,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Tài khoản', tabBarIcon: tabBarIcon('person') }}
      />
    </Tabs>
  );
}
