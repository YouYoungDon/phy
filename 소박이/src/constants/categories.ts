import { ExpenseCategory, RecordKind } from '../types';

export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
  memoSuggestions: string[];
  kind: RecordKind;
}

export const CATEGORIES: readonly ExpenseCategoryMeta[] = [
  // ─── Spending (outgoing) ────────────────────────────────────────────────
  { key: 'cafe',                label: '카페',      emoji: '☕',   inPicker: true,  kind: 'spending', memoSuggestions: ['아메리카노', '라떼', '디저트', '테이크아웃', '브런치'] },
  { key: 'home_meal',           label: '집밥',      emoji: '🍚',   inPicker: true,  kind: 'spending', memoSuggestions: ['장보기', '반찬', '과일', '간식', '밀키트'] },
  { key: 'dining_out',          label: '외식',      emoji: '🍽️',  inPicker: true,  kind: 'spending', memoSuggestions: ['떡볶이', '제육', '돈까스', '국밥', '마라탕', '초밥', '햄버거'] },
  { key: 'transport',           label: '이동',      emoji: '🚌',   inPicker: true,  kind: 'spending', memoSuggestions: ['지하철', '버스', '택시', '주유', '주차'] },
  { key: 'living',              label: '생활',      emoji: '🏠',   inPicker: true,  kind: 'spending', memoSuggestions: ['세제', '휴지', '생필품', '다이소', '편의점'] },
  { key: 'hobby',               label: '취미',      emoji: '🎀',   inPicker: true,  kind: 'spending', memoSuggestions: ['다꾸', '문구', '책', '영화', '전시', '게임'] },
  { key: 'gift',                label: '선물',      emoji: '🎁',   inPicker: true,  kind: 'spending', memoSuggestions: ['생일선물', '꽃', '편지', '포장', '기프티콘'] },
  { key: 'pet',                 label: '반려동물',  emoji: '🐾',   inPicker: true,  kind: 'spending', memoSuggestions: ['사료', '간식', '미용', '장난감', '병원'] },
  { key: 'travel',              label: '여행',      emoji: '✈️',  inPicker: true,  kind: 'spending', memoSuggestions: ['숙소', '기차', '비행기', '맛집', '기념품'] },
  { key: 'health',              label: '병원',      emoji: '💊',   inPicker: true,  kind: 'spending', memoSuggestions: ['약', '진료', '검진', '영양제', '치료'] },
  { key: 'event',               label: '경조사',    emoji: '💌',   inPicker: true,  kind: 'spending', memoSuggestions: ['축의금', '부의금', '답례', '모임', '가족행사'] },
  { key: 'allowance',           label: '용돈',      emoji: '🫶',   inPicker: true,  kind: 'spending', memoSuggestions: ['부모님', '아이', '조카', '용돈', '챙김'] },
  { key: 'no_spend',            label: '무지출',    emoji: '🌿',   inPicker: false, kind: 'spending', memoSuggestions: [] },

  // ─── Income (incoming) — new in sub-spec A ──────────────────────────────
  { key: 'salary',              label: '월급',      emoji: '💼',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'bonus',               label: '보너스',    emoji: '✨',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'refund',              label: '환급',      emoji: '🧾',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'received_gift',       label: '선물 받음', emoji: '💝',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'received_allowance',  label: '용돈 받음', emoji: '🤲',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
] as const;

export const CATEGORY_BY_TOKEN: Record<ExpenseCategory, ExpenseCategoryMeta> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<ExpenseCategory, ExpenseCategoryMeta>;

export const SPENDING_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.kind === 'spending');

export const GENERAL_SPENDING_CATEGORIES: readonly ExpenseCategoryMeta[] =
  SPENDING_CATEGORIES.filter((c) => c.key !== 'no_spend');

export const INCOME_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.kind === 'income');

export function kindForCategory(c: ExpenseCategory): RecordKind {
  return CATEGORY_BY_TOKEN[c]?.kind ?? 'spending';
}

/**
 * "☕ 카페" — emoji-prefixed full label for in-list rendering (history card,
 * stats records list, monthly top line).
 */
export function formatCategoryWithEmoji(token: ExpenseCategory): string {
  const meta = CATEGORY_BY_TOKEN[token];
  return `${meta.emoji} ${meta.label}`;
}

/**
 * "카페" — bare label for the photocard records block where the design
 * already supplies its own visual context.
 */
export function formatCategoryLabel(token: ExpenseCategory): string {
  return CATEGORY_BY_TOKEN[token].label;
}
