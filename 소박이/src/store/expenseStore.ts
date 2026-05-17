import { create } from 'zustand';
import { Expense, ExpenseCategory } from '../types';
import { getLocalDateString } from '../utils/date';

interface ExpensePatch {
  amount: number;
  category: ExpenseCategory;
  memo?: string;
}

interface ExpenseStore {
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  getTodayExpenses: () => Expense[];
  hydrate: (expenses: Expense[]) => void;
  updateExpense: (id: string, patch: ExpensePatch) => void;
  deleteExpense: (id: string) => void;
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
  updateExpense: (id, patch) =>
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, amount: patch.amount, category: patch.category, memo: patch.memo } : e,
      ),
    })),
  deleteExpense: (id) =>
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
}));
