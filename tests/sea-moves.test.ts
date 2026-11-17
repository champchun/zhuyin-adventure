import { describe, expect, it } from 'vitest';
import { MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';

const DATA: [string, string, number, string, string][] = [
  ['glow', 'ㄧ', 10, '亮光閃', '亮光魔法'],
  ['jet', 'ㄨ', 10, '噗噗水柱', '水柱魔法'],
  ['pop', 'ㄩ', 11, '吐泡泡', '吐泡魔法'],
];

describe('海底三招', () => {
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
  it('威力隨關卡遞增：ㄧㄨㄩ 比 ㄗㄘㄙ 高', () => {
    const last = Math.max(MOVES.zip.power, MOVES.spike.power, MOVES.whistle.power);
    for (const [id] of DATA) expect(MOVES[id].power).toBeGreaterThan(last);
  });
});
