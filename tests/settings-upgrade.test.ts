import { beforeEach, describe, expect, it, vi } from 'vitest';
import { G, loadSettings } from '../src/core/save';
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

describe('loadSettings 的家長可出題符號升級', () => {
  it('沒有存過設定：預設全開', () => {
    expect([...load()].sort()).toEqual([...ALL_SYMBOLS].sort());
  });
  it('存了第四關結束時的 14 個符號 → 升級成含 ㄓㄔㄕㄖ', () => {
    expect(has(load(OLD14), 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ')).toBe(true);
  });
  it('已經含新符號 → 不變', () => {
    const a = [...OLD14, 'ㄓ'];
    expect([...load(a)].sort()).toEqual([...a].sort());
  });
  it('客製子集（只有 ㄅㄆ）→ 不變', () => {
    expect(load(['ㄅ', 'ㄆ'])).toEqual(['ㄅ', 'ㄆ']);
  });
  it('客製：取消勾選過 ㄅ 的 13 個 → 不變', () => {
    const a = OLD14.filter((s) => s !== 'ㄅ');
    expect(load(a)).toEqual(a);
  });
  it('舊的 8 個、11 個清單仍然升級到全開', () => {
    expect(has(load(OLD8), 'ㄍ', 'ㄓ', 'ㄖ')).toBe(true);
    expect(has(load(OLD11), 'ㄐ', 'ㄓ', 'ㄖ')).toBe(true);
  });
});
