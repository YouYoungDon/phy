import { create } from 'zustand';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { keepItem } from '../services/discoveryService';

// Single source of truth for the Discover & Keep model.
//
// `useAppInit` and the Home screen are independent readers of the same storage:
// the root mounts `useAppInit`, which loads/migrates/enqueues arrivals at the
// end of a long async chain, while Home reads on its own mount. With a
// storage-only model the two races — Home almost always reads the pre-arrival
// queue and never re-reads, so a freshly-arrived item doesn't show until the
// next launch. Promoting {queue, kept} into a store (mirroring emotionStore)
// gives both a reactive channel: useAppInit hydrates after compute, Home
// consumes reactively. Storage stays the durable backing; the store owns
// in-session truth and writes through on mutation.
interface DiscoveryStore {
  queue: string[];
  kept: string[];
  // Replace in-session truth with the values useAppInit computed (post-migration,
  // post-arrival). Does not write storage — the caller already persisted.
  hydrate: (next: { queue: string[]; kept: string[] }) => void;
  // Pick up the front-of-room discoverable: move it from the queue into kept and
  // write through to storage. Idempotent on an already-kept item.
  keep: (itemId: string) => void;
}

export const useDiscoveryStore = create<DiscoveryStore>((set, get) => ({
  queue: [],
  kept: [],
  hydrate: ({ queue, kept }) => set({ queue, kept }),
  keep: (itemId) => {
    const { queue, kept } = keepItem(itemId, get().queue, get().kept);
    set({ queue, kept });
    void storageService.save(STORAGE_KEYS.DISCOVERY_QUEUE, queue);
    void storageService.save(STORAGE_KEYS.KEPT_ITEM_IDS, kept);
  },
}));
