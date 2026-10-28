import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Link, type Href } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
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

      {me.role === 'admin' ? (
        <View className="gap-3">
          <Text className="px-1 text-sm font-semibold text-ink">Quản lý</Text>
          <View className="overflow-hidden rounded-2xl bg-white">
            <ManageRow href="/admin/stats" icon="stats-chart-outline" title="Thống kê doanh thu" />
            <ManageRow href="/admin/stores" icon="storefront-outline" title="Cửa hàng" last />
          </View>
        </View>
      ) : (
        <Text className="text-center text-sm text-ink-muted">
          Menu, cửa hàng và tài khoản do quản trị viên quản lý.
        </Text>
      )}

      <Button
        title="Đăng xuất"
        variant="outline"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
        }}
      />
    </ScrollView>
  );
}

function ManageRow({
  href,
  icon,
  title,
  last,
}: {
  href: Href;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  /** No divider under the last row. */
  last?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-surface ${last ? '' : 'border-b border-line-light'}`}>
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
          <Ionicons name={icon} size={20} color={COLORS.brand} />
        </View>
        <Text className="flex-1 text-sm font-semibold text-ink">{title}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.inkMuted} />
      </Pressable>
    </Link>
  );
}
