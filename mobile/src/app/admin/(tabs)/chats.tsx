import { Link } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { useStaffConversations } from '@/hooks/staff';
import { formatDateTime } from '@/utils/format';
import { COLORS } from '@/constants/theme';

/** Customers who have written to the shop, most recent first. Live via WebSocket. */
export default function StaffChatsScreen() {
  const { data, error, isPending, isRefetching, refetch } = useStaffConversations();
  const tabBarHeight = useBottomTabBarHeight();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(conversation) => conversation.id}
      contentContainerClassName="gap-2 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={COLORS.brand}
        />
      }
      ListEmptyComponent={<EmptyView text="Chưa có khách nào nhắn tin" />}
      renderItem={({ item: conversation }) => {
        const last = conversation.lastMessage;
        const unread = conversation.unreadCount > 0;
        return (
          <Link
            href={{
              pathname: '/admin/chats/[id]',
              params: { id: conversation.id, name: conversation.customer.fullName },
            }}
            asChild
          >
            <Pressable className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-70">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-100">
                <Text className="text-base font-bold text-brand">
                  {conversation.customer.fullName.split(' ').at(-1)?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-base text-stone-900 ${unread ? 'font-bold' : 'font-semibold'}`}
                  >
                    {conversation.customer.fullName}
                  </Text>
                  {conversation.lastMessageAt ? (
                    <Text className="text-xs text-stone-400">
                      {formatDateTime(conversation.lastMessageAt)}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text
                    className={`flex-1 text-sm ${unread ? 'font-semibold text-stone-900' : 'text-stone-500'}`}
                    numberOfLines={1}
                  >
                    {last ? `${last.senderId === conversation.customerId ? '' : 'Bạn: '}${last.body}` : ''}
                  </Text>
                  {unread ? (
                    <View className="min-w-5 items-center rounded-full bg-red-600 px-1.5">
                      <Text className="text-xs font-bold text-white">{conversation.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}
