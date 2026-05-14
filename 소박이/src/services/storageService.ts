import { Storage } from '@apps-in-toss/framework';

declare const __DEV__: boolean;

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    await Storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (__DEV__) {
      console.warn('[storageService] setItem failed:', error);
    }
  }
}

export async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await Storage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    if (__DEV__) {
      console.warn('[storageService] getItem failed:', error);
    }
    return null;
  }
}
