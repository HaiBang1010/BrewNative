import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type ComingSoonProps = {
  title: string;
  /** What this screen will do and in which step of docs/project-overview.md. */
  description: string;
  children?: ReactNode;
};

/** Placeholder body for screens that are only part of the navigation skeleton so far. */
export function ComingSoon({ title, description, children }: ComingSoonProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-stone-50 px-8">
      <Text className="text-xl font-bold text-stone-900">{title}</Text>
      <Text className="text-center text-base text-stone-500">{description}</Text>
      {children ? <View className="mt-4 w-full gap-3">{children}</View> : null}
    </View>
  );
}
