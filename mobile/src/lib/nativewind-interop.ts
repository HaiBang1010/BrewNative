import { cssInterop } from 'nativewind';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/**
 * NativeWind only turns `className` into styles on React Native's own components.
 * Third-party components are registered here once, so screens can style them
 * with classes like any View. Imported by app/_layout.tsx.
 */
cssInterop(KeyboardAwareScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
