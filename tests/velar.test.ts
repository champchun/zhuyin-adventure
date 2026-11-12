import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { MONSTER_ART, monsterSize } from '../src/gfx/monsterArt';

describe('第三關（舌根音）的資料', () => {
  it('ㄍㄎ 進森林才開始教，ㄏ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄍ', 'ㄎ'], flag: 'gEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄏ'], flag: 'gPractice' });
  });
  it('關卡開放，入口是主島蛙鳴灣', () => {
    expect(LEVELS.g.open).toBe(true);
    expect(LEVELS.g.mapId).toBe('gh');
  });
  it('三個新招式各綁一個注音，三隻夥伴都學得會', () => {
    expect(MOVES.croak.symbol).toBe('ㄍ');
    expect(MOVES.knock.symbol).toBe('ㄎ');
    expect(MOVES.breath.symbol).toBe('ㄏ');
    for (const sp of Object.values(SPECIES)) {
      for (const [sym, ability] of [['ㄍ', 'croak'], ['ㄎ', 'knock'], ['ㄏ', 'breath']]) {
        expect(moveFor(sp.id, sym, (a) => a === ability).needAbility).toBe(ability);
      }
    }
  });
  it('敵人：蝙蝠是回音怪，其他不是；四種敵人的圖都在，而且放得進 32×32', () => {
    expect(ENEMIES.bat.echo).toBe(true);
    for (const id of ['froggy', 'pecker', 'batking']) expect(ENEMIES[id].echo).toBeFalsy();
    for (const id of ['froggy', 'pecker', 'bat', 'batking']) {
      const key = ENEMIES[id].sprite;
      expect(MONSTER_ART[key], `${key} 沒有圖`).toBeDefined();
      const s = monsterSize(key);
      expect(s.w).toBeLessThanOrEqual(32);
      expect(s.h).toBeLessThanOrEqual(32);
    }
  });
  it('練習戰教 ㄍㄎ（是教學戰、設旗標 gPractice、學會 croak 與 knock）', () => {
    const b = BATTLES.gpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄍ', 'ㄎ']);
    expect(b.reward!.flag).toBe('gPractice');
    expect(b.reward!.abilities).toEqual(['croak', 'knock']);
  });
  it('頭目蝙蝠王嗡嗡有護盾、是三個小回合、打贏學會 breath', () => {
    const b = BATTLES.boss_g;
    expect(b.enemy).toBe('batking');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward!.flag).toBe('boss_g');
    expect(b.reward!.abilities).toEqual(['breath']);
  });
  it('本關的小怪考 ㄍㄎㄏ，並複習上一關的符號', () => {
    for (const id of ['g1', 'g2', 'g3', 'gc1m', 'gc2m']) {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn, `${id} 野生怪要會重生`).toBe(true);
      expect(b.focus.every((s) => ['ㄍ', 'ㄎ', 'ㄏ'].includes(s)), `${id} 主題只能是 ㄍㄎㄏ`).toBe(true);
    }
    expect(BATTLES.g3.focus).toContain('ㄏ');
  });
});
