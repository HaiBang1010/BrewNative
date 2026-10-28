import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { BrandSwitch } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useSetProductAvailable } from '@/hooks/admin-menu';
import type { Product } from '@/types/api';
import { errorMessage } from '@/utils/errors';
import { formatVnd } from '@/utils/format';

/**
 * One product in the admin menu list. Tapping it opens the edit form; the switch
 * marks it sold out at once, the most common change during a shift.
 */
export function AdminProductRow({ product }: { product: Product }) {
  const setAvailable = useSetProductAvailable();

  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-white p-3">
      <Link href={{ pathname: '/admin/menu/products/[id]', params: { id: product.id } }} asChild>
        <Pressable className="flex-1 flex-row items-center gap-3 active:opacity-70">
          <Image
            source={product.imageUrl}
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: COLORS.imagePlaceholder,
              opacity: product.isAvailable ? 1 : 0.5,
            }}
            contentFit="cover"
            transition={150}
          />
          <View className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
              {product.name}
            </Text>
            <Text className="text-sm text-ink-soft">{formatVnd(product.basePrice)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.inkMuted} />
        </Pressable>
      </Link>
      <View className="w-16 items-center gap-1">
        <BrandSwitch
          value={product.isAvailable}
          onChange={(isAvailable) =>
            setAvailable.mutate(
              { id: product.id, isAvailable },
              { onError: (error) => Alert.alert('Không đổi được', errorMessage(error)) },
            )
          }
          accessibilityLabel={`${product.name}: còn hàng`}
        />
        <Text className={`text-[10px] ${product.isAvailable ? 'text-success' : 'text-ink-muted'}`}>
          {product.isAvailable ? 'Còn hàng' : 'Hết hàng'}
        </Text>
      </View>
    </View>
  );
}

/** First load of the admin menu list. */
export function AdminMenuSkeleton() {
  return (
    <SkeletonGroup className="gap-3 px-5 pt-4">
      <Skeleton className="h-[52px] rounded-xl" />
      <Skeleton className="mt-3 h-5 w-32 rounded" />
      {Array.from({ length: 5 }, (_, i) => (
        <View key={i} className="flex-row items-center gap-3 rounded-2xl bg-white p-3">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/3 rounded" />
          </View>
          <Skeleton className="h-8 w-12 rounded-full" />
        </View>
      ))}
    </SkeletonGroup>
  );
}
