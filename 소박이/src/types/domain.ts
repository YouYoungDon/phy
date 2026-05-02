export interface ItemSprite {
  id: string;
  name: string;
  type: "furniture" | "pet" | "decoration";
  rarity?: "common" | "rare" | "epic" | "legendary";
  position: {
    x: number;
    y: number;
  };
}

export interface RoomState {
  roomId: string;
  title: string;
  backgroundImageUrl?: string;
  items: ItemSprite[];
  description?: string;
}

export interface LedgerEntry {
  id: string;
  category: string;
  amount: number;
  savedAt: string;
  description?: string;
}

export interface ItemSummary {
  id: string;
  name: string;
  acquired: boolean;
  iconUrl?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface QuestSummary {
  id: string;
  title: string;
  progress: number;
  target: number;
  rewardItem?: ItemSummary;
  completed: boolean;
}
