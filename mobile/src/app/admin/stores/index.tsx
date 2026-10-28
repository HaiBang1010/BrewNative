import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Link } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useAdminStores } from '@/hooks/admin-shop';
import { openingHoursSummary } from '@/utils/admin-stores';

/** Admin: every store, temporarily closed ones included. */
export default function AdminStoresScreen() {
  const { data, error, isPending, isRefetching, refetch } = useAdminStores();
  const insets = useSafeAreaInsets();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <View className="flex-1">
      <FlatList
        data={data}
        keyExtractor={(store) => store.id}
        contentContainerClassName="gap-3 px-5 pb-6 pt-4"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.brand} />
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/admin/stores/[id]', params: { id: item.id } }} asChild>
            <Pressable className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-70">
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="shrink text-base font-semibold text-ink" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.isActive ? 'bg-success/15 text-success' : 'bg-line-light text-ink-muted'
                    }`}
                  >
                    {item.isActive ? 'Đang bán' : 'Tạm đóng'}
                  </Text>
                </View>
                <Text className="text-xs text-ink-soft" numberOfLines={1}>
                  {item.address}
                </Text>
                <Text className="text-xs text-ink-muted" numberOfLines={2}>
                  {openingHoursSummary(item.openingHours)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.inkMuted} />
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<EmptyView text="Chưa có cửa hàng" />}
      />
      <View className="bg-white px-6 pt-4" style={{ paddingBottom: insets.bottom + 12 }}>
        <Link href="/admin/stores/new" asChild>
          <Button title="Thêm cửa hàng" />
        </Link>
      </View>
    </View>
  );
}
