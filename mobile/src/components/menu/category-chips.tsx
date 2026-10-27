import { Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';

export const ALL_CATEGORIES = 'all';

type CategoryChipsProps = {
  categories: { id: string; name: string }[];
  /** A category id, or ALL_CATEGORIES. */
  selected: string;
  onSelect: (id: string) => void;
};

/** Horizontally scrolling category filter: "Tất cả" first, then each category. */
export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const items = [{ id: ALL_CATEGORIES, name: 'Tất cả' }, ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-4 px-6"
    >
      {items.map((category) => {
        const active = category.id === selected;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(category.id)}
            className={`rounded-md px-3 py-1.5 ${active ? 'bg-brand' : 'bg-line-light/60 active:bg-line-light'}`}
          >
            <Text className={`text-sm ${active ? 'font-semibold text-white' : 'text-ink-soft'}`}>
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
