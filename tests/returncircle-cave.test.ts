import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { visibleWith, walkMap } from './helpers/flood';

const walk = (m: (typeof MAPS)[string], x: number, y: number) => !BLOCKED_TILES.has(m.tiles[y]?.[x] ?? '#');
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// 到頭目前取得的能力（不含頭目獎勵）
const CASES = [
  { f1: 'gc1', f2: 'gc2', flag: 'boss_g', at: [6, 16], to: { map: 'gh', x: 6, y: 4 }, inn: 'door_inn', abilities: ['blast', 'gust', 'croak', 'knock'] },
  { f1: 'xc1', f2: 'xc2', flag: 'boss_x', at: [20, 7], to: { map: 'xh', x: 6, y: 7 }, inn: 'door_inn', abilities: ['blast', 'gust', 'snow', 'slide', 'freeze'] },
  { f1: 'zc1', f2: 'zc2', flag: 'boss_z', at: [2, 19], to: { map: 'zh', x: 5, y: 5 }, inn: 'door_inn', abilities: ['blast', 'gust', 'web', 'gulp'] },
  { f1: 'sc1', f2: 'sc2', flag: 'boss_s', at: [20, 16], to: { map: 'sh', x: 7, y: 4 }, inn: 'door_inn', abilities: ['blast', 'gust', 'hum', 'fog', 'web', 'gulp', 'roar', 'sun', 'zip', 'spike', 'whistle'] },
] as const;

// 魔法陣加進去之前的物件（id:x,y，產生順序）：circle 只能新增，其他一格都不能動
const BASE: Record<string, string[]> = {
  gc1: ['chest_key:5,14', 'up:1,1', 'down:29,2', 'rock_h:24,1', 'chest_h:23,2', 'door:12,19', 'chest_1:20,20', 'chest_2:20,14', 'chest_3:14,17', 'mon1:19,1', 'mon2:10,19', 'mon3:22,4', 'mon4:16,7'],
  gc2: ['switch1:29,14', 'up:1,1', 'boss:7,16', 'chest_boss:8,17', 'rock_h:24,1', 'chest_h:23,2', 'barrier1:19,18', 'chest_1:8,2', 'chest_2:2,20', 'chest_3:17,8', 'mon1:23,17', 'mon2:23,14', 'mon3:14,8'],
  xc1: ['chest_key:29,17', 'up:1,1', 'down:11,14', 'rock_h:24,1', 'chest_h:23,2', 'door:15,10', 'chest_1:17,14', 'chest_2:29,2', 'chest_3:23,14', 'mon1:16,10', 'mon2:25,19', 'mon3:13,16', 'mon4:13,13'],
  xc2: ['switch1:23,11', 'up:1,1', 'boss:19,7', 'chest_boss:20,8', 'rock_h:24,1', 'chest_h:23,2', 'barrier1:21,10', 'chest_1:20,17', 'chest_2:5,2', 'chest_3:29,20', 'mon1:14,11', 'mon2:2,20', 'mon3:20,11'],
  zc1: ['chest_key:29,2', 'up:1,1', 'down:8,14', 'rock_h:24,1', 'chest_h:23,2', 'door:12,19', 'chest_1:26,17', 'chest_2:11,2', 'chest_3:20,11', 'mon1:22,16', 'mon2:4,7', 'mon3:19,16', 'mon4:1,4'],
  zc2: ['switch1:26,2', 'up:1,1', 'boss:1,19', 'chest_boss:2,20', 'rock_h:24,1', 'chest_h:23,2', 'barrier1:22,9', 'chest_1:26,11', 'chest_2:11,20', 'chest_3:20,11', 'mon1:20,5', 'mon2:11,17', 'mon3:5,17'],
  sc1: ['chest_key:5,17', 'up:1,1', 'down:26,8', 'rock_h:21,1', 'chest_h:23,2', 'door:25,15', 'chest_1:8,2', 'chest_2:20,20', 'chest_3:29,2', 'mon1:28,19', 'mon2:13,19', 'mon3:16,1', 'mon4:28,16'],
  sc2: ['switch1:5,2', 'up:1,1', 'boss:19,16', 'chest_boss:20,17', 'rock_h:24,1', 'chest_h:23,2', 'barrier1:18,10', 'chest_1:11,11', 'chest_2:14,2', 'chest_3:14,17', 'mon1:23,5', 'mon2:11,14', 'mon3:26,14'],
};

describe('回家魔法陣：產生洞窟二樓（gc2／xc2／zc2／sc2）', () => {
  for (const c of CASES) {
    const m = MAPS[c.f2];
    const circles = m.objects.filter((o) => o.id === 'circle');
    const circle = circles[0];
    it(`${c.f2}：恰有一個 circle，stairs、showIf=${c.flag}、to 照目的地表`, () => {
      expect(circles).toHaveLength(1);
      expect(circle).toMatchObject({ kind: 'stairs', sprite: 'magic_circle', label: '魔法陣', showIf: c.flag });
      expect(circle.to).toEqual(c.to);
      expect([circle.x, circle.y]).toEqual(c.at);
      expect(m.objects.find((o) => o.id === 'boss')!.hideIf).toBe(c.flag); // 與頭目同一個旗標
    });
    it(`${c.f2}：與頭目距離 1、地形可走、不壓其他物件`, () => {
      const boss = m.objects.find((o) => o.id === 'boss')!;
      expect(dist(circle, boss)).toBe(1);
      expect(walk(m, circle.x, circle.y)).toBe(true);
      expect(m.objects.filter((o) => o.x === circle.x && o.y === circle.y).map((o) => o.id)).toEqual(['circle']);
    });
    it(`${c.f2}：既有物件的 id、座標與順序不變`, () => {
      expect(m.objects.filter((o) => o.id !== 'circle').map((o) => `${o.id}:${o.x},${o.y}`)).toEqual(BASE[c.f2]);
    });
    it(`${c.f1}：一樓沒有 circle，物件不變`, () => {
      expect(MAPS[c.f1].objects.some((o) => o.id === 'circle')).toBe(false);
      expect(MAPS[c.f1].objects.map((o) => `${o.id}:${o.x},${o.y}`)).toEqual(BASE[c.f1]);
    });
    it(`${c.f2}：沒有頭目旗標時魔法陣看不到，打倒後看得到`, () => {
      expect(visibleWith({})(circle)).toBe(false);
      expect(visibleWith({ [c.flag]: true })(circle)).toBe(true);
    });
    it(`${c.f2}：用頭目前的能力兩層都走得完、頭目格可達（reachReport）`, () => {
      const r = reachReport([MAPS[c.f1], m], { map: c.f1, x: 2, y: 1 }, [...c.abilities]);
      expect(r.unreachableFloor).toEqual([]);
      expect(r.unreachableObjects).toEqual([]);
      const boss = m.objects.find((o) => o.id === 'boss')!;
      expect(r.reached.has(`${c.f2}:${boss.x},${boss.y}`)).toBe(true);
    });
    it(`${c.f2}：打倒頭目後（旗標＋開關已解）從二樓起點走得到魔法陣那一格與頭目寶箱旁`, () => {
      const r = walkMap(m, { [c.flag]: true, [`g:${c.f2}:switch1`]: true }, [...c.abilities]);
      expect(r.reached.has(`${circle.x},${circle.y}`)).toBe(true);
      expect(r.touched.has('chest_boss')).toBe(true);
    });
    it(`${c.f2}：目的地可走、不壓物件、是旅館門外一格`, () => {
      const dest = MAPS[c.to.map];
      expect(walk(dest, c.to.x, c.to.y)).toBe(true);
      expect(dest.objects.some((o) => o.x === c.to.x && o.y === c.to.y)).toBe(false);
      const inn = dest.objects.find((o) => o.id === c.inn)!;
      expect(inn).toBeDefined();
      expect(c.to).toMatchObject({ x: inn.x, y: inn.y + 1 });
    });
  }
});
