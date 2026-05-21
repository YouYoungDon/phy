import {
  computePebbleDelta,
  findCrossedLetterThresholds,
  getEffectiveRestsToday,
  canRest,
  PEBBLE_MIN,
  PEBBLE_MAX,
  REST_DAILY_CAP,
} from '../src/services/restService';

type ThresholdItem = { id: string; triggerPebbles: number };

describe('computePebbleDelta', () => {
  it('returns a value within [PEBBLE_MIN, PEBBLE_MAX]', () => {
    for (let i = 0; i < 200; i++) {
      const v = computePebbleDelta();
      expect(v).toBeGreaterThanOrEqual(PEBBLE_MIN);
      expect(v).toBeLessThanOrEqual(PEBBLE_MAX);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('PEBBLE_MIN is 5 and PEBBLE_MAX is 20', () => {
    expect(PEBBLE_MIN).toBe(5);
    expect(PEBBLE_MAX).toBe(20);
  });
});

describe('findCrossedLetterThresholds', () => {
  const letters: ThresholdItem[] = [
    { id: 'a', triggerPebbles: 30 },
    { id: 'b', triggerPebbles: 100 },
    { id: 'c', triggerPebbles: 250 },
  ];

  it('returns empty array when no threshold crossed', () => {
    expect(findCrossedLetterThresholds(letters, 10, 25)).toEqual([]);
  });

  it('returns single letter when one threshold crossed', () => {
    const result = findCrossedLetterThresholds(letters, 20, 35);
    expect(result.map((l) => l.id)).toEqual(['a']);
  });

  it('returns multiple letters when several thresholds crossed in one watch', () => {
    const result = findCrossedLetterThresholds(letters, 20, 110);
    expect(result.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('does not re-deliver a letter when already past its threshold', () => {
    expect(findCrossedLetterThresholds(letters, 50, 70)).toEqual([]);
  });

  it('boundary: exactly hitting a threshold counts as crossing', () => {
    const result = findCrossedLetterThresholds(letters, 29, 30);
    expect(result.map((l) => l.id)).toEqual(['a']);
  });

  it('boundary: leaving and re-arriving at same threshold (no-op)', () => {
    expect(findCrossedLetterThresholds(letters, 30, 30)).toEqual([]);
  });
});

describe('getEffectiveRestsToday', () => {
  it('returns 0 when lastRestDate is null', () => {
    expect(getEffectiveRestsToday(2, null, '2026-05-21')).toBe(0);
  });

  it('returns 0 when lastRestDate is stale', () => {
    expect(getEffectiveRestsToday(2, '2026-05-20', '2026-05-21')).toBe(0);
  });

  it('returns stored value when lastRestDate matches today', () => {
    expect(getEffectiveRestsToday(1, '2026-05-21', '2026-05-21')).toBe(1);
    expect(getEffectiveRestsToday(2, '2026-05-21', '2026-05-21')).toBe(2);
  });
});

describe('canRest', () => {
  it('allows rest on a fresh day even when storedRestsToday is 2', () => {
    expect(canRest(2, '2026-05-20', '2026-05-21')).toBe(true);
  });

  it('allows rest when restsToday < REST_DAILY_CAP', () => {
    expect(canRest(0, '2026-05-21', '2026-05-21')).toBe(true);
    expect(canRest(1, '2026-05-21', '2026-05-21')).toBe(true);
  });

  it('blocks rest when restsToday >= REST_DAILY_CAP', () => {
    expect(canRest(2, '2026-05-21', '2026-05-21')).toBe(false);
  });

  it('REST_DAILY_CAP is 2', () => {
    expect(REST_DAILY_CAP).toBe(2);
  });
});

// ─── grantRest() orchestrator ───────────────────────────────────────────────

jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { useUserStore } from '../src/store/userStore';
import { grantRest } from '../src/services/restService';
import { STORAGE_KEYS } from '../src/constants/storage';

describe('grantRest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.setState({
      level: 1,
      streak: 0,
      totalRecordCount: 0,
      recordedDaysCount: 0,
      roomStage: 1,
      pebbleCount: 0,
      restsToday: 0,
      lastRestDate: null,
      lastRestAt: null,
    });
  });

  it('grants 5–20 pebbles within the documented range', async () => {
    await grantRest();
    const after = useUserStore.getState().pebbleCount;
    expect(after).toBeGreaterThanOrEqual(5);
    expect(after).toBeLessThanOrEqual(20);
  });

  it('increments restsToday and sets lastRestDate / lastRestAt', async () => {
    await grantRest();
    const s = useUserStore.getState();
    expect(s.restsToday).toBe(1);
    expect(s.lastRestDate).not.toBeNull();
    expect(s.lastRestAt).not.toBeNull();
  });

  it('persists pebble count and dates to storage', async () => {
    await grantRest();
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.PEBBLE_COUNT,
      expect.any(Number),
    );
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.RESTS_TODAY,
      1,
    );
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.LAST_REST_DATE,
      expect.any(String),
    );
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.LAST_REST_AT,
      expect.any(String),
    );
  });

  it('delivers a letter when its pebble threshold is crossed', async () => {
    // Starting at 25 with delta in [5, 20] gives newCount in [30, 45].
    // Threshold 30 is always crossed — deterministic regardless of RNG.
    useUserStore.setState({ pebbleCount: 25 });
    (storageService.load as jest.Mock).mockResolvedValueOnce(null);
    const result = await grantRest();
    expect(result.lettersDelivered.map((l) => l.id)).toContain('rest1');
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.MAILBOX_DELIVERED_IDS,
      expect.arrayContaining(['rest1']),
    );
  });

  it('does not re-deliver a letter the mailbox already has', async () => {
    // Same setup as above (always crosses 30), but rest1 already delivered.
    useUserStore.setState({ pebbleCount: 25 });
    (storageService.load as jest.Mock).mockResolvedValueOnce(['rest1']);
    const result = await grantRest();
    expect(result.lettersDelivered.map((l) => l.id)).not.toContain('rest1');
  });

  it('uses today (local) as lastRestDate', async () => {
    const before = new Date();
    await grantRest();
    const stored = useUserStore.getState().lastRestDate;
    const yyyy = before.getFullYear();
    const mm = String(before.getMonth() + 1).padStart(2, '0');
    const dd = String(before.getDate()).padStart(2, '0');
    expect(stored).toBe(`${yyyy}-${mm}-${dd}`);
  });
});
