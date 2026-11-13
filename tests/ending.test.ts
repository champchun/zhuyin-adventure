import { describe, it, expect } from 'vitest';
import { REWARDS, SHOP_REWARDS, rewardById } from '../src/data/rewards';
import { canRedeem, redeem, titleName } from '../src/core/stars';
import { grantEnding } from '../src/core/ending';
import { newSave } from '../src/core/save';
import { BATTLES, ENDING_LINES } from '../src/data/levels';
import { ALL_SYMBOLS } from '../src/data/symbols';

describe('免費稱號 title_hero', () => {
  const hero = rewardById('title_hero')!;
  it('是 free、cost 0，不在婆婆清單，不能兌換', () => {
    expect(hero.free).toBe(true);
    expect(hero.cost).toBe(0);
    expect(SHOP_REWARDS.some((r) => r.id === 'title_hero')).toBe(false);
    const s = { ...newSave(), stars: 999 };
    expect(canRedeem(s, hero)).toEqual({ ok: false, reason: 'free' });
    expect(redeem(s, hero)).toEqual({ ok: false, reason: 'free' });
    expect(s.titles).toEqual([]);
    expect(s.starsSpent).toBe(0);
  });
  it('婆婆清單就是其他所有獎勵', () => {
    expect(SHOP_REWARDS.map((r) => r.id)).toEqual(['title_explorer', 'acc_bow', 'title_master', 'acc_crown', 'gift_potion']);
    expect(REWARDS.filter((r) => !r.free).every((r) => r.cost > 0)).toBe(true);
  });
  it('舊兌換照常可用', () => {
    const s = { ...newSave(), stars: 200 };
    for (const r of SHOP_REWARDS) expect(redeem(s, r).ok).toBe(true);
  });
});

describe('grantEnding', () => {
  it('沒打倒 boss_s 不發', () => {
    const s = newSave();
    expect(grantEnding(s)).toEqual({ granted: false });
    expect(s.titles).toEqual([]);
    expect(s.flags.endingSeen).toBeUndefined();
  });
  it('打倒 boss_s 發一次，覆蓋目前稱號，重複呼叫不再發', () => {
    const s = newSave();
    s.titles = ['title_explorer']; s.title = 'title_explorer';
    s.flags.boss_s = true;
    expect(grantEnding(s)).toEqual({ granted: true });
    expect(s.titles).toEqual(['title_explorer', 'title_hero']);
    expect(s.title).toBe('title_hero');
    expect(titleName(s)).toBe('注音大英雄');
    expect(s.flags.endingSeen).toBe(true);
    s.title = 'title_explorer'; // 孩子自己換回去後，不會再被覆蓋
    expect(grantEnding(s)).toEqual({ granted: false });
    expect(s.title).toBe('title_explorer');
    expect(s.titles.filter((t) => t === 'title_hero')).toHaveLength(1);
  });
  it('舊存檔（沒有 titles 欄位）安全', () => {
    const s = newSave() as any;
    delete s.titles; delete s.title;
    s.flags.boss_s = true;
    expect(grantEnding(s).granted).toBe(true);
    expect(s.titles).toEqual(['title_hero']);
  });
});

describe('結尾劇情與畢業考', () => {
  it('結尾台詞非空、無空字串', () => {
    expect(ENDING_LINES.length).toBeGreaterThan(0);
    for (const l of ENDING_LINES) { expect(l.text.trim()).not.toBe(''); expect(l.who.trim()).not.toBe(''); }
  });
  it('boss_s focus/review 為全部 21 個聲母', () => {
    expect(ALL_SYMBOLS).toHaveLength(21);
    expect(BATTLES.boss_s.focus).toEqual(ALL_SYMBOLS);
    expect(BATTLES.boss_s.review).toEqual(ALL_SYMBOLS);
  });
});
