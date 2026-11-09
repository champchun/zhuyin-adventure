import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ALL_SYMBOLS } from '../src/data/symbols';
import { QuestionRun, makeQuestion } from '../src/core/learning';
import { emptyStat } from '../src/core/save';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function reach(mapId: string, from: { x: number; y: number }, extraBlocked: Set<string>) {
  const m = MAPS[mapId];
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const q = [from];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of N4) {
      const x = c.x + dx, y = c.y + dy, k = `${x},${y}`;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h || seen.has(k)) continue;
      if (BLOCKED_TILES.has(m.tiles[y][x]) || extraBlocked.has(k)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  return seen;
}
const adjReach = (seen: Set<string>, o: { x: number; y: number }) => N4.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));

describe('maps', () => {
  for (const m of Object.values(MAPS)) {
    it(`${m.id}: 尺寸一致、物件在界內、起點可走、id 不重複`, () => {
      expect(m.tiles.length).toBe(m.h);
      m.tiles.forEach((r) => expect(r.length).toBe(m.w));
      expect(BLOCKED_TILES.has(m.tiles[m.start.y][m.start.x])).toBe(false);
      expect(BLOCKED_TILES.has(m.tiles[m.respawn.y][m.respawn.x])).toBe(false);
      for (const o of m.objects) {
        expect(o.x).toBeGreaterThanOrEqual(0); expect(o.x).toBeLessThan(m.w);
        expect(o.y).toBeGreaterThanOrEqual(0); expect(o.y).toBeLessThan(m.h);
        if (o.battle) expect(BATTLES[o.battle]).toBeDefined();
      }
      const ids = m.objects.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
    it(`${m.id}: 物件不放在被阻擋的地形上（出口／注音門／裂石除外）`, () => {
      for (const o of m.objects) {
        const t = m.tiles[o.y][o.x];
        expect(BLOCKED_TILES.has(t), `${m.id}/${o.id} 在 ${t}`).toBe(false);
      }
    });
    it(`${m.id}: 起點能走到所有一般物件旁`, () => {
      const solid = new Set(m.objects.map((o) => `${o.x},${o.y}`));
      const seen = reach(m.id, m.start, solid);
      const sealed = new Set(['chest_rock', 'chest_hidden', 'chest_leaf', 'chest_wind', 'chest_fog']);
      for (const o of m.objects) {
        if (['rock', 'woodgate', 'leaves', 'fog'].includes(o.kind) || sealed.has(o.id)) continue;
        expect(adjReach(seen, o), `${m.id}/${o.id} 無法抵達`).toBe(true);
      }
    });
  }
  it('被封住的寶箱：打通裂石／落葉／木門後才可抵達', () => {
    const check = (mapId: string, open: string[], chest: string, expected: boolean) => {
      const m = MAPS[mapId];
      const solid = new Set(m.objects.filter((o) => !open.includes(o.id)).map((o) => `${o.x},${o.y}`));
      const seen = reach(mapId, m.start, solid);
      expect(adjReach(seen, m.objects.find((o) => o.id === chest)!), `${mapId}/${chest}`).toBe(expected);
    };
    check('b', [], 'chest_rock', false); check('b', ['rock_b'], 'chest_rock', true);
    check('p', [], 'chest_leaf', false); check('p', ['leaves_a'], 'chest_leaf', true);
    check('p', [], 'chest_wind', false); check('p', ['woodgate'], 'chest_wind', true);
    check('village', [], 'chest_hidden', false); check('village', ['rock_a'], 'chest_hidden', true);
    check('village', [], 'chest_fog', false); check('village', ['fog_a'], 'chest_fog', true);
  });
});

describe('levels', () => {
  it('已開放關卡有地圖，其餘保留為尚未開放', () => {
    for (const L of Object.values(LEVELS)) {
      if (L.open) expect(MAPS[L.mapId!]).toBeDefined(); else expect(L.mapId).toBeUndefined();
    }
    expect(Object.keys(LEVELS)).toEqual(['b', 'p', 'd', 'g']);
  });
});

describe('learning', () => {
  const stats = () => Object.fromEntries(ALL_SYMBOLS.map((s) => [s, emptyStat()]));
  const ctx = (over: any = {}) => ({ focus: ['ㄅ'], review: ['ㄇ', 'ㄉ'], allowed: ALL_SYMBOLS, tier: 1 as const, audioReady: false, optionCount: 2, stats: stats(), ...over });

  it('選項只來自開放的符號、含正解、不重複', () => {
    const allowed = ['ㄅ', 'ㄆ', 'ㄇ'];
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(ctx({ allowed, optionCount: 3 }));
      expect(q.options.every((o) => allowed.includes(o))).toBe(true);
      expect(q.options).toContain(q.target);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });
  it('正解位置隨機分佈', () => {
    const pos = [0, 0];
    for (let i = 0; i < 400; i++) { const q = makeQuestion(ctx({ review: [], focus: ['ㄅ'], allowed: ['ㄅ', 'ㄆ'] })); pos[q.options.indexOf(q.target)]++; }
    expect(pos[0]).toBeGreaterThan(120); expect(pos[1]).toBeGreaterThan(120);
  });
  it('不連續出同一題（有多個目標時）', () => {
    let prev: string | undefined;
    for (let i = 0; i < 200; i++) { const q = makeQuestion(ctx({ prevTarget: prev })); if (prev) expect(q.target).not.toBe(prev); prev = q.target; }
  });
  it('沒有音檔時，聽音題退回看符號配對並標記 fallback', () => {
    const q = makeQuestion(ctx({ tier: 2, audioReady: false }));
    expect(q.type).toBe('match'); expect(q.fallback).toBe(true);
    expect(makeQuestion(ctx({ tier: 2, audioReady: true })).type).toBe('listen');
  });
  it('家長只開放 2 個符號時，仍只有 2 個選項', () => {
    expect(makeQuestion(ctx({ allowed: ['ㄅ', 'ㄆ'], optionCount: 3 })).options.length).toBe(2);
  });
  it('首次獨立答對才算 first；答錯或提示後完成只算 assisted', () => {
    const st = stats();
    const q = { type: 'match' as const, target: 'ㄅ', options: ['ㄅ', 'ㄆ', 'ㄇ'], fallback: false };
    let r = new QuestionRun(q, st); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1);
    r = new QuestionRun(q, st); r.pick('ㄆ'); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1); expect(st['ㄅ'].assisted).toBe(1); expect(st['ㄅ'].wrong).toBe(1);
    r = new QuestionRun(q, st); r.hint(); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1); expect(st['ㄅ'].assisted).toBe(2); expect(st['ㄅ'].hints).toBe(1);
    r = new QuestionRun(q, st, true); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1);
  });
  it('連續答錯：先減少選項，再顯示正確符號；完成後不能重複計分', () => {
    const st = stats();
    const q = { type: 'match' as const, target: 'ㄅ', options: ['ㄅ', 'ㄆ', 'ㄇ'], fallback: false };
    const r = new QuestionRun(q, st);
    expect(r.pick('ㄆ')).toBe('wrong'); expect(r.visible().length).toBe(3);
    r.pick('ㄇ');
    expect(r.visible().length).toBe(2); expect(r.done).toBe(false);
    r.pick(r.visible().find((o) => o !== 'ㄅ')!);
    expect(r.revealed).toBe(true);
    expect(r.pick('ㄅ')).toBe('correct');
    expect(r.pick('ㄅ')).toBe('ignored');
    expect(st['ㄅ'].assisted).toBe(1);
  });
  it('容易答錯的符號增加複習機會', () => {
    const st = stats();
    st['ㄉ'].wrong = 6;
    let d = 0, m = 0;
    for (let i = 0; i < 1500; i++) { const q = makeQuestion(ctx({ stats: st, focus: [], review: ['ㄇ', 'ㄉ'] })); if (q.target === 'ㄉ') d++; else m++; }
    expect(d).toBeGreaterThan(m);
  });
});
