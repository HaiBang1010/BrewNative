import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { staffService } from '@/services/staff.service';
import type { OrderStatus } from '@/types/api';
import { upsertMessage, type ChatPages } from '@/utils/chat-cache';

/**
 * Hooks for the staff screens (app/admin). Lists stay live because SocketProvider
 * invalidates them on `order:updated`, `message:new` and `conversation:read`.
 */

export function useStaffOrders() {
  return useQuery({
    queryKey: queryKeys.staffOrders,
    queryFn: ({ signal }) => staffService.listOrders(signal),
  });
}

export function useStaffOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.staffOrder(id),
    queryFn: ({ signal }) => staffService.getOrder(id, signal),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      staffService.updateOrderStatus(id, status),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.staffOrder(order.id), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffOrders });
    },
  });
}

export function useStaffConversations() {
  return useQuery({
    queryKey: queryKeys.staffConversations,
    queryFn: ({ signal }) => staffService.listConversations(signal),
  });
}

export function useStaffMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.staffMessages(conversationId),
    queryFn: ({ pageParam, signal }) =>
      staffService.getMessages(conversationId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.items.at(-1)?.id : undefined),
    staleTime: Infinity,
  });
}

export function useSendStaffMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, clientId }: { body: string; clientId: string }) =>
      staffService.sendMessage(conversationId, body, clientId),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatPages>(queryKeys.staffMessages(conversationId), (data) =>
        upsertMessage(data, message),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffConversations });
    },
  });
}

export function useMarkConversationRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => staffService.markConversationRead(conversationId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.staffConversations }),
  });
}
