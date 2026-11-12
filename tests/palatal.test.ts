import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { STROKES } from '../src/data/strokes';

describe('第四關（舌面音）的資料', () => {
  it('ㄒㄑ 進島才開始教，ㄐ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄒ', 'ㄑ'], flag: 'xEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄐ'], flag: 'xPractice' });
  });
  it('關卡開放，入口是主島雪花鎮', () => {
    expect(LEVELS.x.open).toBe(true);
    expect(LEVELS.x.mapId).toBe('xh');
    expect(LEVELS.x.symbol).toBe('ㄐㄑㄒ');
  });
  it('三個新招式各綁一個注音，三隻夥伴都學得會', () => {
    expect(MOVES.snow.symbol).toBe('ㄒ');
    expect(MOVES.slide.symbol).toBe('ㄑ');
    expect(MOVES.freeze.symbol).toBe('ㄐ');
    expect([MOVES.snow.power, MOVES.slide.power, MOVES.freeze.power]).toEqual([6, 6, 7]);
    for (const id of ['snow', 'slide', 'freeze']) {
      expect(MOVES[id].needAbility).toBe(id);
      expect(castSymbol(id)).toBe(MOVES[id].symbol);
    }
    for (const sp of Object.values(SPECIES)) {
      for (const [sym, ability] of [['ㄒ', 'snow'], ['ㄑ', 'slide'], ['ㄐ', 'freeze']]) {
        expect(moveFor(sp.id, sym, (a) => a === ability).needAbility).toBe(ability);
      }
    }
  });
  it('敵人：企鵝與冰晶蝙蝠是回音怪，雪球怪與冰晶女王不是', () => {
    expect(ENEMIES.penguin.echo).toBe(true);
    expect(ENEMIES.icebat.echo).toBe(true);
    expect(ENEMIES.snowball.echo).toBeFalsy();
    expect(ENEMIES.icequeen.echo).toBeFalsy();
    expect([ENEMIES.snowball.hp, ENEMIES.snowball.atk]).toEqual([24, 4]);
    expect([ENEMIES.penguin.hp, ENEMIES.penguin.atk]).toEqual([26, 4]);
    expect([ENEMIES.icebat.hp, ENEMIES.icebat.atk]).toEqual([26, 5]);
    expect([ENEMIES.icequeen.hp, ENEMIES.icequeen.atk]).toEqual([32, 6]);
  });
  it('練習戰教 ㄒㄑ（教學戰、旗標 xPractice、學會 snow 與 slide）', () => {
    const b = BATTLES.xpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄒ', 'ㄑ']);
    expect(b.reward!.flag).toBe('xPractice');
    expect(b.reward!.abilities).toEqual(['snow', 'slide']);
  });
  it('頭目冰晶女王有護盾、三個小回合、打贏學會 freeze', () => {
    const b = BATTLES.boss_x;
    expect(b.enemy).toBe('icequeen');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward!.flag).toBe('boss_x');
    expect(b.reward!.abilities).toEqual(['freeze']);
  });
  it('島上野怪考 ㄐㄑㄒ，旗標是 m:x:m1～m3，會重生', () => {
    ['x1', 'x2', 'x3'].forEach((id, i) => {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn, `${id} 野生怪要會重生`).toBe(true);
      expect(b.focus.every((s) => ['ㄐ', 'ㄑ', 'ㄒ'].includes(s)), `${id} 主題只能是 ㄐㄑㄒ`).toBe(true);
      expect(b.reward!.flag).toBe(`m:x:m${i + 1}`);
    });
    expect(BATTLES.x3.focus).toContain('ㄐ');
  });
  it('ㄐㄑㄒ 的筆順存在（兩畫、一畫、兩畫）', () => {
    expect(STROKES['ㄐ']).toHaveLength(2);
    expect(STROKES['ㄑ']).toHaveLength(1);
    expect(STROKES['ㄒ']).toHaveLength(2);
  });
});
