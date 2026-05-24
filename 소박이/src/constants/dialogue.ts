import { SobagiEmotion } from '../types';

export type DialogueTier = 1 | 2 | 3;

// Tier 1: Day 0–6 — gentle, slightly distant. Sobagi doesn't know you yet.
// Tier 2: Day 7–29 — warmer, formality dropped. A growing familiarity.
// Tier 3: Day 30+ — quietly close. Long enough that the room has changed.
//
// Tone target per tier:
//   Tier 1: observational, a little careful
//   Tier 2: familiar without being presumptuous
//   Tier 3: soft intimacy — the kind that doesn't need to announce itself
export const REACTION_POOLS: Record<DialogueTier, Record<SobagiEmotion, [string, string, string]>> = {
  1: {
    surprised:  ['오늘 처음 들렀네요 ✨', '처음 오셨군요. 반가워요 🌿', '새로 오셨네요 ✨'],
    excited:    ['따뜻한 하루 같았어요 🌿', '오늘도 이어지고 있네요 🌿', '조용히 이어지고 있어요 🍃'],
    sleepy:     ['이 시간에도 기록하다니... 소박이도 졸려요 zzz', '늦은 시간에 왔네요 🌙', '이 시간까지 기록해줬네요 🌙'],
    'soft-sad': ['오늘은 꽤 큰 날이었네요 🌿', '오늘은 좀 특별한 날이었네요', '큰 하루였네요 🌿'],
    happy:      ['조용히 기록해뒀어요 🌿', '오늘도 다녀왔네요 🌿', '여기 남겨뒀어요 🍃'],
  },
  2: {
    surprised:  ['또 처음인 날이네요 ✨', '오늘 처음 들렀네요 ✨', '이 시간에 처음 들렀네요 ✨'],
    excited:    ['요즘 자주 들르고 있네요 🌿', '이번 주도 이어지고 있어요 🌿', '따뜻하게 이어지고 있어요 🍃'],
    sleepy:     ['이 시간에 또 왔네요 🌙', '밤에도 기억해줘서 고마워요 🌙', '늦게까지 있었네요 🌙'],
    'soft-sad': ['오늘은 좀 큰 날이었네요 🌿', '특별한 날이었나봐요', '큰 날도 기록해줬네요 🌿'],
    happy:      ['또 왔네요. 반가워요 🍃', '이번에도 기록해줬네요 🌿', '조용히 다녀갔어요 🍃'],
  },
  3: {
    surprised:  ['오늘 처음 들렀네요 ✨', '어느새 처음인 날도 있네요 ✨', '오늘 첫 번째네요 ✨'],
    excited:    ['어느새 이렇게 됐네요 🌿', '이 방이 조금씩 달라지는 것 같아요 🍃', '조용히 계속되고 있네요 🌿'],
    sleepy:     ['이 시간까지 있었네요 🌙', '이 방은 밤에도 여기 있어요 🌙', '늦은 시간도 기억할게요 🌙'],
    'soft-sad': ['그런 날도 있어요 🌿', '오늘은 좀 큰 날이었네요 🌿', '다 기억해둘게요 🌿'],
    happy:      ['또 왔네요 🍃', '이 방이 기억하고 있어요 🌿', '오랜 친구처럼 왔네요 🍃'],
  },
};

// Income-aware reaction pool. Selected when expense.kind === 'income'.
// Indexed by tier ONLY (not by emotion) because the income emotion subroutine
// returns at most 2 emotions (happy | sleepy) and they share the same tonal
// register — slicing the pool further would force tonally-thin sub-pools.
// Tone target: relief / warmth / "something warm entered the day".
// Banned vocabulary: 수입, 수익, 보상, 축하, 벌었, 입금, 잔액, 통장. See sub-spec C §4.
export const INCOME_REACTION_POOLS: Record<DialogueTier, [string, string, string]> = {
  1: [
    '조금 든든한 날이네요 🌿',
    '따뜻한 일이 들어왔어요 🍃',
    '오늘은 조금 안심되는 날이에요',
  ],
  2: [
    '들어온 날이 있네요 🌿',
    '오늘은 조금 든든한 하루였어요 🍃',
    '따뜻한 소식이 들어왔어요',
  ],
  3: [
    '들어온 날도 기억해둘게요 🌿',
    '오늘은 조금 든든했을 거예요 🍃',
    '이런 날도 있어요. 다 기억하고 있어요',
  ],
};

// Observation messages — behavioral texture only.
// MUST NEVER reference amounts, totals, spending frequency, or financial behavior.
// Only: time-of-day pattern, category atmosphere, absence/return shape, quiet/busy day feel.
export const OBSERVATION_POOLS: Record<
  'timeOfDay' | 'categoryWarm' | 'returnAfterGap' | 'quietDays',
  [string, string, string]
> = {
  timeOfDay:      ['이 시간에 자주 오네요.', '요즘 이 시간대에 자주 들르네요.', '이 시간에 기록하는 게 익숙해진 것 같아요.'],
  categoryWarm:   ['따뜻한 걸 자주 찾게 되는 날인가 봐요.', '요즘 카페에 자주 가시나 봐요 ☕', '따뜻한 것들을 자주 기록하게 되네요.'],
  returnAfterGap: ['조용한 기록들이 조금씩 쌓이고 있어요.', '가끔씩 들러도, 다 기억하고 있어요 🌿', '오랜만이에요. 잘 지내셨어요? 🌿'],
  quietDays:      ['잠잠한 날들이 이어지고 있네요.', '조용한 한 주였네요 🍃', '잠잠하게 흘러가고 있어요 🌿'],
};
