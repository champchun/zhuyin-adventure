import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { ITEMS, SPECIES } from '../src/data/monsters';
import { ACC_OFFSET, accOffset } from '../src/gfx/accessory';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

describe('星星婆婆', () => {
  for (const id of ['dh', 'gh', 'xh', 'zh']) {
    it(`${id}：有一位 id 為 granny 的婆婆，站在可走的地形上，旁邊有可走的空格`, () => {
      const m = MAPS[id];
      const gs = m.objects.filter((o) => o.kind === 'granny');
      expect(gs.map((o) => o.id)).toEqual(['granny']);
      const g = gs[0];
      expect(BLOCKED_TILES.has(m.tiles[g.y][g.x])).toBe(false);
      const others = new Set(m.objects.filter((o) => o !== g).map((o) => `${o.x},${o.y}`));
      const open = N4.filter(([dx, dy]) => {
        const x = g.x + dx, y = g.y + dy;
        return !BLOCKED_TILES.has(m.tiles[y]?.[x] ?? '~') && !others.has(`${x},${y}`);
      });
      expect(open.length).toBeGreaterThanOrEqual(2);
    });
  }
  it('起始村、研究所與試煉洞窟沒有婆婆（第 0 關與 dc1/dc2 不動）', () => {
    for (const id of ['village', 'lab', 'b', 'p', 'room', 'shop', 'd', 'dc1', 'dc2']) {
      expect(MAPS[id].objects.some((o) => o.kind === 'granny' || o.kind === 'stardoor'), id).toBe(false);
    }
  });
  it('雪花鎮原本的「雪地奶奶」改了 id，不會和星星婆婆撞名', () => {
    const xh = MAPS.xh;
    expect(xh.objects.filter((o) => o.id === 'granny')).toHaveLength(1);
    expect(xh.objects.find((o) => o.id === 'snow_granny')?.kind).toBe('npc');
  });
});

describe('星光門與星光小屋', () => {
  const xh = MAPS.xh, star = MAPS.xh_star;
  const door = xh.objects.find((o) => o.kind === 'stardoor')!;
  it('星光門在雪花鎮東北角，站的格子可走，門前一格也可走', () => {
    expect(door).toBeDefined();
    expect(door.x).toBeGreaterThan(xh.w / 2);
    expect(door.y).toBeLessThan(xh.h / 2);
    expect(BLOCKED_TILES.has(xh.tiles[door.y][door.x])).toBe(false);
    expect(BLOCKED_TILES.has(xh.tiles[door.y + 1][door.x])).toBe(false);
  });
  it('目的地 xh_star 存在，抵達格可走', () => {
    expect(door.to!.map).toBe('xh_star');
    expect(star).toBeDefined();
    expect(BLOCKED_TILES.has(star.tiles[door.to!.y][door.to!.x])).toBe(false);
  });
  it('小屋的出口回星光門前一格', () => {
    const out = star.objects.find((o) => o.kind === 'door')!;
    expect(out.to).toEqual({ map: 'xh', x: door.x, y: door.y + 1 });
  });
  it('小屋有一個大寶箱（大藥水×2、魔力果×2）與一座星星雕像', () => {
    const chests = star.objects.filter((o) => o.kind === 'chest');
    expect(chests).toHaveLength(1);
    expect(chests[0].items).toEqual({ bigpotion: 2, berry: 2 });
    for (const id of Object.keys(chests[0].items!)) expect(ITEMS[id]).toBeDefined();
    const statue = star.objects.find((o) => o.kind === 'statue')!;
    expect(statue.text!.length).toBeGreaterThan(0);
  });
});

describe('飾品位置表', () => {
  it('涵蓋全部夥伴 species，每個進化階段都有一組座標', () => {
    for (const sp of Object.values(SPECIES)) {
      const list = ACC_OFFSET[sp.id];
      expect(list, sp.id).toBeDefined();
      expect(list.length, sp.id).toBeGreaterThanOrEqual(sp.sprites.length);
      for (const o of list) { expect(o.x).toBeGreaterThanOrEqual(0); expect(o.x).toBeLessThan(32); expect(o.y).toBeGreaterThanOrEqual(0); expect(o.y).toBeLessThan(32); }
    }
  });
  it('沒有資料的 species 退回頭頂正中央；階段超過上限取最後一組', () => {
    expect(accOffset('nobody', 0)).toEqual({ x: 16, y: 8 });
    expect(accOffset('bobo', 9)).toEqual(ACC_OFFSET.bobo[ACC_OFFSET.bobo.length - 1]);
  });
});
