export type PersonalLetter = {
  id: string;
  triggerDays: number;
  sig: string;
  body: string;
};

export type SeasonalLetter = {
  id: string;
  month: number;   // 1–12
  day: number;     // deliver on or after this day of month
  endDay: number;  // stop delivering after this day
  sig: string;
  body: string;
};

export type RemoteLetter = {
  id: string;
  body: string;
  sig: string;
  createdAt?: string;
  target?: 'all' | 'user';
};

// id '001' matches the old hardcoded letter so existing users' read state stays valid.
export const PERSONAL_LETTERS: PersonalLetter[] = [
  {
    id: '001',
    triggerDays: 0,
    sig: '— 소박이',
    body: '안녕하세요. 처음 오셨군요.\n\n이 방은 조용한 곳이에요. 작은 것들을 여기에 두고 가셔도 돼요.\n소박이가 잘 보관할게요 🌿',
  },
  {
    id: 'personal-week1',
    triggerDays: 7,
    sig: '— 소박이',
    body: '벌써 일주일이 됐네요.\n\n짧은 것 같지만, 꽤 많은 날들을 함께 보냈어요.\n앞으로도 가끔씩 들러주세요 🍃',
  },
  {
    id: 'personal-month1',
    triggerDays: 30,
    sig: '— 소박이',
    body: '한 달이 됐어요.\n\n이 방도 조금씩 달라지고 있는 것 같아요. 잘 모르겠지만요.\n그냥 — 고마워요 🌿',
  },
  {
    id: 'personal-month3',
    triggerDays: 90,
    sig: '— 소박이',
    body: '세 달이 넘었네요.\n\n이 방에 시간이 쌓인 것 같아요. 처음이랑은 좀 다른 것 같기도 하고요.\n계속 이렇게 지내도 될 것 같아요 🌿',
  },
];

export const SEASONAL_LETTERS_2026: SeasonalLetter[] = [
  {
    id: 'seasonal-may-2026',
    month: 5, day: 1, endDay: 31,
    sig: '— 창가에서',
    body: '오월이네요.\n\n바람이 좋은 계절이에요. 창문을 열어두면 좋은 냄새가 나요.\n오늘 하루도 여기 두고 가세요 🌿',
  },
  {
    id: 'seasonal-spring-2026',
    month: 3, day: 1, endDay: 15,
    sig: '— 창가에서',
    body: '창문 너머로 꽃잎이 날리고 있어요.\n\n봄이 오면 항상 이 냄새가 나는 것 같아요.\n오늘 하루도 어딘가에 남겨두세요 🌸',
  },
  {
    id: 'seasonal-rain-2026',
    month: 6, day: 20, endDay: 31,
    sig: '— 창가에서',
    body: '비가 오는 날엔 어쩐지 더 조용해지는 것 같아요.\n\n우산을 챙겼나요?\n젖은 신발 냄새가 나는 날도 기록해둬요 🌧️',
  },
  {
    id: 'seasonal-autumn-2026',
    month: 10, day: 10, endDay: 25,
    sig: '— 창가에서',
    body: '낙엽이 지기 시작했어요.\n\n가을엔 어쩐지 따뜻한 게 자꾸 생각나요.\n오늘 마신 것도 여기 두고 가세요 ☕',
  },
  {
    id: 'seasonal-yearend-2026',
    month: 12, day: 20, endDay: 31,
    sig: '— 창가에서',
    body: '올해도 거의 다 갔네요.\n\n이 방에 남겨진 것들을 가끔 꺼내 봐요.\n작은 것들도 다 기억되고 있어요 🌿',
  },
];

export const ALL_SEASONAL_LETTERS: SeasonalLetter[] = [...SEASONAL_LETTERS_2026];
