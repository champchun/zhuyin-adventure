import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { ITEMS } from '../src/data/monsters';
import { shouldRespawn } from '../src/core/travel';

describe('小鑰匙', () => {
  it('是不能買、不能在戰鬥中使用的道具', () => {
    const k = ITEMS.key;
    expect(k).toBeDefined();
    expect(k.key).toBe(true);
    expect(k.price).toBeUndefined();
    expect(k.hp).toBeUndefined();
    expect(k.mp).toBeUndefined();
  });
  it('其他道具都不是鑰匙', () => {
    for (const [id, it] of Object.entries(ITEMS)) if (id !== 'key') expect(it.key, id).toBeFalsy();
  });
});

describe('shouldRespawn：換地圖時野生怪要不要重生', () => {
  const m = (id: string, group?: string): MapDef => ({ ...MAPS.shop, id, name: id, group });
  it('第一次進地圖（沒有上一張）會重生', () => {
    expect(shouldRespawn(undefined, m('a', 'g'))).toBe(true);
  });
  it('同一個洞窟（group 相同）的樓層之間不重生', () => {
    expect(shouldRespawn(m('a', 'g'), m('b', 'g'))).toBe(false);
  });
  it('從洞窟外面進來、或換到別的洞窟，會重生', () => {
    expect(shouldRespawn(m('out'), m('a', 'g'))).toBe(true);
    expect(shouldRespawn(m('a', 'g'), m('b', 'h'))).toBe(true);
    expect(shouldRespawn(m('a', 'g'), m('out'))).toBe(true);
  });
  it('兩張都沒有 group 的一般地圖：照舊重生', () => {
    expect(shouldRespawn(m('x'), m('y'))).toBe(true);
  });
});
