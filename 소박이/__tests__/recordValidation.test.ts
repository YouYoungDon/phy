import {
  incomeRecordHasIntent,
  amountValidForKind,
  INCOME_DEFAULT_CATEGORY,
} from '../src/utils/recordValidation';

describe('incomeRecordHasIntent (pre-dogfooding QA #3)', () => {
  const base = {
    amount: 0,
    memo: '',
    userEmotion: undefined as string | undefined,
    category: INCOME_DEFAULT_CATEGORY,
  };

  it('blocks a completely default income record (salary + 0 + no memo/emotion)', () => {
    expect(incomeRecordHasIntent(base)).toBe(false);
  });

  it('allows when amount > 0', () => {
    expect(incomeRecordHasIntent({ ...base, amount: 50000 })).toBe(true);
  });

  it('allows when a non-blank memo is present', () => {
    expect(incomeRecordHasIntent({ ...base, memo: '용돈' })).toBe(true);
  });

  it('treats a whitespace-only memo as no intent', () => {
    expect(incomeRecordHasIntent({ ...base, memo: '   ' })).toBe(false);
  });

  it('allows when a userEmotion is selected', () => {
    expect(incomeRecordHasIntent({ ...base, userEmotion: '🥰' })).toBe(true);
  });

  it('allows when the category was changed from the default', () => {
    expect(incomeRecordHasIntent({ ...base, category: 'bonus' })).toBe(true);
    expect(incomeRecordHasIntent({ ...base, category: 'received_allowance' })).toBe(true);
  });
});

describe('amountValidForKind (pre-dogfooding QA #6)', () => {
  it('income allows 0 (amount optional)', () => {
    expect(amountValidForKind('income', 0)).toBe(true);
    expect(amountValidForKind('income', 50000)).toBe(true);
  });

  it('spending requires a positive amount', () => {
    expect(amountValidForKind('spending', 0)).toBe(false);
    expect(amountValidForKind('spending', 1)).toBe(true);
  });
});
