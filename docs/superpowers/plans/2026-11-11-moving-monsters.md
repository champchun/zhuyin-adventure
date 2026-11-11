# 會動的怪物（階段 2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 怪物會在地圖上移動：一種沿固定路線巡邏、一種看到主角就追；全部同步（主角走一格、怪物走一格，主角不動怪物就不動）；碰到就開戰，撤退後怪物暫停 3 回合。

**Architecture:** 規則寫成不依賴 Phaser 的純函式模組 `src/core/monsters.ts`，用 Vitest 直接測。World 場景只負責：保存每隻會動怪物的狀態、在主角每走一步時呼叫一次 `stepMonsters`、把結果變成動畫、碰到時開戰。家長設定新增「怪物會走動」開關。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest。

來源規格：`docs/superpowers/specs/2026-11-11-level-structure-design.md` 的「會動的怪物」一節（本計畫是它的「階段 2」）。階段 1（`src/core/travel.ts`、主島與碼頭）已完成並合併。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- **同步回合制**：主角走一格，所有怪物才各走一格；主角不動，怪物不動。點地面自動走路時，每一步都算一回合。
- **一樓怪物巡邏**（沿固定路線來回）；**二樓以上怪物追擊**（最短路徑 ≤ 5 步就追，每回合走一格，被擋就停，不穿牆）。這個階段兩種都是同一個欄位 `ai: 'patrol' | 'chase'`，由資料決定。
- **碰到就開戰**：怪物走到主角旁邊（上下左右相鄰），或主角走到怪物旁邊，就進入戰鬥。
- **撤退後暫停 3 回合**：該怪物 3 個回合不動，也不會觸發接觸。
- 怪物不穿牆、不重疊、不進主角所在格、不進入有其他物件（寶箱、NPC、樓梯、機關、頭目等）的格子。
- 同一回合有多隻怪相鄰，只開一場戰鬥，其他怪那回合不再移動。
- 野生怪離開地圖再回來會重生並回到起始位置（沿用現有重生規則）；頭目、練習布偶不重生。
- 家長設定「怪物會走動」預設開；關掉時怪物保持原地，行為跟現在完全一樣（點怪物才開戰）。
- 對話、戰鬥、彈窗期間不跑怪物回合（怪物回合只在主角走路時跑）。
- **第 0 關（起始村、村外小徑、風車草原）的怪物完全不動、也不加 `ai` 欄位。**
- 任何 `say()` / modal 都會增減 `ui.blocking`，新增流程務必成對（曾因 `say([])` 例外造成地圖輸入鎖死）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本（在這台機器會卡住）；測試用 `npx vitest run`。
- 只在使用者明確要求時才 push。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 工作目錄乾淨、在 `main`。執行者先開分支：`git switch -c stage2-moving-monsters`。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/core/monsters.ts` | 新增 | 純函式：`makeMon`、`stunMon`、`stepMonsters`、常數 `CHASE_RANGE`、`STUN_TURNS` |
| `tests/monsters.test.ts` | 新增 | 規則測試＋地圖資料的巡邏路線驗證 |
| `src/data/maps.ts` | 修改 | `MapObj` 加 `ai`、`patrol`；舌尖中音島的 3 隻小怪設定移動方式 |
| `src/core/save.ts` | 修改 | `Settings.monstersMove`（預設 `true`） |
| `src/core/ui.ts` | 修改 | 家長設定加「怪物會走動」開關 |
| `src/scenes/World.ts` | 修改 | 保存怪物狀態、每步呼叫怪物回合、移動動畫、碰到開戰、撤退暫停 |
| `tests/e2e/play.mjs` | 修改 | 測試開始時把「怪物會走動」關掉 |

---

### Task 1: 怪物規則模組 `monsters.ts`（純邏輯）

**Files:**
- Create: `src/core/monsters.ts`
- Create: `tests/monsters.test.ts`

**Interfaces:**
- Produces（Task 2、3 會用）：
  ```ts
  export interface Pt { x: number; y: number }
  export type MonAI = 'patrol' | 'chase';
  export const CHASE_RANGE = 5;
  export const STUN_TURNS = 3;
  export interface MonState { id: string; x: number; y: number; ai: MonAI; route: Pt[]; idx: number; dir: 1 | -1; stun: number }
  export function makeMon(def: { id: string; x: number; y: number; ai?: MonAI; patrol?: Pt[] }): MonState;
  export function stunMon(m: MonState): void;
  export interface TurnResult { moves: { id: string; from: Pt; to: Pt }[]; contact: string | null }
  export function stepMonsters(mons: MonState[], player: Pt, blocked: (x: number, y: number) => boolean): TurnResult;
  ```
  `blocked(x, y)` 由呼叫端提供：地圖外、阻擋地形、以及「不屬於 `mons` 的任何物件」所在格都要回傳 `true`。怪物彼此之間、怪物和主角之間的擋路由 `stepMonsters` 自己處理。

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/monsters.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { CHASE_RANGE, STUN_TURNS, makeMon, stepMonsters, stunMon } from '../src/core/monsters';

/** 一個 w×h 的空地圖，walls 是牆；回傳 blocked(x, y) */
const open = (w: number, h: number, walls: [number, number][] = []) => {
  const wall = new Set(walls.map(([x, y]) => `${x},${y}`));
  return (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || wall.has(`${x},${y}`);
};
const pos = (m: { x: number; y: number }) => `${m.x},${m.y}`;

describe('makeMon / stunMon', () => {
  it('路線的第 0 格就是起點；沒有 patrol 時只有一格', () => {
    const m = makeMon({ id: 'a', x: 2, y: 3, patrol: [{ x: 3, y: 3 }] });
    expect(m.route).toEqual([{ x: 2, y: 3 }, { x: 3, y: 3 }]);
    expect(m.ai).toBe('patrol');
    expect(makeMon({ id: 'b', x: 0, y: 0 }).route).toEqual([{ x: 0, y: 0 }]);
  });
  it('撤退後暫停 STUN_TURNS 回合', () => {
    const m = makeMon({ id: 'a', x: 0, y: 0 });
    stunMon(m);
    expect(m.stun).toBe(STUN_TURNS);
    expect(STUN_TURNS).toBe(3);
  });
});

describe('巡邏', () => {
  const player = { x: 7, y: 0 };
  it('沿路線來回走，走到盡頭就掉頭', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }, { x: 3, y: 0 }] });
    const blocked = open(8, 1);
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) { stepMonsters([m], player, blocked); seen.push(pos(m)); }
    expect(seen).toEqual(['2,0', '3,0', '2,0', '1,0', '2,0']);
  });
  it('只有起點、沒有路線的怪物原地不動', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0 });
    const r = stepMonsters([m], player, open(8, 1));
    expect(r.moves).toEqual([]);
    expect(pos(m)).toBe('1,0');
  });
  it('下一格被牆擋住就原地等，擋路消失後繼續走', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }] });
    expect(stepMonsters([m], player, open(8, 1, [[2, 0]])).moves).toEqual([]);
    expect(pos(m)).toBe('1,0');
    stepMonsters([m], player, open(8, 1));
    expect(pos(m)).toBe('2,0');
  });
  it('下一格有別的怪物就等', () => {
    const a = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }] });
    const b = makeMon({ id: 'b', x: 2, y: 0 });
    const r = stepMonsters([a, b], player, open(8, 1));
    expect(r.moves).toEqual([]);
    expect(pos(a)).toBe('1,0');
  });
});

describe('追擊', () => {
  it('繞過牆，沿最短路往主角走（路徑 5 步以內）', () => {
    // 牆在 (2,0)、(2,1)，只有 (2,2) 是缺口。(1,0) → (1,1) → (1,2) → (2,2) → (3,2) → (3,1) 共 5 步
    const m = makeMon({ id: 'c', x: 1, y: 0, ai: 'chase' });
    const blocked = open(5, 3, [[2, 0], [2, 1]]);
    const r = stepMonsters([m], { x: 3, y: 1 }, blocked);
    expect(r.moves).toEqual([{ id: 'c', from: { x: 1, y: 0 }, to: { x: 1, y: 1 } }]);
  });
  it(`路徑超過 ${CHASE_RANGE} 步就不追`, () => {
    const m = makeMon({ id: 'c', x: 0, y: 0, ai: 'chase' });
    const r = stepMonsters([m], { x: 9, y: 0 }, open(10, 1));
    expect(r.moves).toEqual([]);
    expect(pos(m)).toBe('0,0');
  });
  it('被牆完全隔開（沒有路）就不動', () => {
    const m = makeMon({ id: 'c', x: 0, y: 0, ai: 'chase' });
    const r = stepMonsters([m], { x: 2, y: 0 }, open(3, 1, [[1, 0]]));
    expect(r.moves).toEqual([]);
  });
  it('窄走廊裡後面的怪物不會穿過前面的怪物', () => {
    const a = makeMon({ id: 'a', x: 0, y: 0, ai: 'chase' });
    const b = makeMon({ id: 'b', x: 1, y: 0, ai: 'chase' });
    stepMonsters([a, b], { x: 4, y: 0 }, open(5, 1));
    expect(pos(b)).toBe('2,0');
    expect(pos(a)).toBe('0,0'); // 前面有 b 擋著，找不到路
    expect(pos(a)).not.toBe(pos(b));
  });
});

describe('接觸與開戰', () => {
  it('主角走到怪物旁邊：怪物不動，直接接觸', () => {
    const m = makeMon({ id: 'a', x: 1, y: 0, patrol: [{ x: 2, y: 0 }] });
    const r = stepMonsters([m], { x: 0, y: 0 }, open(5, 1));
    expect(r.contact).toBe('a');
    expect(r.moves).toEqual([]);
  });
  it('怪物走到主角旁邊：這一步之後接觸', () => {
    const m = makeMon({ id: 'c', x: 0, y: 0, ai: 'chase' });
    const r = stepMonsters([m], { x: 2, y: 0 }, open(5, 1));
    expect(r.moves).toHaveLength(1);
    expect(pos(m)).toBe('1,0');
    expect(r.contact).toBe('c');
  });
  it('同一回合兩隻怪都能碰到，只有第一隻接觸，另一隻不再移動', () => {
    const a = makeMon({ id: 'a', x: 0, y: 0, ai: 'chase' });
    const b = makeMon({ id: 'b', x: 4, y: 0, ai: 'chase' });
    const r = stepMonsters([a, b], { x: 2, y: 0 }, open(5, 1));
    expect(r.contact).toBe('a');
    expect(r.moves).toHaveLength(1);
    expect(pos(b)).toBe('4,0');
  });
  it('怪物不會走進主角所在的格子', () => {
    const m = makeMon({ id: 'c', x: 1, y: 0, ai: 'chase' });
    stepMonsters([m], { x: 2, y: 0 }, open(5, 1)); // 已經相鄰：直接接觸，不會再走
    expect(pos(m)).toBe('1,0');
  });
});

describe('撤退後暫停', () => {
  it('暫停的 3 個回合不動也不接觸，第 4 個回合恢復', () => {
    const m = makeMon({ id: 'c', x: 1, y: 0, ai: 'chase' });
    const blocked = open(5, 1);
    const player = { x: 2, y: 0 };
    stunMon(m);
    for (let i = 0; i < STUN_TURNS; i++) {
      const r = stepMonsters([m], player, blocked);
      expect(r.contact, `第 ${i + 1} 回合`).toBeNull();
      expect(r.moves).toEqual([]);
    }
    expect(stepMonsters([m], player, blocked).contact).toBe('c');
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/monsters.test.ts`
Expected: FAIL，訊息類似 `Failed to resolve import "../src/core/monsters"`。

- [ ] **Step 3: 寫實作**

建立 `src/core/monsters.ts`：

```ts
// 會動的怪物規則（同步回合制）。不依賴 Phaser，可直接用 Vitest 測。
// 主角每走一格，呼叫一次 stepMonsters；主角不動就不呼叫，怪物也就不動。

export interface Pt { x: number; y: number }
export type MonAI = 'patrol' | 'chase';

/** 追擊範圍：到主角的最短路徑在這麼多步以內才會追 */
export const CHASE_RANGE = 5;
/** 撤退之後，怪物暫停的回合數 */
export const STUN_TURNS = 3;

export interface MonState {
  id: string;
  x: number;
  y: number;
  ai: MonAI;
  /** 巡邏路線：第 0 格是起點，之後依序走，走到盡頭掉頭 */
  route: Pt[];
  idx: number;
  dir: 1 | -1;
  /** 還要暫停幾個回合（撤退後設成 STUN_TURNS） */
  stun: number;
}

export function makeMon(def: { id: string; x: number; y: number; ai?: MonAI; patrol?: Pt[] }): MonState {
  return { id: def.id, x: def.x, y: def.y, ai: def.ai ?? 'patrol', route: [{ x: def.x, y: def.y }, ...(def.patrol ?? [])], idx: 0, dir: 1, stun: 0 };
}

export function stunMon(m: MonState): void { m.stun = STUN_TURNS; }

export interface TurnResult {
  moves: { id: string; from: Pt; to: Pt }[];
  /** 這回合碰到主角、要開戰的怪物 id（沒有就是 null） */
  contact: string | null;
}

const manhattan = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const DIRS: Pt[] = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
const KEY = 1000; // 格子編號 = y * KEY + x（地圖寬度一定小於 1000）

/** 從怪物走到主角的最短路；路徑長度 ≤ range 才回傳「第一步要走到哪一格」，否則回傳 null。 */
function chaseStep(m: MonState, player: Pt, blocked: (x: number, y: number) => boolean, occupied: (x: number, y: number) => boolean): Pt | null {
  const key = (x: number, y: number) => y * KEY + x;
  const start = key(m.x, m.y), goal = key(player.x, player.y);
  const dist = new Map<number, number>([[start, 0]]);
  const prev = new Map<number, number>();
  const queue: Pt[] = [{ x: m.x, y: m.y }];
  while (queue.length) {
    const c = queue.shift()!;
    const d = dist.get(key(c.x, c.y))!;
    if (d >= CHASE_RANGE) continue;
    for (const dd of DIRS) {
      const nx = c.x + dd.x, ny = c.y + dd.y, k = key(nx, ny);
      if (dist.has(k)) continue;
      if (k !== goal && (blocked(nx, ny) || occupied(nx, ny))) continue;
      dist.set(k, d + 1);
      prev.set(k, key(c.x, c.y));
      if (k === goal) {
        let cur = k;
        while (prev.get(cur) !== start) cur = prev.get(cur)!;
        return cur === goal ? null : { x: cur % KEY, y: Math.floor(cur / KEY) }; // 已經相鄰：不用再走（接觸由呼叫端處理）
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

/**
 * 主角剛走完一步，輪到怪物。
 * 1. 如果主角走到某隻（沒暫停的）怪物旁邊：直接接觸，怪物這回合不動。
 * 2. 否則怪物依序各走一格（暫停中的只倒數）。走完某一隻就碰到主角，就停下來，後面的怪物這回合不動。
 */
export function stepMonsters(mons: MonState[], player: Pt, blocked: (x: number, y: number) => boolean): TurnResult {
  const res: TurnResult = { moves: [], contact: null };
  const touching = mons.find((m) => m.stun === 0 && manhattan(m, player) === 1);
  if (touching) { res.contact = touching.id; return res; }

  const occupied = (self: MonState) => (x: number, y: number) =>
    (x === player.x && y === player.y) || mons.some((o) => o !== self && o.x === x && o.y === y);

  for (const m of mons) {
    if (m.stun > 0) { m.stun--; continue; }
    let to: Pt | null = null;
    if (m.ai === 'chase') {
      to = chaseStep(m, player, blocked, occupied(m));
    } else if (m.route.length > 1) {
      let dir = m.dir;
      let ni = m.idx + dir;
      if (ni < 0 || ni >= m.route.length) { dir = dir === 1 ? -1 : 1; ni = m.idx + dir; }
      const t = m.route[ni];
      if (!blocked(t.x, t.y) && !occupied(m)(t.x, t.y)) { m.idx = ni; m.dir = dir as 1 | -1; to = t; }
    }
    if (!to) continue;
    res.moves.push({ id: m.id, from: { x: m.x, y: m.y }, to });
    m.x = to.x; m.y = to.y;
    if (manhattan(m, player) === 1) { res.contact = m.id; break; }
  }
  return res;
}
```

- [ ] **Step 4: 執行，確認通過**

Run: `npx vitest run tests/monsters.test.ts`
Expected: 全部 PASS（約 13 個）。如果「繞過牆」那個失敗，先確認牆的座標與路徑：缺口在 (2,2)，怪物 (1,0)、主角 (3,1)，最短路 5 步，第一步是 (1,1)。

- [ ] **Step 5: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

- [ ] **Step 6: Commit**

```bash
git add src/core/monsters.ts tests/monsters.test.ts
git commit -m "新增會動怪物的規則模組（巡邏、追擊、接觸、撤退暫停）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 資料欄位、家長設定開關、舌尖中音島的小怪

**Files:**
- Modify: `src/data/maps.ts`（`MapObj` 加欄位、島上 3 隻小怪）
- Modify: `src/core/save.ts`（`Settings.monstersMove`）
- Modify: `src/core/ui.ts`（家長設定開關）
- Test: `tests/monsters.test.ts`（加資料驗證）

**Interfaces:**
- Consumes: Task 1 的 `MonAI`、`Pt`
- Produces: `MapObj.ai?: 'patrol' | 'chase'`、`MapObj.patrol?: { x: number; y: number }[]`；`Settings.monstersMove: boolean`（預設 `true`）

- [ ] **Step 1: 寫會失敗的測試（資料驗證）**

在 `tests/monsters.test.ts` 檔尾加（並把檔案最上面的 import 改成下面三行）：

```ts
import { describe, expect, it } from 'vitest';
import { CHASE_RANGE, STUN_TURNS, makeMon, stepMonsters, stunMon } from '../src/core/monsters';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
```

```ts
describe('會動的怪物資料', () => {
  for (const m of Object.values(MAPS)) {
    it(`${m.id}: 有 ai 的都是怪物；巡邏路線每一格都能走、前後相鄰，且不壓到別的物件`, () => {
      for (const o of m.objects.filter((x) => x.ai || x.patrol)) {
        expect(o.kind, `${m.id}/${o.id}`).toBe('monster');
        const route = [{ x: o.x, y: o.y }, ...(o.patrol ?? [])];
        route.forEach((p, i) => {
          expect(BLOCKED_TILES.has(m.tiles[p.y]?.[p.x] ?? '#'), `${m.id}/${o.id} 第 ${i} 格 (${p.x},${p.y})`).toBe(false);
          if (i > 0) expect(Math.abs(p.x - route[i - 1].x) + Math.abs(p.y - route[i - 1].y), `${m.id}/${o.id} 第 ${i} 格不相鄰`).toBe(1);
          for (const other of m.objects) {
            if (other.id !== o.id) expect(other.x === p.x && other.y === p.y, `${m.id}/${o.id} 壓到 ${other.id}`).toBe(false);
          }
        });
      }
    });
  }
  it('第 0 關的三張地圖沒有任何會動的怪物', () => {
    for (const id of ['village', 'b', 'p']) expect(MAPS[id].objects.some((o) => o.ai || o.patrol), id).toBe(false);
  });
  it('舌尖中音島的小怪各有移動方式（兩隻巡邏、一隻追擊）', () => {
    const d = MAPS.d.objects;
    expect(d.find((o) => o.id === 'm1')!.ai).toBe('patrol');
    expect(d.find((o) => o.id === 'm2')!.ai).toBe('patrol');
    expect(d.find((o) => o.id === 'm3')!.ai).toBe('chase');
    expect(d.find((o) => o.id === 'boss')!.ai).toBeUndefined();
    expect(d.find((o) => o.id === 'dummy')!.ai).toBeUndefined();
  });
});
```

這幾個測試現在會因為 `o.ai` / `o.patrol` 型別不存在而 FAIL（編譯錯誤），或因為島上還沒設定而 FAIL。

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/monsters.test.ts`
Expected: FAIL（資料驗證裡的「舌尖中音島的小怪各有移動方式」失敗；型別欄位不存在）。

- [ ] **Step 3: `MapObj` 加欄位**

在 `src/data/maps.ts` 的 `MapObj` 介面裡，`doneText?: string[];` 後面加：

```ts
  /** monster：怎麼移動。patrol＝沿 patrol 路線來回走；chase＝看到主角就追（最短路 ≤ 5 步）。沒有 ai 的怪物不會動 */
  ai?: 'patrol' | 'chase';
  /** monster：巡邏路線（不含起點，起點就是 x, y）；每一格要和前一格上下左右相鄰 */
  patrol?: { x: number; y: number }[];
```

- [ ] **Step 4: 舌尖中音島的小怪設定移動方式**

在 `src/data/maps.ts` 的 `MAPS.d.objects` 裡，把這三行：

```ts
    { id: 'm1', kind: 'monster', x: 9, y: 9, battle: 'd1' },
```
改成
```ts
    { id: 'm1', kind: 'monster', x: 9, y: 9, battle: 'd1', ai: 'patrol', patrol: [{ x: 10, y: 9 }, { x: 11, y: 9 }, { x: 12, y: 9 }] },
```

```ts
    { id: 'm2', kind: 'monster', x: 11, y: 4, battle: 'd2' },
```
改成
```ts
    { id: 'm2', kind: 'monster', x: 11, y: 4, battle: 'd2', ai: 'patrol', patrol: [{ x: 11, y: 5 }, { x: 11, y: 6 }] },
```

```ts
    { id: 'm3', kind: 'monster', x: 19, y: 10, battle: 'd3' },
```
改成
```ts
    { id: 'm3', kind: 'monster', x: 19, y: 10, battle: 'd3', ai: 'chase' },
```

（這座島之後會依「主島＋兩座怪物島」重做，這裡先當作會動怪物的試玩場；頭目與練習布偶不會動。）

- [ ] **Step 5: 設定欄位**

在 `src/core/save.ts` 的 `Settings` 介面裡，`speedBonus: boolean;` 後面加：

```ts
  /** 怪物會在地圖上走動（給比較小的孩子可以關掉） */
  monstersMove: boolean;
```

在 `defaultSettings` 裡，`speedBonus: true,` 後面加：

```ts
  monstersMove: true,
```

（`loadSettings` 先建預設值再蓋上存起來的設定，所以舊設定檔沒有這個欄位時會自動是 `true`。）

- [ ] **Step 6: 家長設定畫面加開關**

在 `src/core/ui.ts` 的家長設定 HTML 裡，找到這一行：

```ts
    <div class="row">答得越快、攻擊越強（不顯示倒數，只有加成） ${sw('speedBonus', s.speedBonus)}</div>
```

在它後面加：

```ts
    <div class="row">怪物會在地圖上走動（比較小的孩子可以關掉） ${sw('monstersMove', s.monstersMove)}</div>
```

（`sw()` 與按下去的處理是通用的：切換 `data-k` 指定的設定並存檔，不用另外寫。）

- [ ] **Step 7: 執行，確認通過**

Run: `npx vitest run`
Expected: 全部 PASS。如果「巡邏路線每一格都能走」失敗，訊息會指出哪隻怪的哪一格；先對照 `MAPS.d.tiles` 與物件座標，必要時只調整那條路線，不要移動其他物件。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

- [ ] **Step 8: Commit**

```bash
git add src/data/maps.ts src/core/save.ts src/core/ui.ts tests/monsters.test.ts
git commit -m "怪物移動方式的資料欄位、家長設定開關，舌尖中音島小怪設為會動

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: World 整合（怪物回合、動畫、碰到開戰、撤退暫停）

**Files:**
- Modify: `src/scenes/World.ts`
- Modify: `tests/e2e/play.mjs`（測試時把怪物移動關掉）

**Interfaces:**
- Consumes: Task 1 的 `makeMon`、`stepMonsters`、`stunMon`、`MonState`；Task 2 的 `MapObj.ai/patrol`、`Settings.monstersMove`
- Produces: 無（最終行為）

這個 Task 動場景與動畫，沒辦法像純邏輯那樣單元測試；驗證靠型別檢查、既有單元測試、端對端（第 0 關與島的流程在「怪物不動」設定下完全不變），以及 Task 4 的手動確認。

- [ ] **Step 1: import 與型別**

在 `src/scenes/World.ts` 開頭的 import 區，`import { defeatSpot, dockSpot, markArrival, visitedHubs } from '../core/travel';` 後面加：

```ts
import { makeMon, stepMonsters, stunMon } from '../core/monsters';
import type { MonState } from '../core/monsters';
```

把

```ts
interface Obj { def: MapObj; spr: Phaser.GameObjects.Image; extra: Phaser.GameObjects.GameObject[] }
```
改成
```ts
interface Obj { def: MapObj; spr: Phaser.GameObjects.Image; extra: Phaser.GameObjects.GameObject[]; /** 目前所在格（會動的怪物會改變；其他物件等於 def.x / def.y） */ x: number; y: number }
```

在 `private objs = new Map<string, Obj>();` 後面加：

```ts
  /** 這張地圖上會動的怪物的狀態（refreshObjects 會重建圖片，所以位置要存在這裡；換地圖時清空） */
  private mons = new Map<string, MonState>();
```

- [ ] **Step 2: 換地圖時清空怪物狀態**

在 `loadMap()` 裡，找到

```ts
    this.objs.clear();
    this.followers = [];
```
改成
```ts
    this.objs.clear();
    this.mons.clear();
    this.followers = [];
```

- [ ] **Step 3: refreshObjects 用怪物目前的位置，會動的怪物不做上下晃動**

在 `refreshObjects()` 裡，找到

```ts
      const px = def.x * T, py = def.y * T;
```
改成
```ts
      const mon = def.kind === 'monster' && def.ai ? this.monOf(def) : undefined;
      const ox = mon ? mon.x : def.x, oy = mon ? mon.y : def.y; // 會動的怪物：用目前所在格
      const px = ox * T, py = oy * T;
```

找到 `case 'monster'` 裡的

```ts
          bob(spr, 2, 500);
          break;
        }
        default: continue;
```
改成
```ts
          if (!def.ai) bob(spr, 2, 500); // 會動的怪物用移動動畫，不能同時上下晃（兩個動畫會搶 y）
          break;
        }
        default: continue;
```

找到

```ts
      this.objs.set(def.id, { def, spr, extra });
```
改成
```ts
      this.objs.set(def.id, { def, spr, extra, x: ox, y: oy });
```

在 `refreshObjects()` 方法**前面**加上新方法：

```ts
  /** 取得（或建立）會動的怪物的狀態 */
  private monOf(def: MapObj): MonState {
    let m = this.mons.get(def.id);
    if (!m) { m = makeMon(def); this.mons.set(def.id, m); }
    return m;
  }
```

- [ ] **Step 4: 通行判定改用物件目前位置**

在 `objAt()` 裡，把

```ts
    for (const o of this.objs.values()) if (o.def.x === x && o.def.y === y) return o;
```
改成
```ts
    for (const o of this.objs.values()) if (o.x === x && o.y === y) return o;
```

- [ ] **Step 5: 怪物回合（新方法）**

在 `walkable()` 方法**後面**加：

```ts
  /** 怪物走路時的阻擋：地圖外、阻擋地形、以及「不是會動的怪物」的任何物件所在格 */
  private blockedForMonsters(x: number, y: number): boolean {
    const m = this.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    if (BLOCKED_TILES.has(m.tiles[y][x])) return true;
    for (const o of this.objs.values()) if (!this.mons.has(o.def.id) && o.x === x && o.y === y) return true;
    return false;
  }

  /**
   * 主角剛走了一步：輪到怪物（同步回合制）。回傳怪物移動動畫（done）與這回合碰到主角的怪物（contact）。
   * 設定關掉「怪物會走動」或這張地圖沒有會動的怪物時，什麼都不做。
   */
  private monsterTurn(): { done: Promise<void>; contact?: Obj } {
    const live = [...this.objs.values()].filter((o) => this.mons.has(o.def.id));
    if (!G.settings.monstersMove || !live.length) return { done: Promise.resolve() };
    const res = stepMonsters(live.map((o) => this.mons.get(o.def.id)!), { x: this.tx, y: this.ty }, (x, y) => this.blockedForMonsters(x, y));
    const tweens: Promise<void>[] = [];
    for (const mv of res.moves) {
      const o = this.objs.get(mv.id)!;
      o.x = mv.to.x; o.y = mv.to.y;
      o.spr.setDepth(mv.to.y * T + T);
      const shadow = o.extra[0] as Phaser.GameObjects.Image | undefined;
      tweens.push(new Promise<void>((r) => this.tweens.add({ targets: o.spr, x: mv.to.x * T + 8, y: mv.to.y * T + 16, duration: STEP_MS, ease: 'Linear', onComplete: () => r() })));
      if (shadow) this.tweens.add({ targets: shadow, x: mv.to.x * T + 8, y: mv.to.y * T + 14, duration: STEP_MS, ease: 'Linear' });
    }
    return { done: Promise.all(tweens).then(() => undefined), contact: res.contact ? this.objs.get(res.contact) : undefined };
  }
```

- [ ] **Step 6: run() 每一步都跑怪物回合，碰到就開戰**

在 `run()` 裡，找到

```ts
    this.moving = true;
    while (this.queue.length && !this.busy) {
```
改成
```ts
    this.moving = true;
    let contact: Obj | undefined;
    while (this.queue.length && !this.busy) {
```

找到

```ts
      this.tx = n.x; this.ty = n.y;
      this.placeFollowers(true);
```
改成
```ts
      this.tx = n.x; this.ty = n.y;
      const turn = this.monsterTurn(); // 主角走一格，怪物也走一格（同步）；動畫和主角的移動同時進行
      this.placeFollowers(true);
```

找到

```ts
      await new Promise<void>((res) => this.tweens.add({ targets: this.player, x: n.x * T + 8, y: n.y * T + 16, duration: STEP_MS, ease: 'Linear', onComplete: () => res() }));
      G.save.x = this.tx; G.save.y = this.ty;
      if (++this.stepCount % 25 === 0) saveGame();
    }
    this.moving = false;
```
改成
```ts
      await Promise.all([
        new Promise<void>((res) => this.tweens.add({ targets: this.player, x: n.x * T + 8, y: n.y * T + 16, duration: STEP_MS, ease: 'Linear', onComplete: () => res() })),
        turn.done,
      ]);
      G.save.x = this.tx; G.save.y = this.ty;
      if (++this.stepCount % 25 === 0) saveGame();
      if (turn.contact) { contact = turn.contact; this.queue = []; break; } // 碰到怪物：停下來，準備開戰
    }
    this.moving = false;
    if (contact && !this.busy) {
      this.pending = undefined;
      this.busy = true;
      try { await this.startBattle(contact); } catch (e) { console.error(e); }
      this.busy = false;
      saveGame();
      return;
    }
```

找到（run() 最後面的互動判斷）

```ts
    if (o && !this.busy && Math.abs(o.def.x - this.tx) + Math.abs(o.def.y - this.ty) === 1) {
      const dx = o.def.x - this.tx, dy = o.def.y - this.ty;
```
改成
```ts
    if (o && !this.busy && Math.abs(o.x - this.tx) + Math.abs(o.y - this.ty) === 1) {
      const dx = o.x - this.tx, dy = o.y - this.ty;
```

- [ ] **Step 7: 撤退後怪物暫停 3 回合**

在 `startBattle()` 裡，找到

```ts
    if (res === 'run') return;
```
改成
```ts
    if (res === 'run') { const st = this.mons.get(o.def.id); if (st) stunMon(st); return; } // 撤退：這隻怪暫停幾步，讓孩子來得及走開
```

- [ ] **Step 8: 端對端測試時關掉怪物移動**

機器人是用座標點擊走路，怪物一動就會亂掉，所以測試時把設定關掉（規格裡也這樣規定）。在 `tests/e2e/play.mjs` 找到

```js
await page.click('#screen [data-a=new]');
```
在它**後面**加一行：

```js
await ev(() => { window.__game.G.settings.monstersMove = false; }); // 機器人用座標點擊走路：怪物不動，流程才穩定
```

- [ ] **Step 9: 型別檢查、單元測試、打包**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npm run build`
Expected: `✓ built in ...`。

端對端（`npx vite preview --port 5190 --host 127.0.0.1` 開在背景後執行 `STARTER=momo node tests/e2e/play.mjs http://127.0.0.1:5190/ e2e-shots`）很吃資源，這一步由控制端決定跑不跑；不跑的話在回報裡寫明。

- [ ] **Step 10: Commit**

```bash
git add src/scenes/World.ts tests/e2e/play.mjs
git commit -m "World 整合會動的怪物：同步回合、移動動畫、碰到開戰、撤退暫停

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 手動確認清單（由使用者或控制端在瀏覽器做）

這個 Task 不改程式，只列出要親眼確認的事。把結果回報給控制端；有問題再開修正。

- [ ] **Step 1: 開發環境起來**

Run: `npm run dev`，瀏覽器開啟；用「測試用指令」跳到舌尖中音島（見規格對話中的主控台指令，或自己玩到島上）。

- [ ] **Step 2: 巡邏怪物**

Expected：島的左半邊，水滴怪（m1）在 3 格內來回走、橫行蟹（m2）上下 2 格來回走；你走路它們才動，你站著不動它們就不動。

- [ ] **Step 3: 追擊怪物**

Expected：過橋走到右半邊，右邊的水滴怪（m3）在你靠近約 5 步內會一步一步追你；你站著它就停；被牆或水擋住時它會停在原地，不會穿過去。

- [ ] **Step 4: 碰到就開戰**

Expected：你走到怪物旁邊、或它走到你旁邊，都會馬上進入戰鬥。贏了怪物消失；按「撤退」回到地圖後，那隻怪停 3 步不動、不會立刻又打你，第 4 步起恢復。

- [ ] **Step 5: 關閉開關**

Expected：家長設定把「怪物會在地圖上走動」關掉後，島上所有怪物原地不動，要點怪物才會開戰，跟以前一樣。

- [ ] **Step 6: 第 0 關沒有變**

Expected：村外小徑、風車草原的小怪完全不動，行為跟以前一樣。

---

## Self-Review（對照規格）

- **同步回合制**：Task 3 Step 6（每步呼叫 `monsterTurn`）；主角不動不呼叫（`run()` 只在走路時）。
- **一樓巡邏、二樓以上追擊、範圍 5、被擋就停、不穿牆**：Task 1（`stepMonsters`、`chaseStep`、`CHASE_RANGE`）。「一樓／二樓」目前由資料欄位 `ai` 決定，迷宮樓層在階段 3 才有。
- **碰到就開戰、同回合只開一場**：Task 1 測試「接觸與開戰」；Task 3 Step 6。
- **撤退暫停 3 回合、期間不接觸**：Task 1 `STUN_TURNS` 與「撤退後暫停」測試；Task 3 Step 7。
- **不重疊、不進主角格、不進其他物件格**：Task 1（`occupied`）、Task 3 Step 5（`blockedForMonsters`）。
- **重生回到起始位置**：`loadMap` 清空 `mons`（Task 3 Step 2），重新進入地圖時由 `makeMon(def)` 從 `def.x, def.y` 重建；頭目、練習布偶沒有 `ai`，不受影響。
- **家長設定開關、預設開**：Task 2 Step 5、6；關掉時 `monsterTurn` 直接回傳（Task 3 Step 5）。
- **對話／戰鬥／彈窗期間不跑**：`monsterTurn` 只在 `run()` 的走路迴圈裡呼叫；`run()` 在 `busy` 時不會走路。
- **第 0 關不動**：Task 2 測試「第 0 關的三張地圖沒有任何會動的怪物」。
- **未涵蓋（屬於後續階段）**：迷宮樓層與樓梯、鎖門與開關（階段 3）、旅館與主島模板（階段 4）。

型別一致性：`makeMon` / `stepMonsters` / `stunMon` / `MonState` / `TurnResult` 在 Task 1 定義，Task 3 的呼叫簽名一致；`MapObj.ai` / `patrol` 在 Task 2 Step 3 定義，Task 2 Step 4 與 Task 3 Step 3 使用；`Settings.monstersMove` 在 Task 2 Step 5 定義，Task 3 Step 5 使用。
