import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { errorMessage } from '@/utils/errors';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '@/utils/format';
import { useConfirmPayment } from '@/hooks/payments';
import { useOrder } from '@/hooks/queries';
import type { Order } from '@/types/api';
import { COLORS } from '@/constants/theme';

/** While a paid order waits for confirmation, how long to keep polling. */
const POLL_TIMEOUT_MS = 60_000;

/**
 * Also opened from a push notification: data { type: 'order', orderId } → /orders/:id.
 *
 * Customers pay in the cart, so an order shown here is normally already paid.
 * The exception: the payment went through but the backend hasn't confirmed it
 * yet (slow payment method, or the network dropped). Then the screen asks the
 * backend to check with Stripe and polls for a minute.
 * Live status updates over WebSocket come in a later step; until then, pull to refresh.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pollingSince, setPollingSince] = useState<number | null>(null);
  const { data: order, error, isPending, isRefetching, refetch } = useOrder(id, {
    refetchInterval: pollingSince ? 2_000 : false,
  });
  const confirm = useConfirmPayment();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const checkedOnOpen = useRef(false);

  const awaitingConfirmation = order?.status === 'pending_payment';

  function checkAgain() {
    setConfirmError(null);
    confirm.mutate(id, { onError: (e) => setConfirmError(errorMessage(e)) });
  }

  // Not confirmed yet when opened: check with Stripe once, then poll for a while.
  useEffect(() => {
    if (!order || checkedOnOpen.current || order.status !== 'pending_payment') return;
    checkedOnOpen.current = true;
    checkAgain();
    setPollingSince(Date.now());
  }, [order]);

  useEffect(() => {
    if (pollingSince && order && order.status !== 'pending_payment') setPollingSince(null);
  }, [pollingSince, order]);

  useEffect(() => {
    if (!pollingSince) return;
    const timer = setTimeout(() => setPollingSince(null), POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pollingSince]);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const busy = !!pollingSince || confirm.isPending;

  return (
    <>
      <Stack.Screen options={{ title: order.code }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 p-5"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !pollingSince}
            onRefresh={() => void refetch()}
            tintColor={COLORS.brand}
          />
        }
      >
        <StatusCard order={order} confirming={awaitingConfirmation && busy} />

        {awaitingConfirmation && !busy ? (
          <View className="gap-3 rounded-2xl bg-white p-5">
            <Text className="text-base text-stone-700">
              Chưa nhận được xác nhận thanh toán. Nếu bạn đã trả tiền, đơn sẽ tự được cập nhật
              trong vài phút.
            </Text>
            {confirmError ? <Text className="text-red-600">{confirmError}</Text> : null}
            <Button title="Kiểm tra lại" variant="outline" onPress={checkAgain} />
          </View>
        ) : null}

        <ItemsCard order={order} />

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

function StatusCard({ order, confirming }: { order: Order; confirming: boolean }) {
  return (
    <View className="gap-1 rounded-2xl bg-brand p-5">
      <Text className="text-sm text-brand-100">Trạng thái</Text>
      {confirming ? (
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color="#fff" />
          <Text className="text-xl font-bold text-white">Đang xác nhận thanh toán…</Text>
        </View>
      ) : (
        <Text className="text-2xl font-bold text-white">{ORDER_STATUS_LABEL[order.status]}</Text>
      )}
      <Text className="text-brand-100">{order.store.name}</Text>
    </View>
  );
}

function ItemsCard({ order }: { order: Order }) {
  return (
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
      {order.note ? <Text className="text-sm italic text-stone-500">Ghi chú: {order.note}</Text> : null}
      <View className="flex-row justify-between border-t border-stone-200 pt-3">
        <Text className="text-base font-semibold text-stone-900">Tổng</Text>
        <Text className="text-base font-semibold text-stone-900">{formatVnd(order.total)}</Text>
      </View>
    </View>
  );
}
