import { describe, it, expect, vi, afterEach } from 'vitest';
import { REWARDS, STAR_DOOR_NEED, rewardById } from '../src/data/rewards';
import { availableStars, canRedeem, redeem, equip, setTitle, starDoorOpen } from '../src/core/stars';
import { newSave, loadGame, G } from '../src/core/save';

const R = (id: string) => rewardById(id)!;
const withStars = (stars: number, spent = 0) => ({ ...newSave(), stars, starsSpent: spent });

afterEach(() => vi.unstubAllGlobals());

describe('星星兌換', () => {
  it('可用星星 = 累計 − 已花掉', () => {
    expect(availableStars(withStars(12, 5))).toBe(7);
    expect(availableStars(withStars(3, 0))).toBe(3);
  });
  it('星星不足被拒，且不改存檔', () => {
    const s = withStars(4);
    expect(canRedeem(s, R('title_explorer'))).toEqual({ ok: false, reason: 'poor' });
    expect(redeem(s, R('title_explorer'))).toEqual({ ok: false, reason: 'poor' });
    expect(s.starsSpent).toBe(0);
    expect(s.titles).toEqual([]);
  });
  it('扣的是可用星星，累計不動；第一個稱號自動成為目前稱號', () => {
    const s = withStars(12);
    const r = redeem(s, R('title_explorer'));
    expect(r.ok).toBe(true);
    expect(s.stars).toBe(12);
    expect(s.starsSpent).toBe(5);
    expect(availableStars(s)).toBe(7);
    expect(s.titles).toEqual(['title_explorer']);
    expect(s.title).toBe('title_explorer');
  });
  it('第二個稱號不會自動換掉目前稱號，可用 setTitle 換', () => {
    const s = withStars(30);
    redeem(s, R('title_explorer'));
    redeem(s, R('title_master'));
    expect(s.title).toBe('title_explorer');
    expect(setTitle(s, 'title_master')).toBe(true);
    expect(s.title).toBe('title_master');
    expect(setTitle(s, 'nope')).toBe(false);
  });
  it('重複的稱號與飾品被拒', () => {
    const s = withStars(100);
    redeem(s, R('title_explorer'));
    redeem(s, R('acc_bow'));
    expect(canRedeem(s, R('title_explorer'))).toEqual({ ok: false, reason: 'owned' });
    expect(canRedeem(s, R('acc_bow'))).toEqual({ ok: false, reason: 'owned' });
    const spent = s.starsSpent;
    expect(redeem(s, R('acc_bow'))).toEqual({ ok: false, reason: 'owned' });
    expect(s.starsSpent).toBe(spent);
  });
  it('已擁有優先於星星不足', () => {
    const s = withStars(15);
    redeem(s, R('acc_bow'));
    expect(canRedeem(s, R('acc_bow'))).toEqual({ ok: false, reason: 'owned' });
  });
  it('禮物可重複兌換，回傳要給的道具', () => {
    const s = withStars(80);
    const a = redeem(s, R('gift_potion'));
    const b = redeem(s, R('gift_potion'));
    expect(a).toMatchObject({ ok: true, gift: { item: 'bigpotion', count: 2 } });
    expect(b.ok).toBe(true);
    expect(s.starsSpent).toBe(80);
    expect(canRedeem(s, R('gift_potion'))).toEqual({ ok: false, reason: 'poor' });
  });
  it('飾品自動戴上、互斥、可脫下，沒買過的不能戴', () => {
    const s = withStars(100);
    expect(equip(s, 'crown')).toBe(false);
    redeem(s, R('acc_bow'));
    expect(s.equipped).toBe('bow');
    redeem(s, R('acc_crown'));
    expect(s.equipped).toBe('crown');
    expect(equip(s, 'bow')).toBe(true);
    expect(s.equipped).toBe('bow');
    expect(equip(s, undefined)).toBe(true);
    expect(s.equipped).toBeUndefined();
    expect(s.accessories).toEqual(['bow', 'crown']);
  });
  it('星光門看累計，花掉之後仍然開著', () => {
    const s = withStars(STAR_DOOR_NEED - 1);
    expect(starDoorOpen(s)).toBe(false);
    s.stars = 30;
    expect(starDoorOpen(s)).toBe(true);
    redeem(s, R('acc_bow'));
    redeem(s, R('title_master'));
    expect(availableStars(s)).toBe(0);
    expect(starDoorOpen(s)).toBe(true);
  });
});

describe('存檔欄位', () => {
  const load = (obj: unknown) => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(obj), setItem: () => {} });
    return loadGame();
  };
  it('newSave 有預設值', () => {
    const s = newSave();
    expect(s.starsSpent).toBe(0);
    expect(s.titles).toEqual([]);
    expect(s.accessories).toEqual([]);
    expect(s.equipped).toBeUndefined();
  });
  it('舊存檔缺欄位時補預設值', () => {
    const old: Record<string, unknown> = { ...newSave(), stars: 7 };
    for (const k of ['starsSpent', 'titles', 'accessories', 'equipped', 'title']) delete old[k];
    expect(load(old)).toBe(true);
    expect(G.save.stars).toBe(7);
    expect(G.save.starsSpent).toBe(0);
    expect(G.save.titles).toEqual([]);
    expect(G.save.accessories).toEqual([]);
    expect(availableStars(G.save)).toBe(7);
  });
  it('新存檔的欄位原樣讀回', () => {
    const s = { ...newSave(), stars: 20, starsSpent: 15, titles: ['title_explorer'], accessories: ['bow'], equipped: 'bow', title: 'title_explorer' };
    expect(load(s)).toBe(true);
    expect(G.save).toMatchObject({ starsSpent: 15, titles: ['title_explorer'], accessories: ['bow'], equipped: 'bow', title: 'title_explorer' });
  });
});

describe('獎勵資料', () => {
  it('id 唯一、cost 為正整數、類型欄位完整', () => {
    expect(new Set(REWARDS.map((r) => r.id)).size).toBe(REWARDS.length);
    for (const r of REWARDS) {
      expect(Number.isInteger(r.cost) && r.cost > 0).toBe(true);
      expect(r.name && r.icon).toBeTruthy();
      if (r.type === 'accessory') expect(['bow', 'crown']).toContain(r.accessory);
      if (r.type === 'gift') { expect(r.item).toBeTruthy(); expect(r.count).toBeGreaterThan(0); }
    }
  });
  it('飾品 accessory 值不重複，禮物道具存在', async () => {
    const acc = REWARDS.filter((r) => r.type === 'accessory').map((r) => r.accessory);
    expect(new Set(acc).size).toBe(acc.length);
    const { ITEMS } = await import('../src/data/monsters');
    for (const r of REWARDS.filter((x) => x.type === 'gift')) expect(ITEMS[r.item!]).toBeTruthy();
  });
});
