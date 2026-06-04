import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// useNavigation is the only side-effecting dependency. Tabs must SWITCH, not
// stack: on a native-stack router, navigate() pushes a new screen for any route
// not already in the stack, so hopping 홈→기록→통계 accumulates [/, /record,
// /stats] and hardware-back walks the history one screen at a time. The fix
// collapses to the home base with navigate('/') (which pops back to the existing
// home rather than pushing) before pushing the target once, so the stack never
// grows past [home] or [home, subtab]. We avoid popToTop() because POP_TO_TOP
// is not handled by this router ("not handled by any navigator").
const mockNavigate = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { BottomTabs } from '../src/components/common/BottomTabs';

beforeEach(() => {
  mockNavigate.mockReset();
});

describe('BottomTabs — tab switching does not stack screens', () => {
  it('tapping a sub-tab from home collapses to the home base then pushes it once', () => {
    const { getByText } = render(<BottomTabs activeRoute="/" />);

    fireEvent.press(getByText('기록'));

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/record');
  });

  it('tapping a different sub-tab collapses to home base first (no accumulation)', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('통계'));

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/stats');
  });

  it('tapping 홈 from a sub-tab returns to the base without a second push', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('홈'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('tapping the already-active tab does nothing', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('기록'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
