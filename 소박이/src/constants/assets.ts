import { SobagiEmotion } from '../types';

const CDN = 'https://cdn.jsdelivr.net/gh/YouYoungDon/sobaki@94fdc8ea787a469d6ae86a0d7e4ce7d10a0e3e66/assets';

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

export const UTILITY_ICON_URIS: Record<'bag' | 'mailbox', string> = {
  bag: `${CDN}/sobaki_bag.png`,
  mailbox: `${CDN}/sobaki_post.png`,
};

export type PhotocardMoodAsset =
  | 'photocard_1' | 'photocard_2' | 'photocard_3' | 'photocard_4' | 'photocard_5'
  | 'photocard_6' | 'photocard_7' | 'photocard_8' | 'photocard_9' | 'photocard_10';

// NOTE: remote filenames are `pothocard_*.png` (sic) — uploaded with a typo.
// The URL keeps the actual filename; the TypeScript identifier uses the correct spelling.
export const PHOTOCARD_MOOD_URIS: Record<PhotocardMoodAsset, string> = {
  photocard_1: `${CDN}/pothocard_1.png`,
  photocard_2: `${CDN}/pothocard_2.png`,
  photocard_3: `${CDN}/pothocard_3.png`,
  photocard_4: `${CDN}/pothocard_4.png`,
  photocard_5: `${CDN}/pothocard_5.png`,
  photocard_6: `${CDN}/pothocard_6.png`,
  photocard_7: `${CDN}/pothocard_7.png`,
  photocard_8: `${CDN}/pothocard_8.png`,
  photocard_9: `${CDN}/pothocard_9.png`,
  photocard_10: `${CDN}/pothocard_10.png`,
};
