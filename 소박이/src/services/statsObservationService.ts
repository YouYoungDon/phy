import { Expense } from '../types';
import {
  hasCategoryPattern,
  hasNightPattern,
  type CategoryPatternOpts,
  type NightPatternOpts,
} from './roomPresenceService';
import { computeCalmDayCount } from './atmosphereService';
import { getLocalDateString } from '../utils/date';

// ─── Stats observation — single rotating line ───────────────────────────────
//
// Picks ONE observation string from a priority chain. Lifestyle texture
// (cafe / night / calm) wins over consistency signals (streak tiers). The
// streak fallback absorbs what used to be a separate streak surface — there
// is no other observation line elsewhere on the Stats screen.

// Mirrors the cafe trigger used in roomPresenceService.checkForPlacement (P-path).
const CAFE_PATTERN_OPTS: CategoryPatternOpts = {
  minCount: 3,
  minDistinctDays: 3,
  windowDays: 14,
};

// Mirrors the NIGHT_TRIGGER defined in roomPresenceService (L-path).
const NIGHT_PATTERN_OPTS: NightPatternOpts = {
  startHour: 19,
  endHour: 4,
  minCount: 3,
  minDistinctDays: 3,
  windowDays: 14,
};

const CALM_OBSERVATION_THRESHOLD = 4;

const INCOME_OBSERVATION_THRESHOLD = 2;
const INCOME_OBSERVATION_WINDOW_DAYS = 30;

function computeIncomeDayCount(expenses: Expense[], today: string): number {
  const cutoffDate = new Date(today + 'T12:00:00');
  cutoffDate.setDate(cutoffDate.getDate() - INCOME_OBSERVATION_WINDOW_DAYS + 1);
  const cutoff = getLocalDateString(cutoffDate);

  const incomeDays = new Set<string>();
  for (const e of expenses) {
    if (e.kind !== 'income') continue;
    const day = getLocalDateString(new Date(e.createdAt));
    if (day < cutoff || day > today) continue;
    incomeDays.add(day);
  }
  return incomeDays.size;
}

/**
 * Pure. Returns ONE observation string for the Stats screen. Priority:
 *   1. cafe pattern detected     → "요즘 카페에 자주 들렀네요 ☕"
 *   2. night pattern detected    → "밤에도 종종 기록했네요 🌙"
 *   3. calm-day count >= 4       → "차분한 날이 자주 있었어요 🍃"
 *   4. income days >= 2 (30d)    → "들어온 일이 종종 있었어요 🍃"
 *   5. streak >= 7               → "요즘 자주 들르고 있어요 🌿"
 *   6. streak >= 3               → "꾸준히 들르고 있어요 🌿"
 *   7. streak >= 1               → "오늘도 잠깐 들렀네요 🍃"
 *   8. default                   → "가끔씩 들러도 괜찮아요 🌿"
 *
 * `today` is a YYYY-MM-DD local-date string (matches `getLocalDateString`).
 */
export function selectStatsObservation(
  expenses: Expense[],
  streak: number,
  today: string,
): string {
  if (hasCategoryPattern(expenses, 'cafe', CAFE_PATTERN_OPTS, today)) {
    return '요즘 카페에 자주 들렀네요 ☕';
  }
  if (hasNightPattern(expenses, NIGHT_PATTERN_OPTS, today)) {
    return '밤에도 종종 기록했네요 🌙';
  }
  if (computeCalmDayCount(expenses, today) >= CALM_OBSERVATION_THRESHOLD) {
    return '차분한 날이 자주 있었어요 🍃';
  }
  if (computeIncomeDayCount(expenses, today) >= INCOME_OBSERVATION_THRESHOLD) {
    return '들어온 일이 종종 있었어요 🍃';
  }
  if (streak >= 7) return '요즘 자주 들르고 있어요 🌿';
  if (streak >= 3) return '꾸준히 들르고 있어요 🌿';
  if (streak >= 1) return '오늘도 잠깐 들렀네요 🍃';
  return '가끔씩 들러도 괜찮아요 🌿';
}
