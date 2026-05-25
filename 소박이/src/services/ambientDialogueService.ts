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
//   return path:   pickLine(RETURN) -> 1
//   rare path:     rare-roll -> 1, then rare pick -> 1 (only if a fresh rare exists)
//   silence path:  silence-roll -> 1 (only if recentIds non-empty & !lastWasSilence)
//   weighted path: pickWeightedCategory -> 1, pickLine -> 1
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
