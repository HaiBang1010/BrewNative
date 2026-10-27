import { Link } from 'expo-router';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/screen-state';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '@/lib/format';
import { useOrders } from '@/lib/queries';

export default function OrdersScreen() {
  const { data, error, isPending, isRefetching, refetch } = useOrders();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(order) => order.id}
      contentContainerClassName="gap-3 p-5"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#7C4A2D" />
      }
      ListEmptyComponent={<EmptyView text="Bạn chưa có đơn nào" />}
      renderItem={({ item: order }) => (
        <Link href={{ pathname: '/orders/[id]', params: { id: order.id } }} asChild>
          <Pressable className="gap-2 rounded-2xl bg-white p-4 active:opacity-80">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-stone-900">{order.code}</Text>
              <Text className="font-semibold text-stone-900">{formatVnd(order.total)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand">{ORDER_STATUS_LABEL[order.status]}</Text>
              <Text className="text-sm text-stone-500">{formatDateTime(order.createdAt)}</Text>
            </View>
            <Text className="text-sm text-stone-500" numberOfLines={1}>
              {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
            </Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
