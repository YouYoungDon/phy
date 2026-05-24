import { useEffect } from 'react';
import { Image, AppState, AppStateStatus } from 'react-native';
import * as storageService from '../services/storageService';
import { runExpenseCategoryMigration } from '../services/expenseMigration';
import { normalizeExpense } from '../services/expenseService';
import { promoteStaged } from '../services/foundItemService';
import { checkAndDeliverLetters } from '../services/letterService';
import { checkForPlacement } from '../services/roomPresenceService';
import { STORAGE_KEYS } from '../constants/storage';
import { VALID_EMOTIONS, EMOTION_MESSAGES } from '../constants/emotion';
import {
  SOBAGI_DEFAULT_URI,
  SOBAGI_IMAGE_URIS,
  ROOM_BACKGROUND_URIS,
  UTILITY_ICON_URIS,
} from '../constants/assets';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore, getLevel, getRoomStage } from '../store/userStore';
import { useEmotionStore } from '../store/emotionStore';
import { Expense, UserState, SobagiEmotion } from '../types';
import { getLocalDateString, expenseLocalDate } from '../utils/date';

let appInitialized = false;
let prevVisitDate: string | null = null;

// Prefetch CDN-hosted character/room assets so the reaction screen never has
// to wait on a cold image fetch. Without this, navigating to /reaction with
// an emotion whose image hasn't been seen on the home screen yet produces a
// blank frame where Sobagi should be while the network request resolves —
// which reads as a delay between "save" and "Sobagi is there."
//
// Prefetch is purely an optimization: every asset has a working lazy-load
// fallback (the Image tag still resolves the URI on first render if cache is
// cold). So this function MUST NOT throw, reject, or otherwise affect app
// init. Three layers of isolation:
//   1. inner try/catch — Image.prefetch can throw synchronously on some
//      platforms / when the Image module is missing or stubbed.
//   2. .catch on the returned promise — async rejection (network failure,
//      malformed URI) becomes a no-op.
//   3. outer try/catch at call site — last-resort guard against an
//      unexpected throw from Object.values / iteration / anything else.
function prefetchHotAssets(): void {
  const safePrefetch = (uri: string | undefined): void => {
    if (uri == null || uri === '') return;
    try {
      const p = Image.prefetch(uri);
      if (p != null && typeof p.catch === 'function') {
        p.catch(() => {
          // CDN unreachable or asset missing — silently fall back to lazy load.
        });
      }
    } catch {
      // Image.prefetch threw synchronously — ignore and continue with the
      // remaining assets. Cold-load fallback applies for this URI only.
    }
  };
  safePrefetch(SOBAGI_DEFAULT_URI);
  for (const uri of Object.values(SOBAGI_IMAGE_URIS)) safePrefetch(uri);
  for (const uri of Object.values(UTILITY_ICON_URIS)) safePrefetch(uri);
  for (const uri of Object.values(ROOM_BACKGROUND_URIS)) safePrefetch(uri);
}

export function getPrevVisitDate(): string | null {
  return prevVisitDate;
}

function computeRecordedDaysCount(expenses: Expense[]): number {
  return new Set(expenses.map((e) => expenseLocalDate(e))).size;
}

// Refreshes the visit-date anchor when the app returns to the foreground.
// The RN process can stay alive across days while backgrounded; the one-time
// init in useAppInit won't re-run, so without this the `prevVisitDate` module
// var and the stored LAST_VISIT_DATE would go stale and returnAfterGap would
// mis-detect. Only updates when the local day has actually changed, so repeated
// same-day foregrounds are no-ops. Deliberately does NOT re-run found-item /
// placement / letter logic — those are tied to the first record of a day and
// re-running them here risks double-triggering.
async function refreshVisitState(): Promise<void> {
  try {
    const today = getLocalDateString(new Date());
    const storedVisitDate = await storageService.load<string>(STORAGE_KEYS.LAST_VISIT_DATE);
    if (storedVisitDate !== today) {
      prevVisitDate = storedVisitDate;
      void storageService.save(STORAGE_KEYS.LAST_VISIT_DATE, today);
    }
  } catch {
    // Best-effort — a missed refresh just leaves the prior (still-valid) anchor.
  }
}

export function useAppInit(): boolean {
  useEffect(() => {
    // Foreground listener — registered once, persists for the app lifetime
    // (useAppInit lives on the always-mounted root). Refreshes day-sensitive
    // visit state when the app re-activates after being backgrounded across a
    // day boundary. Registered outside the appInitialized guard so it survives
    // even if the heavy init already ran.
    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') void refreshVisitState();
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    if (appInitialized) return () => appStateSub.remove();
    appInitialized = true;

    // Kick prefetches off first so they overlap with storage I/O. They're
    // fire-and-forget; nothing below awaits them. The outer try/catch is the
    // last line of defense — if anything inside `prefetchHotAssets` throws
    // unexpectedly (Image module unavailable, asset map malformed, etc.),
    // init must still proceed.
    try {
      prefetchHotAssets();
    } catch {
      // Prefetch is purely opportunistic; lazy load always works as fallback.
    }

    async function loadStored() {
      try {
        await runExpenseCategoryMigration();

        const [userData, expenses, lastEmotionRaw] = await Promise.all([
          storageService.load<UserState>(STORAGE_KEYS.USER),
          storageService.load<Expense[]>(STORAGE_KEYS.EXPENSES),
          storageService.load<string>(STORAGE_KEYS.LAST_EMOTION),
        ]);

        const normalized = expenses ? expenses.map(normalizeExpense) : null;
        if (normalized) useExpenseStore.getState().hydrate(normalized);

        const recomputedDays = normalized ? computeRecordedDaysCount(normalized) : 0;
        if (userData) {
          // Always recompute recordedDaysCount from expenses for correctness.
          // This also handles users migrating from the old exp-based system.
          // Default rest fields when absent (legacy users predate them).
          useUserStore.getState().hydrate({
            ...userData,
            recordedDaysCount: recomputedDays,
            level: getLevel(recomputedDays),
            roomStage: getRoomStage(recomputedDays),
            pebbleCount: userData.pebbleCount ?? 0,
            restsToday: userData.restsToday ?? 0,
            lastRestDate: userData.lastRestDate ?? null,
            lastRestAt: userData.lastRestAt ?? null,
            // exp was removed — strip it from any legacy stored object
          });
        }

        await promoteStaged();
        // Found-item eval moved to saveExpense (first record of day).
        // App init only promotes already-staged items; it does not re-evaluate
        // triggers, so the eval fires exactly once per calendar day, tied to
        // the day's first meaningful record (spending or no-spend).

        const storedVisitDate = await storageService.load<string>(STORAGE_KEYS.LAST_VISIT_DATE);
        prevVisitDate = storedVisitDate;
        const today = getLocalDateString(new Date());
        void storageService.save(STORAGE_KEYS.LAST_VISIT_DATE, today);
        await checkAndDeliverLetters(recomputedDays);

        const emotion: SobagiEmotion =
          lastEmotionRaw != null && VALID_EMOTIONS.includes(lastEmotionRaw as SobagiEmotion)
            ? (lastEmotionRaw as SobagiEmotion)
            : 'happy';

        await checkForPlacement(emotion, recomputedDays, prevVisitDate, normalized ?? []);

        useEmotionStore.setState({
          currentEmotion: emotion,
          currentMessage: EMOTION_MESSAGES[emotion],
        });
      } catch {
        // Storage unavailable in sandbox — use default state
      }
    }

    loadStored();

    return () => appStateSub.remove();
  }, []);

  return true;
}
