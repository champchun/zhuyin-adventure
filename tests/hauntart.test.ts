import { describe, expect, it } from 'vitest';
import { SKINS } from '../src/data/maps';
import { HAUNT_TEXTURES, drawHauntTextures } from '../src/gfx/hauntArt';
import type { Ctx2 } from '../src/gfx/snowArt';

function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawHauntTextures((key, w, h, fn) => {
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

describe('古堡圖樣', () => {
  const tex = render();
  it('每個圖樣都有畫出來，16×16，不是空的', () => {
    for (const k of HAUNT_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('地形圖塊（t_ 開頭）畫滿 16×16，沒有透明縫', () => {
    for (const k of HAUNT_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  // 吊橋缺口與吊橋是「畫在護城河那一格上」的物件，要畫滿整格才和旁邊的護城河接得起來；其餘物件背景透明（疊在護城河旁的地上）
  const FULL_TILE_OBJECTS = ['drawbridge_gap', 'drawbridge'];
  it('物件圖樣背景透明（疊在護城河旁的地上），吊橋缺口與吊橋除外', () => {
    for (const k of HAUNT_TEXTURES.filter((t) => !t.startsWith('t_') && !FULL_TILE_OBJECTS.includes(t))) expect(tex[k].px.some((p) => !p), k).toBe(true);
  });
  it('吊橋缺口與吊橋畫滿 16×16（沒有透明角落）', () => {
    for (const k of FULL_TILE_OBJECTS) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('明暗成對的物件畫得不一樣', () => {
    for (const [a, b] of [['spiderweb_thick', 'spiderweb_clear'], ['pumpkin_dark', 'pumpkin_lit'], ['drawbridge_gap', 'drawbridge'], ['ghost_door', 'ghost_door_open']]) expect(tex[a].px.join('|'), `${a} vs ${b}`).not.toBe(tex[b].px.join('|'));
  });
});

describe('SKINS.haunt', () => {
  const haunt = SKINS.haunt;
  it('字元對應與擋路設定照規格', () => {
    expect(haunt).toBeDefined();
    const KEY: Record<string, string> = { '.': 't_haunt_stone', ',': 't_haunt_grass', '=': 't_haunt_path', f: 't_castle_floor', '#': 't_haunt_tree', R: 't_haunt_fence', '~': 't_haunt_moat', O: 't_haunt_pond', h: 't_roof_pumpkin', H: 't_wall_pumpkin', i: 't_roof_inn_haunt', I: 't_wall_inn_haunt', k: 't_roof_shop_haunt', K: 't_wall_shop_haunt', D: 't_door', W: 't_castle_wall' };
    expect(haunt.key).toEqual(KEY);
    expect([...haunt.blocked].sort()).toEqual('#RO~hHiIkKDW'.split('').sort());
  });
  it('每個 skin 貼圖都已畫出來（除了既有的 t_door）', () => {
    for (const k of Object.values(haunt.key)) if (k !== 't_door') expect(HAUNT_TEXTURES as readonly string[], k).toContain(k);
  });
});
