import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ErrorView } from '@/components/ui/screen-state';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { errorMessage } from '@/utils/errors';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '@/utils/format';
import { ORDER_PROGRESS_STEPS, ORDER_STATUS_DETAIL, orderProgress } from '@/utils/order-progress';
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
 * Status changes arrive live over WebSocket (lib/socket-provider.tsx) while the app is
 * open, and as a push notification when it isn't.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pollingSince, setPollingSince] = useState<number | null>(null);
  const { data: order, error, isPending, isRefetching, refetch } = useOrder(id, {
    // Stops by itself as soon as the order is no longer waiting for its payment.
    refetchInterval: (query) =>
      pollingSince && query.state.data?.status === 'pending_payment' ? 2_000 : false,
  });
  const { mutate: confirmPayment, isPending: isConfirming } = useConfirmPayment();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const checkedOnOpen = useRef(false);

  const awaitingConfirmation = order?.status === 'pending_payment';
  const polling = !!pollingSince && awaitingConfirmation;

  const checkAgain = useCallback(() => {
    setConfirmError(null);
    confirmPayment(id, { onError: (e) => setConfirmError(errorMessage(e)) });
  }, [confirmPayment, id]);

  // Not confirmed yet when opened: check with Stripe once, then poll for a while.
  useEffect(() => {
    if (!order || checkedOnOpen.current || order.status !== 'pending_payment') return;
    checkedOnOpen.current = true;
    checkAgain();
    setPollingSince(Date.now());
  }, [order, checkAgain]);

  useEffect(() => {
    if (!pollingSince) return;
    const timer = setTimeout(() => setPollingSince(null), POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pollingSince]);

  if (isPending) return <OrderSkeleton />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const busy = polling || isConfirming;

  return (
    <>
      <Stack.Screen options={{ title: order.code }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-6 pb-8 pt-2"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !polling}
            onRefresh={() => void refetch()}
            tintColor={COLORS.brand}
          />
        }
      >
        <ProgressCard order={order} confirming={awaitingConfirmation && busy} />

        {awaitingConfirmation && !busy ? (
          <View className="gap-3 rounded-2xl bg-white p-5">
            <Text className="text-sm text-ink-soft">
              Chưa nhận được xác nhận thanh toán. Nếu bạn đã trả tiền, đơn sẽ tự được cập nhật
              trong vài phút.
            </Text>
            {confirmError ? <Text className="text-sm text-red-500">{confirmError}</Text> : null}
            <Button title="Kiểm tra lại" variant="outline" onPress={checkAgain} />
          </View>
        ) : null}

        <StoreCard order={order} />
        <ItemsCard order={order} />

        {order.statusHistory?.length ? (
          <View className="gap-3 rounded-2xl bg-white p-5">
            <Text className="text-base font-semibold text-ink">Lịch sử</Text>
            {order.statusHistory.map((entry) => (
              <View key={entry.id} className="flex-row items-center gap-3">
                <View className="h-2 w-2 rounded-full bg-brand" />
                <Text className="flex-1 text-sm text-ink-soft">
                  {ORDER_STATUS_LABEL[entry.toStatus]}
                </Text>
                <Text className="text-xs text-ink-muted">{formatDateTime(entry.createdAt)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const STATUS_ICON: Record<Order['status'], ComponentProps<typeof Ionicons>['name']> = {
  pending_payment: 'card-outline',
  paid: 'receipt-outline',
  accepted: 'checkmark-circle-outline',
  preparing: 'cafe-outline',
  ready: 'bag-check-outline',
  completed: 'happy-outline',
  cancelled: 'close-circle-outline',
};

/** Like the "Delivery" screen of the design: headline, 4-step bar, card for the current step. */
function ProgressCard({ order, confirming }: { order: Order; confirming: boolean }) {
  const detail = ORDER_STATUS_DETAIL[order.status];
  const done = orderProgress(order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <View className="gap-5 rounded-3xl bg-white px-6 pb-6 pt-5">
      <View className="items-center gap-0.5">
        <Text className="text-center text-base font-semibold text-ink">{detail.title}</Text>
        <Text className="text-center text-xs text-ink-muted">
          Nhận tại <Text className="text-xs font-semibold text-night-raised">{order.store.name}</Text>
        </Text>
      </View>

      <View className="flex-row gap-2.5">
        {Array.from({ length: ORDER_PROGRESS_STEPS }, (_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${
              cancelled ? 'bg-red-200' : i < done ? 'bg-success' : 'bg-line'
            }`}
          />
        ))}
      </View>

      <View className="flex-row items-center gap-4 rounded-xl border border-line py-2 pl-3 pr-4">
        <View className="h-14 w-14 items-center justify-center rounded-xl border border-line">
          {confirming ? (
            <ActivityIndicator color={COLORS.brand} />
          ) : (
            <Ionicons
              name={STATUS_ICON[order.status]}
              size={28}
              color={cancelled ? COLORS.danger : COLORS.brand}
            />
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-ink">
            {ORDER_STATUS_LABEL[order.status]}
          </Text>
          <Text className="text-xs font-light leading-[18px] text-ink-muted">
            {detail.description}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** The design's courier row: here the shop, with a button to chat with it. */
function StoreCard({ order }: { order: Order }) {
  return (
    <View className="flex-row items-center gap-4 rounded-2xl bg-white p-4">
      <Image
        source={order.store.imageUrl}
        style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: COLORS.imagePlaceholder }}
        contentFit="cover"
      />
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
          {order.store.name}
        </Text>
        <Text className="text-xs text-ink-muted" numberOfLines={2}>
          {order.store.address}
        </Text>
      </View>
      <Link href="/chat" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chat với quán"
          className="h-11 w-11 items-center justify-center rounded-xl border border-line active:bg-surface"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.ink} />
        </Pressable>
      </Link>
    </View>
  );
}

function ItemsCard({ order }: { order: Order }) {
  return (
    <View className="gap-4 rounded-2xl bg-white p-5">
      <Text className="text-base font-semibold text-ink">Món đã đặt</Text>
      {order.items.map((item) => (
        <View key={item.id} className="flex-row items-center gap-4">
          <Image
            source={item.productImageUrl}
            style={{ width: 54, height: 54, borderRadius: 8, backgroundColor: COLORS.imagePlaceholder }}
            contentFit="cover"
          />
          <View className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
              {item.productName}
            </Text>
            {item.options?.length ? (
              <Text className="text-xs text-ink-muted" numberOfLines={1}>
                {item.options.map((o) => o.optionName).join(' · ')}
              </Text>
            ) : null}
          </View>
          <View className="items-end gap-1">
            <Text className="text-sm font-semibold text-ink">{formatVnd(item.lineTotal)}</Text>
            <Text className="text-xs text-ink-muted">x{item.quantity}</Text>
          </View>
        </View>
      ))}
      {order.note ? (
        <Text className="text-xs text-ink-muted">Ghi chú: {order.note}</Text>
      ) : null}
      <View className="h-px bg-line" />
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-ink-soft">Tổng cộng</Text>
        <Text className="text-base font-bold text-ink">{formatVnd(order.total)}</Text>
      </View>
    </View>
  );
}

/** Progress card, store card and items card, like the loaded screen. */
function OrderSkeleton() {
  return (
    // Same inset as the loaded ScrollView: starts below the iOS 26+ floating header,
    // so nothing jumps when the order arrives.
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={false}
      contentContainerClassName="px-6 pt-2"
    >
      <SkeletonGroup className="gap-4">
        <View className="gap-5 rounded-3xl bg-white px-6 pb-6 pt-5">
          <View className="items-center gap-2">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </View>
          <View className="flex-row gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-1 flex-1 rounded-full" />
            ))}
          </View>
          <Skeleton className="h-[74px] rounded-xl" />
        </View>
        <View className="flex-row items-center gap-4 rounded-2xl bg-white p-4">
          <Skeleton className="h-14 w-14 rounded-[14px]" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </View>
        </View>
        <View className="gap-4 rounded-2xl bg-white p-5">
          <Skeleton className="h-4 w-24 rounded" />
          {[0, 1].map((i) => (
            <View key={i} className="flex-row items-center gap-4">
              <Skeleton className="h-[54px] w-[54px] rounded-lg" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </View>
            </View>
          ))}
        </View>
      </SkeletonGroup>
    </ScrollView>
  );
}
