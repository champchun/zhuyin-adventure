import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { STROKES } from '../src/data/strokes';

describe('第五關（翹舌音）的資料', () => {
  it('ㄓㄔ 進島才開始教，ㄕㄖ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄓ', 'ㄔ'], flag: 'zEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄕ', 'ㄖ'], flag: 'zPractice' });
  });
  it('關卡開放，入口是主島綠洲鎮 zh', () => {
    expect(LEVELS.z).toEqual({ id: 'z', symbol: 'ㄓㄔㄕㄖ', name: '翹舌音島（火山沙漠）', open: true, mapId: 'zh', partner: '夥伴' });
  });
  it('四個新招式各綁一個注音，三隻夥伴都學得會', () => {
    const spec: [string, string, number][] = [['web', 'ㄓ', 7], ['gulp', 'ㄔ', 7], ['roar', 'ㄕ', 8], ['sun', 'ㄖ', 8]];
    for (const [id, sym, power] of spec) {
      expect(MOVES[id].symbol).toBe(sym);
      expect(MOVES[id].power).toBe(power);
      expect(MOVES[id].needAbility).toBe(id);
      expect(castSymbol(id)).toBe(sym);
      expect(MOVES[id].desc).toMatch(/翹/);
      for (const sp of Object.values(SPECIES)) expect(moveFor(sp.id, sym, (a) => a === id).needAbility).toBe(id);
    }
  });
  it('敵人：仙人掌怪與木乃伊是回音怪，蠍子與熔岩獸不是', () => {
    expect(ENEMIES.cactusman.echo).toBe(true);
    expect(ENEMIES.mummy.echo).toBe(true);
    expect(ENEMIES.scorpion.echo).toBeFalsy();
    expect(ENEMIES.lavabeast.echo).toBeFalsy();
    expect([ENEMIES.scorpion.hp, ENEMIES.scorpion.atk]).toEqual([30, 5]);
    expect([ENEMIES.cactusman.hp, ENEMIES.cactusman.atk]).toEqual([32, 5]);
    expect([ENEMIES.mummy.hp, ENEMIES.mummy.atk]).toEqual([34, 6]);
    expect([ENEMIES.lavabeast.hp, ENEMIES.lavabeast.atk]).toEqual([42, 7]);
  });
  it('練習戰教 ㄓㄔ（教學戰、旗標 zPractice、學會 web 與 gulp）', () => {
    const b = BATTLES.zpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄓ', 'ㄔ']);
    expect(b.reward.flag).toBe('zPractice');
    expect(b.reward.abilities).toEqual(['web', 'gulp']);
  });
  it('頭目熔岩獸有護盾、三個小回合、打贏學會 roar 與 sun', () => {
    const b = BATTLES.boss_z;
    expect(b.enemy).toBe('lavabeast');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward.flag).toBe('boss_z');
    expect(b.reward.abilities).toEqual(['roar', 'sun']);
  });
  it('島上野怪旗標是 m:z:m1～m3，會重生；z3 才考 ㄕㄖ', () => {
    ['z1', 'z2', 'z3'].forEach((id, i) => {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn).toBe(true);
      expect(b.reward.flag).toBe(`m:z:m${i + 1}`);
    });
    for (const id of ['z1', 'z2']) expect(BATTLES[id].focus.every((s) => ['ㄓ', 'ㄔ'].includes(s)), id).toBe(true);
    expect(BATTLES.z3.focus).toEqual(expect.arrayContaining(['ㄕ', 'ㄖ']));
  });
  it('台詞不出現還沒學過的拼音（練習戰只能出現 ㄓㄔ，之前也不能有 ㄕㄖ）', () => {
    const lines = (id: string) => [...BATTLES[id].intro, ...BATTLES[id].reward.story];
    for (const id of ['zpractice', 'z1', 'z2']) for (const l of [...BATTLES[id].intro]) expect(/[ㄕㄖ]/.test(l), `${id}：${l}`).toBe(false);
    expect(lines('boss_z').length).toBeGreaterThan(0);
  });
  it('ㄓㄔㄕㄖ 的筆順存在（4、3、3、4 畫）', () => {
    expect(STROKES['ㄓ']).toHaveLength(4);
    expect(STROKES['ㄔ']).toHaveLength(3);
    expect(STROKES['ㄕ']).toHaveLength(3);
    expect(STROKES['ㄖ']).toHaveLength(4);
  });
});
