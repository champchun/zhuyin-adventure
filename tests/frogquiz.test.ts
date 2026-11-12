import { describe, expect, it } from 'vitest';
import { FROG_REWARD, FROG_ROUNDS, makeFrogRound } from '../src/core/frogquiz';

/** 每次回傳固定序列的假亂數，讓結果可預測 */
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('makeFrogRound：青蛙聽音石出題', () => {
  const pool = ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ'];
  it('答案在選項裡，選項是 3 個不重複的符號，都來自 pool', () => {
    for (let i = 0; i < 50; i++) {
      const r = makeFrogRound(pool)!;
      expect(r.options).toHaveLength(3);
      expect(new Set(r.options).size).toBe(3);
      expect(r.options).toContain(r.target);
      for (const o of r.options) expect(pool).toContain(o);
    }
  });
  it('pool 少於 3 個符號就不出題', () => {
    expect(makeFrogRound(['ㄅ', 'ㄆ'])).toBeNull();
    expect(makeFrogRound([])).toBeNull();
  });
  it('剛好 3 個符號也可以出題', () => {
    const r = makeFrogRound(['ㄅ', 'ㄆ', 'ㄇ'])!;
    expect([...r.options].sort()).toEqual(['ㄅ', 'ㄆ', 'ㄇ']);
  });
  it('不會連續兩題答案一樣（pool 夠大時）', () => {
    for (let i = 0; i < 50; i++) expect(makeFrogRound(pool, 'ㄅ')!.target).not.toBe('ㄅ');
  });
  it('答案的位置會變（不是永遠第一個）', () => {
    const idx = new Set<number>();
    for (let i = 0; i < 80; i++) { const r = makeFrogRound(pool)!; idx.add(r.options.indexOf(r.target)); }
    expect(idx.size).toBeGreaterThan(1);
  });
  it('可以注入亂數（結果可重現）', () => {
    expect(makeFrogRound(pool, undefined, seq(0.1, 0.3, 0.6, 0.9))).toEqual(makeFrogRound(pool, undefined, seq(0.1, 0.3, 0.6, 0.9)));
  });
});

describe('青蛙聽音石的獎勵', () => {
  it('答對 3 題，送 10 金幣和 1 顆魔力果', () => {
    expect(FROG_ROUNDS).toBe(3);
    expect(FROG_REWARD).toEqual({ coins: 10, item: 'berry', count: 1 });
  });
});
