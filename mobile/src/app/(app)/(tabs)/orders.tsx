import { Link } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { OrderListSkeleton } from '@/components/order-list-skeleton';
import { EmptyView, ErrorView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '@/utils/format';
import { useOrders } from '@/hooks/queries';
import { COLORS } from '@/constants/theme';

export default function OrdersScreen() {
  const { data, error, isPending, isRefetching, refetch } = useOrders();
  const tabBarHeight = useBottomTabBarHeight();

  if (isPending) return <OrderListSkeleton />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(order) => order.id}
      contentContainerClassName="gap-3 px-5 pt-5"
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.brand} />
      }
      ListEmptyComponent={<EmptyView text="Bạn chưa có đơn nào" />}
      renderItem={({ item: order }) => (
        <Link href={{ pathname: '/orders/[id]', params: { id: order.id } }} asChild>
          <Pressable className="gap-2 rounded-2xl bg-white p-4 active:opacity-80">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-ink">{order.code}</Text>
              <Text className="font-semibold text-ink">{formatVnd(order.total)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand">{ORDER_STATUS_LABEL[order.status]}</Text>
              <Text className="text-sm text-ink-muted">{formatDateTime(order.createdAt)}</Text>
            </View>
            <Text className="text-sm text-ink-muted" numberOfLines={1}>
              {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
            </Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
