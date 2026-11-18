import { describe, expect, it } from 'vitest';
import { BATTLES } from '../src/data/levels';
import { ENEMIES, MOVES } from '../src/data/monsters';
import { MONSTER_ART } from '../src/gfx/monsterArt';
import { LEARN_STEPS, VOWELS } from '../src/data/symbols';

describe('第十關敵人', () => {
  it('數值與回音怪設定照規格；每個敵人都有像素圖', () => {
    expect(ENEMIES.gearbug).toMatchObject({ hp: 60, atk: 10, sprite: 'en_gearbug', scale: 2.25 });
    expect(ENEMIES.windup).toMatchObject({ hp: 62, atk: 10, sprite: 'en_windup', echo: true, scale: 2.25 });
    expect(ENEMIES.alarmclock).toMatchObject({ hp: 64, atk: 11, sprite: 'en_alarmclock', echo: true, scale: 2.25 });
    expect(ENEMIES.timekeeper).toMatchObject({ hp: 82, atk: 12, sprite: 'en_timekeeper', scale: 2.75 });
    expect(ENEMIES.clockdummy).toMatchObject({ hp: 8, atk: 1, sprite: 'en_dummy', scale: 2.25 });
    expect(ENEMIES.gearbug.echo).toBeFalsy();
    expect(ENEMIES.timekeeper.echo).toBeFalsy();
    for (const id of ['gearbug', 'windup', 'alarmclock', 'timekeeper', 'clockdummy']) expect(MONSTER_ART[ENEMIES[id].sprite], id).toBeDefined();
  });
});

describe('第十關戰鬥', () => {
  const learnable = new Set(LEARN_STEPS.flatMap((s) => s.symbols));
  it('練習戰：教學戰、focus ㄢㄣ、獎勵 chime＋crank 並設 tPractice', () => {
    const b = BATTLES.tpractice;
    expect(b).toMatchObject({ enemy: 'clockdummy', phases: 2, tier: 1, guided: true });
    expect(b.focus).toEqual(['ㄢ', 'ㄣ']);
    expect(b.reward.flag).toBe('tPractice');
    expect(b.reward.abilities).toEqual(['chime', 'crank']);
    expect(b.penalty).toBeFalsy();
    expect(b.respawn).toBeFalsy();
  });
  it('野生怪 t1～t3：旗標 m:t:m<n>、會重生；t1／t2 不考 ㄤㄥㄦ，t3 才有', () => {
    for (const i of [1, 2, 3]) {
      const b = BATTLES[`t${i}`];
      expect(ENEMIES[b.enemy], `t${i}`).toBeDefined();
      expect(b.reward.flag).toBe(`m:t:m${i}`);
      expect(b.respawn).toBe(true);
    }
    for (const s of ['ㄤ', 'ㄥ', 'ㄦ']) {
      expect([...BATTLES.t1.focus, ...BATTLES.t2.focus]).not.toContain(s);
      expect(BATTLES.t3.focus).toContain(s);
    }
  });
  it('頭目：護盾、三個小回合、獎勵 bark／rumble／curl 與旗標 boss_t；三招不在其他戰鬥獎勵裡', () => {
    const b = BATTLES.boss_t;
    expect(b).toMatchObject({ enemy: 'timekeeper', shield: true, phases: 3, penalty: true, tier: 3 });
    expect(b.focus).toEqual(['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ']);
    expect(b.review).toEqual(['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ']);
    expect([...b.focus, ...b.review].sort()).toEqual([...VOWELS].sort());
    expect(b.reward).toMatchObject({ flag: 'boss_t', abilities: ['bark', 'rumble', 'curl'] });
    for (const [id, bt] of Object.entries(BATTLES)) {
      if (id === 'boss_t') continue;
      for (const a of ['bark', 'rumble', 'curl']) expect(bt.reward.abilities ?? [], `${id} ${a}`).not.toContain(a);
    }
    for (const a of ['bark', 'rumble', 'curl']) expect(MOVES[a].needAbility).toBe(a);
  });
  it('鐘塔迷宮小怪：旗標 m:<洞窟>:mon<n>，用鐘塔小怪', () => {
    const names = ['tc1m', 'tc1m2', 'tc1m3', 'tc1m4', 'tc2m', 'tc2m2', 'tc2m3'];
    for (const n of names) {
      const b = BATTLES[n];
      expect(['gearbug', 'windup', 'alarmclock']).toContain(b.enemy);
      expect(b.reward.flag, n).toMatch(/^m:tc[12]:mon[1-4]$/);
      expect(b.respawn).toBe(true);
    }
    expect(BATTLES.tc1m.reward.flag).toBe('m:tc1:mon1');
    expect(BATTLES.tc2m3.reward.flag).toBe('m:tc2:mon3');
  });
  it('每場戰鬥的符號都在教學進度內；練習戰與 t1／t2 的台詞不提還沒學的 ㄤㄥㄦ', () => {
    for (const id of ['tpractice', 't1', 't2', 't3', 'boss_t']) for (const s of [...BATTLES[id].focus, ...BATTLES[id].review]) expect(learnable.has(s), `${id} ${s}`).toBe(true);
    for (const id of ['tpractice', 't1', 't2']) for (const l of BATTLES[id].intro) expect(/[ㄤㄥㄦ]/.test(l), `${id}：${l}`).toBe(false);
  });
});
