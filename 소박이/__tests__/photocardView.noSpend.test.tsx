import React from 'react';
import { render } from '@testing-library/react-native';
import { PhotocardView } from '../src/components/photocard/PhotocardView';

describe('PhotocardView — no-spend record line', () => {
  it('shows a single 무지출 line and no amount for a no-spend-only card', () => {
    const { getByText, queryByText } = render(
      <PhotocardView
        quote="오늘은 조용히 지나간 하루 🌿"
        dateStr="2026.05.24"
        weekdayLabel="일요일"
        records={[
          { id: 'n1', category: 'no_spend', categoryLabel: '무지출', amount: 0, kind: 'spending' },
        ]}
      />,
    );
    // The no-spend record line is present (Problem 4: it used to be omitted).
    expect(getByText('무지출')).toBeTruthy();
    // ...with no money column — a 🌿 day must never read as ₩0.
    expect(queryByText(/₩/)).toBeNull();
  });

  it('still renders the amount column for a spending record', () => {
    const { getByText } = render(
      <PhotocardView
        quote="q"
        dateStr="2026.05.24"
        records={[
          { id: 's1', category: 'cafe', categoryLabel: '카페', amount: 5000, kind: 'spending' },
        ]}
      />,
    );
    expect(getByText(/₩/)).toBeTruthy();
  });
});
