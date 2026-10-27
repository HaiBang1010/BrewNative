import type { ChatMessage, ChatMessagePage } from '@/types/realtime';

/** TanStack Query's shape for an infinite query: pages[0] holds the newest messages. */
export type ChatPages = {
  pages: ChatMessagePage[];
  pageParams: unknown[];
};

/**
 * Adds a message to the newest page unless it is already there. A message can
 * arrive twice (the send ack and the `message:new` event), so this must be idempotent.
 */
export function upsertMessage(data: ChatPages | undefined, message: ChatMessage): ChatPages | undefined {
  if (!data) return data;
  const exists = data.pages.some((page) => page.items.some((m) => m.id === message.id));
  if (exists) return data;
  const [newest, ...older] = data.pages;
  return {
    ...data,
    pages: [{ ...newest, items: [message, ...newest.items] }, ...older],
  };
}

/** All loaded messages, newest first (for an inverted FlatList). */
export function flattenMessages(data: ChatPages | undefined): ChatMessage[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
