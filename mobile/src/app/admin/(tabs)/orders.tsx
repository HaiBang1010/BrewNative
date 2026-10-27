import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { StaffOrderCard } from '@/components/staff-order-card';
import { Chip } from '@/components/ui/chip';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/screen-state';
import { useStaffOrders } from '@/hooks/staff';
import type { OrderStatus } from '@/types/api';
import { STAFF_ORDER_TABS, type StaffOrderTab } from '@/utils/staff-orders';
import { COLORS } from '@/constants/theme';

/** The shop's order queue. New paid orders appear live (WebSocket `order:updated`). */
export default function StaffOrdersScreen() {
  const { data, error, isPending, isRefetching, refetch } = useStaffOrders();
  const [tab, setTab] = useState<StaffOrderTab>('new');
  const tabBarHeight = useBottomTabBarHeight();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const countFor = (statuses: readonly OrderStatus[]) =>
    data.items.filter((o) => statuses.includes(o.status)).length;
  const current = STAFF_ORDER_TABS.find((t) => t.key === tab)!;
  const orders = data.items
    .filter((o) => (current.statuses as readonly OrderStatus[]).includes(o.status))
    // Oldest first while there is work to do, newest first once done.
    .sort((a, b) =>
      tab === 'done'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );

  return (
    <FlatList
      data={orders}
      keyExtractor={(order) => order.id}
      contentContainerClassName="gap-3 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={COLORS.brand}
        />
      }
      ListHeaderComponent={
        <View className="mb-1 flex-row flex-wrap gap-2">
          {STAFF_ORDER_TABS.map((t) => (
            <Chip
              key={t.key}
              label={`${t.label} (${countFor(t.statuses)})`}
              selected={t.key === tab}
              onPress={() => setTab(t.key)}
            />
          ))}
        </View>
      }
      ListEmptyComponent={<EmptyView text="Không có đơn nào" />}
      renderItem={({ item }) => <StaffOrderCard order={item} />}
    />
  );
}
