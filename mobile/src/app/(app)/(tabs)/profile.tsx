import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { useAuth } from '@/lib/auth';
import { useMe } from '@/lib/queries';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { data: me, error, isPending, refetch } = useMe();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const initials = me.fullName
    .split(' ')
    .slice(-2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <ScrollView contentContainerClassName="gap-6 p-5">
      <View className="items-center gap-3 rounded-3xl bg-white p-6">
        {me.avatarUrl ? (
          <Image
            source={me.avatarUrl}
            style={{ width: 88, height: 88, borderRadius: 44 }}
            contentFit="cover"
          />
        ) : (
          <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-brand-100">
            <Text className="text-3xl font-bold text-brand">{initials}</Text>
          </View>
        )}
        <View className="items-center gap-1">
          <Text className="text-xl font-bold text-stone-900">{me.fullName}</Text>
          <Text className="text-stone-500">{me.email}</Text>
          {me.phone ? <Text className="text-stone-500">{me.phone}</Text> : null}
        </View>
      </View>

      <View className="gap-3">
        <Link href="/chat" asChild>
          <Button title="Chat với quán" variant="outline" />
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
