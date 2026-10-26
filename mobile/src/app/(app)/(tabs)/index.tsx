import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-5 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <View>
        <Text className="text-base text-stone-500">Chào buổi sáng 👋</Text>
        <Text className="text-3xl font-extrabold text-stone-900">Hôm nay uống gì?</Text>
      </View>

      <View className="gap-3 rounded-3xl bg-brand p-6">
        <Text className="text-lg font-bold text-white">Đặt trước, khỏi xếp hàng</Text>
        <Text className="text-brand-100">
          Chọn món, thanh toán trong app, quán báo khi đồ uống sẵn sàng.
        </Text>
        <Link href="/menu" asChild>
          <Pressable className="self-start rounded-full bg-white px-4 py-2 active:opacity-80">
            <Text className="font-semibold text-brand">Xem menu</Text>
          </Pressable>
        </Link>
      </View>

      <Link href="/cart" asChild>
        <Button title="Mở giỏ hàng" variant="outline" />
      </Link>
    </ScrollView>
  );
}
