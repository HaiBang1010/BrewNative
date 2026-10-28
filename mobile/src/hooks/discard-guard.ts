import { router, usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

/** For `leaving` when the blocked action itself does the leaving. */
const NOOP = () => undefined;

/**
 * For form screens: while `dirty`, leaving (back button, swipe back) first asks
 * whether to drop the changes. Returns `leave`, to leave without asking once
 * the form is saved: `leave()` goes back, `leave(() => router.replace(...))` goes elsewhere.
 */
export function useDiscardGuard(dirty: boolean) {
  // Set once leaving is allowed: the guard turns off on the next render, then the effect runs it.
  const [leaving, setLeaving] = useState<(() => void) | null>(null);

  usePreventRemove(dirty && !leaving, ({ repeat }) => {
    Alert.alert('Bỏ thay đổi?', 'Những gì bạn vừa sửa chưa được lưu.', [
      { text: 'Ở lại', style: 'cancel' },
      {
        text: 'Bỏ thay đổi',
        style: 'destructive',
        // repeat() turns the guard off and runs the blocked action (the back that was
        // stopped). Dispatching that action ourselves would be blocked again: the alert loops.
        // The state keeps the guard off too, as usePreventRemove expects.
        onPress: () => {
          setLeaving(() => NOOP);
          repeat();
        },
      },
    ]);
  });

  useEffect(() => {
    leaving?.();
  }, [leaving]);

  return useCallback((go: () => void = () => router.back()) => setLeaving(() => go), []);
}
