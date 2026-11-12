import { describe, expect, it } from 'vitest';
import { rulesActive, resolveHit } from '../src/core/shield';
import { BATTLES } from '../src/data/levels';
import { ENEMIES } from '../src/data/monsters';

const base = { guided: false, audioReady: true, tierSetting: 'auto' as const };

describe('rulesActive：什麼時候啟動護盾與回音怪', () => {
  it('一般戰鬥、音檔齊、難度自動、還有魔力：啟動', () => {
    expect(rulesActive(base)).toBe(true);
    expect(rulesActive({ ...base, tierSetting: 2 })).toBe(true);
    expect(rulesActive({ ...base, tierSetting: 3 })).toBe(true);
  });
  it('教學戰不啟動', () => {
    expect(rulesActive({ ...base, guided: true })).toBe(false);
  });
  it('沒有音檔不啟動', () => {
    expect(rulesActive({ ...base, audioReady: false })).toBe(false);
  });
  it('家長固定成只看符號（難度 1）不啟動', () => {
    expect(rulesActive({ ...base, tierSetting: 1 })).toBe(false);
  });
});

describe('resolveHit：一次答對之後的傷害', () => {
  const hit = { active: true, type: 'match' as const, echo: false, shield: false, dmg: 6 };
  it('沒有護盾也不是回音怪：傷害照舊', () => {
    expect(resolveHit(hit)).toEqual({ dmg: 6, shield: false });
    expect(resolveHit({ ...hit, type: 'listen' })).toEqual({ dmg: 6, shield: false });
  });
  it('回音怪：普通攻擊只有 1 點，魔法攻擊照一般算', () => {
    const r = resolveHit({ ...hit, echo: true });
    expect(r.dmg).toBe(1);
    expect(r.msg).toBe('攻擊被彈開了，只有一點點效果。');
    expect(resolveHit({ ...hit, echo: true, type: 'listen' })).toEqual({ dmg: 6, shield: false });
  });
  it('回音怪：原本傷害就是 0 或 1 時，不會被「提高」到 1', () => {
    expect(resolveHit({ ...hit, echo: true, dmg: 0 }).dmg).toBe(0);
    expect(resolveHit({ ...hit, echo: true, dmg: 1 }).dmg).toBe(1);
  });
  it('護盾：普通攻擊 0 點、護盾還在；魔法攻擊照常傷害並打破護盾', () => {
    const blocked = resolveHit({ ...hit, shield: true });
    expect(blocked).toEqual({ dmg: 0, shield: true, msg: '護盾擋住了！換 🪄 魔法攻擊試試！' });
    const broken = resolveHit({ ...hit, shield: true, type: 'listen' });
    expect(broken.dmg).toBe(6);
    expect(broken.shield).toBe(false);
    expect(broken.msg).toBe('護盾被魔法打破了！');
  });
  it('護盾與回音同時成立時，護盾優先', () => {
    const r = resolveHit({ ...hit, shield: true, echo: true });
    expect(r.dmg).toBe(0);
    expect(r.shield).toBe(true);
  });
  it('規則停用時：護盾不擋、回音不減，傷害照舊，護盾狀態原樣保留', () => {
    expect(resolveHit({ ...hit, active: false, shield: true, echo: true })).toEqual({ dmg: 6, shield: true });
  });
});

describe('戰鬥資料與護盾、回音怪', () => {
  it('只有第三關的戰鬥使用護盾與回音怪（鼓王咚咚以前的都不用）', () => {
    const velar = new Set(['boss_g', 'g1', 'g2', 'g3', 'gc1m', 'gc1m2', 'gc1m3', 'gc1m4', 'gc2m', 'gc2m2', 'gc2m3']);
    for (const b of Object.values(BATTLES)) {
      if (velar.has(b.id)) continue;
      expect(b.shield, `${b.id} 不該有護盾`).toBeFalsy();
      expect(ENEMIES[b.enemy].echo, `${b.id} 的敵人不該是回音怪`).toBeFalsy();
    }
  });
  it('只有頭目戰（多個小回合）可以有護盾；教學戰不可以有護盾，也不可以對上回音怪', () => {
    for (const b of Object.values(BATTLES)) {
      if (b.shield) expect(b.phases, `${b.id} 有護盾但不是頭目戰`).toBeGreaterThan(1);
      if (b.guided) {
        expect(b.shield, `${b.id} 是教學戰卻有護盾`).toBeFalsy();
        expect(ENEMIES[b.enemy].echo, `${b.id} 是教學戰卻是回音怪`).toBeFalsy();
      }
    }
  });
});
