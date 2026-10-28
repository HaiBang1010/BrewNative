import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '@/components/ui/chip';
import { ErrorView } from '@/components/ui/screen-state';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useSalesStats } from '@/hooks/admin-shop';
import type { SalesStats } from '@/types/api';
import { formatShortDate, formatVnd, formatVndShort } from '@/utils/format';

const PERIODS = [
  { days: 1, label: 'Hôm nay' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
];
const CHART_HEIGHT = 140;

/**
 * Admin: sales over a period. Only paid, not cancelled orders count, on the day
 * they were placed (Vietnam time). Refetches by itself when an order changes.
 */
export default function AdminStatsScreen() {
  const [days, setDays] = useState(7);
  const { data, error, isPending, isRefetching, isPlaceholderData, refetch } = useSalesStats(days);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerClassName="gap-4 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isPlaceholderData}
          onRefresh={() => void refetch()}
          tintColor={COLORS.brand}
        />
      }
    >
      <View className="flex-row gap-2">
        {PERIODS.map((period) => (
          <Chip
            key={period.days}
            label={period.label}
            selected={days === period.days}
            onPress={() => setDays(period.days)}
            className="flex-1"
          />
        ))}
      </View>

      {isPending ? (
        <StatsSkeleton />
      ) : error && !data ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : data ? (
        // Dimmed while another period loads over the previous one.
        <View className={`gap-4 ${isPlaceholderData ? 'opacity-50' : ''}`}>
          <Stats stats={data} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function Stats({ stats }: { stats: SalesStats }) {
  const period =
    stats.from === stats.to
      ? formatShortDate(stats.to)
      : `${formatShortDate(stats.from)} – ${formatShortDate(stats.to)}`;

  return (
    <>
      <Text className="text-xs text-ink-muted">{period} · chỉ tính đơn đã thanh toán, không bị huỷ</Text>

      <View className="flex-row flex-wrap gap-3">
        <Figure label="Doanh thu" value={formatVnd(stats.revenue)} highlight />
        <Figure label="Đơn hàng" value={String(stats.orders)} />
        <Figure label="Trung bình mỗi đơn" value={formatVnd(stats.averageOrder)} />
        <Figure label="Món đã bán" value={String(stats.itemsSold)} />
      </View>
      {stats.cancelledOrders > 0 ? (
        <Text className="px-1 text-xs text-ink-muted">
          {stats.cancelledOrders} đơn đã thanh toán bị quán huỷ và hoàn tiền (không tính vào doanh thu).
        </Text>
      ) : null}

      {stats.orders === 0 ? (
        <Card>
          <Text className="py-6 text-center text-sm text-ink-muted">Chưa có đơn nào trong khoảng này</Text>
        </Card>
      ) : (
        <>
          {/* Keyed by period: a new period starts on its last day. */}
          {stats.byDay.length > 1 ? <DayChart key={stats.from} days={stats.byDay} /> : null}
          <Card title="Bán chạy">
            {stats.topProducts.map((product, index) => (
              <BarRow
                key={product.productId ?? product.name}
                label={`${index + 1}. ${product.name}`}
                detail={`${product.quantity} ly/phần · ${formatVnd(product.revenue)}`}
                ratio={product.quantity / stats.topProducts[0].quantity}
              />
            ))}
          </Card>
          <Card title="Theo cửa hàng">
            {stats.byStore.map((store) => (
              <BarRow
                key={store.storeId}
                label={store.name}
                detail={`${formatVnd(store.revenue)} · ${store.orders} đơn`}
                ratio={store.revenue / stats.byStore[0].revenue}
              />
            ))}
          </Card>
        </>
      )}
    </>
  );
}

/** Revenue per day; tapping a bar shows that day's figures. */
function DayChart({ days }: { days: SalesStats['byDay'] }) {
  const [selected, setSelected] = useState(days.length - 1);
  const max = Math.max(...days.map((day) => day.revenue), 1);
  const day = days[Math.min(selected, days.length - 1)];

  return (
    <Card title="Doanh thu theo ngày">
      <Text className="text-sm text-ink-soft">
        <Text className="text-sm font-semibold text-ink">{formatShortDate(day.date)}</Text>
        {`: ${formatVnd(day.revenue)} · ${day.orders} đơn`}
      </Text>
      <View className="flex-row items-end" style={{ height: CHART_HEIGHT, gap: days.length > 14 ? 2 : 6 }}>
        {days.map((d, index) => (
          <Pressable
            key={d.date}
            accessibilityRole="button"
            accessibilityLabel={`${formatShortDate(d.date)}: ${formatVnd(d.revenue)}`}
            onPress={() => setSelected(index)}
            className="h-full flex-1 justify-end"
          >
            <View
              className={`rounded-t ${index === selected ? 'bg-brand' : 'bg-brand-200'}`}
              // At least a sliver, so days without sales still show on the axis.
              style={{ height: Math.max(3, (d.revenue / max) * CHART_HEIGHT) }}
            />
          </Pressable>
        ))}
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[10px] text-ink-muted">{formatShortDate(days[0].date)}</Text>
        <Text className="text-[10px] text-ink-muted">Cao nhất {formatVndShort(max)}</Text>
        <Text className="text-[10px] text-ink-muted">{formatShortDate(days[days.length - 1].date)}</Text>
      </View>
    </Card>
  );
}

function Figure({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    // Two per row: (100% - gap) / 2.
    <View className={`gap-1 rounded-2xl p-4 ${highlight ? 'bg-brand' : 'bg-white'}`} style={{ width: '48.3%' }}>
      <Text className={`text-xs ${highlight ? 'text-brand-100' : 'text-ink-muted'}`}>{label}</Text>
      <Text
        className={`text-lg font-semibold ${highlight ? 'text-white' : 'text-ink'}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function BarRow({ label, detail, ratio }: { label: string; detail: string; ratio: number }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="shrink text-sm font-semibold text-ink" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-xs text-ink-muted">{detail}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-surface">
        <View className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, ratio * 100)}%` }} />
      </View>
    </View>
  );
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl bg-white p-4">
      {title ? <Text className="text-base font-semibold text-ink">{title}</Text> : null}
      {children}
    </View>
  );
}

function StatsSkeleton() {
  return (
    <SkeletonGroup className="gap-4">
      <Skeleton className="h-3 w-48 rounded" />
      <View className="flex-row flex-wrap gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[76px] rounded-2xl" style={{ width: '48.3%' }} />
        ))}
      </View>
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </SkeletonGroup>
  );
}
