import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '@/lib/format';
import { useOrder } from '@/lib/queries';

/**
 * Also opened from a push notification: data { type: 'order', orderId } → /orders/:id.
 * Live status updates over WebSocket (order:updated) come in a later step;
 * for now pull down to refresh.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, error, isPending, isRefetching, refetch } = useOrder(id);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <>
      <Stack.Screen options={{ title: order.code }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 p-5"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#7C4A2D" />
        }
      >
        <View className="gap-1 rounded-2xl bg-brand p-5">
          <Text className="text-sm text-brand-100">Trạng thái</Text>
          <Text className="text-2xl font-bold text-white">{ORDER_STATUS_LABEL[order.status]}</Text>
          <Text className="text-brand-100">{order.store.name}</Text>
        </View>

        <View className="gap-3 rounded-2xl bg-white p-5">
          {order.items.map((item) => (
            <View key={item.id} className="flex-row justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base text-stone-900">
                  {item.quantity}× {item.productName}
                </Text>
                {item.options?.length ? (
                  <Text className="text-sm text-stone-500">
                    {item.options.map((o) => o.optionName).join(', ')}
                  </Text>
                ) : null}
              </View>
              <Text className="text-stone-900">{formatVnd(item.lineTotal)}</Text>
            </View>
          ))}
          <View className="flex-row justify-between border-t border-stone-200 pt-3">
            <Text className="text-base font-semibold text-stone-900">Tổng</Text>
            <Text className="text-base font-semibold text-stone-900">{formatVnd(order.total)}</Text>
          </View>
        </View>

        {order.statusHistory?.length ? (
          <View className="gap-2 rounded-2xl bg-white p-5">
            {order.statusHistory.map((entry) => (
              <View key={entry.id} className="flex-row justify-between">
                <Text className="text-stone-700">{ORDER_STATUS_LABEL[entry.toStatus]}</Text>
                <Text className="text-sm text-stone-500">{formatDateTime(entry.createdAt)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
