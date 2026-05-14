import { create } from 'zustand';
import { Expense } from '../types';
import { getLocalDateString } from '../utils/date';

interface ExpenseStore {
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  getTodayExpenses: () => Expense[];
  hydrate: (expenses: Expense[]) => void;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  expenses: [],
  addExpense: (expense) =>
    set((state) => ({ expenses: [...state.expenses, expense] })),
  getTodayExpenses: () => {
    const todayStr = getLocalDateString(new Date());
    return get().expenses.filter((e) => getLocalDateString(new Date(e.createdAt)) === todayStr);
  },
  hydrate: (expenses) => set({ expenses }),
}));
