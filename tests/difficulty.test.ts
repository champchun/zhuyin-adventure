import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/monsters';

/** 每一關出現的敵人：小怪與頭目（稻草布偶是練習用的，不算）。新增關卡時照順序加一列。 */
const LEVELS: { name: string; smalls: string[]; boss: string }[] = [
  { name: '第 0 關（村外小徑、風車草原）', smalls: ['pebble', 'leafy'], boss: 'windking' },
  { name: '第 1 關（舌尖中音島）', smalls: ['drippy', 'crabby'], boss: 'drumking' },
  { name: '第 2 關（回音森林）', smalls: ['froggy', 'pecker', 'bat'], boss: 'batking' },
  { name: '第 3 關（企鵝冰原）', smalls: ['snowball', 'penguin', 'icebat'], boss: 'icequeen' },
  { name: '第 4 關（火山沙漠）', smalls: ['scorpion', 'cactusman', 'mummy'], boss: 'lavabeast' },
  { name: '第 5 關（天空島）', smalls: ['cloudy', 'sprite', 'comet'], boss: 'skydragon' },
];
const range = (ids: string[], k: 'hp' | 'atk') => ({ min: Math.min(...ids.map((i) => ENEMIES[i][k])), max: Math.max(...ids.map((i) => ENEMIES[i][k])) });

describe('怪物強度隨關卡遞增', () => {
  it('每一關的小怪，血量與攻擊力的最低值都不低於上一關的最高值（血量要更高）', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const prev = LEVELS[i - 1], cur = LEVELS[i];
      expect(range(cur.smalls, 'hp').min, `${cur.name} 小怪血量要比 ${prev.name} 多`).toBeGreaterThan(range(prev.smalls, 'hp').max);
      expect(range(cur.smalls, 'atk').min, `${cur.name} 小怪攻擊力不能比 ${prev.name} 低`).toBeGreaterThanOrEqual(range(prev.smalls, 'atk').max);
    }
  });
  it('每一關的頭目，血量與攻擊力都不低於上一關的頭目，而且比同一關的小怪強', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const cur = LEVELS[i], b = ENEMIES[cur.boss];
      expect(b.hp, `${cur.name} 頭目血量要比小怪多`).toBeGreaterThan(range(cur.smalls, 'hp').max);
      expect(b.atk, `${cur.name} 頭目攻擊力不能比小怪低`).toBeGreaterThanOrEqual(range(cur.smalls, 'atk').max);
      if (i > 0) {
        const p = ENEMIES[LEVELS[i - 1].boss];
        expect(b.hp, `${cur.name} 頭目血量不能比上一關少`).toBeGreaterThan(p.hp);
        expect(b.atk, `${cur.name} 頭目攻擊力不能比上一關低`).toBeGreaterThanOrEqual(p.atk);
      }
    }
  });
});

describe('第六關的小王（星門守衛）', () => {
  it('強度介於同一關的小怪與最終頭目之間', () => {
    const g = ENEMIES.starguard, d = ENEMIES.skydragon;
    for (const k of ['hp', 'atk'] as const) {
      expect(g[k], `小王 ${k} 要不低於小怪`).toBeGreaterThanOrEqual(Math.max(ENEMIES.cloudy[k], ENEMIES.sprite[k], ENEMIES.comet[k]));
      expect(g[k], `小王 ${k} 不能高過最終頭目`).toBeLessThanOrEqual(d[k]);
    }
    expect(g.hp).toBeGreaterThan(Math.max(ENEMIES.cloudy.hp, ENEMIES.sprite.hp, ENEMIES.comet.hp));
    expect(g.hp).toBeLessThan(d.hp);
  });
});
