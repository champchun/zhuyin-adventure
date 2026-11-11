import { describe, expect, it } from 'vitest';
import { CHASE_RANGE, STUN_TURNS, makeMon, stepMonsters, stunMon } from '../src/core/monsters';

/** 一個 w×h 的空地圖，walls 是牆；回傳 blocked(x, y) */
const open = (w: number, h: number, walls: [number, number][] = []) => {
  const wall = new Set(walls.map(([x, y]) => `${x},${y}`));
  return (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || wall.has(`${x},${y}`);
};
const pos = (m: { x: number; y: number }) => `${m.x},${m.y}`;

describe('makeMon / stunMon', () => {
  it('路線的第 0 格就是起點；沒有 patrol 時只有一格', () => {
    const m = makeMon({ id: 'a', x: 2, y: 3, patrol: [{ x: 3, y: 3 }] });
    expect(m.route).toEqual([{ x: 2, y: 3 }, { x: 3, y: 3 }]);
    expect(m.ai).toBe('patrol');
    expect(makeMon({ id: 'b', x: 0, y: 0 }).route).toEqual([{ x: 0, y: 0 }]);
  });
  it('撤退後暫停 STUN_TURNS 回合', () => {
    const m = makeMon({ id: 'a', x: 0, y: 0 });
    stunMon(m);
    expect(m.stun).toBe(STUN_TURNS);
    expect(STUN_TURNS).toBe(3);
  });
});

describe('巡邏', () => {
  const player = { x: 7, y: 0 };
  it('沿路線來回走，走到盡頭就掉頭', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }, { x: 3, y: 0 }] });
    const blocked = open(8, 1);
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) { stepMonsters([m], player, blocked); seen.push(pos(m)); }
    expect(seen).toEqual(['2,0', '3,0', '2,0', '1,0', '2,0']);
  });
  it('只有起點、沒有路線的怪物原地不動', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0 });
    const r = stepMonsters([m], player, open(8, 1));
    expect(r.moves).toEqual([]);
    expect(pos(m)).toBe('1,0');
  });
  it('下一格被牆擋住就原地等，擋路消失後繼續走', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }] });
    expect(stepMonsters([m], player, open(8, 1, [[2, 0]])).moves).toEqual([]);
    expect(pos(m)).toBe('1,0');
    stepMonsters([m], player, open(8, 1));
    expect(pos(m)).toBe('2,0');
  });
  it('下一格有別的怪物就等', () => {
    const a = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }] });
    const b = makeMon({ id: 'b', x: 2, y: 0 });
    const r = stepMonsters([a, b], player, open(8, 1));
    expect(r.moves).toEqual([]);
    expect(pos(a)).toBe('1,0');
  });
});

describe('追擊', () => {
  it('繞過牆，沿最短路往主角走（路徑 5 步以內）', () => {
    // 牆在 (2,0)、(2,1)，只有 (2,2) 是缺口。(1,0) → (1,1) → (1,2) → (2,2) → (3,2) → (3,1) 共 5 步
    const m = makeMon({ id: 'c', x: 1, y: 0, ai: 'chase' });
    const blocked = open(5, 3, [[2, 0], [2, 1]]);
    const r = stepMonsters([m], { x: 3, y: 1 }, blocked);
    expect(r.moves).toEqual([{ id: 'c', from: { x: 1, y: 0 }, to: { x: 1, y: 1 } }]);
  });
  it(`路徑超過 ${CHASE_RANGE} 步就不追`, () => {
    const m = makeMon({ id: 'c', x: 0, y: 0, ai: 'chase' });
    const r = stepMonsters([m], { x: 9, y: 0 }, open(10, 1));
    expect(r.moves).toEqual([]);
    expect(pos(m)).toBe('0,0');
  });
  it('被牆完全隔開（沒有路）就不動', () => {
    const m = makeMon({ id: 'c', x: 0, y: 0, ai: 'chase' });
    const r = stepMonsters([m], { x: 2, y: 0 }, open(3, 1, [[1, 0]]));
    expect(r.moves).toEqual([]);
  });
  it('窄走廊裡後面的怪物不會穿過前面的怪物', () => {
    const a = makeMon({ id: 'a', x: 0, y: 0, ai: 'chase' });
    const b = makeMon({ id: 'b', x: 1, y: 0, ai: 'chase' });
    stepMonsters([a, b], { x: 4, y: 0 }, open(5, 1));
    expect(pos(b)).toBe('2,0');
    expect(pos(a)).toBe('0,0'); // 前面有 b 擋著，找不到路
    expect(pos(a)).not.toBe(pos(b));
  });
});

describe('接觸與開戰', () => {
  it('主角走到怪物旁邊：怪物不動，直接接觸', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }] });
    const r = stepMonsters([m], { x: 0, y: 0 }, open(5, 1));
    expect(r.contact).toBe('a');
    expect(r.moves).toEqual([]);
  });
  it('怪物走到主角旁邊：這一步之後接觸', () => {
    const m = makeMon({ id: 'c', x: 0, y: 0, ai: 'chase' });
    const r = stepMonsters([m], { x: 2, y: 0 }, open(5, 1));
    expect(r.moves).toHaveLength(1);
    expect(pos(m)).toBe('1,0');
    expect(r.contact).toBe('c');
  });
  it('同一回合兩隻怪都能碰到，只有第一隻接觸，另一隻不再移動', () => {
    const a = makeMon({ id: 'a', x: 0, y: 0, ai: 'chase' });
    const b = makeMon({ id: 'b', x: 4, y: 0, ai: 'chase' });
    const r = stepMonsters([a, b], { x: 2, y: 0 }, open(5, 1));
    expect(r.contact).toBe('a');
    expect(r.moves).toHaveLength(1);
    expect(pos(b)).toBe('4,0');
  });
  it('怪物不會走進主角所在的格子', () => {
    const m = makeMon({ id: 'c', x: 1, y: 0, ai: 'chase' });
    stepMonsters([m], { x: 2, y: 0 }, open(5, 1)); // 已經相鄰：直接接觸，不會再走
    expect(pos(m)).toBe('1,0');
  });
});

describe('撤退後暫停', () => {
  it('暫停的 3 個回合不動也不接觸，第 4 個回合恢復', () => {
    const m = makeMon({ id: 'c', x: 1, y: 0, ai: 'chase' });
    const blocked = open(5, 1);
    const player = { x: 2, y: 0 };
    stunMon(m);
    for (let i = 0; i < STUN_TURNS; i++) {
      const r = stepMonsters([m], player, blocked);
      expect(r.contact, `第 ${i + 1} 回合`).toBeNull();
      expect(r.moves).toEqual([]);
    }
    expect(stepMonsters([m], player, blocked).contact).toBe('c');
  });
});
