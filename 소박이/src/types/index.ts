export type SobagiEmotion = 'happy' | 'excited' | 'surprised' | 'sleepy' | 'soft-sad';

export type ExpenseCategory =
  | 'cafe'
  | 'home_meal'
  | 'dining_out'
  | 'transport'
  | 'living'
  | 'gift'
  | 'hobby'
  | 'pet'
  | 'travel'
  | 'health'
  | 'event'
  | 'allowance'
  | 'no_spend';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  userEmotion?: string;   // emoji the user selected
  memo?: string;
  sobagiEmotion: SobagiEmotion;
  createdAt: string;      // ISO string, local time used for display
}

export interface UserState {
  level: number;
  streak: number;
  totalRecordCount: number;
  recordedDaysCount: number;
  roomStage: 1 | 2 | 3 | 4 | 5;
}

export interface EmotionContext {
  isFirstRecordToday: boolean;
  currentStreak: number;
  currentHour: number;    // 0–23, device local time
}
