import { describe, expect, it } from 'vitest';
import { SKINS } from '../src/data/maps';
import { CLOCK_TEXTURES, drawClockTextures } from '../src/gfx/clockArt';
import type { Ctx2 } from '../src/gfx/snowArt';

function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawClockTextures((key, w, h, fn) => {
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

describe('鐘塔圖樣', () => {
  const tex = render();
  it('每個圖樣都有畫出來，16×16，不是空的', () => {
    for (const k of CLOCK_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('地形圖塊（t_ 開頭）畫滿 16×16，沒有透明縫', () => {
    for (const k of CLOCK_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  // 齒輪橋缺口與齒輪橋是「畫在油溝那一格上」的物件，要畫滿整格才和旁邊的油溝接得起來；其餘物件背景透明
  const FULL_TILE_OBJECTS = ['gearbridge_gap', 'gearbridge'];
  it('物件圖樣背景透明（疊在地上），齒輪橋缺口與齒輪橋除外', () => {
    for (const k of CLOCK_TEXTURES.filter((t) => !t.startsWith('t_') && !FULL_TILE_OBJECTS.includes(t))) expect(tex[k].px.some((p) => !p), k).toBe(true);
  });
  it('齒輪橋缺口與齒輪橋畫滿 16×16（沒有透明角落）', () => {
    for (const k of FULL_TILE_OBJECTS) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('缺口與橋的接縫：缺口四邊、橋的上下兩側都和 t_clock_oil 一樣', () => {
    const oil = tex.t_clock_oil.px;
    const at = (k: string, x: number, y: number) => tex[k].px[y * 16 + x];
    for (let i = 0; i < 16; i++) {
      for (const [x, y] of [[i, 0], [i, 15], [0, i], [15, i]]) expect(at('gearbridge_gap', x, y), `gap ${x},${y}`).toBe(oil[y * 16 + x]);
      for (const y of [0, 1, 2, 3, 13, 14, 15]) expect(at('gearbridge', i, y), `bridge ${i},${y}`).toBe(oil[y * 16 + i]);
    }
  });
  it('成對的物件畫得不一樣', () => {
    for (const [a, b] of [['gear_stuck', 'gear_turning'], ['musicbox_still', 'musicbox_play'], ['gearbridge_gap', 'gearbridge'], ['belldoor', 'belldoor_open'], ['keyhole', 'keyhole_open'], ['winder_off', 'winder_on']]) expect(tex[a].px.join('|'), `${a} vs ${b}`).not.toBe(tex[b].px.join('|'));
  });
});

describe('SKINS.clock', () => {
  const clock = SKINS.clock;
  it('字元對應與擋路設定照規格', () => {
    expect(clock).toBeDefined();
    const KEY: Record<string, string> = { '.': 't_clock_floor', ',': 't_clock_moss', '=': 't_clock_path', f: 't_tower_floor', '#': 't_clock_gear', R: 't_clock_fence', '~': 't_clock_oil', O: 't_clock_steam', h: 't_roof_gear', H: 't_wall_gear', i: 't_roof_inn_clock', I: 't_wall_inn_clock', k: 't_roof_shop_clock', K: 't_wall_shop_clock', D: 't_door', W: 't_tower_wall' };
    expect(clock.key).toEqual(KEY);
    expect([...clock.blocked].sort()).toEqual('#RO~hHiIkKDW'.split('').sort());
  });
  it('每個 skin 貼圖都已畫出來（除了既有的 t_door）', () => {
    for (const k of Object.values(clock.key)) if (k !== 't_door') expect(CLOCK_TEXTURES as readonly string[], k).toContain(k);
  });
});
