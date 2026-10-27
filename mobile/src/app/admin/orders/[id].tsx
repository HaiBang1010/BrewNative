import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useStaffAction } from '@/components/staff-order-card';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { useStaffOrder } from '@/hooks/staff';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '@/utils/format';
import { staffActions } from '@/utils/staff-orders';

export default function StaffOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, error, isPending, refetch } = useStaffOrder(id);
  const { run, pendingStatus } = useStaffAction();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const payment = order.payments?.at(-1);

  return (
    <>
      <Stack.Screen options={{ title: order.code }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-5">
        <View className="gap-1 rounded-2xl bg-brand p-5">
          <Text className="text-sm text-brand-100">Trạng thái</Text>
          <Text className="text-2xl font-bold text-white">{ORDER_STATUS_LABEL[order.status]}</Text>
          <Text className="text-brand-100">{order.store.name}</Text>
        </View>

        <View className="gap-3">
          {staffActions(order.status).map((action) => (
            <Button
              key={action.to}
              title={action.label}
              variant={action.destructive ? 'outline' : 'primary'}
              loading={pendingStatus === action.to}
              disabled={pendingStatus !== null}
              onPress={() => run(order, action)}
            />
          ))}
        </View>

        <View className="gap-1 rounded-2xl bg-white p-5">
          <Text className="text-base font-semibold text-ink">{order.user.fullName}</Text>
          <Text className="text-ink-muted">{order.user.email}</Text>
          {order.user.phone ? <Text className="text-ink-muted">{order.user.phone}</Text> : null}
        </View>

        <View className="gap-3 rounded-2xl bg-white p-5">
          {order.items.map((item) => (
            <View key={item.id} className="flex-row justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">
                  {item.quantity}× {item.productName}
                </Text>
                {item.options?.length ? (
                  <Text className="text-ink-soft">
                    {item.options.map((o) => `${o.groupName}: ${o.optionName}`).join(' · ')}
                  </Text>
                ) : null}
              </View>
              <Text className="text-ink">{formatVnd(item.lineTotal)}</Text>
            </View>
          ))}
          {order.note ? (
            <Text className="rounded-xl bg-amber-50 p-3 text-amber-800">Ghi chú: {order.note}</Text>
          ) : null}
          <View className="flex-row justify-between border-t border-line pt-3">
            <Text className="text-base font-semibold text-ink">Tổng</Text>
            <Text className="text-base font-semibold text-ink">{formatVnd(order.total)}</Text>
          </View>
          {payment ? (
            <Text className="text-sm text-ink-muted">
              Stripe: {payment.status}
              {payment.amountRefunded ? ` · đã hoàn ${formatVnd(payment.amountRefunded)}` : ''}
            </Text>
          ) : null}
        </View>

        {order.statusHistory?.length ? (
          <View className="gap-2 rounded-2xl bg-white p-5">
            {order.statusHistory.map((entry) => (
              <View key={entry.id} className="flex-row justify-between">
                <Text className="text-ink-soft">{ORDER_STATUS_LABEL[entry.toStatus]}</Text>
                <Text className="text-sm text-ink-muted">{formatDateTime(entry.createdAt)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
