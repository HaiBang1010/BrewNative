import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { FloatingTabBar, tabBarIcon } from '@/components/floating-tab-bar';
import { useStaffConversations, useStaffOrders } from '@/hooks/staff';
import { COLORS } from '@/constants/theme';
import { useAuth } from '@/lib/auth-provider';

export default function AdminTabsLayout() {
  const { role } = useAuth();
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
      {/* Only admins edit the menu (the backend refuses staff): staff don't get the tab at all. */}
      <Tabs.Protected guard={role === 'admin'}>
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: tabBarIcon('cafe'),
            headerRight: MenuHeaderActions,
          }}
        />
      </Tabs.Protected>
      <Tabs.Screen
        name="account"
        options={{ title: 'Tài khoản', tabBarIcon: tabBarIcon('person') }}
      />
    </Tabs>
  );
}

/** Header of the Menu tab: manage categories, add a product. */
function MenuHeaderActions() {
  return (
    <View className="flex-row items-center gap-1 pr-3">
      <HeaderIcon href="/admin/menu/categories" icon="albums-outline" label="Danh mục" />
      <HeaderIcon href="/admin/menu/products/new" icon="add" label="Thêm món" />
    </View>
  );
}

function HeaderIcon({
  href,
  icon,
  label,
}: {
  href: ComponentProps<typeof Link>['href'];
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-brand-50"
      >
        <Ionicons name={icon} size={22} color={COLORS.ink} />
      </Pressable>
    </Link>
  );
}
