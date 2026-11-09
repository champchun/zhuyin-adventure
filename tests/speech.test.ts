import { describe, expect, it } from 'vitest';
import { isSpeakable, splitZhuyin } from '../src/core/speech';
import { allVoiceLines } from '../src/data/voiceLines';

describe('splitZhuyin', () => {
  it('把注音符號獨立成段，其餘文字保持原樣', () => {
    expect(splitZhuyin('找找看，哪一個和蛋上的「ㄅ」一樣？')).toEqual([
      { t: 'text', v: '找找看，哪一個和蛋上的「' }, { t: 'sym', v: 'ㄅ' }, { t: 'text', v: '」一樣？' },
    ]);
  });
  it('夥伴名字：符號 + 其餘字', () => {
    expect(splitZhuyin('ㄅ寶加入了你的隊伍！')).toEqual([{ t: 'sym', v: 'ㄅ' }, { t: 'text', v: '寶加入了你的隊伍！' }]);
    expect(splitZhuyin('ㄆ翼鳥累倒了…').map((x) => x.t)).toEqual(['sym', 'text']);
  });
  it('沒有注音的句子只有一段文字；連續符號各自成段', () => {
    expect(splitZhuyin('你好呀')).toEqual([{ t: 'text', v: '你好呀' }]);
    expect(splitZhuyin('ㄅㄆ').map((x) => x.v)).toEqual(['ㄅ', 'ㄆ']);
  });
  it('只有標點的片段不必朗讀', () => {
    expect(isSpeakable('」。')).toBe(false);
    expect(isSpeakable('」一樣？')).toBe(true);
  });
  it('遊戲裡所有固定句子拆段後，文字段都不含注音符號', () => {
    for (const l of allVoiceLines()) for (const sg of splitZhuyin(l)) if (sg.t === 'text') expect(sg.v).not.toMatch(/[\u3105-\u312f]/);
  });
});
