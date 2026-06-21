import { reactionHearts } from '../src/services/dialogueService';

describe('reactionHearts — taper with familiarity', () => {
  it('tier 1 (newcomer) shows the full 3-heart burst', () => {
    const hearts = reactionHearts(1);
    expect(hearts).toHaveLength(3);
    expect(hearts.map((h) => h.delay)).toEqual([0, 220, 440]);
  });

  it('tier 2 thins to a single heart', () => {
    expect(reactionHearts(2)).toHaveLength(1);
    expect(reactionHearts(2)[0]?.delay).toBe(0);
  });

  it('tier 3 (routine, ~30+ days) goes quiet — no hearts', () => {
    expect(reactionHearts(3)).toEqual([]);
  });
});
