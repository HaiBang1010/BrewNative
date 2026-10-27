import type { ChatMessage } from '@/types/realtime';
import { flattenMessages, upsertMessage, type ChatPages } from '../chat-cache';

const message = (id: string): ChatMessage => ({
  id,
  clientId: null,
  conversationId: 'c',
  senderId: 'u',
  sender: null,
  body: `message ${id}`,
  createdAt: '2026-10-27T00:00:00.000Z',
});

// pages[0] holds the newest messages, newest first.
const cache = (): ChatPages => ({
  pages: [
    { items: [message('3'), message('2')], hasMore: true },
    { items: [message('1')], hasMore: false },
  ],
  pageParams: [undefined, '2'],
});

describe('upsertMessage', () => {
  it('puts a new message at the top of the newest page', () => {
    const next = upsertMessage(cache(), message('4'));
    expect(next?.pages[0].items.map((m) => m.id)).toEqual(['4', '3', '2']);
    expect(next?.pages[1].items.map((m) => m.id)).toEqual(['1']);
  });

  it('ignores a message that is already there (send ack + message:new event)', () => {
    const data = cache();
    expect(upsertMessage(data, message('1'))).toBe(data);
    expect(upsertMessage(upsertMessage(data, message('4')), message('4'))?.pages[0].items).toHaveLength(3);
  });

  it('does nothing while the chat has not been loaded', () => {
    expect(upsertMessage(undefined, message('4'))).toBeUndefined();
  });
});

describe('flattenMessages', () => {
  it('returns every loaded message, newest first', () => {
    expect(flattenMessages(cache()).map((m) => m.id)).toEqual(['3', '2', '1']);
    expect(flattenMessages(undefined)).toEqual([]);
  });
});
