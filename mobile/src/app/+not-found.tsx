import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy', headerShown: true }} />
      <View className="flex-1 items-center justify-center gap-4 bg-stone-50 px-8">
        <Text className="text-xl font-bold text-stone-900">Trang này không tồn tại</Text>
        {/* className goes on the child: Link itself isn't styled by NativeWind. */}
        <Link href="/" asChild>
          <Text className="font-semibold text-brand">Về trang chủ</Text>
        </Link>
      </View>
    </>
  );
}
