import type { Href } from 'expo-router';
import type { NotificationData } from '@/types/notifications';

/** Where tapping a notification goes. Staff and customers have their own screens. */
export function notificationRoute(data: NotificationData, isStaff: boolean): Href | null {
  switch (data.type) {
    case 'order':
      return isStaff
        ? { pathname: '/admin/orders/[id]', params: { id: data.orderId } }
        : { pathname: '/orders/[id]', params: { id: data.orderId } };
    case 'chat':
      return isStaff
        ? { pathname: '/admin/chats/[id]', params: { id: data.conversationId } }
        : '/chat';
    default:
      return null;
  }
}
