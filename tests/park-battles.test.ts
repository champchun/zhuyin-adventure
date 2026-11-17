import { describe, expect, it } from 'vitest';
import { BATTLES } from '../src/data/levels';
import { ENEMIES, MOVES } from '../src/data/monsters';
import { MONSTER_ART } from '../src/gfx/monsterArt';
import { LEARN_STEPS } from '../src/data/symbols';

describe('第八關敵人', () => {
  it('數值與回音怪設定照規格；每個敵人都有像素圖', () => {
    expect(ENEMIES.balloony).toMatchObject({ hp: 48, atk: 8, sprite: 'en_balloony', scale: 2.25 });
    expect(ENEMIES.toysoldier).toMatchObject({ hp: 50, atk: 8, sprite: 'en_toysoldier', echo: true, scale: 2.25 });
    expect(ENEMIES.jackbox).toMatchObject({ hp: 52, atk: 9, sprite: 'en_jackbox', echo: true, scale: 2.25 });
    expect(ENEMIES.clownking).toMatchObject({ hp: 66, atk: 10, sprite: 'en_clownking', scale: 2.75 });
    expect(ENEMIES.ballpuppet).toMatchObject({ hp: 8, atk: 1, sprite: 'en_dummy', scale: 2.25 });
    expect(ENEMIES.balloony.echo).toBeFalsy();
    expect(ENEMIES.clownking.echo).toBeFalsy();
    for (const id of ['balloony', 'toysoldier', 'jackbox', 'clownking', 'ballpuppet']) expect(MONSTER_ART[ENEMIES[id].sprite], id).toBeDefined();
  });
});

describe('第八關戰鬥', () => {
  const learnable = new Set(LEARN_STEPS.flatMap((s) => s.symbols));
  it('練習戰：教學戰、focus ㄚㄛ、獎勵 shout＋inflate 並設 aPractice', () => {
    const b = BATTLES.apractice;
    expect(b).toMatchObject({ enemy: 'ballpuppet', phases: 2, tier: 1, guided: true });
    expect(b.focus).toEqual(['ㄚ', 'ㄛ']);
    expect(b.reward.flag).toBe('aPractice');
    expect(b.reward.abilities).toEqual(['shout', 'inflate']);
    expect(b.penalty).toBeFalsy();
    expect(b.respawn).toBeFalsy();
  });
  it('野生怪 a1～a3：旗標 m:a:m<n>、會重生；a1／a2 不考 ㄜㄝ，a3 才有', () => {
    for (const i of [1, 2, 3]) {
      const b = BATTLES[`a${i}`];
      expect(ENEMIES[b.enemy], `a${i}`).toBeDefined();
      expect(b.reward.flag).toBe(`m:a:m${i}`);
      expect(b.respawn).toBe(true);
    }
    expect([...BATTLES.a1.focus, ...BATTLES.a2.focus]).not.toContain('ㄜ');
    expect([...BATTLES.a1.focus, ...BATTLES.a2.focus]).not.toContain('ㄝ');
    expect(BATTLES.a3.focus).toEqual(expect.arrayContaining(['ㄜ', 'ㄝ']));
  });
  it('頭目：護盾、三個小回合、獎勵 honk＋cheer 與旗標 boss_a；兩招不在其他戰鬥獎勵裡', () => {
    const b = BATTLES.boss_a;
    expect(b).toMatchObject({ enemy: 'clownking', shield: true, phases: 3, penalty: true, tier: 3 });
    expect(b.focus).toEqual(expect.arrayContaining(['ㄜ', 'ㄝ', 'ㄚ', 'ㄛ']));
    expect(b.reward).toMatchObject({ flag: 'boss_a', abilities: ['honk', 'cheer'] });
    for (const [id, bt] of Object.entries(BATTLES)) {
      if (id === 'boss_a') continue;
      expect(bt.reward.abilities ?? [], id).not.toContain('honk');
      expect(bt.reward.abilities ?? [], id).not.toContain('cheer');
    }
    expect(MOVES.honk.needAbility).toBe('honk');
    expect(MOVES.cheer.needAbility).toBe('cheer');
  });
  it('鏡子迷宮小怪：旗標 m:<洞窟>:mon<n>，用遊樂園小怪', () => {
    const names = ['ac1m', 'ac1m2', 'ac1m3', 'ac1m4', 'ac2m', 'ac2m2', 'ac2m3'];
    for (const n of names) {
      const b = BATTLES[n];
      expect(['balloony', 'toysoldier', 'jackbox']).toContain(b.enemy);
      expect(b.reward.flag, n).toMatch(/^m:ac[12]:mon[1-4]$/);
      expect(b.respawn).toBe(true);
    }
    expect(BATTLES.ac1m.reward.flag).toBe('m:ac1:mon1');
    expect(BATTLES.ac2m3.reward.flag).toBe('m:ac2:mon3');
  });
  it('每場戰鬥的符號都在教學進度內；練習戰與 a1／a2 的台詞不提還沒學的 ㄜㄝ', () => {
    for (const id of ['apractice', 'a1', 'a2', 'a3', 'boss_a']) for (const s of [...BATTLES[id].focus, ...BATTLES[id].review]) expect(learnable.has(s), `${id} ${s}`).toBe(true);
    for (const id of ['apractice', 'a1', 'a2']) for (const l of BATTLES[id].intro) expect(/[ㄜㄝ]/.test(l), `${id}：${l}`).toBe(false);
  });
});
