import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// storageService pulls in @apps-in-toss/framework (a native module that can't
// load under jest), so stub it — the stores work off setState regardless.
jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(true),
}));

// useNavigation is the only side-effecting dependency; stub it so we can assert
// whether the screen tried to leave (navigation.reset = "go home / close").
const mockReset = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  createRoute: (_path: string, opts: { component: React.ComponentType }) => ({
    component: opts.component,
  }),
  useNavigation: () => ({ reset: mockReset }),
}));

import { Route } from '../src/pages/reaction';
import { useEmotionStore } from '../src/store/emotionStore';
import { useExpenseStore } from '../src/store/expenseStore';
import { useUserStore } from '../src/store/userStore';
import { getLocalDateString } from '../src/utils/date';
import { Expense } from '../src/types';

// The createRoute mock above returns { component } at runtime; the real type
// doesn't surface it, so reach through unknown.
const Screen = (Route as unknown as { component: React.ComponentType }).component;
const today = getLocalDateString(new Date());

const spending = (): Expense => ({
  id: 's1',
  kind: 'spending',
  amount: 5000,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
  localDate: today,
});

beforeEach(() => {
  jest.useFakeTimers();
  mockReset.mockReset();
  // A spending record on the context day makes the photocard button appear.
  useExpenseStore.setState({ expenses: [spending()] });
  useEmotionStore.setState({
    currentEmotion: 'happy',
    currentMessage: '오늘도 다녀왔네요',
    lastKind: 'spending',
    lastRecordDate: today,
  });
  useUserStore.setState({ recordedDaysCount: 1 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('reaction screen — press isolation', () => {
  it('pressing 포토카드 생성 opens the card and does NOT close the screen', () => {
    const { getByText } = render(<Screen />);
    // Photocard button reveals at 1000ms (and cancels the auto-dismiss).
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent.press(getByText('포토카드 생성'));

    // The button press must not bubble to the backdrop's handleClose...
    expect(mockReset).not.toHaveBeenCalled();
    // ...and the photocard modal must have opened (card content rendered).
    expect(getByText('🌱 오늘의 한 줄')).toBeTruthy();
  });

  it('tapping the reaction card content does NOT close the screen', () => {
    const { getByText } = render(<Screen />);
    // The Sobagi message lives inside the content card, which absorbs presses.
    fireEvent.press(getByText('오늘도 다녀왔네요'));
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('pressing 나중에 할게요 returns home', () => {
    const { getByText } = render(<Screen />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent.press(getByText('나중에 할게요'));

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
