import { describe, expect, it } from 'vitest';
import { allVoiceLines, PROMPT_LINES } from '../src/data/voiceLines';
import { STORY, BATTLES } from '../src/data/levels';
import { HUDU, ZHUYIN_TEST } from '../src/data/symbols';
import { ZHUYIN_AUDIO } from '../src/data/audioMap';

describe('預錄語音句子清單', () => {
  const lines = allVoiceLines();
  it('涵蓋所有劇情、戰鬥開場與勝利文字，且不重複', () => {
    for (const v of Object.values(STORY)) v.forEach((t) => expect(lines).toContain(t));
    for (const b of Object.values(BATTLES)) { b.intro.forEach((t) => expect(lines).toContain(t)); b.reward.story.forEach((t) => expect(lines).toContain(t)); }
    Object.values(PROMPT_LINES).forEach((t) => expect(lines).toContain(t));
    expect(new Set(lines).size).toBe(lines.length);
  });
  it('固定句子不含動態變數', () => { lines.forEach((t) => expect(t).not.toMatch(/\$\{|undefined|NaN/)); });
  it('audioMap 涵蓋全部 37 個注音、檔名不重複', () => {
    const all = ZHUYIN_TEST.flatMap((g) => g.list.map(([c]) => c));
    expect(all.length).toBe(37);
    all.forEach((c) => expect(ZHUYIN_AUDIO[c], c).toBeDefined());
    const files = Object.values(ZHUYIN_AUDIO);
    expect(new Set(files).size).toBe(files.length);
  });
  it('呼讀對照只列有效符號', () => { Object.keys(HUDU).forEach((s) => expect(ZHUYIN_AUDIO[s], s).toBeDefined()); });
});
