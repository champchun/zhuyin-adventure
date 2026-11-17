import { describe, expect, it } from 'vitest';
import { SKINS } from '../src/data/maps';
import { PARK_TEXTURES, drawParkTextures } from '../src/gfx/parkArt';
import type { Ctx2 } from '../src/gfx/snowArt';

function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawParkTextures((key, w, h, fn) => {
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

describe('遊樂園圖樣', () => {
  const tex = render();
  it('每個圖樣都有畫出來，16×16，不是空的', () => {
    for (const k of PARK_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('地形圖塊（t_ 開頭）畫滿 16×16，沒有透明縫', () => {
    for (const k of PARK_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  // 摩天輪缺口與摩天輪橋是「畫在水溝那一格上」的物件，要畫滿整格才和旁邊的水溝接得起來；其餘物件背景透明（疊在水溝旁的地上）
  const FULL_TILE_OBJECTS = ['ferris_gap', 'ferris_bridge'];
  it('物件圖樣背景透明（疊在水溝旁的地上），摩天輪缺口與摩天輪橋除外', () => {
    for (const k of PARK_TEXTURES.filter((t) => !t.startsWith('t_') && !FULL_TILE_OBJECTS.includes(t))) expect(tex[k].px.some((p) => !p), k).toBe(true);
  });
  it('摩天輪缺口與摩天輪橋畫滿 16×16（沒有透明角落）', () => {
    for (const k of FULL_TILE_OBJECTS) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('明暗成對的物件畫得不一樣', () => {
    for (const [a, b] of [['carousel_asleep', 'carousel_on'], ['balloon_flat', 'balloon_big'], ['ferris_gap', 'ferris_bridge'], ['fireworks_cannon', 'fireworks_lit'], ['gong', 'gong_hit']]) expect(tex[a].px.join('|'), `${a} vs ${b}`).not.toBe(tex[b].px.join('|'));
  });
});

describe('SKINS.park', () => {
  const park = SKINS.park;
  it('字元對應與擋路設定照規格', () => {
    expect(park).toBeDefined();
    const KEY: Record<string, string> = { '.': 't_park_brick', ',': 't_park_grass', '=': 't_park_path', f: 't_mirror_floor', '#': 't_park_flower', R: 't_park_fence', '~': 't_park_canal', O: 't_park_fountain', h: 't_roof_tent', H: 't_wall_tent', i: 't_roof_inn_tent', I: 't_wall_inn_tent', k: 't_roof_shop_tent', K: 't_wall_shop_tent', D: 't_door', W: 't_mirror_wall' };
    expect(park.key).toEqual(KEY);
    expect([...park.blocked].sort()).toEqual('#RO~hHiIkKDW'.split('').sort());
  });
  it('每個 skin 貼圖都已畫出來（除了既有的 t_door）', () => {
    for (const k of Object.values(park.key)) if (k !== 't_door') expect(PARK_TEXTURES as readonly string[], k).toContain(k);
  });
});
