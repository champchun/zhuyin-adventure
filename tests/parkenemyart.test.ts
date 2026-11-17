import { describe, expect, it } from 'vitest';
import { MONSTER_ART, monsterRows, monsterSize } from '../src/gfx/monsterArt';

const KEYS = ['en_balloony', 'en_toysoldier', 'en_jackbox', 'en_clownking'];

describe('第八關敵人像素圖', () => {
  it('四隻都有登記、放得進 32×32、夠大', () => {
    for (const k of KEYS) {
      expect(MONSTER_ART[k], k).toBeDefined();
      const b = monsterSize(k);
      expect(b.w, k).toBeLessThanOrEqual(32); expect(b.h, k).toBeLessThanOrEqual(32);
      expect(monsterRows(k).rows.join('').replace(/\./g, '').length, `${k} 太小`).toBeGreaterThan(100);
    }
  });
  it('頭目小丑魔術師比小怪大', () => {
    const area = (k: string) => monsterRows(k).rows.join('').replace(/\./g, '').length;
    for (const k of KEYS.slice(0, 3)) expect(area('en_clownking'), `clownking vs ${k}`).toBeGreaterThan(area(k));
  });
  it('四張圖互不相同（不是複製貼上）', () => {
    const sigs = KEYS.map((k) => monsterRows(k).rows.join('|'));
    expect(new Set(sigs).size).toBe(4);
  });
});
