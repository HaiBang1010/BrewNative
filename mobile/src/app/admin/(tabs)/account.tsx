import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { useMe } from '@/hooks/queries';
import { useAuth } from '@/lib/auth-provider';

const ROLE_LABEL = { staff: 'Nhân viên', admin: 'Quản trị viên', customer: 'Khách hàng' } as const;

export default function StaffAccountScreen() {
  const { signOut } = useAuth();
  const { data: me, error, isPending, refetch } = useMe();
  const [signingOut, setSigningOut] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-5 pt-5"
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
    >
      <View className="items-center gap-1 rounded-3xl bg-white p-6">
        <Text className="text-xl font-bold text-ink">{me.fullName}</Text>
        <Text className="text-ink-muted">{me.email}</Text>
        <Text className="mt-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand">
          {ROLE_LABEL[me.role]}
        </Text>
      </View>
      <Text className="text-center text-sm text-ink-muted">
        Quản lý menu, cửa hàng và tài khoản: dùng trang Swagger của backend (/api/docs).
      </Text>
      <Button
        title="Đăng xuất"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
        }}
      />
    </ScrollView>
  );
}
