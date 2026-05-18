import { SobagiEmotion, ExpenseCategory } from '../types';

export type RoomZone =
  | '창가'
  | '책상'
  | '침대옆'
  | '방구석'
  | '벽걸이'
  | '차코너'
  | '작은선반';

// Reserved for future systems — not implemented yet
export type AmbientAffinity =
  | 'room'
  | 'photocardOnly'
  | 'wearable'
  | 'temporaryAmbient'
  | 'seasonal';

export type BagTab = '장신구' | '재료' | '간식' | '장난감';

export type BagItem = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  minDays: number;

  // Room placement — undefined means bag-only forever
  roomPresence?: {
    zones: [RoomZone, ...RoomZone[]];
    emotionAffinity?: SobagiEmotion[];
    promptOnPlace: boolean;
    minDaysInBag: number;
    // timeAffinity: reserved, not used in this implementation
  };

  // Photocard appearance — only for already-placed items
  photocardAffinity?: SobagiEmotion[];

  // Implicit accumulation by category pattern — e.g. frequent cafe records
  // make the mug appear in the room. When set, the room presence service
  // can place this item via the category-pattern path, bypassing the normal
  // minDays / minDaysInBag eligibility gates (the pattern itself is the gate).
  categoryAffinity?: ExpenseCategory[];

  // Implicit accumulation by recording streak — e.g. a 7-day streak makes the
  // small plant appear. When set, the room presence service can place this
  // item via the streak path once the user's current recording streak meets
  // `minStreak`. Like categoryAffinity, this bypasses minDays / minDaysInBag.
  streakAffinity?: { minStreak: number };

  // Reserved — type slot for future systems
  ambientAffinity?: AmbientAffinity;
};

export type RoomPlacement = {
  itemId: string;
  zone: RoomZone;
  placedAt: string;                          // YYYY-MM-DD
  placementPath: 'B' | 'A' | 'C' | 'P' | 'S'; // internal only, never shown in UI. 'P' = category pattern, 'S' = recording streak.
};

export type PendingPlacement = {
  itemId: string;
  pendingFrom: string;   // YYYY-MM-DD
  settleAfter: number;   // 3, 4, or 5 — jittered at 나중에 tap time
};

// Zone coordinate slots (normalized 0–1 relative to room background).
// Used by PhotocardView for overlay positioning. Room sprite renderer uses these
// when assets exist — not rendered in this implementation.
export const ZONE_SLOTS: Record<RoomZone, { x: number; y: number }[]> = {
  '창가':    [{ x: 0.78, y: 0.18 }],
  '책상':    [{ x: 0.72, y: 0.58 }, { x: 0.82, y: 0.60 }],
  '침대옆':  [{ x: 0.18, y: 0.62 }],
  '방구석':  [{ x: 0.12, y: 0.72 }],
  '벽걸이':  [{ x: 0.85, y: 0.30 }],
  '차코너':  [{ x: 0.20, y: 0.52 }],
  '작은선반':[{ x: 0.15, y: 0.38 }, { x: 0.22, y: 0.38 }],
};

export const BAG_TABS: BagTab[] = ['장신구', '재료', '간식', '장난감'];

export const BAG_ITEMS: Record<BagTab, BagItem[]> = {
  장신구: [
    {
      id: 'a1', emoji: '🌸', name: '꽃잎 핀',
      desc: '봄날에 주운 꽃잎이에요. 아직 향이 남아있는 것 같아요.',
      minDays: 0,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
      photocardAffinity: ['happy', 'surprised'],
    },
    {
      id: 'a2', emoji: '🌿', name: '잎새 브로치',
      desc: '창문에 기대다가 발견했어요. 잘 어울려요.',
      minDays: 5,
    },
    {
      id: 'a3', emoji: '🌙', name: '달 반지',
      desc: '밤에 살짝 반짝이는 작은 반지예요. 소박이가 아끼는 물건이에요.',
      minDays: 14,
      roomPresence: { zones: ['침대옆'], emotionAffinity: ['soft-sad', 'sleepy'], promptOnPlace: false, minDaysInBag: 7 },
      photocardAffinity: ['soft-sad', 'sleepy'],
    },
    {
      id: 'a4', emoji: '🎀', name: '작은 리본',
      desc: '소박이가 아끼는 작은 리본이에요 🌿',
      minDays: 25,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
    },
    // New item — day 50
    {
      id: 'a5', emoji: '📮', name: '엽서',
      desc: '어디선가 날아온 엽서예요. 읽을수록 마음이 따뜻해져요.',
      minDays: 50,
      roomPresence: { zones: ['작은선반', '책상'], promptOnPlace: false, minDaysInBag: 5 },
      photocardAffinity: ['happy', 'excited', 'surprised', 'sleepy', 'soft-sad'],
    },
  ],
  재료: [
    {
      id: 'm1', emoji: '🍃', name: '찻잎',
      desc: '은은한 향이 나요. 차 한 잔 마시면 마음이 편해져요.',
      minDays: 0,
    },
    {
      id: 'm2', emoji: '🌰', name: '도토리',
      desc: '산책하다 주웠어요. 특별한 이유는 없어요.',
      minDays: 7,
      roomPresence: { zones: ['작은선반'], promptOnPlace: false, minDaysInBag: 14 },
    },
    {
      id: 'm3', emoji: '🍯', name: '꿀병',
      desc: '달콤한 꿀이 가득 들어있어요. 가끔 한 숟갈씩 먹어요.',
      minDays: 18,
      roomPresence: { zones: ['차코너'], emotionAffinity: ['happy', 'excited'], promptOnPlace: false, minDaysInBag: 5 },
    },
    {
      id: 'm4', emoji: '🪵', name: '나뭇조각',
      desc: '결이 부드럽고 따뜻한 나뭇조각이에요.',
      minDays: 32,
      roomPresence: { zones: ['방구석'], promptOnPlace: false, minDaysInBag: 14 },
    },
    // New item — day 28
    {
      id: 'm5', emoji: '🧣', name: '담요',
      desc: '차가운 날 꺼내 드는 부드러운 담요예요.',
      minDays: 28,
      roomPresence: { zones: ['침대옆'], emotionAffinity: ['soft-sad', 'sleepy'], promptOnPlace: true, minDaysInBag: 7 },
      photocardAffinity: ['soft-sad', 'sleepy'],
    },
    // New item — day 45. Also surfaces via the recording-streak trigger:
    // 7 consecutive days of presence is enough for the plant to settle in,
    // ahead of the day-45 unlock. The streak itself is the gate.
    {
      id: 'm6', emoji: '🪴', name: '작은 식물',
      desc: '창가에 놓아두면 잘 자라는 작은 식물이에요.',
      minDays: 45,
      roomPresence: { zones: ['창가', '방구석'], promptOnPlace: true, minDaysInBag: 14 },
      photocardAffinity: ['happy', 'surprised'],
      streakAffinity: { minStreak: 7 },
    },
  ],
  간식: [
    {
      id: 's1', emoji: '🍪', name: '버터 쿠키',
      desc: '바삭하고 달콤해요. 소박이가 가장 좋아하는 간식이에요.',
      minDays: 0,
    },
    {
      id: 's2', emoji: '🍡', name: '쑥 경단',
      desc: '쑥향이 은은하게 나요. 봄에 만든 거예요.',
      minDays: 10,
    },
    {
      id: 's3', emoji: '☕', name: '따뜻한 커피',
      desc: '식기 전에 마셔요. 한 모금이면 마음이 따뜻해져요.',
      minDays: 20,
      roomPresence: { zones: ['책상', '차코너'], emotionAffinity: ['happy', 'excited'], promptOnPlace: false, minDaysInBag: 7 },
      photocardAffinity: ['happy', 'excited'],
    },
    {
      id: 's4', emoji: '🍞', name: '작은 빵',
      desc: '갓 구운 빵이에요. 아직 따뜻해요.',
      minDays: 35,
    },
    // New item — day 55. Also surfaces via the cafe category-pattern trigger:
    // recurring cafe records bring the mug into the room ahead of the day-55
    // unlock, because the user has effectively built the habit themselves.
    {
      id: 's5', emoji: '🫖', name: '머그컵',
      desc: '두 손으로 감싸면 따뜻해지는 머그컵이에요.',
      minDays: 55,
      roomPresence: { zones: ['책상', '차코너'], emotionAffinity: ['happy', 'excited'], promptOnPlace: true, minDaysInBag: 10 },
      photocardAffinity: ['happy', 'excited'],
      categoryAffinity: ['cafe'],
    },
  ],
  장난감: [
    {
      id: 't1', emoji: '🪀', name: '요요',
      desc: '잘 못 하는데 그냥 갖고 있어요.',
      minDays: 3,
    },
    {
      id: 't2', emoji: '🎈', name: '작은 풍선',
      desc: '언제 들고 온 건지 모르겠지만, 아직 팡 안 터졌어요.',
      minDays: 12,
      roomPresence: { zones: ['창가'], promptOnPlace: false, minDaysInBag: 10 },
    },
    {
      id: 't3', emoji: '🌀', name: '팽이',
      desc: '조용히 돌아가는 걸 보고 있으면 마음이 고요해져요.',
      minDays: 22,
    },
    {
      id: 't4', emoji: '🧸', name: '작은 곰',
      desc: '오래된 곰 인형이에요. 낡았지만 소박이가 아껴요.',
      minDays: 40,
      roomPresence: { zones: ['작은선반', '방구석'], emotionAffinity: ['soft-sad', 'sleepy'], promptOnPlace: true, minDaysInBag: 14 },
      photocardAffinity: ['soft-sad', 'sleepy'],
    },
    // New item — day 35 (bag only; temporaryAmbient deferred)
    {
      id: 't5', emoji: '☂', name: '우산',
      desc: '비 오는 날 꺼내 쓰는 소박이의 우산이에요.',
      minDays: 35,
      ambientAffinity: 'temporaryAmbient',  // room presence deferred
    },
  ],
};

export const ALL_BAG_ITEMS: BagItem[] = Object.values(BAG_ITEMS).flat();
