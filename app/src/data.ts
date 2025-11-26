export type TierId = string;

export interface Tier {
  id: TierId;
  label: string;
  color: string;
  textColor: string;
}

export interface Item {
  id: string;
  label: string;
  image?: string;
  color?: string;
  badge?: string;
}

export const tiers: Tier[] = [
  { id: 's', label: 'S', color: '#4caf50', textColor: '#08260f' },
  { id: 'a', label: 'A', color: '#7bc74d', textColor: '#163900' },
  { id: 'b', label: 'B', color: '#c0d860', textColor: '#303800' },
  { id: 'c', label: 'C', color: '#ffd166', textColor: '#3a2700' },
  { id: 'd', label: 'D', color: '#ff9f43', textColor: '#421500' },
  { id: 'f', label: 'F', color: '#f44336', textColor: '#330504' },
] as const;

export const items: Item[] = [
  { id: 'strawberry', label: 'Strawberry', color: '#f43f5e', badge: 'ST' },
  { id: 'banana', label: 'Banana', color: '#fde68a' },
  { id: 'orange', label: 'Orange', color: '#ffb347' },
  { id: 'pineapple', label: 'Pineapple', color: '#f6d743' },
  { id: 'grape', label: 'Grape', color: '#b39ddb' },
  { id: 'kiwi', label: 'Kiwi', color: '#7fbf50', badge: 'KI' },
] as const;
