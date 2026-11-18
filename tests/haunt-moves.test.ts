import { describe, expect, it } from 'vitest';
import { MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';

const DATA: [string, string, number, string, string][] = [
  ['chill', 'ㄞ', 12, '發抖', '發抖魔法'],
  ['tickle', 'ㄟ', 12, '咯咯笑', '搔癢魔法'],
  ['howl', 'ㄠ', 13, '嗷嗚', '嗷嗚魔法'],
  ['hoot', 'ㄡ', 13, '呦呦叫', '貓頭鷹魔法'],
];

describe('古堡四招', () => {
  it('綁定符號、威力、名稱、能力 id 與特效都照表', () => {
    for (const [id, sym, power, name, magic] of DATA) {
      expect(MOVES[id], id).toMatchObject({ id, symbol: sym, power, name, magicName: magic, needAbility: id, fx: id });
      expect(MOVES[id].desc.length, id).toBeGreaterThan(20);
      expect(castSymbol(id), id).toBe(sym);
    }
  });
  it('招式名稱（含魔法名）不和既有招式重複', () => {
    const all = Object.values(MOVES).flatMap((m) => [m.name, m.magicName]);
    expect(new Set(all).size).toBe(all.length);
  });
  it('三隻初始夥伴都學得會；沒有能力時用通用小拳擊，有了才使出綁定招式', () => {
    for (const sp of ['bobo', 'momo', 'popo']) {
      for (const [id] of DATA) expect(SPECIES[sp].moves, `${sp} ${id}`).toContain(MOVES[id]);
      for (const [id, sym] of DATA) {
        expect(moveFor(sp, sym, () => false).id, `${sp} ${sym} 沒能力`).toBe('tap');
        expect(moveFor(sp, sym, (a) => a === id).id, `${sp} ${sym} 有能力`).toBe(id);
      }
    }
  });
  it('威力隨關卡遞增：ㄞㄟㄠㄡ 不低於 ㄚㄛㄜㄝ，且最強的更高', () => {
    const last = Math.max(MOVES.shout.power, MOVES.inflate.power, MOVES.honk.power, MOVES.cheer.power);
    for (const [id] of DATA) expect(MOVES[id].power).toBeGreaterThanOrEqual(last);
    expect(Math.max(...DATA.map(([id]) => MOVES[id].power))).toBeGreaterThan(last);
  });
});
