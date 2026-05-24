import { Storage } from '@apps-in-toss/framework';

declare const __DEV__: boolean;

const SAVE_RETRY_ATTEMPTS = 2;

/**
 * Persists `value` under `key`. Returns true on success, false if the write
 * ultimately failed. Serialization failures (circular refs, etc.) are not
 * retried — they can't succeed on a second pass. Storage write failures are
 * retried once, since they're often transient (storage momentarily busy).
 *
 * Returning a boolean gives callers an error path; existing `void`-prefixed
 * callers are unaffected (the value is simply discarded). The in-memory store
 * remains the source of truth during a session, and app init recomputes
 * derived state from the persisted expense array, so a single dropped write
 * degrades gracefully rather than corrupting state.
 */
export async function save<T>(key: string, value: T): Promise<boolean> {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    if (__DEV__) {
      console.warn('[storageService] serialize failed (not retried):', error);
    }
    return false;
  }

  for (let attempt = 1; attempt <= SAVE_RETRY_ATTEMPTS; attempt++) {
    try {
      await Storage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn(
          `[storageService] setItem failed (attempt ${attempt}/${SAVE_RETRY_ATTEMPTS}):`,
          error,
        );
      }
    }
  }
  return false;
}

export async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await Storage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    if (__DEV__) {
      console.warn('[storageService] getItem failed:', error);
    }
    return null;
  }
}
