import { Expense, EmotionContext, SobagiEmotion } from '../types';

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
