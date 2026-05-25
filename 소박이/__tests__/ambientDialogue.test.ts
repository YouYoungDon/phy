import {
  BASELINE_LINES, TIME_OF_DAY_LINES, NO_SPEND_LINES, ACCUMULATION_LINES,
  RETURN_LINES, CALM_LINES, REST_LINES, RARE_LINES, OBJECT_LINES, AmbientLine,
} from '../src/constants/ambientDialogue';

function allLines(): AmbientLine[] {
  return [
    ...BASELINE_LINES,
    ...Object.values(TIME_OF_DAY_LINES).flat(),
    ...NO_SPEND_LINES, ...ACCUMULATION_LINES, ...RETURN_LINES,
    ...CALM_LINES, ...REST_LINES, ...RARE_LINES,
    ...Object.values(OBJECT_LINES).flat(),
  ];
}

describe('ambientDialogue pools', () => {
  // Income / finance / achievement / coaching vocabulary must never appear.
  const BANNED = /수입|수익|보상|축하|벌었|입금|잔액|통장|저축|잘했|대단|성공|완료|화이팅|파이팅|순수익|차액/;

  it('contains no banned vocabulary', () => {
    for (const line of allLines()) {
      expect(line.text).not.toMatch(BANNED);
    }
  });

  it('has unique, stable ids', () => {
    const ids = allLines().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never guilts on return', () => {
    const RETURN_GUILT = /오랜만|왜 안|안 왔|기다렸|기다리/;
    for (const line of RETURN_LINES) {
      expect(line.text).not.toMatch(RETURN_GUILT);
    }
  });
});
