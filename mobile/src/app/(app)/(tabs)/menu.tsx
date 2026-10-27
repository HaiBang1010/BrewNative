import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { RefreshControl, SectionList, View } from 'react-native';
import { ProductCard } from '@/components/menu/product-card';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useMenu } from '@/hooks/queries';
import type { Product } from '@/types/api';

/** [a, b, c] → [[a, b], [c]]: SectionList has no columns, so each row is a pair. */
function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

/** The whole menu grouped by category, two products per row. */
export default function MenuScreen() {
  const { data, error, isPending, isRefetching, refetch } = useMenu();
  const tabBarHeight = useBottomTabBarHeight();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  // SectionList wants [{ title, data: [...] }]: one section per category.
  const sections = data
    .filter((category) => category.products.length > 0)
    .map((category) => ({ title: category.name, data: pairs(category.products) }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(row) => row.map((product) => product.id).join('+')}
      contentContainerClassName="px-6"
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.brand} />
      }
      renderSectionHeader={({ section }) => (
        <Text className="pb-4 pt-6 text-base font-semibold text-ink">{section.title}</Text>
      )}
      renderItem={({ item: row }) => <ProductRow products={row} />}
      ItemSeparatorComponent={() => <View className="h-[15px]" />}
      ListEmptyComponent={<EmptyView text="Menu đang trống" />}
    />
  );
}

function ProductRow({ products }: { products: Product[] }) {
  return (
    <View className="flex-row gap-[15px]">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      {/* An odd last product stays half-width. */}
      {products.length === 1 ? <View className="flex-1" /> : null}
    </View>
  );
}
