import { Expense, SobagiEmotion } from '../types';

export type DayFeelingType =
  | 'hard'
  | 'caffeinated'
  | 'warm'
  | 'sweet'
  | 'selfcare'
  | 'active'
  | 'quiet'
  | 'modest';

export interface DayFeelingResult {
  type: DayFeelingType;
  mainLine: string;
  observations: string[];
  sobagiEmotion: SobagiEmotion;
  bgColor: string;
}

// ─── Text pools ──────────────────────────────────────────────────────────────

function linesFor(type: DayFeelingType): [string, ...string[]] {
  switch (type) {
    case 'hard':
      return [
        '오늘은 조금 힘들었던 것 같아요 🌙',
        '마음이 무거운 날도 있어요 🌧️',
        '힘든 날도 기록했네요. 수고했어요 🌿',
      ];
    case 'caffeinated':
      return [
        '오늘은 카페를 두 번 들른 하루였어요 ☕',
        '밖에서 커피 한 잔이 필요했던 하루예요 ☕',
        '카페인이 필요했던 날이었어요 ☕',
      ];
    case 'warm':
      return [
        '오늘은 따뜻한 음식이 생각난 하루예요 🍲',
        '먹는 게 위로가 된 하루였어요 🍜',
        '오늘은 맛있는 걸 많이 먹었네요 🍚',
      ];
    case 'sweet':
      return [
        '달콤한 게 생각나는 하루였어요 🍪',
        '조금 달달한 게 필요했나봐요 🍬',
        '작은 달콤함을 찾은 하루예요 ☕',
      ];
    case 'selfcare':
      return [
        '좋아하는 일에 시간을 쓴 하루예요 🎀',
        '오늘은 마음이 가는 곳에 머문 하루였어요 ✨',
        '나만의 시간을 보낸 하루예요 🌸',
      ];
    case 'active':
      return [
        '오늘은 밖에 오래 있었네요 ☀️',
        '여기저기 돌아다닌 하루였어요 🚌',
        '바쁘게 움직인 하루였어요 🌿',
      ];
    case 'quiet':
      return [
        '오늘은 잔잔하게 지나갔네요 🌿',
        '천천히 흘러간 하루였어요 🍃',
        '조용히 머무른 하루였네요 🌙',
      ];
    case 'modest':
      return [
        '소박하게 지나간 하루예요 🍃',
        '평범한 하루도 소중해요 🌿',
        '오늘도 조용히 기록했네요 🌱',
      ];
  }
}

function sobagiEmotionFor(type: DayFeelingType): SobagiEmotion {
  switch (type) {
    case 'hard':        return 'soft-sad';
    case 'caffeinated': return 'excited';
    case 'warm':        return 'happy';
    case 'sweet':       return 'happy';
    case 'selfcare':    return 'surprised';
    case 'active':      return 'excited';
    case 'quiet':       return 'sleepy';
    case 'modest':      return 'happy';
  }
}

function bgColorFor(type: DayFeelingType): string {
  switch (type) {
    case 'hard':        return '#ECE9F2';
    case 'caffeinated': return '#ECF0E8';
    case 'warm':        return '#F5EDE3';
    case 'sweet':       return '#F5EDE3';
    case 'selfcare':    return '#F0EBF5';
    case 'active':      return '#ECF0E8';
    case 'quiet':       return '#F2EFEB';
    case 'modest':      return '#FAF6EE';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateToSeed(dateStr: string): number {
  return dateStr.split('-').reduce((acc, n) => acc * 100 + parseInt(n, 10), 0);
}

function pickLine(pool: [string, ...string[]], seed: number): string {
  const item = pool[seed % pool.length];
  return item ?? pool[0];
}

function buildObservations(expenses: Expense[], dominant: DayFeelingType): string[] {
  const cats = expenses.map((e) => e.category);
  const cafeCount = cats.filter((c) => c === 'cafe').length;
  const mealCount = cats.filter((c) => c === 'home_meal' || c === 'dining_out').length;
  const obs: string[] = [];

  if (dominant !== 'caffeinated' && cafeCount > 0) {
    obs.push(cafeCount >= 2 ? '카페를 두 번 들렀어요 ☕' : '카페를 들렀어요 ☕');
  }
  if (dominant !== 'warm' && mealCount > 0) {
    obs.push(mealCount >= 2 ? '따뜻한 음식을 두 번 먹었어요 🍚' : '따뜻한 음식도 먹었네요 🍲');
  }
  if (cats.includes('transport') && dominant !== 'active') {
    obs.push('잠깐 이동도 했어요 🚌');
  }
  if (cats.includes('hobby') && dominant !== 'selfcare') {
    obs.push('좋아하는 일에 시간을 썼어요 🎀');
  }

  return obs.slice(0, 2);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function getDayFeeling(expenses: Expense[], dateStr: string): DayFeelingResult {
  const seed = dateToSeed(dateStr);

  function make(type: DayFeelingType, obs?: string[]): DayFeelingResult {
    return {
      type,
      mainLine: pickLine(linesFor(type), seed),
      observations: obs ?? buildObservations(expenses, type),
      sobagiEmotion: sobagiEmotionFor(type),
      bgColor: bgColorFor(type),
    };
  }

  if (expenses.length === 0) return make('quiet', []);

  const cats = expenses.map((e) => e.category);
  const emotions = expenses.flatMap((e) => (e.userEmotion ? [e.userEmotion] : []));

  // Priority 1: emotional honesty override
  if (emotions.some((em) => em === '😔' || em === '😤')) return make('hard');

  // Priority 2: caffeinated (cafe ≥ 2)
  if (cats.filter((c) => c === 'cafe').length >= 2) return make('caffeinated');

  // Priority 3: warm (home_meal + dining_out ≥ 2, or any meal + cafe combo)
  const mealCount = cats.filter((c) => c === 'home_meal' || c === 'dining_out').length;
  const cafeCount = cats.filter((c) => c === 'cafe').length;
  if (mealCount >= 2 || (mealCount >= 1 && cafeCount >= 1)) return make('warm');

  // Priority 4: sweet (small cafe/home_meal/dining_out purchase under 6,000)
  if (expenses.some((e) =>
    (e.category === 'cafe' || e.category === 'home_meal' || e.category === 'dining_out') && e.amount < 6000
  )) {
    return make('sweet');
  }

  // Priority 5: selfcare (hobby present — closest scene to "small treat to self")
  if (cats.includes('hobby')) return make('selfcare');

  // Priority 6: active (transport + 3+ distinct categories)
  if (cats.includes('transport') && new Set(cats).size >= 3) return make('active');

  // Priority 7: quiet (very low total)
  // Threshold intentionally decoupled from calm-atmosphere's 10,000.
  // Synchronized thresholds would let users infer "low spending = reward state".
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  if (total < 8000) return make('quiet');

  // Fallback
  return make('modest');
}
