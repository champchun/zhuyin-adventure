import { describe, expect, it } from 'vitest';
import { generateFloor } from '../tools/gen-dungeon.mjs';
import type { FloorConfig } from '../tools/gen-dungeon.mjs';

const cfg1: FloorConfig = { seed: 11, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } };
const cfg2: FloorConfig = { seed: 23, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } };
const cfgX1: FloorConfig = { seed: 37, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } };
const cfgX2: FloorConfig = { seed: 41, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } };
const cfgZ1: FloorConfig = { seed: 53, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } };
const cfgZ2: FloorConfig = { seed: 59, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } };
const cfgS1: FloorConfig = { seed: 67, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } };
const cfgS2: FloorConfig = { seed: 71, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** 從 (sx,sy) 出發能走到的地板（不看物件） */
function flood(rows: string[], sx: number, sy: number): Set<string> {
  const seen = new Set<string>([`${sx},${sy}`]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.pop()!;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (rows[ny]?.[nx] !== ':' || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`); q.push([nx, ny]);
    }
  }
  return seen;
}

describe.each([['一樓', cfg1], ['二樓', cfg2], ['冰晶一樓', cfgX1], ['冰晶二樓', cfgX2], ['熔岩一樓', cfgZ1], ['熔岩二樓', cfgZ2], ['星塔一樓', cfgS1], ['星塔二樓', cfgS2]] as const)('generateFloor：%s', (_n, cfg) => {
  const f = generateFloor(cfg);
  it('大小是 31×22、每列長度一致、只有 S 與 :', () => {
    expect(f.w).toBe(31);
    expect(f.h).toBe(22);
    expect(f.rows).toHaveLength(22);
    for (const r of f.rows) { expect(r).toHaveLength(31); expect(/^[S:]+$/.test(r)).toBe(true); }
  });
  it('外圍一圈是牆；起點房間的落腳格 (2,1) 與樓梯 (1,1) 都是地板', () => {
    for (let x = 0; x < 31; x++) { expect(f.rows[0][x]).toBe('S'); expect(f.rows[21][x]).toBe('S'); }
    for (let y = 0; y < 22; y++) { expect(f.rows[y][0]).toBe('S'); expect(f.rows[y][30]).toBe('S'); }
    expect(f.arrive).toEqual({ x: 2, y: 1 });
    expect(f.rows[1][2]).toBe(':');
    expect(f.objects.find((o) => o.role === 'up')).toMatchObject({ x: 1, y: 1 });
  });
  it('所有物件都在地板上，而且沒有兩個物件在同一格', () => {
    const at = new Set<string>();
    for (const o of f.objects) {
      expect(f.rows[o.y][o.x], `${o.role} (${o.x},${o.y})`).toBe(':');
      expect(at.has(`${o.x},${o.y}`), `${o.role} 與別的物件重疊`).toBe(false);
      at.add(`${o.x},${o.y}`);
    }
  });
  it('一定有 up；有鎖門就恰好一把鎖門＋一把鑰匙；有石牆就恰好一道石牆＋一個開關', () => {
    const count = (r: string) => f.objects.filter((o) => o.role === r).length;
    expect(count('up')).toBe(1);
    expect(count('door')).toBe(cfg.lock ? 1 : 0);
    expect(count('key')).toBe(cfg.lock ? 1 : 0);
    expect(count('barrier')).toBe(cfg.barrier ? 1 : 0);
    expect(count('switch')).toBe(cfg.barrier ? 1 : 0);
    expect(count('boss')).toBe(cfg.boss ? 1 : 0);
    expect(count('bossChest')).toBe(cfg.boss ? 1 : 0);
    expect(count('down')).toBe(cfg.boss ? 0 : 1);
    expect(f.downArrive === null).toBe(!!cfg.boss);
    expect(count('chest')).toBe(cfg.chests);
    expect(count('monster')).toBe(cfg.monsters.count);
    expect(count('rock')).toBe(cfg.closet ? 1 : 0);
    expect(count('closet')).toBe(cfg.closet ? 1 : 0);
  });
  it('把門、石牆、裂石當成牆之後，起點走得到除了「門後面」與「密室」以外所有房間；開了之後走得到全部（密室要打裂石）', () => {
    const solid = new Set(f.objects.filter((o) => ['door', 'barrier', 'rock'].includes(o.role)).map((o) => `${o.x},${o.y}`));
    const open = f.rows.map((r, y) => [...r].map((c, x) => (solid.has(`${x},${y}`) ? 'S' : c)).join(''));
    const before = flood(open, 2, 1);
    const all = flood(f.rows, 2, 1);
    const totalFloor = f.rows.join('').split(':').length - 1;
    expect(all.size).toBe(totalFloor); // 全部打開：每一格地板都連得到
    // 鑰匙／開關在鎖門／石牆之前拿得到
    for (const role of ['key', 'switch'] as const) {
      const o = f.objects.find((x) => x.role === role);
      if (o) expect(before.has(`${o.x},${o.y}`), `${role} 在鎖之後`).toBe(true);
    }
    // 終點（往下的樓梯或頭目）要被鎖擋住（走不到）
    const goal = f.objects.find((o) => o.role === 'down' || o.role === 'boss')!;
    if (cfg.lock || cfg.barrier) expect(before.has(`${goal.x},${goal.y}`), '終點沒被鎖擋住').toBe(false);
  });
  it('通道是 2 格寬：大部分房間之間的相連牆有兩格都打通了', () => {
    let wide = 0;
    for (let ry = 0; ry < 7; ry++) for (let rx = 0; rx < 9; rx++) {
      const x = 3 * rx + 3, y = 3 * ry + 1;
      if (f.rows[y][x] === ':' && f.rows[y + 1][x] === ':') wide++;
    }
    expect(wide).toBeGreaterThan(20);
  });
  it('怪物不在起點 5 步內；巡邏路線每一格都是地板、與前一格相鄰', () => {
    for (const m of f.objects.filter((o) => o.role === 'monster')) {
      expect(m.ai).toBe(cfg.monsters.ai);
      if (m.ai === 'patrol') {
        const route = [{ x: m.x, y: m.y }, ...m.patrol!];
        route.forEach((p, i) => {
          expect(f.rows[p.y][p.x]).toBe(':');
          if (i > 0) expect(Math.abs(p.x - route[i - 1].x) + Math.abs(p.y - route[i - 1].y)).toBe(1);
        });
      }
    }
  });
  it('有環（岔路與捷徑）：地板格比一棵樹能提供的更多通道', () => {
    // 房間 70 或 69 個；一棵樹有 房間數-1 條邊，每條 2 格寬通道；有環就會有更多打通的牆
    const opened = [];
    for (let ry = 0; ry < 7; ry++) for (let rx = 0; rx < 9; rx++) if (f.rows[3 * ry + 1][3 * rx + 3] === ':') opened.push(1);
    for (let ry = 0; ry < 6; ry++) for (let rx = 0; rx < 10; rx++) if (f.rows[3 * ry + 3][3 * rx + 1] === ':') opened.push(1);
    expect(opened.length).toBeGreaterThan(60); // 70 個房間的樹約 69 條邊；braid 會再多
  });
});

describe('generateFloor：確定性', () => {
  it('同樣的種子與設定產生一模一樣的樓層；換種子就不一樣', () => {
    expect(generateFloor(cfg1)).toEqual(generateFloor(cfg1));
    expect(generateFloor(cfg1).rows).not.toEqual(generateFloor({ ...cfg1, seed: 12 }).rows);
  });
});

// @ts-ignore 專案沒裝 @types/node，只有這個測試要讀檔
import { readFileSync } from 'node:fs';
import { renderMazes } from '../tools/gen-dungeon.mjs';

describe('src/data/mazes.ts 與產生器同步', () => {
  it('檔案內容和現在產生器的輸出一模一樣（改了種子或演算法記得重跑 node tools/gen-dungeon.mjs）', () => {
    const file = readFileSync(new URL('../src/data/mazes.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(file).toBe(renderMazes());
  });
});
