import { ExpenseCategory } from '../types';

export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
}

export const CATEGORIES: readonly ExpenseCategoryMeta[] = [
  { key: 'cafe',       label: '카페',     emoji: '☕',  inPicker: true },
  { key: 'home_meal',  label: '집밥',     emoji: '🍚',  inPicker: true },
  { key: 'dining_out', label: '외식',     emoji: '🍽️', inPicker: true },
  { key: 'transport',  label: '이동',     emoji: '🚌',  inPicker: true },
  { key: 'living',     label: '생활',     emoji: '🏠',  inPicker: true },
  { key: 'hobby',      label: '취미',     emoji: '🎀',  inPicker: true },
  { key: 'gift',       label: '선물',     emoji: '🎁',  inPicker: true },
  { key: 'pet',        label: '반려동물', emoji: '🐾',  inPicker: true },
  { key: 'travel',     label: '여행',     emoji: '✈️', inPicker: true },
  { key: 'health',     label: '병원',     emoji: '💊',  inPicker: true },
  { key: 'event',      label: '경조사',   emoji: '💌',  inPicker: true },
  { key: 'allowance',  label: '용돈',     emoji: '🫶',  inPicker: true },
  { key: 'no_spend',   label: '무지출',   emoji: '🌿',  inPicker: false },
] as const;

export const CATEGORY_BY_TOKEN: Partial<Record<ExpenseCategory, ExpenseCategoryMeta>> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const PICKER_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.inPicker);

/**
 * "☕ 카페" — emoji-prefixed full label for in-list rendering (history card,
 * stats records list, monthly top line). Falls back to the raw token when an
 * unknown category sneaks through (shouldn't happen post-migration, but
 * stays defensive).
 */
export function formatCategoryWithEmoji(token: ExpenseCategory): string {
  const meta = CATEGORY_BY_TOKEN[token];
  return meta ? `${meta.emoji} ${meta.label}` : token;
}

/**
 * "카페" — bare label for the photocard records block where the design
 * already supplies its own visual context.
 */
export function formatCategoryLabel(token: ExpenseCategory): string {
  return CATEGORY_BY_TOKEN[token]?.label ?? token;
}
