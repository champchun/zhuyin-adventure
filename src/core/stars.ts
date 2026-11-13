// 星星婆婆的兌換邏輯（純函式，不依賴 Phaser）。
import { STAR_DOOR_NEED, REWARDS, type RewardDef, type AccessoryId } from '../data/rewards';
import type { SaveData } from './save';

type StarSave = Pick<SaveData, 'stars' | 'starsSpent' | 'titles' | 'accessories' | 'equipped' | 'title'>;

/** 可用星星 = 累計 − 已花掉 */
export const availableStars = (s: StarSave): number => Math.max(0, s.stars - (s.starsSpent ?? 0));

export type CanRedeem = { ok: true } | { ok: false; reason: 'poor' | 'owned' | 'free' };

function owned(s: StarSave, r: RewardDef): boolean {
  if (r.type === 'title') return (s.titles ?? []).includes(r.id);
  if (r.type === 'accessory') return (s.accessories ?? []).includes(r.accessory!);
  return false; // 禮物可重複
}
export const isOwned = owned;

export function canRedeem(s: StarSave, r: RewardDef): CanRedeem {
  if (r.free) return { ok: false, reason: 'free' };
  if (owned(s, r)) return { ok: false, reason: 'owned' };
  if (availableStars(s) < r.cost) return { ok: false, reason: 'poor' };
  return { ok: true };
}

export type RedeemResult =
  | { ok: true; reward: RewardDef; gift?: { item: string; count: number } }
  | { ok: false; reason: 'poor' | 'owned' | 'free' };

/** 兌換：直接修改傳入的存檔。只增加 starsSpent，不動累計 stars。 */
export function redeem(s: StarSave, r: RewardDef): RedeemResult {
  const c = canRedeem(s, r);
  if (!c.ok) return c;
  s.starsSpent = (s.starsSpent ?? 0) + r.cost;
  if (r.type === 'title') {
    (s.titles ??= []).push(r.id);
    if (!s.title) s.title = r.id;
  } else if (r.type === 'accessory') {
    (s.accessories ??= []).push(r.accessory!);
    s.equipped = r.accessory;
  } else {
    return { ok: true, reward: r, gift: { item: r.item!, count: r.count ?? 1 } };
  }
  return { ok: true, reward: r };
}

/** 戴上（已擁有的）飾品；傳 undefined 就是脫下。回傳是否成功。 */
export function equip(s: StarSave, acc: AccessoryId | undefined): boolean {
  if (acc === undefined) { s.equipped = undefined; return true; }
  if (!(s.accessories ?? []).includes(acc)) return false;
  s.equipped = acc;
  return true;
}

/** 換目前顯示的稱號（要已擁有）。回傳是否成功。 */
export function setTitle(s: StarSave, titleId: string): boolean {
  if (!(s.titles ?? []).includes(titleId)) return false;
  s.title = titleId;
  return true;
}

/** 星光門：看累計星星，花掉之後仍然開著 */
export const starDoorOpen = (s: StarSave): boolean => s.stars >= STAR_DOOR_NEED;

/** 目前稱號的顯示名稱（沒有就回 undefined） */
export const titleName = (s: StarSave): string | undefined => REWARDS.find((r) => r.id === s.title)?.name;
