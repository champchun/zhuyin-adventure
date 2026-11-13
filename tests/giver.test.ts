import { describe, it, expect } from 'vitest';
import { POOR_COINS, GIVER_REWARD, isPoor, giverMap, giverVisible, nextGiverMap } from '../src/core/giver';
import { newSave } from '../src/core/save';
import { ITEMS } from '../src/data/monsters';

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
    const s = mk(['dh', 'gh', 'xh'], 0, 'dh');
    expect(nextGiverMap(s, () => 0)).toBe('gh');
    expect(nextGiverMap(s, () => 0.99)).toBe('xh');
    expect(nextGiverMap(mk(['dh'], 0, 'dh'))).toBe('dh');
    for (const r of [0, 0.3, 0.5, 0.7, 0.99]) {
      for (const at of ['dh', 'gh', 'xh']) {
        const t = mk(['dh', 'gh', 'xh'], 0, at);
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
