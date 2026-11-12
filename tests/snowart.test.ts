import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, TILE_KEY } from '../src/data/maps';
import { ENEMIES } from '../src/data/monsters';
import { MONSTER_ART, monsterRows, monsterSize } from '../src/gfx/monsterArt';
import { SNOW_TEXTURES, drawSnowTextures, type Ctx2 } from '../src/gfx/snowArt';

/** 假畫布：記下每個圖樣畫了哪些格子 */
function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawSnowTextures((key, w, h, fn) => {
    const buf: string[] = Array(w * h).fill('');
    const c: Ctx2 = {
      fillStyle: '#000000',
      fillRect(x, y, ww, hh) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (i >= 0 && j >= 0 && i < w && j < h) buf[j * w + i] = String(c.fillStyle); },
    };
    fn(c);
    out[key] = { w, h, px: buf };
  }, (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); });
  return out;
}

describe('第四關圖樣', () => {
  const tex = render();
  it('每個雪地圖樣都有畫出來', () => {
    for (const k of SNOW_TEXTURES) { expect(tex[k], k).toBeDefined(); expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true); }
  });
  it('地形圖塊畫滿 16×16（沒有透明縫）', () => {
    for (const k of SNOW_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('雪地小路拱門 snow_trail：16×16、有紅旗與木柱（比灰色樓梯醒目）、畫面上半部有橫樑', () => {
    const t = tex.snow_trail;
    expect([t.w, t.h]).toEqual([16, 16]);
    expect(t.px.every((p) => p)).toBe(true);
    for (const col of ['#e8514a', '#b9824f', '#d9a26a']) expect(t.px, col).toContain(col);
    expect(t.px.slice(0, 16 * 4).filter((p) => p === '#2b2140').length).toBeGreaterThan(8);
  });
  it('新地形字元：都有貼圖；雪地、冰面、冰橋可走，其餘不能走', () => {
    for (const c of 'njzqdumMgGoO') {
      expect(SNOW_TEXTURES as readonly string[], c).toContain(TILE_KEY[c]);
      expect(BLOCKED_TILES.has(c), `${c} 的阻擋設定`).toBe(!'njz'.includes(c));
    }
  });
  it('四種新敵人的怪物圖放得進 32×32', () => {
    for (const id of ['snowball', 'penguin', 'icebat', 'icequeen']) {
      const key = ENEMIES[id].sprite;
      expect(MONSTER_ART[key], key).toBeDefined();
      const b = monsterSize(key);
      expect(b.w).toBeLessThanOrEqual(32); expect(b.h).toBeLessThanOrEqual(32);
      expect(monsterRows(key).rows.join('').replace(/\./g, '').length).toBeGreaterThan(100);
    }
  });
});
