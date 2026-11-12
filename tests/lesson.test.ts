import { describe, expect, it } from 'vitest';
import { introducedFromAbilities, lessonSteps, lessonSymbols, makeLessonRound } from '../src/core/lesson';
import { castSymbol } from '../src/data/monsters';

describe('lessonSymbols：這次領到的招式要上哪些符號的課', () => {
  it('每個招式對應綁定的符號，依順序', () => {
    expect(lessonSymbols(['blast', 'gust'], [], castSymbol)).toEqual(['ㄅ', 'ㄆ']);
    expect(lessonSymbols(['croak', 'knock'], [], castSymbol)).toEqual(['ㄍ', 'ㄎ']);
  });
  it('已經認識過的不再出現', () => {
    expect(lessonSymbols(['blast', 'gust'], ['ㄅ'], castSymbol)).toEqual(['ㄆ']);
    expect(lessonSymbols(['breath'], ['ㄏ'], castSymbol)).toEqual([]);
  });
  it('重複的招式只算一次；沒有綁定符號的招式（未知）略過', () => {
    expect(lessonSymbols(['blast', 'blast', 'nope'], [], castSymbol)).toEqual(['ㄅ']);
  });
});

describe('lessonSteps：要上哪幾關', () => {
  it('一律先選符號；有音檔才聽；有筆順且家長開了寫字才寫；順序固定', () => {
    expect(lessonSteps({ hasAudio: true, hasStrokes: true, writeOn: true })).toEqual(['match', 'listen', 'write']);
    expect(lessonSteps({ hasAudio: false, hasStrokes: true, writeOn: true })).toEqual(['match', 'write']);
    expect(lessonSteps({ hasAudio: true, hasStrokes: false, writeOn: true })).toEqual(['match', 'listen']);
    expect(lessonSteps({ hasAudio: true, hasStrokes: true, writeOn: false })).toEqual(['match', 'listen']);
    expect(lessonSteps({ hasAudio: false, hasStrokes: false, writeOn: false })).toEqual(['match']);
  });
});

describe('makeLessonRound：一題', () => {
  const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
  it('選項含目標、不重複、最多 3 個；選項都來自 pool 加上目標', () => {
    for (let i = 0; i < 50; i++) {
      const r = makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ']);
      expect(r.target).toBe('ㄍ');
      expect(r.options).toHaveLength(3);
      expect(new Set(r.options).size).toBe(3);
      expect(r.options).toContain('ㄍ');
      for (const o of r.options) expect(['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ']).toContain(o);
    }
  });
  it('pool 沒包含目標時，目標還是會在選項裡', () => {
    for (let i = 0; i < 30; i++) expect(makeLessonRound('ㄏ', ['ㄅ', 'ㄆ', 'ㄇ']).options).toContain('ㄏ');
  });
  it('pool 很小（不到 3 個）時用 2 個選項；只有目標自己時也不會當掉', () => {
    expect(makeLessonRound('ㄅ', ['ㄅ', 'ㄆ']).options.sort()).toEqual(['ㄅ', 'ㄆ']);
    expect(makeLessonRound('ㄅ', ['ㄅ']).options).toEqual(['ㄅ']);
  });
  it('答案的位置會變；可以注入亂數重現', () => {
    const idx = new Set<number>();
    for (let i = 0; i < 80; i++) idx.add(makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ']).options.indexOf('ㄍ'));
    expect(idx.size).toBeGreaterThan(1);
    expect(makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ'], seq(0.1, 0.5, 0.9))).toEqual(makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ'], seq(0.1, 0.5, 0.9)));
  });
});

describe('introducedFromAbilities：舊存檔升級', () => {
  it('學會的招式綁定的符號都算已認識', () => {
    expect(introducedFromAbilities(['blast', 'gust', 'hum'], castSymbol)).toEqual(['ㄅ', 'ㄆ', 'ㄇ']);
    expect(introducedFromAbilities([], castSymbol)).toEqual([]);
  });
});
