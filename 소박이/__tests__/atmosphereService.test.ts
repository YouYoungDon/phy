import { getTimeOfDayTint, getWarmthOpacity } from '../src/services/atmosphereService';

describe('getTimeOfDayTint', () => {
  it('returns null for morning hours (baseline)', () => {
    expect(getTimeOfDayTint(7)).toBeNull();
    expect(getTimeOfDayTint(9)).toBeNull();
    expect(getTimeOfDayTint(11)).toBeNull();
  });

  it('returns cool blue for dawn (5–6)', () => {
    const tint = getTimeOfDayTint(5);
    expect(tint).not.toBeNull();
    expect(tint!.color).toBe('#C8D4E8');
    expect(tint!.opacity).toBe(0.07);
  });

  it('returns golden for afternoon (12–16)', () => {
    const tint = getTimeOfDayTint(14);
    expect(tint).not.toBeNull();
    expect(tint!.color).toBe('#F5E8C0');
  });

  it('returns amber for evening (17–20)', () => {
    const tint = getTimeOfDayTint(18);
    expect(tint).not.toBeNull();
    expect(tint!.color).toBe('#E8C070');
    expect(tint!.opacity).toBe(0.09);
  });

  it('returns dark for night (21–4)', () => {
    expect(getTimeOfDayTint(22)!.color).toBe('#2A3048');
    expect(getTimeOfDayTint(0)!.color).toBe('#2A3048');
    expect(getTimeOfDayTint(4)!.color).toBe('#2A3048');
  });

  it('covers hour 12 as afternoon (boundary)', () => {
    expect(getTimeOfDayTint(12)!.color).toBe('#F5E8C0');
  });

  it('covers hour 17 as evening (boundary)', () => {
    expect(getTimeOfDayTint(17)!.color).toBe('#E8C070');
  });

  it('covers hour 21 as night (boundary)', () => {
    expect(getTimeOfDayTint(21)!.color).toBe('#2A3048');
  });
});

describe('getWarmthOpacity', () => {
  it('returns 0 at day 0', () => {
    expect(getWarmthOpacity(0)).toBe(0);
  });

  it('returns a small positive value at day 7', () => {
    const v = getWarmthOpacity(7);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(0.03);
  });

  it('returns a moderate value by day 30', () => {
    const v = getWarmthOpacity(30);
    expect(v).toBeGreaterThan(0.02);
    expect(v).toBeLessThan(0.06);
  });

  it('caps at 0.06 by day 90', () => {
    expect(getWarmthOpacity(90)).toBeCloseTo(0.06, 3);
  });

  it('never exceeds 0.06 even at high day counts', () => {
    expect(getWarmthOpacity(200)).toBe(0.06);
    expect(getWarmthOpacity(500)).toBe(0.06);
  });

  it('is monotonically increasing', () => {
    expect(getWarmthOpacity(30)).toBeGreaterThan(getWarmthOpacity(7));
    expect(getWarmthOpacity(90)).toBeGreaterThan(getWarmthOpacity(30));
  });
});
