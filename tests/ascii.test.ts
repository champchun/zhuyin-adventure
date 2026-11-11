import { describe, expect, it } from 'vitest';
import { fromAscii } from '../src/data/ascii';

describe('fromAscii：文字圖', () => {
  const legend = {
    K: { id: 'key_chest', kind: 'chest' as const, item: 'key' },
    '>': { id: 'down', kind: 'stairs' as const, to: { map: 'next', x: 1, y: 1 } },
  };
  it('# 是牆（S）、. 是地板（:），並量出大小', () => {
    const f = fromAscii(['####', '#..#', '####']);
    expect(f.w).toBe(4);
    expect(f.h).toBe(3);
    expect(f.tiles).toEqual(['SSSS', 'S::S', 'SSSS']);
    expect(f.objects).toEqual([]);
  });
  it('圖例的字元變成物件，座標就是字元的位置，底下是地板', () => {
    const f = fromAscii(['#####', '#K.>#', '#####'], legend);
    expect(f.tiles[1]).toBe('S:::S');
    expect(f.objects).toEqual([
      { id: 'key_chest', kind: 'chest', item: 'key', x: 1, y: 1 },
      { id: 'down', kind: 'stairs', to: { map: 'next', x: 1, y: 1 }, x: 3, y: 1 },
    ]);
  });
  it('每一行長度要一樣，否則丟出錯誤並說明哪一行', () => {
    expect(() => fromAscii(['####', '#.#', '####'])).toThrow(/第 1 行/);
  });
  it('沒有定義的字元丟出錯誤並說明位置', () => {
    expect(() => fromAscii(['###', '#?#', '###'])).toThrow(/第 1 行第 1 欄.*\?/);
  });
  it('同一個物件字元出現兩次（id 重複）會丟出錯誤', () => {
    expect(() => fromAscii(['#####', '#K.K#', '#####'], legend)).toThrow(/重複/);
  });
});
