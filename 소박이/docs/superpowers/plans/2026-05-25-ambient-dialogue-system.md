# Ambient Dialogue System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home room's flat `IDLE_MESSAGES` random pick with a context-driven ambient voice (Approach B: category buckets, two-stage pick) that varies by time-of-day, no-spend, accumulation, return-after-absence, placed objects, and atmosphere, with a session anti-repeat ring, rare lines, and a silence allowance.

**Architecture:** Pure data (`ambientDialogue.ts`) + pure selector (`ambientDialogueService.ts`, injectable `rng`/`session` for deterministic tests) + thin wire into `index.tsx` `handleSobagiTap`. No new storage key (session memory only). Save reactions / observations / DayFeeling untouched.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess`), Jest 29.

**Spec:** `docs/superpowers/specs/2026-05-25-ambient-dialogue-system-design.md`

---

## File Structure

- `src/constants/ambientDialogue.ts` — types, line pools, weights, tuning constants. Pure data; imports only the `TimeOfDayBackgroundKey` type from atmosphereService.
- `src/services/ambientDialogueService.ts` — pure `selectAmbientLine` + exported helpers (`eligibleCategories`, `linesForCategory`, `pickLine`, `pickWeightedCategory`). No RN imports.
- `__tests__/ambientDialogue.test.ts` — guardrail scan of all pools for banned vocabulary.
- `__tests__/ambientDialogueService.test.ts` — selector + helper unit tests (injected rng).
- `src/pages/index.tsx` — wire the selector into `handleSobagiTap`; add a tap-pulse acknowledgment; remove `IDLE_MESSAGES`/`REST_IDLE_MESSAGES`/`getIdleMessages`/`lastIndexRef`.

---

### Task 1: Ambient dialogue pools + constants (`ambientDialogue.ts`)

**Files:**
- Create: `src/constants/ambientDialogue.ts`
- Test: `__tests__/ambientDialogue.test.ts`

- [ ] **Step 1: Write the guardrail test (fails — module missing)**

Create `__tests__/ambientDialogue.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd 소박이; npm test -- ambientDialogue.test 2>&1 | Select-String -Pattern "Cannot find module|FAIL|PASS"`
Expected: FAIL — cannot find `../src/constants/ambientDialogue`.

- [ ] **Step 3: Create `src/constants/ambientDialogue.ts`**

```ts
import { TimeOfDayBackgroundKey } from '../services/atmosphereService';

// Time buckets reuse the background resolver's keys so the room's voice matches
// its visible lighting: morning 5-12, afternoon 12-17, evening 17-21, latenight else.
export type TimeBucket = TimeOfDayBackgroundKey;

export type AmbientCategory =
  | 'baseline' | 'timeOfDay' | 'noSpend' | 'accumulation'
  | 'object' | 'atmosphere' | 'return' | 'rare';

// Categories that participate in the weighted pick (return & rare are priority overrides).
export type WeightedCategory = Exclude<AmbientCategory, 'return' | 'rare'>;

export type AmbientLine = { id: string; text: string };

export const BASELINE_LINES: AmbientLine[] = [
  { id: 'base-1', text: '여기 있을게요' },
  { id: 'base-2', text: '천천히 해요' },
  { id: 'base-3', text: '같이 있을게요' },
  { id: 'base-4', text: '조용히 있어도 괜찮아요' },
  { id: 'base-5', text: '무슨 생각 하고 있어요?' },
  { id: 'base-6', text: '오늘도 들렀네요' },
];

export const TIME_OF_DAY_LINES: Record<TimeBucket, AmbientLine[]> = {
  morning: [
    { id: 'morn-1', text: '아침 공기가 맑아요 🌿' },
    { id: 'morn-2', text: '천천히 시작해요' },
    { id: 'morn-3', text: '햇살이 들어오고 있어요' },
    { id: 'morn-4', text: '아침이에요. 잘 잤어요?' },
  ],
  afternoon: [
    { id: 'noon-1', text: '나른한 오후예요 🍃' },
    { id: 'noon-2', text: '잠깐 쉬어가요' },
    { id: 'noon-3', text: '오후 햇살이 따뜻해요' },
    { id: 'noon-4', text: '조용한 한낮이에요' },
  ],
  evening: [
    { id: 'eve-1', text: '불을 켤 시간이네요' },
    { id: 'eve-2', text: '하루가 저물어가요 🌆' },
    { id: 'eve-3', text: '저녁 공기가 차분해요' },
    { id: 'eve-4', text: '이제 좀 쉬어도 돼요' },
  ],
  latenight: [
    { id: 'late-1', text: '아직 안 잤네요 🌙' },
    { id: 'late-2', text: '밤이 고요해요' },
    { id: 'late-3', text: '여기 같이 있을게요' },
    { id: 'late-4', text: '늦었어요. 너무 무리하지 말아요' },
  ],
};

export const NO_SPEND_LINES: AmbientLine[] = [
  { id: 'nospend-1', text: '오늘은 조용한 하루였네 🌿' },
  { id: 'nospend-2', text: '아무것도 사지 않은 날도 좋아요' },
  { id: 'nospend-3', text: '가만히 지나간 하루예요' },
];

export const ACCUMULATION_LINES: AmbientLine[] = [
  { id: 'accum-1', text: '이 방이 조금씩 익숙해지고 있어요' },
  { id: 'accum-2', text: '요즘 자주 와줘서 좋아요 🌿' },
  { id: 'accum-3', text: '어느새 익숙한 풍경이 됐어요' },
];

export const RETURN_LINES: AmbientLine[] = [
  { id: 'return-1', text: '다시 와줘서 반가워요 🌿' },
  { id: 'return-2', text: '천천히 다시 시작해요' },
  { id: 'return-3', text: '다시 만나서 좋아요 🍃' },
];

export const CALM_LINES: AmbientLine[] = [
  { id: 'calm-1', text: '오늘 방이 조금 따뜻한 것 같아요' },
  { id: 'calm-2', text: '공기가 포근해요 🌿' },
  { id: 'calm-3', text: '방 안이 차분해요' },
];

export const REST_LINES: AmbientLine[] = [
  { id: 'rest-1', text: '잠깐 쉬다 왔어요 🌿' },
  { id: 'rest-2', text: '좋은 채널이었어요 📺' },
  { id: 'rest-3', text: '따뜻한 기운이 남아있어요' },
];

export const RARE_LINES: AmbientLine[] = [
  { id: 'rare-1', text: '창밖 바람 소리가 좋아요' },
  { id: 'rare-2', text: '먼지 한 톨이 햇빛에 떠다녀요' },
  { id: 'rare-3', text: '어디선가 좋은 냄새가 나요' },
  { id: 'rare-4', text: '시계 초침 소리가 들려요' },
  { id: 'rare-5', text: '오늘은 시간이 천천히 가는 것 같아요' },
];

// Object lines keyed by bag item id. Observational (the room notices the object's
// presence), never ownership/collection praise. Eligible only when the item is in
// the room. Lamp (a6) gates to evening/latenight via EVENING_ONLY_OBJECTS.
export const OBJECT_LINES: Record<string, AmbientLine[]> = {
  m6: [ // 작은 식물 🪴
    { id: 'obj-m6-1', text: '오늘 물 줬어요 🌱' },
    { id: 'obj-m6-2', text: '식물이 조금 자란 것 같아요 🪴' },
  ],
  a6: [ // 따뜻한 램프 🪔
    { id: 'obj-a6-1', text: '밤엔 이 불빛이 좋더라고요 🪔' },
    { id: 'obj-a6-2', text: '램프를 켜뒀어요' },
  ],
  s5: [ // 머그컵 🫖
    { id: 'obj-s5-1', text: '따뜻한 거 마시고 싶네요 🫖' },
    { id: 'obj-s5-2', text: '두 손이 따뜻해져요' },
  ],
  m5: [{ id: 'obj-m5-1', text: '담요가 포근해요 🧣' }],        // 담요
  a3: [{ id: 'obj-a3-1', text: '달 반지가 반짝여요 🌙' }],       // 달 반지
  m3: [{ id: 'obj-m3-1', text: '꿀 한 숟갈 먹었어요 🍯' }],      // 꿀병
  s3: [{ id: 'obj-s3-1', text: '커피 향이 좋아요 ☕' }],         // 따뜻한 커피
  t4: [{ id: 'obj-t4-1', text: '곰 인형이랑 있어요 🧸' }],       // 작은 곰
};

export const EVENING_ONLY_OBJECTS: Set<string> = new Set(['a6']);

export const CATEGORY_WEIGHTS: Record<WeightedCategory, number> = {
  baseline: 30,
  timeOfDay: 30,
  object: 14,
  noSpend: 15,
  accumulation: 12,
  atmosphere: 10,
};

export const STRONG_NO_CONSECUTIVE: Set<AmbientCategory> = new Set(['object', 'rare', 'return']);

export const RARE_PROBABILITY = 0.02;
export const RETURN_GAP_DAYS = 7;
export const SILENCE_PROBABILITY = 0.15;
export const RECENT_RING_SIZE = 7;
export const ACCUMULATION_MIN_DAYS = 30;
export const ACCUMULATION_MIN_STREAK = 7;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd 소박이; npm test -- ambientDialogue.test 2>&1 | Select-String -Pattern "Tests:|FAIL|PASS"`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/constants/ambientDialogue.ts 소박이/__tests__/ambientDialogue.test.ts
git commit -m "feat(dialogue): ambient line pools + tuning constants"
```

---

### Task 2: Pure selector (`ambientDialogueService.ts`)

**Files:**
- Create: `src/services/ambientDialogueService.ts`
- Test: `__tests__/ambientDialogueService.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/ambientDialogueService.test.ts`:

```ts
import {
  selectAmbientLine, eligibleCategories, linesForCategory,
  pickLine, pickWeightedCategory, AmbientContext, AmbientSession,
} from '../src/services/ambientDialogueService';
import {
  BASELINE_LINES, TIME_OF_DAY_LINES, OBJECT_LINES, RARE_LINES, RETURN_LINES, AmbientLine,
} from '../src/constants/ambientDialogue';

// Deterministic rng: yields the given values in order, repeating the last.
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
}

const baseCtx: AmbientContext = {
  timeBucket: 'morning',
  recordedDaysCount: 3,
  streak: 1,
  isNoSpendToday: false,
  placedItemIds: [],
  daysSinceLastVisit: 0,
  calmActive: false,
  restActive: false,
};
const freshSession = (): AmbientSession => ({ recentIds: [], returnGreetingShown: false, lastWasSilence: false });

describe('eligibleCategories', () => {
  it('always includes baseline + timeOfDay', () => {
    expect(eligibleCategories(baseCtx)).toEqual(expect.arrayContaining(['baseline', 'timeOfDay']));
  });
  it('adds noSpend only when isNoSpendToday', () => {
    expect(eligibleCategories(baseCtx)).not.toContain('noSpend');
    expect(eligibleCategories({ ...baseCtx, isNoSpendToday: true })).toContain('noSpend');
  });
  it('adds accumulation at >=30 days OR >=7 streak (boundary)', () => {
    expect(eligibleCategories({ ...baseCtx, recordedDaysCount: 29, streak: 6 })).not.toContain('accumulation');
    expect(eligibleCategories({ ...baseCtx, recordedDaysCount: 30 })).toContain('accumulation');
    expect(eligibleCategories({ ...baseCtx, streak: 7 })).toContain('accumulation');
  });
  it('adds atmosphere when calm or rest active', () => {
    expect(eligibleCategories({ ...baseCtx, calmActive: true })).toContain('atmosphere');
    expect(eligibleCategories({ ...baseCtx, restActive: true })).toContain('atmosphere');
  });
  it('adds object only when a placed item has lines', () => {
    expect(eligibleCategories({ ...baseCtx, placedItemIds: ['t1'] })).not.toContain('object'); // t1 has no lines
    expect(eligibleCategories({ ...baseCtx, placedItemIds: ['m6'] })).toContain('object');
  });
});

describe('linesForCategory', () => {
  it('resolves the timeOfDay sub-pool by bucket', () => {
    expect(linesForCategory({ ...baseCtx, timeBucket: 'evening' }, 'timeOfDay'))
      .toEqual(TIME_OF_DAY_LINES.evening);
  });
  it('object lines only for placed items', () => {
    const lines = linesForCategory({ ...baseCtx, placedItemIds: ['m6'] }, 'object');
    expect(lines).toEqual(OBJECT_LINES.m6);
  });
  it('lamp (a6) lines suppressed outside evening/latenight', () => {
    expect(linesForCategory({ ...baseCtx, timeBucket: 'morning', placedItemIds: ['a6'] }, 'object')).toEqual([]);
    expect(linesForCategory({ ...baseCtx, timeBucket: 'evening', placedItemIds: ['a6'] }, 'object')).toEqual(OBJECT_LINES.a6);
    expect(linesForCategory({ ...baseCtx, timeBucket: 'latenight', placedItemIds: ['a6'] }, 'object')).toEqual(OBJECT_LINES.a6);
  });
  it('atmosphere prefers rest lines when restActive', () => {
    const rest = linesForCategory({ ...baseCtx, restActive: true }, 'atmosphere');
    expect(rest[0]?.id).toMatch(/^rest-/);
    const calm = linesForCategory({ ...baseCtx, calmActive: true }, 'atmosphere');
    expect(calm[0]?.id).toMatch(/^calm-/);
  });
});

describe('pickLine', () => {
  it('excludes recently shown ids', () => {
    const pool: AmbientLine[] = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
    expect(pickLine(pool, ['a'], seq(0))?.id).toBe('b');
  });
  it('falls back to the full pool when all are recent', () => {
    const pool: AmbientLine[] = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
    expect(pickLine(pool, ['a', 'b'], seq(0))?.id).toBe('a');
  });
});

describe('pickWeightedCategory', () => {
  it('never returns a STRONG_NO_CONSECUTIVE lastCategory', () => {
    const ctx = { ...baseCtx, placedItemIds: ['m6'] };
    const cats = eligibleCategories(ctx); // includes 'object'
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickWeightedCategory(ctx, cats, [], 'object', seq(r))).not.toBe('object');
    }
  });
  it('allows a non-strong lastCategory (timeOfDay) to repeat', () => {
    // With only baseline+timeOfDay eligible and rng favoring timeOfDay, repeat is allowed.
    const cats = eligibleCategories(baseCtx);
    const got = pickWeightedCategory(baseCtx, cats, [], 'timeOfDay', seq(0.99));
    expect(['baseline', 'timeOfDay']).toContain(got);
  });
});

describe('selectAmbientLine — return override', () => {
  it('forces a return greeting at the gap threshold, once', () => {
    const ctx = { ...baseCtx, daysSinceLastVisit: 7 };
    const sel = selectAmbientLine(ctx, freshSession(), seq(0));
    expect(sel).toMatchObject({ kind: 'line', category: 'return', isReturnGreeting: true });
    expect(RETURN_LINES.some((l) => l.id === (sel.kind === 'line' && sel.line.id))).toBe(true);
  });
  it('does not greet again once returnGreetingShown', () => {
    const ctx = { ...baseCtx, daysSinceLastVisit: 7 };
    const sel = selectAmbientLine(ctx, { recentIds: [], returnGreetingShown: true, lastWasSilence: false }, seq(0.99, 0.99, 0, 0));
    expect(sel.kind === 'line' && sel.category).not.toBe('return');
  });
  it('does not greet below the threshold', () => {
    const sel = selectAmbientLine({ ...baseCtx, daysSinceLastVisit: 6 }, freshSession(), seq(0.99, 0.99, 0, 0));
    expect(sel.kind === 'line' && sel.category).not.toBe('return');
  });
});

describe('selectAmbientLine — rare override', () => {
  it('emits a rare line when the roll hits and an unshown rare exists', () => {
    // rng: [rare-roll 0.001 (<0.02)], [rare pick 0]
    const sel = selectAmbientLine(baseCtx, freshSession(), seq(0.001, 0));
    expect(sel).toMatchObject({ kind: 'line', category: 'rare' });
  });
  it('suppresses rare when all rare ids are in the ring', () => {
    const session: AmbientSession = { recentIds: RARE_LINES.map((l) => l.id), returnGreetingShown: false, lastWasSilence: false };
    // rare-roll hits (0.001) but no fresh rare → falls through; silence skipped (lastWasSilence false but provide rolls), weighted pick.
    const sel = selectAmbientLine(baseCtx, session, seq(0.001, 0.99, 0, 0));
    expect(sel.kind === 'line' && sel.category).not.toBe('rare');
  });
});

describe('selectAmbientLine — silence', () => {
  it('stays silent on the normal path when the roll hits', () => {
    const session: AmbientSession = { recentIds: ['base-1'], returnGreetingShown: false, lastWasSilence: false };
    // rng: [rare-roll 0.99 (no)], [silence-roll 0.0 (<0.15 yes)]
    expect(selectAmbientLine(baseCtx, session, seq(0.99, 0.0))).toEqual({ kind: 'silence' });
  });
  it('never silences the first utterance (empty ring)', () => {
    const sel = selectAmbientLine(baseCtx, freshSession(), seq(0.99, 0.0, 0, 0));
    expect(sel.kind).toBe('line');
  });
  it('never silences twice in a row', () => {
    const session: AmbientSession = { recentIds: ['base-1'], returnGreetingShown: false, lastWasSilence: true };
    const sel = selectAmbientLine(baseCtx, session, seq(0.99, 0.0, 0, 0));
    expect(sel.kind).toBe('line');
  });
  it('return and rare are never silenced', () => {
    const ctx = { ...baseCtx, daysSinceLastVisit: 7 };
    const session: AmbientSession = { recentIds: ['base-1'], returnGreetingShown: false, lastWasSilence: false };
    expect(selectAmbientLine(ctx, session, seq(0)).kind).toBe('line'); // return wins before silence roll
  });
});

describe('selectAmbientLine — weighted normal path', () => {
  it('returns a line from an eligible pool (morning → baseline or morning)', () => {
    const session: AmbientSession = { recentIds: ['x'], returnGreetingShown: false, lastWasSilence: true };
    // rare no (0.99); silence skipped (lastWasSilence); weighted-cat 0 (first), pick 0
    const sel = selectAmbientLine(baseCtx, session, seq(0.99, 0, 0));
    const eligibleIds = [...BASELINE_LINES, ...TIME_OF_DAY_LINES.morning].map((l) => l.id);
    expect(sel.kind === 'line' && eligibleIds.includes(sel.line.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd 소박이; npm test -- ambientDialogueService 2>&1 | Select-String -Pattern "Cannot find module|FAIL|PASS"`
Expected: FAIL — cannot find `../src/services/ambientDialogueService`.

- [ ] **Step 3: Create `src/services/ambientDialogueService.ts`**

```ts
import {
  AmbientCategory, WeightedCategory, AmbientLine, TimeBucket,
  BASELINE_LINES, TIME_OF_DAY_LINES, NO_SPEND_LINES, ACCUMULATION_LINES,
  RETURN_LINES, CALM_LINES, REST_LINES, RARE_LINES, OBJECT_LINES,
  EVENING_ONLY_OBJECTS, CATEGORY_WEIGHTS, STRONG_NO_CONSECUTIVE,
  RARE_PROBABILITY, RETURN_GAP_DAYS, SILENCE_PROBABILITY,
  ACCUMULATION_MIN_DAYS, ACCUMULATION_MIN_STREAK,
} from '../constants/ambientDialogue';

export type AmbientContext = {
  timeBucket: TimeBucket;
  recordedDaysCount: number;
  streak: number;
  isNoSpendToday: boolean;
  placedItemIds: string[];
  daysSinceLastVisit: number; // 0 if visited today or first ever
  calmActive: boolean;
  restActive: boolean;
};

export type AmbientSession = {
  recentIds: string[];
  returnGreetingShown: boolean;
  lastCategory?: AmbientCategory;
  lastWasSilence: boolean;
};

export type AmbientSelection =
  | { kind: 'line'; line: AmbientLine; category: AmbientCategory; isReturnGreeting: boolean }
  | { kind: 'silence' };

// Lines available for a category in this context (timeOfDay sub-pool, placed
// objects honoring evening-only gating, rest-vs-calm atmosphere).
export function linesForCategory(ctx: AmbientContext, category: AmbientCategory): AmbientLine[] {
  switch (category) {
    case 'baseline': return BASELINE_LINES;
    case 'timeOfDay': return TIME_OF_DAY_LINES[ctx.timeBucket];
    case 'noSpend': return NO_SPEND_LINES;
    case 'accumulation': return ACCUMULATION_LINES;
    case 'return': return RETURN_LINES;
    case 'rare': return RARE_LINES;
    case 'atmosphere': return ctx.restActive ? REST_LINES : CALM_LINES;
    case 'object': {
      const out: AmbientLine[] = [];
      const eveningOk = ctx.timeBucket === 'evening' || ctx.timeBucket === 'latenight';
      for (const id of ctx.placedItemIds) {
        const lines = OBJECT_LINES[id];
        if (!lines) continue;
        if (EVENING_ONLY_OBJECTS.has(id) && !eveningOk) continue;
        out.push(...lines);
      }
      return out;
    }
  }
}

// Weighted (non-override) categories with at least one line in this context.
export function eligibleCategories(ctx: AmbientContext): WeightedCategory[] {
  const cats: WeightedCategory[] = ['baseline', 'timeOfDay'];
  if (ctx.isNoSpendToday) cats.push('noSpend');
  if (ctx.recordedDaysCount >= ACCUMULATION_MIN_DAYS || ctx.streak >= ACCUMULATION_MIN_STREAK) cats.push('accumulation');
  if (ctx.calmActive || ctx.restActive) cats.push('atmosphere');
  if (linesForCategory(ctx, 'object').length > 0) cats.push('object');
  return cats;
}

// Pick a line excluding recentIds; if every line is recent, fall back to the full pool.
export function pickLine(pool: AmbientLine[], recentIds: string[], rng: () => number): AmbientLine | null {
  if (pool.length === 0) return null;
  const fresh = pool.filter((l) => !recentIds.includes(l.id));
  const usable = fresh.length > 0 ? fresh : pool;
  return usable[Math.floor(rng() * usable.length)] ?? usable[0] ?? null;
}

// Weighted category pick. Excludes a STRONG_NO_CONSECUTIVE lastCategory and
// prefers categories with at least one fresh (non-recent) line.
export function pickWeightedCategory(
  ctx: AmbientContext,
  cats: WeightedCategory[],
  recentIds: string[],
  lastCategory: AmbientCategory | undefined,
  rng: () => number,
): WeightedCategory | null {
  const allowed = cats.filter((c) => !(lastCategory === c && STRONG_NO_CONSECUTIVE.has(c)));
  if (allowed.length === 0) return null;
  const withFresh = allowed.filter((c) => linesForCategory(ctx, c).some((l) => !recentIds.includes(l.id)));
  const pool = withFresh.length > 0 ? withFresh : allowed;
  const total = pool.reduce((s, c) => s + CATEGORY_WEIGHTS[c], 0);
  let r = rng() * total;
  for (const c of pool) {
    r -= CATEGORY_WEIGHTS[c];
    if (r < 0) return c;
  }
  return pool[pool.length - 1] ?? null;
}

// rng consumption order (for deterministic tests):
//   return path:   pickLine(RETURN) → 1
//   rare path:     rare-roll → 1, then rare pick → 1 (only if a fresh rare exists)
//   silence path:  silence-roll → 1 (only if recentIds non-empty & !lastWasSilence)
//   weighted path: pickWeightedCategory → 1, pickLine → 1
export function selectAmbientLine(
  ctx: AmbientContext,
  session: AmbientSession,
  rng: () => number = Math.random,
): AmbientSelection {
  // 1. Return greeting — forced, bypasses silence.
  if (ctx.daysSinceLastVisit >= RETURN_GAP_DAYS && !session.returnGreetingShown) {
    const line = pickLine(RETURN_LINES, session.recentIds, rng);
    if (line) return { kind: 'line', line, category: 'return', isReturnGreeting: true };
  }

  // 2. Rare — bypasses silence; only when an unshown rare exists.
  if (rng() < RARE_PROBABILITY) {
    const freshRares = RARE_LINES.filter((l) => !session.recentIds.includes(l.id));
    if (freshRares.length > 0) {
      const line = freshRares[Math.floor(rng() * freshRares.length)] ?? freshRares[0];
      if (line) return { kind: 'line', line, category: 'rare', isReturnGreeting: false };
    }
  }

  // 3. Silence — normal path only; never first utterance / never consecutive.
  if (session.recentIds.length > 0 && !session.lastWasSilence && rng() < SILENCE_PROBABILITY) {
    return { kind: 'silence' };
  }

  // 4. Weighted category pick.
  const cats = eligibleCategories(ctx);
  const category = pickWeightedCategory(ctx, cats, session.recentIds, session.lastCategory, rng) ?? 'baseline';
  const line =
    pickLine(linesForCategory(ctx, category), session.recentIds, rng) ??
    pickLine(BASELINE_LINES, session.recentIds, rng) ??
    BASELINE_LINES[0];
  if (!line) return { kind: 'silence' }; // unreachable (baseline non-empty); satisfies the type
  return { kind: 'line', line, category, isReturnGreeting: false };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd 소박이; npm test -- ambientDialogueService 2>&1 | Select-String -Pattern "Tests:|FAIL|PASS"`
Expected: PASS — all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/services/ambientDialogueService.ts 소박이/__tests__/ambientDialogueService.test.ts
git commit -m "feat(dialogue): pure ambient line selector (context, anti-repeat, rare, silence)"
```

---

### Task 3: Wire into the home screen (`index.tsx`)

**Files:**
- Modify: `src/pages/index.tsx` (imports; remove old idle consts; session ref + tap pulse; rewrite `handleSobagiTap`; wrap character)

- [ ] **Step 1: Update imports**

Add near the other imports:

```ts
import { getPrevVisitDate } from '../hooks/useAppInit';
import {
  selectAmbientLine, AmbientContext, AmbientSession,
} from '../services/ambientDialogueService';
import { RECENT_RING_SIZE } from '../constants/ambientDialogue';
```

Add `streak` to the userStore selectors (alongside `recordedDaysCount`):

```ts
const streak = useUserStore((s) => s.streak);
```

- [ ] **Step 2: Remove the flat idle dialogue**

Delete the `IDLE_MESSAGES` array, the `REST_IDLE_MESSAGES` array, and the `getIdleMessages` function (lines ~46–72). Delete the `lastIndexRef` declaration (`const lastIndexRef = useRef(-1);`, ~line 110).

- [ ] **Step 3: Add the session ref, tap-pulse value, and a day-diff helper**

Add a module-level helper above the component:

```ts
// Whole calendar days between two YYYY-MM-DD strings (noon-anchored, DST-safe).
function calendarDaysBetween(laterYmd: string, earlierYmd: string): number {
  const a = Date.parse(laterYmd + 'T12:00:00');
  const b = Date.parse(earlierYmd + 'T12:00:00');
  return Math.round((a - b) / 86_400_000);
}
```

Inside the component, near the other refs:

```ts
const ambientSessionRef = useRef<AmbientSession>({ recentIds: [], returnGreetingShown: false, lastWasSilence: false });
const tapPulse = useRef(new Animated.Value(1)).current;

const playTapPulse = useCallback(() => {
  tapPulse.setValue(1);
  Animated.sequence([
    Animated.timing(tapPulse, { toValue: 1.06, duration: 90, useNativeDriver: true }),
    Animated.spring(tapPulse, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 140 }),
  ]).start();
}, [tapPulse]);
```

- [ ] **Step 4: Rewrite `handleSobagiTap`**

Replace the body of `handleSobagiTap` (the current ~lines 230–243) with:

```ts
const handleSobagiTap = useCallback(() => {
  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  playTapPulse(); // every tap is acknowledged — esp. silent ones

  const now = new Date();
  const prev = getPrevVisitDate();
  const spendingTotalToday = todayExpenses
    .filter((e) => e.kind !== 'income')
    .reduce((s, e) => s + e.amount, 0);

  const ctx: AmbientContext = {
    timeBucket: getTimeOfDayBackgroundKey(now.getHours()),
    recordedDaysCount,
    streak,
    isNoSpendToday: todayExpenses.length > 0 && spendingTotalToday === 0,
    placedItemIds: roomPlacements.map((p) => p.itemId),
    daysSinceLastVisit: prev ? calendarDaysBetween(getLocalDateString(now), prev) : 0,
    calmActive: calmOpacity > 0,
    restActive: getRestWarmthOpacity(now, lastRestAt) > 0,
  };

  const session = ambientSessionRef.current;
  const sel = selectAmbientLine(ctx, session, Math.random);

  if (sel.kind === 'silence') {
    session.lastWasSilence = true;
    setBubbleVisible(false); // quiet — the tap pulse is the only acknowledgment
    return;
  }

  session.recentIds = [...session.recentIds, sel.line.id].slice(-RECENT_RING_SIZE);
  if (sel.isReturnGreeting) session.returnGreetingShown = true;
  session.lastCategory = sel.category;
  session.lastWasSilence = false;

  setBubbleMessage(sel.line.text);
  setBubbleVisible(true);
  hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
}, [recordedDaysCount, streak, todayExpenses, roomPlacements, calmOpacity, lastRestAt, playTapPulse]);
```

- [ ] **Step 5: Wrap the character in the tap-pulse**

Change the character render (currently `<SobagiCharacter ... />` inside the `characterArea` `TouchableOpacity`, ~line 313–317) to wrap it:

```tsx
<TouchableOpacity style={styles.characterArea} onPress={handleSobagiTap} activeOpacity={1}>
  {/* ...existing bubble / emotion bubble siblings stay as they are... */}
  <Animated.View style={{ transform: [{ scale: tapPulse }] }}>
    <SobagiCharacter emotion={currentEmotion} size="large" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
  </Animated.View>
</TouchableOpacity>
```

(Only wrap the `SobagiCharacter`; leave the speech-bubble / EmotionBubble siblings untouched.)

- [ ] **Step 6: Typecheck**

Run: `cd 소박이; npm run typecheck 2>&1 | Select-String -Pattern "error TS|index.tsx"`
Expected: no errors. (Confirms no dangling `IDLE_MESSAGES`/`getIdleMessages`/`lastIndexRef` references and the new imports resolve.)

- [ ] **Step 7: Grep for stale references**

Run: `cd 소박이; Get-Content src/pages/index.tsx | Select-String -Pattern "IDLE_MESSAGES|getIdleMessages|REST_IDLE_MESSAGES|lastIndexRef"`
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add 소박이/src/pages/index.tsx
git commit -m "feat(home): drive idle bubble from ambient dialogue engine + tap pulse"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck** — `cd 소박이; npm run typecheck` → exits 0.

- [ ] **Step 2: Full Jest** — `cd 소박이; npm test -- --no-cache 2>&1 | Select-String -Pattern "Tests:|Test Suites:|FAIL"` → all suites pass; new `ambientDialogue` + `ambientDialogueService` suites counted.

- [ ] **Step 3: Anti-pattern grep** — `cd 소박이; Get-ChildItem -Recurse src -Include *.ts,*.tsx | Select-String -Pattern "순수익|잔액|차액|net|balance|profit"` → only benign hits (the `// NOT net/balance` comment, `.net` CDN URL, network comments).

- [ ] **Step 4: No commit** (verification only).

---

## Self-Review

**1. Spec coverage:**
- Category buckets + weights → Task 1 `CATEGORY_WEIGHTS`. ✓
- Time-of-day buckets reuse background cutoffs → `TimeBucket = TimeOfDayBackgroundKey`, `getTimeOfDayBackgroundKey` in wiring. ✓
- Example pools (incl. object lines keyed to real item ids, lamp evening-only) → Task 1 pools + `EVENING_ONLY_OBJECTS`. ✓
- Anti-repeat ring + category-specific no-consecutive → `pickLine` ring exclusion, `STRONG_NO_CONSECUTIVE` in `pickWeightedCategory`. ✓
- Return once-per-return (no new storage) → `returnGreetingShown` + `getPrevVisitDate` gap collapse; threshold 7. ✓
- Rare ~2%, change-in-air → `RARE_PROBABILITY`, guardrail/return-guilt tests; unshown-only rare. ✓
- Silence (~15%, never first/consecutive, return+rare bypass, tap still acknowledged) → selector step 3 + `playTapPulse` on every tap. ✓
- Pure + tested service, no RN imports, no new storage key → Tasks 1–2. ✓
- Guardrail test scanning all pools → Task 1 Step 1. ✓
- Wire into `handleSobagiTap`, remove flat idle, REST folds into atmosphere → Task 3. ✓

**2. Placeholder scan:** No TBD/TODO. Full code for both modules + tests + wiring. ✓

**3. Type consistency:** `AmbientCategory` / `WeightedCategory` / `AmbientLine` / `AmbientContext` / `AmbientSession` / `AmbientSelection` spelled identically across constants, service, tests, and wiring. `eligibleCategories`/`pickWeightedCategory` return `WeightedCategory` (subtype of `AmbientCategory`, assignable into the `'line'` result). `CATEGORY_WEIGHTS` keyed by `WeightedCategory` (total) — safe indexing. `linesForCategory` switch is exhaustive over all 8 categories. `TIME_OF_DAY_LINES` total over `TimeBucket`. ✓
