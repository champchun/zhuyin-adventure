import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';
import { ALL_SYMBOLS, LEARN_STEPS } from '../src/data/symbols';
import { STROKES } from '../src/data/strokes';

describe('第六關（舌尖前音、天空島）的資料', () => {
  it('ㄗㄘ 進島才開始教，ㄙ 要打倒小王才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄗ', 'ㄘ'], flag: 'sEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄙ'], flag: 'sPractice' });
  });
  it('關卡開放，入口是主島雲上小鎮 sh', () => {
    expect(LEVELS.s).toEqual({ id: 's', symbol: 'ㄗㄘㄙ', name: '舌尖前音島（天空島）', open: true, mapId: 'sh', partner: '夥伴' });
  });
  it('三個新招式各綁一個注音，三隻夥伴都學得會，說明要寫出位置並和翹舌音區別', () => {
    const spec: [string, string, number][] = [['zip', 'ㄗ', 8], ['spike', 'ㄘ', 8], ['whistle', 'ㄙ', 9]];
    for (const [id, sym, power] of spec) {
      expect(MOVES[id].symbol).toBe(sym);
      expect(MOVES[id].power).toBe(power);
      expect(MOVES[id].needAbility).toBe(id);
      expect(castSymbol(id)).toBe(sym);
      expect(MOVES[id].desc).toMatch(/牙/);
      expect(MOVES[id].desc).toMatch(/翹/);
      for (const sp of Object.values(SPECIES)) expect(moveFor(sp.id, sym, (a) => a === id).needAbility).toBe(id);
    }
  });
  it('敵人：雲朵怪一般、小精靈與彗星是回音怪；小王與最終頭目有數值', () => {
    expect(ENEMIES.cloudy.echo).toBeFalsy();
    expect(ENEMIES.sprite.echo).toBe(true);
    expect(ENEMIES.comet.echo).toBe(true);
    expect([ENEMIES.cloudy.hp, ENEMIES.cloudy.atk]).toEqual([36, 6]);
    expect([ENEMIES.sprite.hp, ENEMIES.sprite.atk]).toEqual([38, 6]);
    expect([ENEMIES.comet.hp, ENEMIES.comet.atk]).toEqual([40, 7]);
    expect([ENEMIES.starguard.hp, ENEMIES.starguard.atk]).toEqual([46, 7]);
    expect([ENEMIES.skydragon.hp, ENEMIES.skydragon.atk]).toEqual([52, 8]);
  });
  it('練習戰教 ㄗㄘ（教學戰、旗標 sPractice 不在這裡、學會 zip 與 spike）', () => {
    const b = BATTLES.spractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄗ', 'ㄘ']);
    expect(b.reward.abilities).toEqual(['zip', 'spike']);
    expect(b.shield).toBeFalsy();
  });
  it('小王星門守衛：護盾、多個小回合、獎勵 whistle 並設旗標 sPractice 與 boss_s1', () => {
    const b = BATTLES.boss_s1;
    expect(b.enemy).toBe('starguard');
    expect(b.shield).toBe(true);
    expect(b.phases).toBeGreaterThan(1);
    expect(b.reward.flag).toBe('boss_s1');
    expect(b.reward.flags).toContain('sPractice');
    expect(b.reward.abilities).toEqual(['whistle']);
  });
  it('最終頭目星空龍王是畢業考：護盾、focus 與 review 都是全部 21 個聲母、沒有新能力', () => {
    const b = BATTLES.boss_s;
    expect(b.enemy).toBe('skydragon');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward.flag).toBe('boss_s');
    expect(b.reward.abilities).toBeUndefined();
    expect(ALL_SYMBOLS).toHaveLength(21);
    expect(b.focus).toEqual(ALL_SYMBOLS);
    expect(b.review).toEqual(ALL_SYMBOLS);
  });
  it('島上野怪旗標是 m:s:m1～m3，會重生', () => {
    ['s1', 's2', 's3'].forEach((id, i) => {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn).toBe(true);
      expect(b.reward.flag).toBe(`m:s:m${i + 1}`);
    });
  });
  it('星塔野怪：旗標 m:sc1:mon*／m:sc2:mon*，用天空怪', () => {
    const ids = ['sc1m', 'sc1m2', 'sc1m3', 'sc1m4', 'sc2m', 'sc2m2', 'sc2m3'];
    ids.forEach((id) => {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(['cloudy', 'sprite', 'comet']).toContain(b.enemy);
      expect(b.respawn).toBe(true);
      expect(b.reward.flag).toMatch(/^m:sc[12]:mon\d$/);
    });
  });
  it('台詞不出現還沒學過的拼音（ㄙ 要打倒小王才學）', () => {
    for (const id of ['spractice', 's1', 's2', 's3', 'boss_s1']) for (const l of BATTLES[id].intro) expect(/ㄙ/.test(l), `${id}：${l}`).toBe(false);
    for (const id of ['spractice', 's1', 's2', 's3', 'boss_s1', 'boss_s']) {
      expect(BATTLES[id].intro.length, id).toBeGreaterThan(0);
      for (const l of BATTLES[id].reward.story) expect(l.length, id).toBeGreaterThan(0);
    }
  });
  it('ㄗㄘㄙ 的筆順存在（2、2、1 畫）', () => {
    expect(STROKES['ㄗ']).toHaveLength(2);
    expect(STROKES['ㄘ']).toHaveLength(2);
    expect(STROKES['ㄙ']).toHaveLength(1);
  });
});
