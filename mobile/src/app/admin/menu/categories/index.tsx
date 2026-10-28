import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Link } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useAdminCategories, useAdminProducts } from '@/hooks/admin-menu';

/** Admin: every category, in menu order, with how many products it has. */
export default function AdminCategoriesScreen() {
  const categories = useAdminCategories();
  const products = useAdminProducts();
  const insets = useSafeAreaInsets();

  if (categories.isPending) return <LoadingView />;
  if (categories.isError) return <ErrorView error={categories.error} onRetry={categories.refetch} />;

  const countFor = (categoryId: string) =>
    products.data?.filter((product) => product.categoryId === categoryId).length;

  return (
    <View className="flex-1">
      <FlatList
        data={categories.data}
        keyExtractor={(category) => category.id}
        contentContainerClassName="gap-3 px-5 pb-6 pt-4"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={categories.isRefetching}
            onRefresh={() => void categories.refetch()}
            tintColor={COLORS.brand}
          />
        }
        ListHeaderComponent={
          <Text className="text-xs text-ink-muted">
            Thứ tự ở đây là thứ tự khách thấy trong menu. Mở một danh mục để đổi tên hoặc thứ tự.
          </Text>
        }
        renderItem={({ item }) => {
          const count = countFor(item.id);
          return (
            <Link href={{ pathname: '/admin/menu/categories/[id]', params: { id: item.id } }} asChild>
              <Pressable className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-70">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <Text className="text-sm font-semibold text-brand">{item.sortOrder}</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    {count === undefined ? ' ' : count ? `${count} món` : 'Chưa có món'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.inkMuted} />
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={<EmptyView text="Chưa có danh mục" />}
      />
      <View className="bg-white px-6 pt-4" style={{ paddingBottom: insets.bottom + 12 }}>
        <Link href="/admin/menu/categories/new" asChild>
          <Button title="Thêm danh mục" />
        </Link>
      </View>
    </View>
  );
}
