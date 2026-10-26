import { ComingSoon } from '@/components/ui/coming-soon';

export default function ChatScreen() {
  return (
    <ComingSoon
      title="Chat với quán"
      description="Tin nhắn qua WebSocket message:send / message:new, lịch sử qua GET /api/chat/messages (bước 4)."
    />
  );
}
