import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// useNavigation is the only side-effecting dependency. Tabs must SWITCH, not
// stack. The earlier approaches (navigate() pushing, or navigate('/') then
// navigate(subtab)) left history traces on this router, so hopping tabs made
// hardware-back replay previous tabs. The fix resets the stack with one atomic
// reset(): home alone, or [home, subtab] so a sub-tab's back lands on home.
const mockReset = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

import { BottomTabs } from '../src/components/common/BottomTabs';

beforeEach(() => {
  mockReset.mockReset();
});

describe('BottomTabs — tab switching resets instead of stacking', () => {
  it('tapping a sub-tab from home resets to [home, subtab] (back → home)', () => {
    const { getByText } = render(<BottomTabs activeRoute="/" />);

    fireEvent.press(getByText('기록'));

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({ index: 1, routes: [{ name: '/' }, { name: '/record' }] });
  });

  it('tapping a different sub-tab resets to [home, subtab] (no accumulation)', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('통계'));

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({ index: 1, routes: [{ name: '/' }, { name: '/stats' }] });
  });

  it('tapping 홈 from a sub-tab resets to [home] alone', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('홈'));

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: '/' }] });
  });

  it('tapping the already-active tab does nothing', () => {
    const { getByText } = render(<BottomTabs activeRoute="/record" />);

    fireEvent.press(getByText('기록'));

    expect(mockReset).not.toHaveBeenCalled();
  });
});
