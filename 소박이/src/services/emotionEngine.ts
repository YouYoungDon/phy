import { Expense, EmotionContext, SobagiEmotion } from '../types';

/**
 * Pure. Builds the emotion context for a save, deciding whether "today's
 * context" (first-record welcome, current streak, wall-clock hour) applies.
 *
 * Real-time (today-dated) saves use today's context unchanged. Past-date
 * catch-up saves are intentionally QUIET: they must not borrow today's
 * first-visit welcome (the 'surprised' pool) or today's streak, and they read
 * the record's own hour (noon for back-dated records) rather than "now". A
 * salary logged for last Tuesday should feel like a calm note about that day,
 * not like today's first visit. See sub-spec C + the date-context QA pass.
 */
export function buildEmotionContext(params: {
  isSelectedDateToday: boolean;
  todayNonIncomeRecordCount: number;
  streak: number;
  nowHour: number;
  recordHour: number;
}): EmotionContext {
  if (params.isSelectedDateToday) {
    return {
      isFirstRecordToday: params.todayNonIncomeRecordCount === 0,
      currentStreak: params.streak,
      currentHour: params.nowHour,
    };
  }
  return {
    isFirstRecordToday: false,
    currentStreak: 0,
    currentHour: params.recordHour,
  };
}

export function evaluate(expense: Expense, ctx: EmotionContext): SobagiEmotion {
  if (expense.kind === 'income') {
    return evaluateIncome(expense, ctx);
  }
  // Spending chain — unchanged.
  if (ctx.isFirstRecordToday) return 'surprised';
  if (ctx.currentStreak >= 3) return 'excited';
  if (ctx.currentHour >= 22) return 'sleepy';
  if (expense.amount >= 50000) return 'soft-sad';
  if (expense.amount < 5000) return 'happy';
  return 'happy';
}

// Income emotion subroutine — intentionally 2 rules.
// Consults `currentHour` only. Must NOT consult amount, streak, isFirstRecordToday,
// or category. First-of-day on an income save would route to the 'surprised' pool
// ("처음 들렀네요 ✨") which reads as event/reward — contradicts the
// "something warm entered the day" tone target. See sub-spec C §3.
function evaluateIncome(_expense: Expense, ctx: EmotionContext): SobagiEmotion {
  if (ctx.currentHour >= 22) return 'sleepy';
  return 'happy';
}
