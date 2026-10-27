import { Tabs } from "expo-router/js-tabs";
import { CartButton } from "@/components/cart-button";
import { FloatingTabBar, tabBarIcon } from "@/components/floating-tab-bar";
import { COLORS, FONTS } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.inkMuted,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { fontFamily: FONTS.semibold, fontSize: 16, color: COLORS.ink },
        headerTitleAlign: "center",
        sceneStyle: { backgroundColor: COLORS.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          headerShown: false,
          tabBarIcon: tabBarIcon("home"),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: tabBarIcon("cafe"),
          headerRight: () => <CartButton />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Đơn hàng", tabBarIcon: tabBarIcon("receipt") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Tài khoản", tabBarIcon: tabBarIcon("person") }}
      />
    </Tabs>
  );
}
