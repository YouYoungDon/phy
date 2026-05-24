import { create } from 'zustand';
import { SobagiEmotion, RecordKind } from '../types';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { getLocalDateString } from '../utils/date';

interface EmotionStore {
  currentEmotion: SobagiEmotion;
  currentMessage: string;
  // Kind of the record that produced the current emotion/message. Read by the
  // reaction screen for its kind-aware title. Carried here (rather than
  // re-derived from `getTodayExpenses()`) so a midnight rollover between save
  // and reaction render can't drop the just-saved record from "today" and
  // mis-resolve the title to the default. Defaults to 'spending'.
  lastKind: RecordKind;
  // Local calendar date (YYYY-MM-DD) of the record that produced the current
  // emotion. The reaction screen uses this — NOT "today" — to pick which day's
  // records to show and how to label the photocard, so a past-date save shows
  // that day's context instead of today's. Defaults to today.
  lastRecordDate: string;
  setEmotion: (
    emotion: SobagiEmotion,
    message: string,
    kind?: RecordKind,
    recordDate?: string,
  ) => void;
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  currentEmotion: 'happy',
  currentMessage: '',
  lastKind: 'spending',
  lastRecordDate: '',
  setEmotion: (emotion, message, kind = 'spending', recordDate) => {
    set({
      currentEmotion: emotion,
      currentMessage: message,
      lastKind: kind,
      lastRecordDate: recordDate ?? getLocalDateString(new Date()),
    });
    storageService.save(STORAGE_KEYS.LAST_EMOTION, emotion);
  },
}));
