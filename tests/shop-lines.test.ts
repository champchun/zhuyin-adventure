import { describe, expect, it } from 'vitest';
import { STORY } from '../src/data/levels';
import { MAPS } from '../src/data/maps';
import { allVoiceLines } from '../src/data/voiceLines';

const SHOPS: [string, string][] = [
  ['shop', '小福'], ['dh_shop', '鼓聲港'], ['gh_shop', '蛙鳴灣'], ['xh_shop', '雪花鎮'],
  ['zh_shop', '綠洲鎮'], ['sh_shop', '雲上小鎮'], ['uh_shop', '珊瑚港'], ['ah_shop', '歡樂廣場'], ['ch_shop', '南瓜鎮'],
];
const clerk = (id: string) => MAPS[id].objects.find((o) => o.id === 'clerk')!;

describe('商店店員的台詞：每間商店各有自己的招呼與道別', () => {
  it('每間商店的店員都有自己的招呼與道別', () => {
    for (const [id] of SHOPS) {
      const c = clerk(id);
      expect(c, id).toBeDefined();
      expect(c.text?.length, `${id} 招呼`).toBeGreaterThan(0);
      expect(c.doneText?.length, `${id} 道別`).toBeGreaterThan(0);
      for (const t of [...c.text!, ...c.doneText!]) expect(t.trim(), id).not.toBe('');
    }
  });
  it('招呼第一句提到這間商店自己的地名，不會提到別的主島', () => {
    const places = SHOPS.map(([, p]) => p).filter((p) => p !== '小福');
    for (const [id, place] of SHOPS) {
      const c = clerk(id);
      expect(c.text![0], id).toContain(place);
      for (const other of places) if (other !== place) expect(c.text!.join(''), `${id} 不該提到 ${other}`).not.toContain(other);
    }
  });
  it('九間商店的招呼、道別都各不相同', () => {
    expect(new Set(SHOPS.map(([id]) => clerk(id).text!.join('|'))).size).toBe(SHOPS.length);
    expect(new Set(SHOPS.map(([id]) => clerk(id).doneText!.join('|'))).size).toBe(SHOPS.length);
  });
  it('起始村的小福道具店和原本的通用台詞一樣（已預錄的語音不變）', () => {
    expect(clerk('shop').text).toEqual(STORY.shopHello);
    expect(clerk('shop').doneText).toEqual(STORY.shopBye);
  });
  it('招呼有提到藥水或魔力果（讓孩子知道這裡賣什麼）', () => {
    for (const [id] of SHOPS) expect(clerk(id).text!.join(''), id).toMatch(/藥水|魔力果/);
  });
  it('語音句子清單包含每間商店的招呼與道別', () => {
    const lines = new Set(allVoiceLines());
    for (const [id] of SHOPS) for (const t of [...clerk(id).text!, ...clerk(id).doneText!]) expect(lines.has(t), t).toBe(true);
  });
});
