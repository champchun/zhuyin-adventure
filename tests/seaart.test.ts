import { describe, expect, it } from 'vitest';
import { SKINS } from '../src/data/maps';
import { SEA_TEXTURES, drawSeaTextures } from '../src/gfx/seaArt';
import type { Ctx2 } from '../src/gfx/snowArt';

function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawSeaTextures((key, w, h, fn) => {
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

describe('海底圖樣', () => {
  const tex = render();
  it('每個圖樣都有畫出來，16×16，不是空的', () => {
    for (const k of SEA_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('地形圖塊（t_ 開頭）畫滿 16×16，沒有透明縫', () => {
    for (const k of SEA_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  // 深水溝缺口與泡泡橋是「畫在深水溝那一格上」的物件，要畫滿整格才和旁邊的深水溝接得起來；其餘物件背景透明（疊在海沙上）
  const FULL_TILE_OBJECTS = ['bubble_gap', 'bubble_bridge'];
  it('物件圖樣背景透明（疊在海沙上），深水溝缺口與泡泡橋除外', () => {
    for (const k of SEA_TEXTURES.filter((t) => !t.startsWith('t_') && !FULL_TILE_OBJECTS.includes(t))) expect(tex[k].px.some((p) => !p), k).toBe(true);
  });
  it('深水溝缺口與泡泡橋畫滿 16×16（沒有透明角落）', () => {
    for (const k of FULL_TILE_OBJECTS) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('明暗成對的物件畫得不一樣', () => {
    for (const [a, b] of [['lantern_jelly', 'lantern_jelly_on'], ['giant_clam', 'giant_clam_open'], ['bubble_gap', 'bubble_bridge']]) expect(tex[a].px.join('|'), `${a} vs ${b}`).not.toBe(tex[b].px.join('|'));
  });
});

describe('SKINS.sea', () => {
  const sea = SKINS.sea;
  it('字元對應與擋路設定照規格', () => {
    expect(sea).toBeDefined();
    const KEY: Record<string, string> = { '.': 't_sea_sand', ',': 't_sea_kelp', '=': 't_sea_path', f: 't_wreck_deck', '#': 't_sea_coral', R: 't_sea_rock', '~': 't_sea_deep', O: 't_sea_pool', h: 't_roof_shell', H: 't_wall_shell', i: 't_roof_inn_shell', I: 't_wall_inn_shell', k: 't_roof_shop_shell', K: 't_wall_shop_shell', D: 't_door', W: 't_wreck_wall' };
    expect(sea.key).toEqual(KEY);
    expect([...sea.blocked].sort()).toEqual('#RO~hHiIkKDW'.split('').sort());
  });
  it('每個 skin 貼圖都已畫出來（除了既有的 t_door）', () => {
    for (const k of Object.values(sea.key)) if (k !== 't_door') expect(SEA_TEXTURES as readonly string[], k).toContain(k);
  });
});
