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
