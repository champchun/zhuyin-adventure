import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, TILE_KEY } from '../src/data/maps';
import { ENEMIES } from '../src/data/monsters';
import { SKY_TEXTURES, drawSkyTextures } from '../src/gfx/skyArt';
import type { Ctx2 } from '../src/gfx/snowArt';
import { MONSTER_ART, monsterRows, monsterSize } from '../src/gfx/monsterArt';

/** 假畫布：記下每個圖樣畫了哪些格子 */
function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawSkyTextures((key, w, h, fn) => {
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

/** 第六關開工前 TILE_KEY 裡的全部字元（寫死，免得只抽查） */
const OLD_CHARS = '.,#=hHDiIkKlY~+:SPafrWTLnjqzdumMgGoOsvwcpVCeEbBxX';
/** 第六關新增的地形字元 → 貼圖 key */
const NEW_TILES: Record<string, string> = {
  A: 't_cloud', F: 't_mist', N: 't_starpool', '*': 't_starstar', Z: 't_cloudwall',
  Q: 't_roof_cloud', R: 't_wall_cloud', J: 't_roof_inn_cloud', U: 't_wall_inn_cloud', y: 't_roof_shop_cloud', t: 't_wall_shop_cloud',
};

describe('第六關圖樣', () => {
  const tex = render();
  it('每個天空島圖樣都有畫出來，大小 16×16', () => {
    for (const k of SKY_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('地形圖塊畫滿 16×16（沒有透明縫）', () => {
    for (const k of SKY_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('物件圖樣背景透明（疊在雲地上）', () => {
    for (const k of SKY_TEXTURES.filter((t) => !t.startsWith('t_'))) expect(tex[k].px.some((p) => !p), k).toBe(true);
  });
  it('彩虹橋 rainbow_bridge 有七彩色帶，和缺口 rainbow_gap 不同', () => {
    for (const col of ['#e8514a', '#ffd84a', '#4cc38a', '#4aa8f0', '#9a6ae8']) expect(tex.rainbow_bridge.px, col).toContain(col);
    expect(tex.rainbow_bridge.px).not.toEqual(tex.rainbow_gap.px);
    // 橋是整格橫過去（左右兩端都有顏色），缺口露出的天空是藍色
    expect(tex.rainbow_gap.px).toContain('#6aa0f0');
  });
  it('拉開前後的雲幕、鼓起前後的熱氣球畫得不一樣', () => {
    expect(tex.zip_curtain.px).not.toEqual(tex.zip_curtain_open.px);
    expect(tex.balloon.px).not.toEqual(tex.balloon_empty.px);
    // 拉開後中間是透明的通道
    expect(tex.zip_curtain_open.px[8 * 16 + 8]).toBe('');
    expect(tex.zip_curtain.px[8 * 16 + 8]).not.toBe('');
  });
  it('新地形字元：都有貼圖，雲地與霧氣可走，其餘不能走', () => {
    for (const [c, key] of Object.entries(NEW_TILES)) {
      expect(TILE_KEY[c], c).toBe(key);
      expect(SKY_TEXTURES as readonly string[], c).toContain(key);
      expect(BLOCKED_TILES.has(c), `${c} 的阻擋設定`).toBe(!'AF'.includes(c));
    }
    // 每個地形圖塊都有字元對應
    for (const k of SKY_TEXTURES.filter((t) => t.startsWith('t_'))) expect(Object.values(NEW_TILES), k).toContain(k);
  });
  it('新字元不和第六關以前的字元重複，舊字元對應沒被蓋掉', () => {
    for (const c of Object.keys(NEW_TILES)) expect(OLD_CHARS.includes(c), `「${c}」和舊字元重複`).toBe(false);
    expect(new Set(Object.keys(NEW_TILES)).size).toBe(Object.keys(NEW_TILES).length);
    // 舊字元集合就是 TILE_KEY 扣掉新字元（沒有漏列、沒有被新字元蓋掉）
    expect(Object.keys(TILE_KEY).filter((c) => !(c in NEW_TILES)).sort()).toEqual([...OLD_CHARS].sort());
    expect(TILE_KEY.a).toBe('t_sand');
    expect(TILE_KEY.t).not.toBe(TILE_KEY.T);
    expect(TILE_KEY.y).not.toBe(TILE_KEY.Y);
  });
  it('五種新敵人的怪物圖放得進 32×32，而且夠大；星空龍王最大', () => {
    const area = (id: string) => monsterRows(ENEMIES[id].sprite).rows.join('').replace(/\./g, '').length;
    for (const id of ['cloudy', 'sprite', 'comet', 'starguard', 'skydragon']) {
      const key = ENEMIES[id].sprite;
      expect(MONSTER_ART[key], key).toBeDefined();
      const b = monsterSize(key);
      expect(b.w).toBeLessThanOrEqual(32); expect(b.h).toBeLessThanOrEqual(32);
      expect(area(id)).toBeGreaterThan(100);
    }
    for (const id of ['cloudy', 'sprite', 'comet', 'starguard']) expect(area('skydragon'), id).toBeGreaterThan(area(id));
  });
});
