import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth-provider';
import { useChatSummary } from '@/hooks/chat';
import { useMe } from '@/hooks/queries';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { data: me, error, isPending, refetch } = useMe();
  const { data: chat } = useChatSummary();
  const unread = chat?.unreadCount ?? 0;
  const [signingOut, setSigningOut] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const initials = me.fullName
    .split(' ')
    .slice(-2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-5 pt-5"
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
    >
      <View className="items-center gap-3 rounded-3xl bg-white p-6">
        {me.avatarUrl ? (
          <Image
            source={me.avatarUrl}
            style={{ width: 64, height: 64, borderRadius: 32 }}
            contentFit="cover"
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <Text className="text-lg font-semibold text-brand">{initials}</Text>
          </View>
        )}
        <View className="items-center gap-1">
          <Text className="text-lg font-semibold text-ink">{me.fullName}</Text>
          <Text className="text-sm text-ink-muted">{me.email}</Text>
          {me.phone ? <Text className="text-sm text-ink-muted">{me.phone}</Text> : null}
        </View>
      </View>

      <View className="gap-3">
        <Link href="/chat" asChild>
          <Button
            title={unread > 0 ? `Chat với quán (${unread} tin mới)` : 'Chat với quán'}
            variant="outline"
          />
        </Link>
        <Button
          title="Đăng xuất"
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            await signOut();
          }}
        />
      </View>
    </ScrollView>
  );
}
