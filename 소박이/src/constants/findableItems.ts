export type FindableItem = {
  id: string;
  emoji: string;
  name: string;
  findLine: string;
};

export const FINDABLE_ITEMS: FindableItem[] = [
  { id: 'f1', emoji: '🍀', name: '네잎 클로버',    findLine: '산책하다가 발견했어요. 드리고 싶었어요.' },
  { id: 'f2', emoji: '✨', name: '반짝이는 조각',   findLine: '빛에 반사되는 게 예뻐서요.' },
  { id: 'f3', emoji: '🌰', name: '작은 도토리',     findLine: '특별한 이유는 없어요. 그냥 챙겨왔어요.' },
  { id: 'f4', emoji: '🎀', name: '리본 조각',       findLine: '오늘 어딘가에서 떨어져 있던 거예요.' },
  { id: 'f5', emoji: '🍃', name: '찻잎 조각',       findLine: '차 한 잔 하면서 생각났어요.' },
  { id: 'f6', emoji: '🌸', name: '꽃잎',            findLine: '바람에 날려왔어요. 받아뒀어요.' },
  { id: 'f7', emoji: '🪶', name: '작은 깃털',       findLine: '어디서 떨어진 건지 몰라요. 부드러웠어요.' },
  { id: 'f8', emoji: '🐚', name: '조개껍데기',      findLine: '여기서 이런 게 나올 줄은 몰랐어요.' },
];
