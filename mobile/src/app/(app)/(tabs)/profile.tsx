import { Link } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/ui/coming-soon';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { signOut } = useAuth();

  return (
    <ComingSoon
      title="Tài khoản"
      description="Hồ sơ, ảnh đại diện và đổi mật khẩu (bước 2 và 5)."
    >
      <View className="gap-3">
        <Link href="/chat" asChild>
          <Button title="Chat với quán" variant="outline" />
        </Link>
        <Button title="Đăng xuất" onPress={signOut} />
      </View>
    </ComingSoon>
  );
}
