export interface Item {
  id: string;
  text: string;
  image?: string;
}

export interface TierConfig {
  id: string;
  label: string;
  color: string;
}

export type Placements = {
  [key: string]: string[];
};

export interface SavedTierList {
  id: string;
  name: string;
  timestamp: number;
  title: string;
  items: Item[];
  placements: Placements;
  tierConfigs: TierConfig[];
  colorInverted: boolean;
}
