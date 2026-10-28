import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartButton } from '@/components/cart-button';
import {
  ALL_CATEGORIES,
  CategoryChips,
  CategoryChipsSkeleton,
} from '@/components/menu/category-chips';
import { ProductCard, ProductGridSkeleton } from '@/components/menu/product-card';
import { PromoBanner } from '@/components/menu/promo-banner';
import { EmptyView, ErrorView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useMe, useMenu, useStores } from '@/hooks/queries';
import { useLightStatusBar } from '@/hooks/status-bar';
import { useCart } from '@/stores/cart';
import { matchesSearch } from '@/utils/search';

/** How far the dark header reaches into the banner (half of its 140px). */
const BANNER_OVERLAP = 70;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function HomeScreen() {
  useLightStatusBar();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { data: me } = useMe();
  const { data: menu, error, isPending, isRefetching, refetch } = useMenu();
  const { data: stores } = useStores();
  const storeId = useCart((state) => state.storeId);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');

  const categories = useMemo(
    () => (menu ?? []).filter((c) => c.products.length > 0),
    [menu],
  );
  const products = useMemo(() => {
    return categories
      .filter((c) => category === ALL_CATEGORIES || c.id === category)
      .flatMap((c) => c.products)
      .filter((p) => matchesSearch(p.name, query));
  }, [categories, category, query]);

  // While loading, the header (search, banner) shows right away; chips and grid are skeletons.
  if (error && !menu) return <ErrorView error={error} onRetry={refetch} />;

  // The store picked in the cart, or the first one until the customer picks.
  const store = stores?.find((s) => s.id === storeId) ?? stores?.[0];
  const firstName = me?.fullName.split(' ').at(-1);

  const header = (
    <View className="gap-6 pb-1">
      <View
        className="gap-6 px-6"
        style={{
          paddingTop: insets.top + 24,
          paddingBottom: BANNER_OVERLAP,
          backgroundImage: 'linear-gradient(233deg, #111111 0%, #313131 100%)',
        }}
      >
        {/* Same dark color above the content, seen when pulling to refresh. */}
        <View className="absolute inset-x-0 -top-[1000px] h-[1000px] bg-night-deep" />

        <View className="gap-2">
          <Text className="text-xs tracking-wide text-ink-muted">
            {greeting()}
            {firstName ? `, ${firstName}` : ''} · Nhận tại
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="location-outline" size={14} color={COLORS.brand} />
            <Text className="shrink text-sm font-semibold text-[#D8D8D8]" numberOfLines={1}>
              {store?.name ?? 'Đang tải cửa hàng…'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-4">
          <View className="h-[52px] flex-1 flex-row items-center gap-2 rounded-xl bg-night-raised px-4">
            <Ionicons name="search-outline" size={20} color={COLORS.white} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm món"
              placeholderTextColor={COLORS.inkMuted}
              returnKeyType="search"
              autoCorrect={false}
              className="h-full flex-1 font-app text-sm text-white"
            />
            {query ? (
              <Ionicons
                name="close-circle"
                size={18}
                color={COLORS.inkMuted}
                onPress={() => setQuery('')}
                accessibilityLabel="Xóa tìm kiếm"
              />
            ) : null}
          </View>
          <CartButton variant="tile" />
        </View>
      </View>

      <View className="px-6" style={{ marginTop: -BANNER_OVERLAP }}>
        <PromoBanner />
      </View>

      {isPending ? (
        <CategoryChipsSkeleton />
      ) : (
        <CategoryChips categories={categories} selected={category} onSelect={setCategory} />
      )}
    </View>
  );

  return (
    <FlatList
      data={products}
      keyExtractor={(product) => product.id}
      numColumns={2}
      // Long lists: the header with the search field must stay mounted while typing.
      ListHeaderComponent={header}
      columnWrapperStyle={{ gap: 15, paddingHorizontal: 24 }}
      contentContainerStyle={{ gap: 15, paddingBottom: tabBarHeight + 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={COLORS.white}
        />
      }
      ListEmptyComponent={
        isPending ? (
          <ProductGridSkeleton />
        ) : (
          <EmptyView text={query ? 'Không tìm thấy món nào' : 'Menu đang trống'} />
        )
      }
      renderItem={({ item, index }) => (
        <>
          <ProductCard product={item} />
          {/* Keep the last card half-width when the count is odd. */}
          {index === products.length - 1 && products.length % 2 === 1 ? (
            <View className="flex-1" />
          ) : null}
        </>
      )}
    />
  );
}
