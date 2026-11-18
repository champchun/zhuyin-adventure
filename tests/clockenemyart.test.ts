import { describe, expect, it } from 'vitest';
import { MONSTER_ART, monsterRows, monsterSize } from '../src/gfx/monsterArt';

const KEYS = ['en_gearbug', 'en_windup', 'en_alarmclock', 'en_timekeeper'];
const area = (k: string) => monsterRows(k).rows.join('').replace(/\./g, '').length;

describe('第十關敵人像素圖', () => {
  it('四隻都有登記、放得進 32×32、夠大', () => {
    for (const k of KEYS) {
      expect(MONSTER_ART[k], k).toBeDefined();
      const b = monsterSize(k);
      expect(b.w, k).toBeLessThanOrEqual(32); expect(b.h, k).toBeLessThanOrEqual(32);
      expect(area(k), `${k} 太小`).toBeGreaterThan(100);
    }
  });
  it('頭目時光守護者面積比任何小怪至少大 30%', () => {
    for (const k of KEYS.slice(0, 3)) expect(area('en_timekeeper'), `timekeeper vs ${k}`).toBeGreaterThanOrEqual(area(k) * 1.3);
  });
  it('四張圖互不相同（不是複製貼上）', () => {
    const sigs = KEYS.map((k) => monsterRows(k).rows.join('|'));
    expect(new Set(sigs).size).toBe(4);
  });
});
