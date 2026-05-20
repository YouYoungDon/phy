import { ExpenseCategory } from '../types';

export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
  memoSuggestions: string[];
}

export const CATEGORIES: readonly ExpenseCategoryMeta[] = [
  { key: 'cafe',       label: '카페',     emoji: '☕',  inPicker: true,  memoSuggestions: ['아메리카노', '라떼', '디저트', '테이크아웃', '브런치'] },
  { key: 'home_meal',  label: '집밥',     emoji: '🍚',  inPicker: true,  memoSuggestions: ['장보기', '반찬', '과일', '간식', '밀키트'] },
  { key: 'dining_out', label: '외식',     emoji: '🍽️', inPicker: true,  memoSuggestions: ['떡볶이', '제육', '돈까스', '국밥', '마라탕', '초밥', '햄버거'] },
  { key: 'transport',  label: '이동',     emoji: '🚌',  inPicker: true,  memoSuggestions: ['지하철', '버스', '택시', '주유', '주차'] },
  { key: 'living',     label: '생활',     emoji: '🏠',  inPicker: true,  memoSuggestions: ['세제', '휴지', '생필품', '다이소', '편의점'] },
  { key: 'hobby',      label: '취미',     emoji: '🎀',  inPicker: true,  memoSuggestions: ['다꾸', '문구', '책', '영화', '전시', '게임'] },
  { key: 'gift',       label: '선물',     emoji: '🎁',  inPicker: true,  memoSuggestions: ['생일선물', '꽃', '편지', '포장', '기프티콘'] },
  { key: 'pet',        label: '반려동물', emoji: '🐾',  inPicker: true,  memoSuggestions: ['사료', '간식', '미용', '장난감', '병원'] },
  { key: 'travel',     label: '여행',     emoji: '✈️', inPicker: true,  memoSuggestions: ['숙소', '기차', '비행기', '맛집', '기념품'] },
  { key: 'health',     label: '병원',     emoji: '💊',  inPicker: true,  memoSuggestions: ['약', '진료', '검진', '영양제', '치료'] },
  { key: 'event',      label: '경조사',   emoji: '💌',  inPicker: true,  memoSuggestions: ['축의금', '부의금', '답례', '모임', '가족행사'] },
  { key: 'allowance',  label: '용돈',     emoji: '🫶',  inPicker: true,  memoSuggestions: ['부모님', '아이', '조카', '용돈', '챙김'] },
  { key: 'no_spend',   label: '무지출',   emoji: '🌿',  inPicker: false, memoSuggestions: [] },
] as const;

export const CATEGORY_BY_TOKEN: Record<ExpenseCategory, ExpenseCategoryMeta> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<ExpenseCategory, ExpenseCategoryMeta>;

export const PICKER_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.inPicker);

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
