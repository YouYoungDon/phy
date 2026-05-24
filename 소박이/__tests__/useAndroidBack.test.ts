import { BackHandler } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useAndroidBack } from '../src/hooks/useAndroidBack';

describe('useAndroidBack', () => {
  let handler: (() => boolean) | null;
  let removeSpy: jest.Mock;
  let addSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = null;
    removeSpy = jest.fn();
    addSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_event, cb) => {
        handler = cb as () => boolean;
        return { remove: removeSpy };
      });
  });

  afterEach(() => {
    addSpy.mockRestore();
  });

  it('registers a handler when active, runs onBack, and consumes the event', () => {
    const onBack = jest.fn();
    renderHook(() => useAndroidBack(true, onBack));
    expect(addSpy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    expect(handler).not.toBeNull();
    const consumed = handler?.();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(consumed).toBe(true); // true = default back suppressed
  });

  it('does not register a handler when inactive (default back untouched)', () => {
    renderHook(() => useAndroidBack(false, jest.fn()));
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    renderHook(() => useAndroidBack(true, jest.fn())).unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('runs the latest onBack without re-subscribing while active stays true', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      (props: { cb: () => void }) => useAndroidBack(true, props.cb),
      { initialProps: { cb: first } },
    );
    rerender({ cb: second });
    expect(addSpy).toHaveBeenCalledTimes(1); // active unchanged → no re-subscribe
    handler?.();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
