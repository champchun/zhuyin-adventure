import { describe, expect, it } from 'vitest';
import { MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';

const DATA: [string, string, number, string, string][] = [
  ['chime', 'ㄢ', 14, '噹噹響', '鐘聲魔法'],
  ['crank', 'ㄣ', 14, '轉發條', '發條魔法'],
  ['bark', 'ㄤ', 15, '昂昂叫', '昂叫魔法'],
  ['rumble', 'ㄥ', 15, '轟轟響', '轟鳴魔法'],
  ['curl', 'ㄦ', 16, '捲舌', '捲舌魔法'],
];

describe('鐘塔五招', () => {
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
  it('威力隨關卡遞增：比第九關四招高，最強的更高', () => {
    const last = Math.max(MOVES.chill.power, MOVES.tickle.power, MOVES.howl.power, MOVES.hoot.power);
    for (const [id] of DATA) expect(MOVES[id].power).toBeGreaterThan(last);
    expect(Math.max(...DATA.map(([id]) => MOVES[id].power))).toBeGreaterThan(last);
  });
});
