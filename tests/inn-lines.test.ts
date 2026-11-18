import { describe, expect, it } from 'vitest';
import { STORY } from '../src/data/levels';
import { MAPS } from '../src/data/maps';
import { allVoiceLines } from '../src/data/voiceLines';

const INNS: [string, string][] = [['dh_inn', '鼓聲港'], ['gh_inn', '蛙鳴灣'], ['xh_inn', '雪花鎮'], ['zh_inn', '綠洲鎮'], ['sh_inn', '雲上小鎮'], ['ch_inn', '南瓜鎮'], ['th_inn', '齒輪鎮']];
const keeper = (id: string) => MAPS[id].objects.find((o) => o.kind === 'innkeeper')!;

describe('旅館老闆的台詞：每間旅館各有自己的介紹', () => {
  it('招呼第一句說的是這間旅館自己的地名，不會說成別的地方', () => {
    for (const [id, place] of INNS) {
      const k = keeper(id);
      expect(k.text?.length, id).toBeGreaterThan(0);
      expect(k.text![0], id).toContain(place);
      for (const [other, otherPlace] of INNS) if (other !== id) expect(k.text!.join(''), `${id} 不該提到 ${otherPlace}`).not.toContain(otherPlace);
    }
  });
  it('七間旅館的招呼、道別都各不相同', () => {
    const hellos = INNS.map(([id]) => keeper(id).text!.join('|'));
    const byes = INNS.map(([id]) => keeper(id).doneText!.join('|'));
    expect(new Set(hellos).size).toBe(INNS.length);
    expect(new Set(byes).size).toBe(INNS.length);
    for (const [id] of INNS) expect(keeper(id).doneText!.length, id).toBeGreaterThan(0);
  });
  it('每一句都不是空字串，而且都有說「住一晚」的介紹', () => {
    for (const [id] of INNS) {
      const k = keeper(id);
      for (const t of [...k.text!, ...k.doneText!]) expect(t.trim(), id).not.toBe('');
      expect(k.text!.join(''), id).toContain('住一晚');
    }
  });
  it('鼓聲港旅館的台詞和原本的通用台詞一樣（已預錄的語音不變）', () => {
    expect(keeper('dh_inn').text).toEqual(STORY.innHello);
    expect(keeper('dh_inn').doneText).toEqual(STORY.innBye);
  });
  it('語音句子清單包含每間旅館的招呼與道別', () => {
    const lines = new Set(allVoiceLines());
    for (const [id] of INNS) for (const t of [...keeper(id).text!, ...keeper(id).doneText!]) expect(lines.has(t), t).toBe(true);
  });
});
