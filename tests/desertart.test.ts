import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, TILE_KEY } from '../src/data/maps';
import { ENEMIES } from '../src/data/monsters';
import { DESERT_TEXTURES, drawDesertTextures } from '../src/gfx/desertArt';
import type { Ctx2 } from '../src/gfx/snowArt';
import { MONSTER_ART, monsterRows, monsterSize } from '../src/gfx/monsterArt';

/** 假畫布：記下每個圖樣畫了哪些格子 */
function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawDesertTextures((key, w, h, fn) => {
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

describe('第五關圖樣', () => {
  const tex = render();
  it('每個沙漠圖樣都有畫出來，大小 16×16', () => {
    for (const k of DESERT_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('地形圖塊畫滿 16×16（沒有透明縫）', () => {
    for (const k of DESERT_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('沙漠小路拱門 desert_road：畫滿、有紅旗與木柱、上半部有橫樑', () => {
    const t = tex.desert_road;
    expect(t.px.every((p) => p)).toBe(true);
    for (const col of ['#e8514a', '#b9824f', '#d9a26a']) expect(t.px, col).toContain(col);
    expect(t.px.slice(0, 16 * 4).filter((p) => p === '#2b2140').length).toBeGreaterThan(8);
  });
  it('物件圖樣背景透明（疊在沙地或岩地上）', () => {
    for (const k of ['sand_pit', 'web_bridge', 'cactus_block', 'sandstone', 'quicksand', 'quicksand_dry']) expect(tex[k].px.some((p) => !p), k).toBe(true);
  });
  it('新地形字元：都有貼圖；沙地、岩地可走，其餘不能走；不和前面關卡的字元重複', () => {
    const chars = 'svwcpVCeEbBxX';
    for (const c of chars) {
      expect(DESERT_TEXTURES as readonly string[], c).toContain(TILE_KEY[c]);
      expect(BLOCKED_TILES.has(c), `${c} 的阻擋設定`).toBe(!'sv'.includes(c));
    }
    // 舊字元對應沒被蓋掉
    expect(TILE_KEY.b).toBe('t_roof_inn_sand');
    expect(TILE_KEY.n).toBe('t_snow');
    expect(TILE_KEY.a).toBe('t_sand');
  });
  it('四種新敵人的怪物圖放得進 32×32，而且夠大', () => {
    for (const id of ['scorpion', 'cactusman', 'mummy', 'lavabeast']) {
      const key = ENEMIES[id].sprite;
      expect(MONSTER_ART[key], key).toBeDefined();
      const b = monsterSize(key);
      expect(b.w).toBeLessThanOrEqual(32); expect(b.h).toBeLessThanOrEqual(32);
      expect(monsterRows(key).rows.join('').replace(/\./g, '').length).toBeGreaterThan(100);
    }
  });
});
