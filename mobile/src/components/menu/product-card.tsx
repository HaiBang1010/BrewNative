import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import type { Product } from '@/types/api';
import { formatVnd } from '@/utils/format';

/**
 * One cell of the 2-column menu grid. The whole card (including the + button)
 * opens the product: options like size must be chosen before adding to the cart.
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={{ pathname: '/products/[id]', params: { id: product.id } }} asChild>
      <Pressable className="flex-1 gap-2 rounded-2xl bg-white px-2 pb-3 pt-2 active:opacity-80">
        <View>
          <Image
            source={product.imageUrl}
            style={{ width: '100%', height: 128, borderRadius: 12, backgroundColor: COLORS.imagePlaceholder }}
            contentFit="cover"
            transition={200}
          />
          {!product.isAvailable ? (
            // Same corner badge as the rating badge of the design.
            <View className="absolute right-0 top-0 rounded-bl-3xl rounded-tr-xl bg-night-deep/60 px-3 py-1.5">
              <Text className="text-[10px] font-semibold text-white">Hết hàng</Text>
            </View>
          ) : null}
        </View>
        <View className="gap-2 px-1">
          <View className="gap-1">
            <Text className="text-base font-semibold text-ink" numberOfLines={1}>
              {product.name}
            </Text>
            <Text className="text-xs text-ink-muted" numberOfLines={1}>
              {product.description ?? ' '}
            </Text>
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <Text
              className="shrink text-base font-semibold text-ink-strong"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatVnd(product.basePrice)}
            </Text>
            <View
              className={`h-8 w-8 items-center justify-center rounded-lg ${product.isAvailable ? 'bg-brand' : 'bg-line'}`}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
