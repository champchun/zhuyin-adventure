// @ts-ignore 專案沒有 @types/node（同 tests/mazegen.test.ts）
import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { G, activeSymbols, defaultSettings, newSave } from '../src/core/save';
import { ZHUYIN_AUDIO } from '../src/data/audioMap';
import { ALL_SYMBOLS, CONSONANTS, LEARN_STEPS, VOWELS, ZHUYIN_TEST, symbolDef } from '../src/data/symbols';

const STAGE1_FLAGS = ['practiceDone', 'dEntered', 'dPractice', 'gEntered', 'gPractice', 'xEntered', 'xPractice', 'zEntered', 'zPractice', 'sEntered', 'sPractice'];
const STAGE2: { symbols: string[]; flag: string }[] = [
  { symbols: ['ㄧ', 'ㄨ'], flag: 'uEntered' }, { symbols: ['ㄩ'], flag: 'uPractice' },
  { symbols: ['ㄚ', 'ㄛ'], flag: 'aEntered' }, { symbols: ['ㄜ', 'ㄝ'], flag: 'aPractice' },
  { symbols: ['ㄞ', 'ㄟ'], flag: 'cEntered' }, { symbols: ['ㄠ', 'ㄡ'], flag: 'cPractice' },
  { symbols: ['ㄢ', 'ㄣ'], flag: 'tEntered' }, { symbols: ['ㄤ', 'ㄥ', 'ㄦ'], flag: 'tPractice' },
];

describe('第二階段符號資料', () => {
  it('21 個聲母、16 個韻母、共 37 個，沒有重複', () => {
    expect(CONSONANTS).toHaveLength(21);
    expect(VOWELS).toHaveLength(16);
    expect(ALL_SYMBOLS).toHaveLength(37);
    expect(new Set(ALL_SYMBOLS).size).toBe(37);
    expect([...CONSONANTS, ...VOWELS]).toEqual(ALL_SYMBOLS);
  });
  it('韻母和發音測試表的「韻母」一組完全一樣', () => {
    const group = ZHUYIN_TEST.find((g) => g.group === '韻母')!;
    expect([...VOWELS].sort()).toEqual(group.list.map(([c]) => c).sort());
    for (const [c, w] of group.list) expect(symbolDef(c).word, c).toBe(w);
  });
  it('每個韻母都有例字與提示語（提示語不重複，且是「這個字的聲音」格式）', () => {
    const tips = new Set<string>();
    for (const v of VOWELS) {
      const d = symbolDef(v);
      expect(d.word.length, v).toBe(1);
      expect(d.tip, v).toBe(`「${d.word}」這個字的聲音`);
      tips.add(d.tip);
    }
    expect(tips.size).toBe(16);
  });
  it('37 個符號的音檔都登記了，檔案也都在 public/audio/zhuyin/', () => {
    for (const s of ALL_SYMBOLS) {
      expect(ZHUYIN_AUDIO[s], s).toBeDefined();
      expect(existsSync(`public/${ZHUYIN_AUDIO[s]}`), s).toBe(true);
    }
  });
});

describe('第二階段教學進度', () => {
  beforeEach(() => { G.save = newSave(); G.settings = defaultSettings(); });
  const setFlags = (fs: string[]) => { for (const f of fs) G.save.flags[f] = true; };

  it('LEARN_STEPS 後面八步照順序、符號與旗標逐字照表', () => {
    expect(LEARN_STEPS.slice(-8)).toEqual(STAGE2);
  });
  it('每一步的旗標都不重複；韻母每個只教一次', () => {
    const flags = LEARN_STEPS.map((s) => s.flag).filter(Boolean);
    expect(new Set(flags).size).toBe(flags.length);
    const stage2 = LEARN_STEPS.slice(-8).flatMap((s) => s.symbols);
    expect([...stage2].sort()).toEqual([...VOWELS].sort());
  });
  it('只通第一階段：21 個聲母都有，一個韻母都還沒有', () => {
    setFlags(STAGE1_FLAGS);
    const a = activeSymbols();
    expect([...a].sort()).toEqual([...CONSONANTS].sort());
  });
  it('逐步進入第二階段：旗標一個一個開，符號一批一批出現', () => {
    setFlags(STAGE1_FLAGS);
    let expected = [...CONSONANTS];
    for (const st of STAGE2) {
      G.save.flags[st.flag] = true;
      expected = [...expected, ...st.symbols];
      expect([...activeSymbols()].sort(), st.flag).toEqual([...expected].sort());
    }
    expect(activeSymbols()).toHaveLength(37);
  });
});
