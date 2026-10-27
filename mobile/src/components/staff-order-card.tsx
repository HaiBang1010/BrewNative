import { Link } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useUpdateOrderStatus } from '@/hooks/staff';
import type { OrderStatus, StaffOrder } from '@/types/api';
import { errorMessage } from '@/utils/errors';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '@/utils/format';
import { staffActions, type StaffAction } from '@/utils/staff-orders';

/** Runs a staff action, asking first if it is destructive (e.g. reject and refund). */
export function useStaffAction() {
  const update = useUpdateOrderStatus();

  function run(order: StaffOrder, action: StaffAction) {
    const go = () =>
      update.mutate(
        { id: order.id, status: action.to },
        // e.g. another staff member already moved it: the backend answers 409.
        { onError: (error) => Alert.alert('Không đổi được trạng thái', errorMessage(error)) },
      );
    if (!action.destructive) return go();
    Alert.alert(action.label, `Đơn ${order.code} · hoàn ${formatVnd(order.total)} cho khách.`, [
      { text: 'Không', style: 'cancel' },
      { text: action.label, style: 'destructive', onPress: go },
    ]);
  }

  return { run, pendingStatus: update.isPending ? (update.variables?.status as OrderStatus) : null };
}

/** One order in the staff list, with buttons for its next steps. */
export function StaffOrderCard({ order }: { order: StaffOrder }) {
  const { run, pendingStatus } = useStaffAction();
  const actions = staffActions(order.status);

  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <Link href={{ pathname: '/admin/orders/[id]', params: { id: order.id } }} asChild>
        <Pressable className="gap-1 active:opacity-70">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-stone-900">{order.code}</Text>
            <Text className="font-semibold text-stone-900">{formatVnd(order.total)}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-brand">{ORDER_STATUS_LABEL[order.status]}</Text>
            <Text className="text-sm text-stone-500">{formatDateTime(order.createdAt)}</Text>
          </View>
          <Text className="text-sm text-stone-600">
            {order.user.fullName} · {order.store.name}
          </Text>
          <Text className="text-sm text-stone-500" numberOfLines={2}>
            {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
          </Text>
          {order.note ? (
            <Text className="text-sm italic text-amber-700">Ghi chú: {order.note}</Text>
          ) : null}
        </Pressable>
      </Link>

      {actions.length ? (
        <View className="flex-row gap-2">
          {actions.map((action) => (
            <Button
              key={action.to}
              title={action.label}
              variant={action.destructive ? 'outline' : 'primary'}
              loading={pendingStatus === action.to}
              disabled={pendingStatus !== null}
              onPress={() => run(order, action)}
              className="flex-1"
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
