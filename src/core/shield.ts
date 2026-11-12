// 魔法戰鬥規則（純函式）：回音怪、頭目護盾。要讓孩子自然地用到「聽聲音」的魔法攻擊。
import type { QType } from './learning';

export type TierSetting = 'auto' | 1 | 2 | 3;

/**
 * 這一次出招，護盾與回音怪要不要生效。
 * 教學戰不用；音檔不齊（不能聽）、家長固定成只看符號、夥伴沒魔力時也不用，否則孩子會被卡住。
 */
export function rulesActive(o: { guided?: boolean; audioReady: boolean; tierSetting: TierSetting; mp: number }): boolean {
  return !o.guided && o.audioReady && o.tierSetting !== 1 && o.mp >= 1;
}

export interface HitIn {
  /** rulesActive 的結果 */
  active: boolean;
  /** match＝普通攻擊（看符號），listen＝魔法攻擊（聽聲音） */
  type: QType;
  /** 敵人是回音怪 */
  echo: boolean;
  /** 護盾現在還在 */
  shield: boolean;
  /** 原本算出來的傷害 */
  dmg: number;
}
export interface HitOut {
  dmg: number;
  /** 這一擊之後護盾還在不在 */
  shield: boolean;
  /** 要顯示給孩子看的訊息 */
  msg?: string;
}

/** 答對之後，實際造成多少傷害、護盾有沒有破。 */
export function resolveHit(i: HitIn): HitOut {
  if (!i.active) return { dmg: i.dmg, shield: i.shield };
  if (i.type === 'listen') {
    return i.shield ? { dmg: i.dmg, shield: false, msg: '護盾被魔法打破了！' } : { dmg: i.dmg, shield: false };
  }
  if (i.shield) return { dmg: 0, shield: true, msg: '護盾擋住了！換 🪄 魔法攻擊試試！' };
  if (i.echo) return { dmg: Math.min(i.dmg, 1), shield: false, msg: '攻擊被彈開了，只有一點點效果。' };
  return { dmg: i.dmg, shield: false };
}
