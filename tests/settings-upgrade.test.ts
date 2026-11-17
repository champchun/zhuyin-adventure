import { beforeEach, describe, expect, it, vi } from 'vitest';
import { G, loadSettings, saveSettings } from '../src/core/save';
import { ALL_SYMBOLS } from '../src/data/symbols';

const KEY = 'zhuyin-adventure-settings-v1';
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
});
const load = (allowed?: string[]) => {
  if (allowed) store.set(KEY, JSON.stringify({ allowed }));
  loadSettings();
  return G.settings.allowed;
};
const has = (a: string[], ...s: string[]) => s.every((x) => a.includes(x));
const OLD8 = ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'];
const OLD11 = [...OLD8, 'ㄍ', 'ㄎ', 'ㄏ'];
const OLD14 = [...OLD11, 'ㄐ', 'ㄑ', 'ㄒ'];
const OLD18 = [...OLD14, 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ'];
const OLD21 = [...OLD18, 'ㄗ', 'ㄘ', 'ㄙ'];

describe('loadSettings 的家長可出題符號升級', () => {
  it('沒有存過設定：預設全開', () => {
    expect([...load()].sort()).toEqual([...ALL_SYMBOLS].sort());
  });
  it('存了第四關結束時的 14 個符號 → 升級成含 ㄓㄔㄕㄖ', () => {
    expect(has(load(OLD14), 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ')).toBe(true);
  });
  it('存了第五關結束時的 18 個符號 → 升級成含 ㄗㄘㄙ', () => {
    expect(has(load(OLD18), 'ㄗ', 'ㄘ', 'ㄙ')).toBe(true);
  });
  it('存了第六關結束時的 21 個聲母 → 升級成含全部韻母', () => {
    expect(has(load(OLD21), 'ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄦ')).toBe(true);
    expect(load(OLD21)).toHaveLength(37);
  });
  it('已經含韻母 → 不變；客製（少了 ㄅ）的 20 個 → 不變', () => {
    const a = [...OLD21, 'ㄚ'];
    expect([...load(a)].sort()).toEqual([...a].sort());
    const b = OLD21.filter((s) => s !== 'ㄅ');
    expect(load(b)).toEqual(b);
  });
  it('已經含新符號 → 不變', () => {
    const a = [...OLD14, 'ㄓ'];
    expect([...load(a)].sort()).toEqual([...a].sort());
    const b = [...OLD18, 'ㄗ'];
    expect([...load(b)].sort()).toEqual([...b].sort());
  });
  it('客製：取消勾選過 ㄅ 的 17 個 → 不變', () => {
    const a = OLD18.filter((s) => s !== 'ㄅ');
    expect(load(a)).toEqual(a);
  });
  it('客製子集（只有 ㄅㄆ）→ 不變', () => {
    expect(load(['ㄅ', 'ㄆ'])).toEqual(['ㄅ', 'ㄆ']);
  });
  it('客製：取消勾選過 ㄅ 的 13 個 → 不變', () => {
    const a = OLD14.filter((s) => s !== 'ㄅ');
    expect(load(a)).toEqual(a);
  });
  it('已升級過（allowedRev 1）的 21 個聲母清單 → 不再升級（家長刻意只留聲母）', () => {
    store.set(KEY, JSON.stringify({ allowed: OLD21, allowedRev: 1 }));
    loadSettings();
    expect(G.settings.allowed).toEqual(OLD21);
    expect(G.settings.allowed).toHaveLength(21);
  });
  it('同樣的 21 個但沒有 allowedRev → 仍升級成 37 個', () => {
    expect(load(OLD21)).toHaveLength(37);
  });
  it('載入舊清單後 allowedRev 變成 1，並且會存回去', () => {
    load(OLD14);
    expect(G.settings.allowedRev).toBe(1);
    saveSettings();
    expect(JSON.parse(store.get(KEY)!).allowedRev).toBe(1);
  });
  it('舊的 8 個、11 個清單仍然升級到全開', () => {
    expect(has(load(OLD8), 'ㄍ', 'ㄓ', 'ㄖ')).toBe(true);
    expect(has(load(OLD11), 'ㄐ', 'ㄓ', 'ㄖ')).toBe(true);
    expect(has(load(OLD14), 'ㄗ', 'ㄙ')).toBe(true);
    expect(has(load(OLD8), 'ㄗ', 'ㄙ')).toBe(true);
  });
});
