import { View } from 'react-native';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

/**
 * First load of an order list, shaped like its cards.
 * `withActions`: the shop's cards, which end with a row of buttons.
 */
export function OrderListSkeleton({ withActions = false, count = 4 }: { withActions?: boolean; count?: number }) {
  return (
    <SkeletonGroup className="gap-3 px-5 pt-5">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="gap-2.5 rounded-2xl bg-white p-4">
          <View className="flex-row justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </View>
          <View className="flex-row justify-between">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </View>
          <Skeleton className="h-3 w-2/3 rounded" />
          {withActions ? (
            <View className="mt-1 flex-row gap-3">
              <Skeleton className="h-12 flex-1 rounded-2xl" />
              <Skeleton className="h-12 flex-1 rounded-2xl" />
            </View>
          ) : null}
        </View>
      ))}
    </SkeletonGroup>
  );
}
