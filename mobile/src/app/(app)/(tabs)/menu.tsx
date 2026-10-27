import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/screen-state';
import { formatVnd } from '@/utils/format';
import { useMenu } from '@/hooks/queries';
import type { Product } from '@/types/api';

export default function MenuScreen() {
  const { data, error, isPending, isRefetching, refetch } = useMenu();

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  // SectionList wants [{ title, data: [...] }]: one section per category.
  const sections = data
    .filter((category) => category.products.length > 0)
    .map((category) => ({ title: category.name, data: category.products }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-5 pb-8"
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#7C4A2D" />
      }
      renderSectionHeader={({ section }) => (
        <Text className="pb-2 pt-6 text-lg font-bold text-stone-900">{section.title}</Text>
      )}
      renderItem={({ item }) => <ProductRow product={item} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListEmptyComponent={<EmptyView text="Menu đang trống" />}
    />
  );
}

function ProductRow({ product }: { product: Product }) {
  return (
    <Link href={{ pathname: '/products/[id]', params: { id: product.id } }} asChild>
      <Pressable className="flex-row items-center gap-4 rounded-2xl bg-white p-3 active:opacity-80">
        <Image
          source={product.imageUrl}
          style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: '#f5f5f4' }}
          contentFit="cover"
          transition={200}
        />
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-stone-900">{product.name}</Text>
          {product.description ? (
            <Text className="text-sm text-stone-500" numberOfLines={1}>
              {product.description}
            </Text>
          ) : null}
          <Text className="font-semibold text-brand">
            {product.isAvailable ? formatVnd(product.basePrice) : 'Hết hàng'}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
