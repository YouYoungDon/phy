import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// useNavigation is the only side-effecting dependency. Tabs must SWITCH, not
// stack: on a native-stack router, navigate() pushes a new screen for any route
// not already in the stack, so hopping 홈→기록→통계 accumulates [/, /record,
// /stats] and hardware-back walks the history one screen at a time. The fix
// collapses to the home base (popToTop) before pushing the target once, so the
// stack never grows past [home] or [home, subtab].
const mockNavigate = jest.fn();
const mockPopToTop = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, popToTop: mockPopToTop }),
}));

import { BottomTabs } from '../src/components/common/BottomTabs';

beforeEach(() => {
  mockNavigate.mockReset();
  mockPopToTop.mockReset();
});

describe('BottomTabs — tab switching does not stack screens', () => {
  it('tapping a sub-tab from home collapses to base then pushes it once', () => {
    const { getByText } = render(<BottomTabs activeRoute="/" />);

    fireEvent.press(getByText('기록'));

    expect(mockPopToTop).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/record');
  });

  it('tapping a different sub-tab collapses to home base first (no accumulation)', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('통계'));

    expect(mockPopToTop).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/stats');
  });

  it('tapping 홈 from a sub-tab returns to the base without a push', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('홈'));

    expect(mockPopToTop).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('tapping the already-active tab does nothing', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('기록'));

    expect(mockPopToTop).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
