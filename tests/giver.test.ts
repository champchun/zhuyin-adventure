import { describe, it, expect } from 'vitest';
import { POOR_COINS, GIVER_REWARD, isPoor, giverMap, giverVisible, nextGiverMap } from '../src/core/giver';
import { newSave } from '../src/core/save';
import { ITEMS } from '../src/data/monsters';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { STORY } from '../src/data/levels';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const mk = (visited: string[], coins = 0, giverAt?: string) => {
  const s = newSave();
  s.flags = {};
  for (const v of visited) s.flags[`visited:${v}`] = true;
  s.coins = coins;
  if (giverAt) s.giverAt = giverAt;
  return s;
};

describe('金幣爺爺', () => {
  it('isPoor 門檻', () => {
    expect(isPoor(24)).toBe(true);
    expect(isPoor(25)).toBe(false);
    expect(isPoor(0)).toBe(true);
  });
  it('giverMap', () => {
    expect(giverMap(mk([]))).toBeUndefined();
    expect(giverMap(mk(['dh']))).toBe('dh');
    expect(giverMap(mk(['dh', 'gh'], 0, 'xh'))).toBe('dh');
    expect(giverMap(mk(['dh', 'gh'], 0, 'gh'))).toBe('gh');
  });
  it('giverVisible', () => {
    expect(giverVisible(mk(['dh'], 0), 'dh')).toBe(true);
    expect(giverVisible(mk(['dh'], 25), 'dh')).toBe(false);
    expect(giverVisible(mk(['dh', 'gh'], 0), 'gh')).toBe(false);
  });
  it('nextGiverMap', () => {
    const s = mk(['dh', 'gh', 'xh', 'zh'], 0, 'dh');
    expect(nextGiverMap(s, () => 0)).toBe('gh');
    expect(nextGiverMap(s, () => 0.5)).toBe('xh');
    expect(nextGiverMap(s, () => 0.99)).toBe('zh');
    expect(nextGiverMap(mk(['dh'], 0, 'dh'))).toBe('dh');
    for (const r of [0, 0.3, 0.5, 0.7, 0.99]) {
      for (const at of ['dh', 'gh', 'xh', 'zh']) {
        const t = mk(['dh', 'gh', 'xh', 'zh'], 0, at);
        expect(nextGiverMap(t, () => r)).not.toBe(at);
      }
    }
  });
  it('常數', () => {
    expect(POOR_COINS).toBe(25);
    expect(GIVER_REWARD).toBe(100);
    const min = Math.min(...Object.values(ITEMS).filter((i) => i.price !== undefined).map((i) => i.price!));
    expect(POOR_COINS).toBeGreaterThanOrEqual(min);
  });
});

describe('金幣爺爺：地圖', () => {
  for (const id of ['dh', 'gh', 'xh', 'zh']) {
    it(`${id}：有一位 id 為 giver 的爺爺，站在可走的地形上，不與其他物件重疊，四周有可走的空格`, () => {
      const m = MAPS[id];
      const gs = m.objects.filter((o) => o.kind === 'giver');
      expect(gs.map((o) => o.id)).toEqual(['giver']);
      const g = gs[0];
      expect(BLOCKED_TILES.has(m.tiles[g.y][g.x])).toBe(false);
      const others = new Set(m.objects.filter((o) => o !== g).map((o) => `${o.x},${o.y}`));
      expect(others.has(`${g.x},${g.y}`)).toBe(false);
      // 不站在任何地方的碼頭抵達格或這座島的碼頭格上
      expect(m.hub && m.hub.dock.x === g.x && m.hub.dock.y === g.y).toBeFalsy();
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const t = o.dockTo ?? o.to;
        expect(t && t.map === id && t.x === g.x && t.y === g.y, `${mm.id}/${o.id}`).toBeFalsy();
      }
      const open = N4.filter(([dx, dy]) => {
        const x = g.x + dx, y = g.y + dy;
        return !BLOCKED_TILES.has(m.tiles[y]?.[x] ?? '~') && !others.has(`${x},${y}`);
      });
      expect(open.length).toBeGreaterThanOrEqual(1);
    });
    it(`${id}：離星星婆婆與碼頭至少 2 格`, () => {
      const m = MAPS[id];
      const g = m.objects.find((o) => o.kind === 'giver')!;
      for (const o of m.objects.filter((o) => o.kind === 'granny' || o.kind === 'dock')) {
        expect(Math.abs(o.x - g.x) + Math.abs(o.y - g.y), o.id).toBeGreaterThanOrEqual(2);
      }
    });
  }
  it('第 0 關與 dc1/dc2 沒有爺爺', () => {
    for (const id of ['village', 'lab', 'b', 'p', 'dc1', 'dc2']) {
      expect(MAPS[id].objects.some((o) => o.kind === 'giver'), id).toBe(false);
    }
  });
});

describe('金幣爺爺：台詞', () => {
  const keys = ['giverHello', 'giverAsk', 'giverNeed', 'giverDone', 'giverBye'] as const;
  it('每組都是非空陣列、每條非空字串', () => {
    for (const k of keys) {
      const lines = STORY[k];
      expect(Array.isArray(lines), k).toBe(true);
      expect(lines.length, k).toBeGreaterThan(0);
      for (const t of lines) expect(typeof t === 'string' && t.trim().length > 0, k).toBe(true);
    }
  });
  it('答對與提問的台詞含金額', () => {
    expect(STORY.giverDone.join('')).toContain(String(GIVER_REWARD));
    expect(STORY.giverAsk.join('')).toContain(String(GIVER_REWARD));
  });
});
