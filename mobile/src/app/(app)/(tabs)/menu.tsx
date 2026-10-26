import { Link } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { MOCK_PRODUCTS, formatVnd } from '@/constants/mock-data';

export default function MenuScreen() {
  return (
    <FlatList
      data={MOCK_PRODUCTS}
      keyExtractor={(item) => item.id}
      contentContainerClassName="gap-3 p-5"
      ListHeaderComponent={
        <Text className="mb-1 text-sm text-stone-500">
          Dữ liệu mẫu. Sẽ lấy từ GET /api/menu ở bước kết nối backend.
        </Text>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/products/[id]', params: { id: item.id } }} asChild>
          <Pressable className="flex-row items-center justify-between rounded-2xl bg-white p-4 active:opacity-80">
            <View className="gap-1">
              <Text className="text-base font-semibold text-stone-900">{item.name}</Text>
              <Text className="text-stone-500">{formatVnd(item.price)}</Text>
            </View>
            <Text className="text-2xl text-brand">›</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
