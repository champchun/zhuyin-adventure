import { describe, it, expect } from 'vitest';
import { SHOP_REWARDS, rewardById } from '../src/data/rewards';
import { canRedeem, redeem, titleName } from '../src/core/stars';
import { ENDING2_TITLE_ID, grantEnding2, needsEnding2 } from '../src/core/ending2';
import { grantEnding, needsEnding } from '../src/core/ending';
import { newSave } from '../src/core/save';
import { ENDING2_LINES } from '../src/data/levels';

describe('免費稱號 title_zhuyin_master', () => {
  const r = rewardById('title_zhuyin_master')!;
  it('free、cost 0、不在婆婆清單、不能兌換；title_master 不受影響', () => {
    expect(ENDING2_TITLE_ID).toBe('title_zhuyin_master');
    expect(r.type).toBe('title');
    expect(r.name).toBe('注音大師');
    expect(r.icon).toBe('👑');
    expect(r.free).toBe(true);
    expect(r.cost).toBe(0);
    expect(SHOP_REWARDS.some((x) => x.id === 'title_zhuyin_master')).toBe(false);
    expect(rewardById('title_master')!.name).toBe('注音小達人');
    const s = { ...newSave(), stars: 999 };
    expect(canRedeem(s, r)).toEqual({ ok: false, reason: 'free' });
    expect(redeem(s, r)).toEqual({ ok: false, reason: 'free' });
  });
});

describe('grantEnding2', () => {
  it('沒打倒 boss_t 不發', () => {
    const s = newSave();
    expect(needsEnding2(s)).toBe(false);
    expect(grantEnding2(s)).toEqual({ granted: false });
    expect(s.titles).toEqual([]);
    expect(s.flags.ending2Seen).toBeUndefined();
  });
  it('打倒後發一次，不重複', () => {
    const s = newSave();
    s.flags.boss_t = true;
    expect(needsEnding2(s)).toBe(true);
    expect(grantEnding2(s)).toEqual({ granted: true });
    expect(s.titles).toContain('title_zhuyin_master');
    expect(s.title).toBe('title_zhuyin_master');
    expect(titleName(s)).toBe('注音大師');
    expect(s.flags.ending2Seen).toBe(true);
    expect(needsEnding2(s)).toBe(false);
    expect(grantEnding2(s)).toEqual({ granted: false });
    expect(s.titles!.filter((t) => t === 'title_zhuyin_master')).toHaveLength(1);
  });
  it('覆蓋目前稱號，title_hero 仍在', () => {
    const s = newSave();
    s.titles = ['title_hero']; s.title = 'title_hero';
    s.flags.boss_t = true;
    grantEnding2(s);
    expect(s.title).toBe('title_zhuyin_master');
    expect(s.titles).toEqual(['title_hero', 'title_zhuyin_master']);
  });
  it('舊存檔沒有 titles 不丟例外', () => {
    const s = newSave() as any;
    delete s.titles; delete s.title;
    s.flags.boss_t = true;
    expect(grantEnding2(s).granted).toBe(true);
    expect(s.titles).toEqual(['title_zhuyin_master']);
  });
  it('與第一階段結局互不影響', () => {
    const a = newSave();
    a.flags.boss_s = true;
    expect(needsEnding2(a)).toBe(false);
    expect(grantEnding(a).granted).toBe(true);
    expect(a.flags.ending2Seen).toBeUndefined();
    const b = newSave();
    b.flags.boss_t = true;
    expect(needsEnding(b)).toBe(false);
    grantEnding2(b);
    expect(b.flags.endingSeen).toBeUndefined();
  });
});

describe('ENDING2_LINES', () => {
  it('結構、內容與收尾', () => {
    expect(ENDING2_LINES.length).toBeGreaterThanOrEqual(6);
    for (const l of ENDING2_LINES) { expect(l.who.trim()).not.toBe(''); expect(l.text.trim()).not.toBe(''); }
    expect(ENDING2_LINES.some((l) => l.text.includes('注音大師'))).toBe(true);
    expect(ENDING2_LINES[ENDING2_LINES.length - 1].who).toBe('旁白');
    const all = ENDING2_LINES.map((l) => l.text).join('');
    expect(all).not.toContain('世界地圖');
    expect(all).not.toContain('新的冒險');
  });
});
