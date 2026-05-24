import {
  kindForCategory,
  SPENDING_CATEGORIES,
  GENERAL_SPENDING_CATEGORIES,
  INCOME_CATEGORIES,
} from '../src/constants/categories';

describe('kindForCategory', () => {
  it('returns spending for general spending tokens', () => {
    expect(kindForCategory('cafe')).toBe('spending');
    expect(kindForCategory('home_meal')).toBe('spending');
    expect(kindForCategory('transport')).toBe('spending');
    expect(kindForCategory('allowance')).toBe('spending');
  });

  it('returns spending for the no_spend marker', () => {
    expect(kindForCategory('no_spend')).toBe('spending');
  });

  it('returns income for each income token', () => {
    expect(kindForCategory('salary')).toBe('income');
    expect(kindForCategory('bonus')).toBe('income');
    expect(kindForCategory('refund')).toBe('income');
    expect(kindForCategory('received_gift')).toBe('income');
    expect(kindForCategory('received_allowance')).toBe('income');
  });
});

describe('category registry partitions', () => {
  it('SPENDING_CATEGORIES contains all 13 spending tokens including no_spend', () => {
    expect(SPENDING_CATEGORIES.length).toBe(13);
    expect(SPENDING_CATEGORIES.every(c => c.kind === 'spending')).toBe(true);
    expect(SPENDING_CATEGORIES.some(c => c.key === 'no_spend')).toBe(true);
  });

  it('GENERAL_SPENDING_CATEGORIES excludes no_spend', () => {
    expect(GENERAL_SPENDING_CATEGORIES.length).toBe(12);
    expect(GENERAL_SPENDING_CATEGORIES.every(c => c.kind === 'spending')).toBe(true);
    expect(GENERAL_SPENDING_CATEGORIES.some(c => c.key === 'no_spend')).toBe(false);
  });

  it('INCOME_CATEGORIES contains exactly 5 income tokens', () => {
    expect(INCOME_CATEGORIES.length).toBe(5);
    expect(INCOME_CATEGORIES.every(c => c.kind === 'income')).toBe(true);
  });

  it('income tokens use distinct icons from outgoing counterparts', () => {
    const gift = SPENDING_CATEGORIES.find(c => c.key === 'gift');
    const receivedGift = INCOME_CATEGORIES.find(c => c.key === 'received_gift');
    expect(gift?.emoji).toBe('🎁');
    expect(receivedGift?.emoji).toBe('💝');
    expect(gift?.emoji).not.toBe(receivedGift?.emoji);

    const allowance = SPENDING_CATEGORIES.find(c => c.key === 'allowance');
    const receivedAllowance = INCOME_CATEGORIES.find(c => c.key === 'received_allowance');
    expect(allowance?.emoji).toBe('🫶');
    expect(receivedAllowance?.emoji).toBe('🤲');
  });
});
