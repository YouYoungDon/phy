import { SobagiEmotion, Expense, RecordKind } from '../types';
import { DialogueTier, REACTION_POOLS, INCOME_REACTION_POOLS, OBSERVATION_POOLS } from '../constants/dialogue';
import { getLocalDateString, expenseLocalDate } from '../utils/date';

export type ObservationType = 'timeOfDay' | 'categoryWarm' | 'returnAfterGap' | 'quietDays';

export type { DialogueTier };

export function getDialogueTier(recordedDaysCount: number): DialogueTier {
  if (recordedDaysCount >= 30) return 3;
  if (recordedDaysCount >= 7)  return 2;
  return 1;
}

export function selectReactionMessage(
  emotion: SobagiEmotion,
  tier: DialogueTier,
  kind: RecordKind = 'spending',
): string {
  if (kind === 'income') {
    const pool = INCOME_REACTION_POOLS[tier];
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  }
  const pool = REACTION_POOLS[tier][emotion];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export function selectObservationMessage(type: ObservationType): string {
  const pool = OBSERVATION_POOLS[type];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

type ObservationContext = {
  expenses: Expense[];
  lastVisitDate: string | null;
  recordedDaysCount: number;
  savesSinceLastObservation: number;
  currentHour: number;
};

function getTimeZone(hour: number): 'morning' | 'afternoon' | 'evening' | 'lateNight' | 'night' {
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21)              return 'lateNight';
  return 'night';
}

function calendarDaysBetween(laterDateStr: string, earlierDateStr: string): number {
  const a = new Date(laterDateStr + 'T12:00:00').getTime();
  const b = new Date(earlierDateStr + 'T12:00:00').getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

// Returns an observation type, or null.
// returnAfterGap is forced (bypasses the 1-in-5 random gate) — it marks a meaningful moment.
// All other types fire ~1-in-5 and only when the behavioral signal is present.
export function detectObservationType(ctx: ObservationContext): ObservationType | null {
  if (ctx.recordedDaysCount < 7) return null;
  if (ctx.savesSinceLastObservation < 4) return null;

  const today = getLocalDateString(new Date());

  if (ctx.lastVisitDate !== null && ctx.lastVisitDate !== today) {
    if (calendarDaysBetween(today, ctx.lastVisitDate) >= 5) return 'returnAfterGap';
  }

  if (Math.random() >= 0.2) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);

  const recentExpenses = ctx.expenses.filter(
    (e) => expenseLocalDate(e) >= sevenDaysAgoStr,
  );

  const currentZone = getTimeZone(ctx.currentHour);
  const sameZoneCount = recentExpenses.filter(
    (e) => getTimeZone(new Date(e.createdAt).getHours()) === currentZone,
  ).length;
  if (sameZoneCount >= 3) return 'timeOfDay';

  const recent10 = ctx.expenses.slice(-10);
  const warmCount = recent10.filter(
    (e) => e.category === 'cafe' || e.category === 'home_meal' || e.category === 'dining_out',
  ).length;
  if (warmCount >= 6) return 'categoryWarm';

  const recentDays = new Set(
    recentExpenses.map((e) => expenseLocalDate(e)),
  ).size;
  if (recentDays < 3) return 'quietDays';

  return null;
}
