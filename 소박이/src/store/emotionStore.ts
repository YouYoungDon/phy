import { create } from 'zustand';
import { SobagiEmotion } from '../types';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';

interface EmotionStore {
  currentEmotion: SobagiEmotion;
  currentMessage: string;
  setEmotion: (emotion: SobagiEmotion, message: string) => void;
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  currentEmotion: 'happy',
  currentMessage: '',
  setEmotion: (emotion, message) => {
    set({ currentEmotion: emotion, currentMessage: message });
    storageService.save(STORAGE_KEYS.LAST_EMOTION, emotion);
  },
}));
