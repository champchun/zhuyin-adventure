import { describe, expect, it } from 'vitest';
import { BATTLES } from '../src/data/levels';
import { ENEMIES, MOVES } from '../src/data/monsters';
import { MONSTER_ART } from '../src/gfx/monsterArt';
import { LEARN_STEPS } from '../src/data/symbols';

describe('第九關敵人', () => {
  it('數值與回音怪設定照規格；每個敵人都有像素圖', () => {
    expect(ENEMIES.batty).toMatchObject({ hp: 54, atk: 9, sprite: 'en_batty', scale: 2.25 });
    expect(ENEMIES.pumpkinmon).toMatchObject({ hp: 56, atk: 9, sprite: 'en_pumpkinmon', echo: true, scale: 2.25 });
    expect(ENEMIES.skeleton).toMatchObject({ hp: 58, atk: 10, sprite: 'en_skeleton', echo: true, scale: 2.25 });
    expect(ENEMIES.ghostcount).toMatchObject({ hp: 74, atk: 11, sprite: 'en_ghostcount', scale: 2.75 });
    expect(ENEMIES.scarecrowdummy).toMatchObject({ hp: 8, atk: 1, sprite: 'en_dummy', scale: 2.25 });
    expect(ENEMIES.batty.echo).toBeFalsy();
    expect(ENEMIES.ghostcount.echo).toBeFalsy();
    for (const id of ['batty', 'pumpkinmon', 'skeleton', 'ghostcount', 'scarecrowdummy']) expect(MONSTER_ART[ENEMIES[id].sprite], id).toBeDefined();
  });
});

describe('第九關戰鬥', () => {
  const learnable = new Set(LEARN_STEPS.flatMap((s) => s.symbols));
  it('練習戰：教學戰、focus ㄞㄟ、獎勵 chill＋tickle 並設 cPractice', () => {
    const b = BATTLES.cpractice;
    expect(b).toMatchObject({ enemy: 'scarecrowdummy', phases: 2, tier: 1, guided: true });
    expect(b.focus).toEqual(['ㄞ', 'ㄟ']);
    expect(b.reward.flag).toBe('cPractice');
    expect(b.reward.abilities).toEqual(['chill', 'tickle']);
    expect(b.penalty).toBeFalsy();
    expect(b.respawn).toBeFalsy();
  });
  it('野生怪 c1～c3：旗標 m:c:m<n>、會重生；c1／c2 不考 ㄠㄡ，c3 才有', () => {
    for (const i of [1, 2, 3]) {
      const b = BATTLES[`c${i}`];
      expect(ENEMIES[b.enemy], `c${i}`).toBeDefined();
      expect(b.reward.flag).toBe(`m:c:m${i}`);
      expect(b.respawn).toBe(true);
    }
    expect([...BATTLES.c1.focus, ...BATTLES.c2.focus]).not.toContain('ㄠ');
    expect([...BATTLES.c1.focus, ...BATTLES.c2.focus]).not.toContain('ㄡ');
    expect(BATTLES.c3.focus).toEqual(expect.arrayContaining(['ㄠ', 'ㄡ']));
  });
  it('頭目：護盾、三個小回合、獎勵 howl＋hoot 與旗標 boss_c；兩招不在其他戰鬥獎勵裡', () => {
    const b = BATTLES.boss_c;
    expect(b).toMatchObject({ enemy: 'ghostcount', shield: true, phases: 3, penalty: true, tier: 3 });
    expect(b.focus).toEqual(expect.arrayContaining(['ㄠ', 'ㄡ', 'ㄞ', 'ㄟ']));
    expect(b.reward).toMatchObject({ flag: 'boss_c', abilities: ['howl', 'hoot'] });
    for (const [id, bt] of Object.entries(BATTLES)) {
      if (id === 'boss_c') continue;
      expect(bt.reward.abilities ?? [], id).not.toContain('howl');
      expect(bt.reward.abilities ?? [], id).not.toContain('hoot');
    }
    expect(MOVES.howl.needAbility).toBe('howl');
    expect(MOVES.hoot.needAbility).toBe('hoot');
  });
  it('古堡迷宮小怪：旗標 m:<洞窟>:mon<n>，用古堡小怪', () => {
    const names = ['cc1m', 'cc1m2', 'cc1m3', 'cc1m4', 'cc2m', 'cc2m2', 'cc2m3'];
    for (const n of names) {
      const b = BATTLES[n];
      expect(['batty', 'pumpkinmon', 'skeleton']).toContain(b.enemy);
      expect(b.reward.flag, n).toMatch(/^m:cc[12]:mon[1-4]$/);
      expect(b.respawn).toBe(true);
    }
    expect(BATTLES.cc1m.reward.flag).toBe('m:cc1:mon1');
    expect(BATTLES.cc2m3.reward.flag).toBe('m:cc2:mon3');
  });
  it('每場戰鬥的符號都在教學進度內；練習戰與 c1／c2 的台詞不提還沒學的 ㄠㄡ', () => {
    for (const id of ['cpractice', 'c1', 'c2', 'c3', 'boss_c']) for (const s of [...BATTLES[id].focus, ...BATTLES[id].review]) expect(learnable.has(s), `${id} ${s}`).toBe(true);
    for (const id of ['cpractice', 'c1', 'c2']) for (const l of BATTLES[id].intro) expect(/[ㄠㄡ]/.test(l), `${id}：${l}`).toBe(false);
  });
});
