import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";
import { CartButton } from "@/components/cart-button";
import type { ComponentProps } from "react";

type IconProps = ComponentProps<typeof Ionicons>;

function tabIcon(name: IconProps["name"]) {
  return ({ color, size }: { color: IconProps["color"]; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7C4A2D",
        tabBarInactiveTintColor: "#a8a29e",
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: "#fafaf9" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          headerShown: false,
          tabBarIcon: tabIcon("home-outline"),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: tabIcon("cafe-outline"),
          headerRight: () => <CartButton />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Đơn hàng", tabBarIcon: tabIcon("receipt-outline") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Tài khoản", tabBarIcon: tabIcon("person-outline") }}
      />
    </Tabs>
  );
}
