import { Expense } from '../types';
import {
  hasCategoryPattern,
  hasNightPattern,
  type CategoryPatternOpts,
  type NightPatternOpts,
} from './roomPresenceService';
import { computeCalmDayCount } from './atmosphereService';

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

/**
 * Pure. Returns ONE observation string for the Stats screen. Priority:
 *   1. cafe pattern detected     → "요즘 카페에 자주 들렀네요 ☕"
 *   2. night pattern detected    → "밤에도 종종 기록했네요 🌙"
 *   3. calm-day count >= 4       → "차분한 날이 자주 있었어요 🍃"
 *   4. streak >= 7               → "요즘 자주 들르고 있어요 🌿"
 *   5. streak >= 3               → "꾸준히 들르고 있어요 🌿"
 *   6. streak >= 1               → "오늘도 잠깐 들렀네요 🍃"
 *   7. default                   → "가끔씩 들러도 괜찮아요 🌿"
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
  if (streak >= 7) return '요즘 자주 들르고 있어요 🌿';
  if (streak >= 3) return '꾸준히 들르고 있어요 🌿';
  if (streak >= 1) return '오늘도 잠깐 들렀네요 🍃';
  return '가끔씩 들러도 괜찮아요 🌿';
}
