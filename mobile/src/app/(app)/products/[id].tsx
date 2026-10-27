import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { formatVnd } from '@/lib/format';
import { useProduct } from '@/lib/queries';
import type { OptionGroup } from '@/types/api';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, error, isPending, refetch } = useProduct(id);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="pb-10">
        <Image
          source={product.imageUrl}
          style={{ width: '100%', aspectRatio: 1, backgroundColor: '#f5f5f4' }}
          contentFit="cover"
          transition={200}
        />
        <View className="gap-6 p-5">
          <View className="gap-2">
            <Text className="text-2xl font-bold text-stone-900">{product.name}</Text>
            {product.description ? (
              <Text className="text-base text-stone-600">{product.description}</Text>
            ) : null}
            <Text className="text-xl font-semibold text-brand">
              {formatVnd(product.basePrice)}
            </Text>
          </View>

          {product.optionGroups.map((group) => (
            <OptionGroupView key={group.id} group={group} />
          ))}

          {/* Choosing options and adding to the cart come with the cart step. */}
          <Button title="Thêm vào giỏ (sắp có)" disabled={!product.isAvailable} />
        </View>
      </ScrollView>
    </>
  );
}

function OptionGroupView({ group }: { group: OptionGroup }) {
  const rule =
    group.minSelect === 0
      ? `Tùy chọn, tối đa ${group.maxSelect}`
      : group.minSelect === group.maxSelect
        ? `Chọn ${group.minSelect}`
        : `Chọn ${group.minSelect}–${group.maxSelect}`;

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-base font-semibold text-stone-900">{group.name}</Text>
        <Text className="text-sm text-stone-500">{rule}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {group.options.map((option) => (
          <View
            key={option.id}
            className={`rounded-full border border-stone-300 bg-white px-4 py-2 ${option.isAvailable ? '' : 'opacity-40'}`}
          >
            <Text className="text-stone-800">
              {option.name}
              {option.priceDelta > 0 ? ` +${formatVnd(option.priceDelta)}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
