import { SobagiEmotion } from '../types';

const CDN = 'https://cdn.jsdelivr.net/gh/YouYoungDon/sobaki@a4d78df4cf085d52894586020c82ef0673c737d6/assets';

export const ROOM_BACKGROUND_URIS: Partial<Record<1 | 2 | 3 | 4 | 5, string>> = {
  1: `${CDN}/room_stage1.png`,
};

export const SOBAGI_DEFAULT_URI = `${CDN}/sobaki.png`;

export const SOBAGI_IMAGE_URIS: Partial<Record<SobagiEmotion, string>> = {
  happy: `${CDN}/sobaki_happy.png`,
  excited: `${CDN}/sobaki_excited.png`,
  surprised: `${CDN}/sobaki_surprised.png`,
  sleepy: `${CDN}/sobaki_sleepy.png`,
  'soft-sad': `${CDN}/sobaki_sad.png`,
};
