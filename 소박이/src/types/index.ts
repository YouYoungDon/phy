export type SobagiEmotion = 'happy' | 'excited' | 'surprised' | 'sleepy' | 'soft-sad';

/**
 * Distinguishes outgoing-money records (spending) from incoming-money records
 * (income). The authoritative source of truth is `kindForCategory(category)`
 * from the registry. `Expense.kind` is a denormalized cache for fast filtering
 * and may be absent in legacy records — hydration repairs missing or
 * mismatched values at read time.
 */
export type RecordKind = 'spending' | 'income';

export type ExpenseCategory =
  // outgoing scenes
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
  | 'no_spend'
  // incoming scenes (new in sub-spec A)
  | 'salary'
  | 'bonus'
  | 'refund'
  | 'received_gift'
  | 'received_allowance';

export interface Expense {
  id: string;
  /**
   * Denormalized convenience cache. Authoritative source is
   * `kindForCategory(category)` from the registry. Optional because legacy
   * records pre-dating sub-spec A do not have this field; hydration fills it
   * in at read time. New records (post sub-spec A) always set this explicitly.
   */
  kind?: RecordKind;
  amount: number;
  category: ExpenseCategory;
  userEmotion?: string;
  memo?: string;
  sobagiEmotion: SobagiEmotion;
  createdAt: string;
  /**
   * The local calendar date (YYYY-MM-DD) captured at record creation, in the
   * device timezone at that moment. Day-grouping should prefer this over
   * re-deriving from `createdAt` (which is UTC and shifts if the device tz
   * changes between recording and viewing). Optional because legacy records
   * pre-date it — `expenseLocalDate()` falls back to deriving from `createdAt`
   * when absent. Read everywhere via that helper, never directly.
   */
  localDate?: string;
}

export interface UserState {
  level: number;
  streak: number;
  totalRecordCount: number;
  recordedDaysCount: number;
  roomStage: 1 | 2 | 3 | 4 | 5;
  pebbleCount: number;
  restsToday: number;
  lastRestDate: string | null;
  lastRestAt: string | null;
}

export interface EmotionContext {
  isFirstRecordToday: boolean;
  currentStreak: number;
  currentHour: number;
}
