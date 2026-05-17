import { SobagiEmotion } from '../types';

export const EMOTION_MESSAGES: Record<SobagiEmotion, string> = {
  surprised: '오늘 처음 들렀네요 ✨',
  excited: '따뜻한 하루 같았어요 🌿',
  sleepy: '이 시간에도 기록하다니... 소박이도 졸려요 zzz',
  'soft-sad': '오늘은 꽤 큰 날이었네요 🌿',
  happy: '조용히 기록해뒀어요 🌿',
};

export const VALID_EMOTIONS: SobagiEmotion[] = [
  'happy', 'excited', 'surprised', 'sleepy', 'soft-sad',
];
