import { useLocalSearchParams } from 'expo-router';
import { ComingSoon } from '@/components/ui/coming-soon';

/** Also opened from a push notification: data { type: 'order', orderId } → /orders/:id. */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ComingSoon
      title={`Đơn ${id}`}
      description="Trạng thái đơn cập nhật realtime qua WebSocket order:updated (bước 4)."
    />
  );
}
