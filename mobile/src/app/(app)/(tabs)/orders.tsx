import { Link } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { MOCK_ORDERS, formatVnd } from '@/constants/mock-data';

export default function OrdersScreen() {
  return (
    <FlatList
      data={MOCK_ORDERS}
      keyExtractor={(item) => item.id}
      contentContainerClassName="gap-3 p-5"
      ListHeaderComponent={
        <Text className="mb-1 text-sm text-stone-500">
          Dữ liệu mẫu. Sẽ lấy từ GET /api/orders ở bước kết nối backend.
        </Text>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/orders/[id]', params: { id: item.id } }} asChild>
          <Pressable className="flex-row items-center justify-between rounded-2xl bg-white p-4 active:opacity-80">
            <View className="gap-1">
              <Text className="text-base font-semibold text-stone-900">{item.code}</Text>
              <Text className="text-stone-500">{item.status}</Text>
            </View>
            <Text className="font-semibold text-stone-900">{formatVnd(item.total)}</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
