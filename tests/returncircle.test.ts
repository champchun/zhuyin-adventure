import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { MAGIC_CIRCLE_TEXTURES, drawMagicCircleTextures } from '../src/gfx/magicArt';
import type { Ctx2 } from '../src/gfx/snowArt';

const walk = (m: (typeof MAPS)[string], x: number, y: number) => !BLOCKED_TILES.has(m.tiles[y]?.[x] ?? '#');
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// 手寫地圖（頭目都在 (22,4)）：位置規則＝頭目四鄰（左、右、上、下）第一個可走、沒有其他物件的格子；三張圖都是左邊 (21,4)
const CASES = [
  { map: 'b', flag: 'boss_b', at: [21, 4], to: { map: 'village', x: 5, y: 4 }, abilities: ['blast', 'gust'] },
  { map: 'p', flag: 'boss_p', at: [21, 4], to: { map: 'village', x: 5, y: 4 }, abilities: ['blast', 'gust', 'hum', 'fog'] },
  { map: 'd', flag: 'boss_d', at: [21, 4], to: { map: 'dh', x: 6, y: 4 }, abilities: ['blast', 'gust', 'hum', 'fog', 'drum', 'splash'] },
] as const;

// 既有物件（id: x,y）：魔法陣只新增 circle，其他一格都不能動
const OBJECTS: Record<string, string[]> = {
  b: ['exit:4,18', 'chest_1:9,15', 'm1:11,16', 'm2:15,12', 'chest_2:18,10', 'm3:16,6', 'rock_b:10,11', 'chest_rock:3,9', 'boss:22,4', 'chest_boss:24,3'],
  p: ['exit:4,18', 'm1:7,14', 'chest_1:6,11', 'windmill:11,9', 'm2:11,13', 'm3:18,11', 'chest_2:20,9', 'boss:22,4', 'leaves_a:5,7', 'chest_leaf:5,4', 'woodgate:22,14', 'chest_wind:23,17'],
  d: ['dock:4,18', 'cave:3,3', 'sign1:7,16', 'dummy:6,14', 'chest_1:8,17', 'drum:3,11', 'chest_drum:3,10', 'plant:9,15', 'chest_plant:10,15', 'm1:9,9', 'bubble:6,5', 'chest_bubble:6,4', 'm2:11,4', 'chest_2:12,2', 'm3:19,10', 'dam:18,15', 'chest_dam:18,16', 'chest_3:24,12', 'boss:22,4', 'chest_boss:24,3'],
};

describe('回家魔法陣：手寫地圖 b／p／d', () => {
  for (const c of CASES) {
    const m = MAPS[c.map];
    const circle = m.objects.find((o) => o.id === 'circle')!;
    it(`${c.map}：circle 是 stairs、showIf 為頭目旗標、通往旅館門外一格`, () => {
      expect(circle).toBeDefined();
      expect(circle).toMatchObject({ kind: 'stairs', sprite: 'magic_circle', label: '魔法陣', showIf: c.flag });
      expect(circle.to).toEqual(c.to);
      expect([circle.x, circle.y]).toEqual(c.at);
    });
    it(`${c.map}：與頭目相鄰、可走、不壓其他物件`, () => {
      const boss = m.objects.find((o) => o.id === 'boss')!;
      expect(dist(circle, boss)).toBe(1);
      expect(walk(m, circle.x, circle.y)).toBe(true);
      expect(m.objects.filter((o) => o.x === circle.x && o.y === circle.y).map((o) => o.id)).toEqual(['circle']);
    });
    it(`${c.map}：既有物件座標與 id 不變，只新增 circle`, () => {
      expect(m.objects.filter((o) => o.id !== 'circle').map((o) => `${o.id}:${o.x},${o.y}`)).toEqual(OBJECTS[c.map]);
      expect(m.objects).toHaveLength(OBJECTS[c.map].length + 1);
    });
    it(`${c.map}：打倒頭目後從入口走得到魔法陣與頭目寶箱`, () => {
      const r = reachReport([m], { map: c.map, ...m.start }, [...c.abilities]);
      expect(r.reached.has(`${c.map}:${circle.x},${circle.y}`)).toBe(true);
      const chest = m.objects.find((o) => o.id === 'chest_boss');
      if (chest) expect(r.unreachableObjects).not.toContain(`${c.map}/chest_boss`);
      expect(r.unreachableObjects).not.toContain(`${c.map}/circle`);
    });
    it(`${c.map}：目的地地圖存在、抵達格可走且不壓物件`, () => {
      const dest = MAPS[c.to.map];
      expect(dest).toBeDefined();
      expect(walk(dest, c.to.x, c.to.y)).toBe(true);
      expect(dest.objects.some((o) => o.x === c.to.x && o.y === c.to.y)).toBe(false);
    });
  }
  it('目的地是旅館門外一格：起始村 (5,4)＝起點、dh (6,4)', () => {
    expect(MAPS.village.start).toEqual({ x: 5, y: 4 });
    const inn = (map: string) => MAPS[map].objects.find((o) => o.id === 'door_inn')!;
    expect(dist(inn('dh'), { x: 6, y: 4 })).toBe(1);
  });
});

describe('魔法陣貼圖', () => {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawMagicCircleTextures((key, w, h, fn) => {
    const buf: string[] = Array(w * h).fill('');
    const c: Ctx2 = {
      fillStyle: '#000000',
      fillRect(x, y, ww, hh) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (i >= 0 && j >= 0 && i < w && j < h) buf[j * w + i] = String(c.fillStyle); },
    };
    fn(c);
    out[key] = { w, h, px: buf };
  }, (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); });
  it('兩格畫面都是 24×16、非空、含透明像素、亮度不同', () => {
    expect(MAGIC_CIRCLE_TEXTURES).toEqual(['magic_circle', 'magic_circle2']);
    for (const k of MAGIC_CIRCLE_TEXTURES) {
      expect([out[k].w, out[k].h], k).toEqual([24, 16]);
      expect(out[k].px.some((p) => p), `${k} 是空的`).toBe(true);
      expect(out[k].px.some((p) => !p), `${k} 沒有透明像素`).toBe(true);
    }
    expect(out.magic_circle.px.join('|')).not.toBe(out.magic_circle2.px.join('|'));
  });
});
