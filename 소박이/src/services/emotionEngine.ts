import { Expense, EmotionContext, SobagiEmotion } from '../types';

export function evaluate(expense: Expense, ctx: EmotionContext): SobagiEmotion {
  if (ctx.isFirstRecordToday) return 'surprised';
  if (ctx.currentStreak >= 3) return 'excited';
  if (ctx.currentHour >= 22) return 'sleepy';
  if (expense.amount >= 50000) return 'soft-sad';
  if (expense.amount < 5000) return 'happy';
  return 'happy';
}
