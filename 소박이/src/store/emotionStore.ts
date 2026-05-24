import { create } from 'zustand';
import { SobagiEmotion, RecordKind } from '../types';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';

interface EmotionStore {
  currentEmotion: SobagiEmotion;
  currentMessage: string;
  // Kind of the record that produced the current emotion/message. Read by the
  // reaction screen for its kind-aware title. Carried here (rather than
  // re-derived from `getTodayExpenses()`) so a midnight rollover between save
  // and reaction render can't drop the just-saved record from "today" and
  // mis-resolve the title to the default. Defaults to 'spending'.
  lastKind: RecordKind;
  setEmotion: (emotion: SobagiEmotion, message: string, kind?: RecordKind) => void;
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  currentEmotion: 'happy',
  currentMessage: '',
  lastKind: 'spending',
  setEmotion: (emotion, message, kind = 'spending') => {
    set({ currentEmotion: emotion, currentMessage: message, lastKind: kind });
    storageService.save(STORAGE_KEYS.LAST_EMOTION, emotion);
  },
}));
