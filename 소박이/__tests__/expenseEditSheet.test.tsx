import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Persistence is the part most likely to regress when this sheet moves between
// screens, so stub the service and assert the exact update/delete calls.
jest.mock('../src/services/expenseService', () => ({
  updateExpense: jest.fn().mockResolvedValue(true),
  deleteExpense: jest.fn().mockResolvedValue(true),
}));

import { ExpenseEditSheet } from '../src/components/expense/ExpenseEditSheet';
import { updateExpense, deleteExpense } from '../src/services/expenseService';
import { Expense } from '../src/types';

const spending = (): Expense => ({
  id: 'e1',
  kind: 'spending',
  amount: 5000,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
  localDate: '2026-06-04',
});

beforeEach(() => {
  (updateExpense as jest.Mock).mockClear();
  (deleteExpense as jest.Mock).mockClear();
});

describe('ExpenseEditSheet', () => {
  it('commits an edit through expenseService.updateExpense with the edited fields', async () => {
    const onClose = jest.fn();
    const { getByDisplayValue, getByText } = render(
      <ExpenseEditSheet expense={spending()} onClose={onClose} />,
    );

    // The amount input is primed with the formatted current value.
    fireEvent.changeText(getByDisplayValue('5,000'), '7000');
    fireEvent.press(getByText('고쳐두기'));

    await waitFor(() =>
      expect(updateExpense).toHaveBeenCalledWith('e1', {
        amount: 7000,
        category: 'cafe',
        memo: undefined,
        kind: 'spending',
      }),
    );
  });

  it('deletes through expenseService.deleteExpense after the confirm step', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ExpenseEditSheet expense={spending()} onClose={onClose} />,
    );

    // Delete is two-step: trigger reveals the confirm, 지우기 commits.
    fireEvent.press(getByText('삭제'));
    fireEvent.press(getByText('지우기'));

    await waitFor(() => expect(deleteExpense).toHaveBeenCalledWith('e1'));
  });

  it('renders the delete-only no-spend variant without amount/category fields', () => {
    const onClose = jest.fn();
    const noSpend: Expense = { ...spending(), category: 'no_spend', amount: 0 };
    const { getByText, queryByText } = render(
      <ExpenseEditSheet expense={noSpend} onClose={onClose} />,
    );

    expect(getByText('무지출 기록')).toBeTruthy();
    expect(getByText('이 날은 무지출로 기록했어요 🌿')).toBeTruthy();
    // The editable form (save button) is hidden for no-spend; only delete remains.
    expect(queryByText('고쳐두기')).toBeNull();
    expect(getByText('삭제')).toBeTruthy();
  });
});
