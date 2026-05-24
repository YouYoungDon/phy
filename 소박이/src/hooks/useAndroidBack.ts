import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/**
 * Runs `onBack` on Android hardware-back while `active` is true, and consumes
 * the event (returns true) so the default route-back / app-exit does NOT also
 * fire. Use it to make hardware back close an open overlay (sheet, modal,
 * picker) before falling through to navigation.
 *
 * No-op on iOS — `BackHandler` never emits 'hardwareBackPress' there, so the
 * listener simply never fires.
 *
 * `onBack` is read through a ref so the latest closure always runs without
 * re-subscribing every render; the listener is only (un)registered when
 * `active` flips. When `active` is false the default back behavior is left
 * entirely untouched.
 */
export function useAndroidBack(active: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackRef.current();
      return true;
    });
    return () => sub.remove();
  }, [active]);
}
