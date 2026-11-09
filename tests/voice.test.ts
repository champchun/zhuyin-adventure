import { describe, expect, it } from 'vitest';
import { allVoiceLines, PROMPT_LINES } from '../src/data/voiceLines';
import { STORY, BATTLES } from '../src/data/levels';
import { HUDU } from '../src/data/symbols';
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
  it('audioMap 內每個符號都有呼讀對照', () => { Object.keys(ZHUYIN_AUDIO).forEach((s) => expect(HUDU[s], s).toBeDefined()); });
});
