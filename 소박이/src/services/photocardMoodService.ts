import { SobagiEmotion } from '../types';
import { PhotocardMoodAsset } from '../constants/assets';

export type PhotocardWeather = 'sunny' | 'rainy' | 'overcast' | 'clear-night';
export type PhotocardSpendingLevel = 'low' | 'normal' | 'high';

export interface PhotocardMoodInput {
  hour: number;                      // 0–23
  weather?: PhotocardWeather;
  emotion?: SobagiEmotion;
  spendingLevel?: PhotocardSpendingLevel;
}

const FALLBACK: PhotocardMoodAsset = 'photocard_2';

// Deterministic — same inputs always resolve to the same asset. Starts simple;
// strong signals (rainy weather, excited emotion, late-night sleepy) override
// time-of-day, and time-of-day fills the rest of the dial.
export function getPhotocardMoodAsset(input: PhotocardMoodInput): PhotocardMoodAsset {
  const { hour, weather, emotion } = input;

  if (typeof hour !== 'number' || hour < 0 || hour > 23) return FALLBACK;

  if (weather === 'rainy') return 'photocard_6';
  if (emotion === 'excited') return 'photocard_3';
  if (emotion === 'soft-sad') return 'photocard_9';
  if (emotion === 'sleepy' && (hour >= 21 || hour < 5)) return 'photocard_5';
  if (emotion === 'happy' && hour >= 11 && hour < 16) return 'photocard_2';

  if (hour >= 5 && hour < 9)   return 'photocard_1';
  if (hour >= 9 && hour < 12)  return 'photocard_8';
  if (hour >= 12 && hour < 15) return 'photocard_10';
  if (hour >= 15 && hour < 18) return 'photocard_7';
  if (hour >= 18 && hour < 21) return 'photocard_4';
  return 'photocard_5';
}
