export type RestLetter = {
  id: string;
  triggerPebbles: number;
  body: string;
  sig: string;
};

// Rest letters mix into the existing mailbox flow. The mailbox UI renders
// them with zero changes — same card layout, same red-dot indicator,
// same expand/collapse. Thresholds are sorted ascending; finding the
// crossed ones is O(n) in restService.findCrossedLetterThresholds.

export const REST_LETTERS: readonly RestLetter[] = [
  {
    id: 'rest1',
    triggerPebbles: 30,
    body: '오늘도 잠깐 쉬어갔네요.\n조용한 채널을 보고 있으면\n시간이 천천히 흐르는 것 같아요.',
    sig: '— 소박이',
  },
  {
    id: 'rest2',
    triggerPebbles: 100,
    body: '요즘 자주 쉬어가네요.\n조용한 시간이 쌓이는 건\n작은 일이 아니에요.',
    sig: '— 소박이',
  },
  {
    id: 'rest3',
    triggerPebbles: 250,
    body: '이 방이 조금 따뜻해진 것 같아요.\n계속 들러줘서 그런가봐요 🌿',
    sig: '— 소박이',
  },
  {
    id: 'rest4',
    triggerPebbles: 500,
    body: '같이 본 채널이 꽤 됐네요.\n대단한 건 아니지만\n이 시간이 좋아요.',
    sig: '— 소박이',
  },
  {
    id: 'rest5',
    triggerPebbles: 1000,
    body: '조약돌이 한가득 모였어요.\n그동안 함께 쉬어갔던\n조용한 순간들이에요.',
    sig: '— 소박이',
  },
];
