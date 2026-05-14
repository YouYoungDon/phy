import { SobagiEmotion } from '../types';

export const EMOTION_MESSAGES: Record<SobagiEmotion, string> = {
  surprised: '오늘 첫 기록이에요! 소박이가 깜짝 놀랐어요 ✨',
  excited: '연속 기록 중이에요! 소박이도 신나요 🌟',
  sleepy: '이 시간에도 기록하다니... 소박이도 졸려요 zzz',
  'soft-sad': '많이 썼네요... 소박이도 살짝 마음이 쓰여요 🌧️',
  happy: '오늘도 잘 기록했어요! 💚',
};

export const VALID_EMOTIONS: SobagiEmotion[] = [
  'happy', 'excited', 'surprised', 'sleepy', 'soft-sad',
];
