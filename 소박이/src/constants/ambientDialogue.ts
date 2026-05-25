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
