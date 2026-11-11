import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef, MapObj } from '../src/data/maps';
import { ITEMS } from '../src/data/monsters';
import { shouldRespawn } from '../src/core/travel';
import { fromAscii } from '../src/data/ascii';
import type { Legend } from '../src/data/ascii';
import { reachReport } from '../src/core/dungeon';

describe('小鑰匙', () => {
  it('是不能買、不能在戰鬥中使用的道具', () => {
    const k = ITEMS.key;
    expect(k).toBeDefined();
    expect(k.key).toBe(true);
    expect(k.price).toBeUndefined();
    expect(k.hp).toBeUndefined();
    expect(k.mp).toBeUndefined();
  });
  it('其他道具都不是鑰匙', () => {
    for (const [id, it] of Object.entries(ITEMS)) if (id !== 'key') expect(it.key, id).toBeFalsy();
  });
});

describe('shouldRespawn：換地圖時野生怪要不要重生', () => {
  const m = (id: string, group?: string): MapDef => ({ ...MAPS.shop, id, name: id, group });
  it('第一次進地圖（沒有上一張）會重生', () => {
    expect(shouldRespawn(undefined, m('a', 'g'))).toBe(true);
  });
  it('同一個洞窟（group 相同）的樓層之間不重生', () => {
    expect(shouldRespawn(m('a', 'g'), m('b', 'g'))).toBe(false);
  });
  it('從洞窟外面進來、或換到別的洞窟，會重生', () => {
    expect(shouldRespawn(m('out'), m('a', 'g'))).toBe(true);
    expect(shouldRespawn(m('a', 'g'), m('b', 'h'))).toBe(true);
    expect(shouldRespawn(m('a', 'g'), m('out'))).toBe(true);
  });
  it('兩張都沒有 group 的一般地圖：照舊重生', () => {
    expect(shouldRespawn(m('x'), m('y'))).toBe(true);
  });
});

/** 用文字圖造一層假的迷宮（測試用） */
const floor = (id: string, rows: string[], legend: Legend = {}, extra: MapObj[] = []): MapDef => {
  const f = fromAscii(rows, legend);
  return { id, name: id, w: f.w, h: f.h, tiles: f.tiles, start: { x: 1, y: 1 }, respawn: { x: 1, y: 1 }, objects: [...f.objects, ...extra], theme: 'valley', group: 'test' };
};
const at = (map: string, x: number, y: number) => ({ map, x, y });

describe('reachReport：迷宮驗證', () => {
  it('一條沒有機關的走廊，全部走得到', () => {
    const f = floor('t', ['######', '#....#', '######']);
    const r = reachReport([f], at('t', 1, 1), []);
    expect(r.unreachableFloor).toEqual([]);
    expect(r.unreachableObjects).toEqual([]);
  });

  describe('鑰匙與鎖門', () => {
    const legend: Legend = {
      K: { id: 'k', kind: 'chest', item: 'key' },
      D: { id: 'd', kind: 'lockdoor' },
      C: { id: 'c', kind: 'chest', item: 'potion' },
    };
    it('鑰匙在門前面：拿到鑰匙、開門、後面的寶箱走得到，鑰匙用掉了', () => {
      const f = floor('t', ['#########', '#..K#..C#', '#...D...#', '#########'], legend);
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.unreachableFloor).toEqual([]);
      expect(r.unreachableObjects).toEqual([]);
      expect(r.keysLeft).toBe(0);
    });
    it('鑰匙放在鎖門的後面（卡死）：鑰匙和後面的地方都走不到', () => {
      const f = floor('t', ['#########', '#..C#..K#', '#...D...#', '#########'], legend);
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.unreachableObjects).toContain('t/k');
      expect(r.unreachableFloor.length).toBeGreaterThan(0);
    });
    it('鑰匙不夠用（兩道門、只有一把鑰匙）：最後一個房間走不到', () => {
      // 三個房間排成一排，中間各隔一道鎖門；鑰匙只有一把，寶箱在最右邊的房間
      const f = floor('t', ['#############', '#..K#...#..C#', '#...D...E...#', '#############'], {
        ...legend,
        E: { id: 'e', kind: 'lockdoor' },
      });
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.keysLeft).toBe(0);
      expect(r.unreachableObjects).toContain('t/c');
      expect(r.unreachableFloor.length).toBeGreaterThan(0);
    });
  });

  describe('隱藏房間（用招式打通裂石）', () => {
    const f = floor('t', ['#######', '#..R..#', '#######'], { R: { id: 'r', kind: 'rock' } });
    it('沒學會爆破拳：裂石後面走不到', () => {
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.unreachableFloor.length).toBeGreaterThan(0);
    });
    it('學會爆破拳：全部走得到', () => {
      const r = reachReport([f], at('t', 1, 1), ['blast']);
      expect(r.unreachableFloor).toEqual([]);
    });
  });

  describe('機關開關與擋路石牆', () => {
    const f = floor('t', ['#########', '#...#...#', '#.W.B...#', '#...#...#', '#########'], {
      W: { id: 'sw', kind: 'gimmick', ability: 'drum', fx: 'drum' },
      B: { id: 'b', kind: 'barrier', hideIf: 'g:t:sw' },
    });
    it('沒學會擊鼓拳：石牆打不開，另一邊走不到', () => {
      expect(reachReport([f], at('t', 1, 1), []).unreachableFloor.length).toBeGreaterThan(0);
    });
    it('學會擊鼓拳：啟動開關、石牆消失，全部走得到', () => {
      const r = reachReport([f], at('t', 1, 1), ['drum']);
      expect(r.unreachableFloor).toEqual([]);
      expect(r.unreachableObjects).toEqual([]);
    });
  });

  describe('樓梯連到另一層', () => {
    const a = floor('a', ['#####', '#..>#', '#####'], { '>': { id: 'down', kind: 'stairs', to: { map: 'b', x: 1, y: 1 } } });
    const b = floor('b', ['#####', '#...#', '#.C.#', '#####'], { C: { id: 'c', kind: 'chest', item: 'potion' } });
    it('走到樓梯旁，另一層的地方也走得到', () => {
      const r = reachReport([a, b], at('a', 1, 1), []);
      expect(r.unreachableFloor).toEqual([]);
      expect(r.unreachableObjects).toEqual([]);
    });
    it('只給第一層：樓梯的目標不在範圍內，不會當成走得到別層', () => {
      const r = reachReport([a], at('a', 1, 1), []);
      expect(r.reached.has('b:1,1')).toBe(false);
    });
  });

  it('怪物不算擋路；有 showIf 的物件被忽略', () => {
    const f = floor('t', ['######', '#....#', '######'], {}, [
      { id: 'hid', kind: 'chest', x: 2, y: 1, showIf: 'someFlag' },
      { id: 'm', kind: 'monster', x: 3, y: 1, battle: 'x' },
    ]);
    const r = reachReport([f], at('t', 1, 1), []);
    expect(r.unreachableFloor).toEqual([]);
    expect(r.unreachableObjects).toEqual([]);
  });

  it('寶箱堵住一格寬的走廊：後面的格子要被回報', () => {
    const f = floor('t', ['#####', '#.C.#', '#####'], { C: { id: 'c', kind: 'chest', item: 'potion' } });
    const r = reachReport([f], at('t', 1, 1), []);
    expect(r.unreachableFloor).toContain('t:3,1');
  });

  it('入口的地圖不在 floors 裡：丟出清楚的錯誤', () => {
    const f = floor('t', ['###', '#.#', '###']);
    expect(() => reachReport([f], at('nope', 1, 1), [])).toThrow('nope');
  });
});
