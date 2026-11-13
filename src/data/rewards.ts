// 星星婆婆的獎勵清單（資料驅動）。
export type RewardType = 'title' | 'accessory' | 'gift';
export type AccessoryId = 'bow' | 'crown';

export interface RewardDef {
  id: string;
  type: RewardType;
  /** 要花的可用星星 */
  cost: number;
  name: string;
  icon: string;
  /** 飾品：戴在頭上的飾品 id（也是 equipped 的值） */
  accessory?: AccessoryId;
  /** 禮物：給的道具與數量（禮物可重複兌換） */
  item?: string;
  count?: number;
  /** true＝不能用星星兌換（劇情自動給），不出現在星星婆婆的清單，cost 為 0 */
  free?: boolean;
}

/** 累計星星達到這個數，雪花鎮的星光門才會醒來（看累計，不看可用） */
export const STAR_DOOR_NEED = 25;

export const REWARDS: RewardDef[] = [
  { id: 'title_explorer', type: 'title', cost: 5, name: '小探險家', icon: '🧭' },
  { id: 'acc_bow', type: 'accessory', cost: 10, name: '蝴蝶結', icon: '🎀', accessory: 'bow' },
  { id: 'title_master', type: 'title', cost: 20, name: '注音小達人', icon: '🏅' },
  { id: 'acc_crown', type: 'accessory', cost: 30, name: '小皇冠', icon: '👑', accessory: 'crown' },
  { id: 'gift_potion', type: 'gift', cost: 40, name: '大藥水 ×2', icon: '🧴', item: 'bigpotion', count: 2 },
  // 免費稱號：打倒最終頭目後自動獲得（見 core/ending.ts）
  { id: 'title_hero', type: 'title', cost: 0, name: '注音大英雄', icon: '🌟', free: true },
];

/** 星星婆婆賣的清單（不含免費獎勵） */
export const SHOP_REWARDS: RewardDef[] = REWARDS.filter((r) => !r.free);

export const rewardById = (id: string): RewardDef | undefined => REWARDS.find((r) => r.id === id);
