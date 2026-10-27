import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { chatService } from '@/services/chat.service';
import type { ChatSummary } from '@/types/realtime';
import { upsertMessage, type ChatPages } from '@/utils/chat-cache';

/** Unread count for the badge. Kept fresh by SocketProvider on new messages. */
export function useChatSummary() {
  return useQuery({
    queryKey: queryKeys.chatSummary,
    queryFn: ({ signal }) => chatService.getSummary(signal),
  });
}

/**
 * Chat history, newest first. More pages load when scrolling up (`fetchNextPage`).
 * New messages are added to the cache by SocketProvider (`message:new`).
 */
export function useChatMessages() {
  return useInfiniteQuery({
    queryKey: queryKeys.chatMessages,
    queryFn: ({ pageParam, signal }) => chatService.getMessages(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    // Next page = messages older than the oldest one loaded.
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.items.at(-1)?.id : undefined,
    // Live updates come over the WebSocket; no need to refetch on focus.
    staleTime: Infinity,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, clientId }: { body: string; clientId: string }) =>
      chatService.send(body, clientId),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatPages>(queryKeys.chatMessages, (data) =>
        upsertMessage(data, message),
      );
    },
  });
}

export function useMarkChatRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatService.markRead,
    onSuccess: () => {
      queryClient.setQueryData<ChatSummary>(queryKeys.chatSummary, (summary) =>
        summary ? { ...summary, unreadCount: 0 } : summary,
      );
    },
  });
}
