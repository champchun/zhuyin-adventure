import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES } from '../src/data/monsters';
import { MONSTER_ART } from '../src/gfx/monsterArt';
import { LEARN_STEPS } from '../src/data/symbols';

describe('第七關敵人', () => {
  it('數值與回音怪設定照規格；每個敵人都有像素圖', () => {
    expect(ENEMIES.clownfish).toMatchObject({ hp: 42, atk: 7, sprite: 'en_clownfish', scale: 2.25 });
    expect(ENEMIES.jellyfish).toMatchObject({ hp: 44, atk: 7, sprite: 'en_jellyfish', echo: true });
    expect(ENEMIES.urchin).toMatchObject({ hp: 46, atk: 8, sprite: 'en_urchin', echo: true });
    expect(ENEMIES.octopus).toMatchObject({ hp: 58, atk: 9, sprite: 'en_octopus', scale: 2.75 });
    expect(ENEMIES.kelpdummy).toMatchObject({ hp: 8, atk: 1, sprite: 'en_dummy' });
    expect(ENEMIES.clownfish.echo).toBeFalsy();
    for (const id of ['clownfish', 'jellyfish', 'urchin', 'octopus', 'kelpdummy']) expect(MONSTER_ART[ENEMIES[id].sprite], id).toBeDefined();
  });
});

describe('第七關戰鬥', () => {
  const learnable = new Set(LEARN_STEPS.flatMap((s) => s.symbols));
  it('練習戰：教學戰、focus ㄧㄨ、獎勵 glow＋jet 並設 uPractice；題目只用學得到的符號', () => {
    const b = BATTLES.upractice;
    expect(b).toMatchObject({ enemy: 'kelpdummy', phases: 2, tier: 1, guided: true });
    expect(b.focus).toEqual(['ㄧ', 'ㄨ']);
    expect(b.reward.flag).toBe('uPractice');
    expect(b.reward.abilities).toEqual(['glow', 'jet']);
    expect(b.penalty).toBeFalsy();
    expect(b.respawn).toBeFalsy();
  });
  it('野生怪 u1～u3：旗標 m:u:m<n>、會重生；u1／u2 不考 ㄩ（還沒學），u3 才有 ㄩ', () => {
    for (const i of [1, 2, 3]) {
      const b = BATTLES[`u${i}`];
      expect(ENEMIES[b.enemy], `u${i}`).toBeDefined();
      expect(b.reward.flag).toBe(`m:u:m${i}`);
      expect(b.respawn).toBe(true);
    }
    expect([...BATTLES.u1.focus, ...BATTLES.u2.focus]).not.toContain('ㄩ');
    expect(BATTLES.u3.focus).toContain('ㄩ');
  });
  it('頭目：護盾、三個小回合、focus 含 ㄩ、獎勵 pop 與旗標 boss_u；pop 不在任何更早的戰鬥獎勵裡', () => {
    const b = BATTLES.boss_u;
    expect(b).toMatchObject({ enemy: 'octopus', shield: true, phases: 3, penalty: true, tier: 3 });
    expect(b.focus).toEqual(expect.arrayContaining(['ㄩ', 'ㄧ', 'ㄨ']));
    expect(b.reward).toMatchObject({ flag: 'boss_u', abilities: ['pop'] });
    for (const [id, bt] of Object.entries(BATTLES)) if (id !== 'boss_u') expect(bt.reward.abilities ?? [], id).not.toContain('pop');
    expect(MOVES.pop.needAbility).toBe('pop');
  });
  it('沉船小怪：旗標 m:<洞窟>:mon<n>，用海底小怪', () => {
    const names = ['uc1m', 'uc1m2', 'uc1m3', 'uc1m4', 'uc2m', 'uc2m2', 'uc2m3'];
    for (const n of names) {
      const b = BATTLES[n];
      expect(['clownfish', 'jellyfish', 'urchin']).toContain(b.enemy);
      expect(b.reward.flag, n).toMatch(/^m:uc[12]:mon[1-4]$/);
      expect(b.respawn).toBe(true);
    }
    expect(BATTLES.uc1m.reward.flag).toBe('m:uc1:mon1');
    expect(BATTLES.uc2m3.reward.flag).toBe('m:uc2:mon3');
  });
  it('每場戰鬥的符號都在教學進度內；練習戰與小怪的台詞不提還沒學的 ㄩ', () => {
    for (const id of ['upractice', 'u1', 'u2', 'u3', 'boss_u']) for (const s of [...BATTLES[id].focus, ...BATTLES[id].review]) expect(learnable.has(s), `${id} ${s}`).toBe(true);
    for (const id of ['upractice', 'u1', 'u2']) for (const l of BATTLES[id].intro) expect(/ㄩ/.test(l), `${id}：${l}`).toBe(false);
  });
  it('LEVELS.u：符號 ㄧㄨㄩ、通往珊瑚港', () => {
    expect(LEVELS.u).toMatchObject({ id: 'u', symbol: 'ㄧㄨㄩ', name: '海底', open: true, mapId: 'uh', partner: '夥伴' });
  });
});
