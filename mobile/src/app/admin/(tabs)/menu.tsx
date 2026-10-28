import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Link } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, RefreshControl, SectionList, TextInput, View } from 'react-native';
import { AdminMenuSkeleton, AdminProductRow } from '@/components/admin-menu/admin-product-row';
import { ALL_CATEGORIES, CategoryChips } from '@/components/menu/category-chips';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useAdminCategories, useAdminProducts } from '@/hooks/admin-menu';
import { groupByCategory } from '@/utils/admin-menu';
import { matchesSearch } from '@/utils/search';

/**
 * Admin: the whole menu, sold-out products included, grouped by category.
 * The header has the buttons for categories and for a new product (admin/(tabs)/_layout.tsx).
 */
export default function AdminMenuScreen() {
  const categories = useAdminCategories();
  const products = useAdminProducts();
  const [selected, setSelected] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const tabBarHeight = useBottomTabBarHeight();

  if (categories.isPending || products.isPending) return <AdminMenuSkeleton />;
  if (categories.isError || products.isError) {
    return (
      <ErrorView
        error={categories.error ?? products.error}
        onRetry={() => {
          void categories.refetch();
          void products.refetch();
        }}
      />
    );
  }

  if (!categories.data.length) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center text-base text-ink-soft">
          Menu chưa có danh mục nào. Tạo danh mục trước (ví dụ “Cà phê”, “Trà”), rồi thêm món vào đó.
        </Text>
        <Link href="/admin/menu/categories/new" asChild>
          <Button title="Tạo danh mục" />
        </Link>
      </View>
    );
  }

  const searching = query.trim() !== '';
  const sections = groupByCategory(
    categories.data,
    products.data.filter((product) => matchesSearch(product.name, query)),
  )
    .filter((section) => selected === ALL_CATEGORIES || section.category.id === selected)
    // While searching, only categories with a match; otherwise empty ones too, to fill them.
    .filter((section) => !searching || section.products.length > 0)
    .map((section) => ({ ...section, data: section.products }));
  const soldOut = products.data.filter((product) => !product.isAvailable).length;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(product) => product.id}
      contentContainerClassName="px-6 pt-4"
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={categories.isRefetching || products.isRefetching}
          onRefresh={() => {
            void categories.refetch();
            void products.refetch();
          }}
          tintColor={COLORS.brand}
        />
      }
      ListHeaderComponent={
        <View className="gap-4">
          <View className="h-[52px] flex-row items-center gap-3 rounded-xl border border-line bg-white px-4">
            <Ionicons name="search" size={18} color={COLORS.inkMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm món"
              placeholderTextColor={COLORS.inkMuted}
              returnKeyType="search"
              clearButtonMode="while-editing"
              className="flex-1 font-app text-sm text-ink"
            />
          </View>
          <View className="-mx-6">
            <CategoryChips categories={categories.data} selected={selected} onSelect={setSelected} />
          </View>
          <Text className="text-xs text-ink-muted">
            {products.data.length} món · {soldOut ? `${soldOut} hết hàng` : 'tất cả đang bán'}
          </Text>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View className="flex-row items-center justify-between pb-3 pt-6">
          <Text className="text-base font-semibold text-ink">
            {section.category.name}{' '}
            <Text className="text-sm text-ink-muted">({section.products.length})</Text>
          </Text>
          <Link
            href={{
              pathname: '/admin/menu/products/[id]',
              params: { id: 'new', categoryId: section.category.id },
            }}
            asChild
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Thêm món vào ${section.category.name}`}
              hitSlop={8}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Ionicons name="add" size={16} color={COLORS.brand} />
              <Text className="text-sm font-semibold text-brand">Thêm món</Text>
            </Pressable>
          </Link>
        </View>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length ? null : (
          <View className="items-center rounded-2xl border border-dashed border-line py-6">
            <Text className="text-sm text-ink-muted">Chưa có món</Text>
          </View>
        )
      }
      renderItem={({ item }) => <AdminProductRow product={item} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListEmptyComponent={<EmptyView text={searching ? 'Không tìm thấy món nào' : 'Chưa có món'} />}
    />
  );
}
