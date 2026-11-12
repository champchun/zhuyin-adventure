# 迷宮產生器（回音洞窟重做）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 寫一支迷宮產生器，把回音洞窟（`gc1`／`gc2`，回音森林）從 21×9 的小圖重做成 31×22 的大迷宮：有岔路與捷徑、一把鑰匙與一道鎖門、機關與石牆、隱藏小密室、寶箱、怪物，並用既有的 `reachReport` 驗證一定解得開。**試煉洞窟（`dc1`／`dc2`）完全不動。**

**Architecture:** `tools/gen-dungeon.mjs`（純 JavaScript、固定種子）產生每層的格子與物件，輸出 `src/data/mazes.ts`（產生出來的資料檔，提交進 git）；`src/data/maps.ts` 用它組出 `gc1`／`gc2`；單元測試用 `reachReport` 把關，並確認「重跑產生器得到一樣的檔案」。

**Tech Stack:** Node（直接執行 `.mjs`）、TypeScript、Vitest。

來源規格：`docs/superpowers/specs/2026-11-12-maze-generator-design.md`。現有範例：`MAPS.gc1`／`MAPS.gc2`（`src/data/maps.ts`，「回音洞窟」那一段）、`src/core/dungeon.ts`（`reachReport`）、`tests/velar.test.ts` 與 `tests/dungeon.test.ts`（既有洞窟測試）、`src/core/monsters.ts`（`patrol` 規則）。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，迷宮不能太容易迷路：通道 2 格寬、沒有時間壓力、**一層只有一把鎖門＋一把鑰匙**（`reachReport` 的鑰匙是貪心開門，抓不到「開錯門」）。
- **不動試煉洞窟**：`dc1`／`dc2`（`DC1`／`DC2`、`MAPS.dc1`／`MAPS.dc2`）與 `tests/dungeon.test.ts` 裡對它們的斷言完全不改。
- 樓層尺寸 **31×22**（10 欄 × 7 列的房間，每個房間 2×2 格地板；`3×10+1 = 31`、`3×7+1 = 22`）。格子字元沿用現有洞窟：`S` 懸崖牆、`:` 泥土地板（`BLOCKED_TILES` 含 `S`）。
- 產生器要**確定性**：同樣的種子、同樣的設定，永遠輸出完全一樣的檔案（亂數用固定的簡單演算法，不用 `Math.random`、不用時間；所有迭代順序固定）。
- 回音洞窟保持原有的外部連結與內容種類：`gc1` 的出口樓梯 `up` 回森林 `g` (24,5)、`gc1` 的 `down` 通往 `gc2` (2,1)、`gc2` 的 `up` 通往 `gc1`（落在 `down` 樓梯旁）；一樓怪物戰鬥 `gc1m`（青蛙）、二樓 `gc2m`（蝙蝠，回音怪）、頭目 `boss_g`（蝙蝠王，`hideIf: 'boss_g'`）、頭目寶箱 `chest_boss`（`showIf: 'boss_g'`）、二樓機關是敲樹洞（`gimmick`，`ability: 'knock'`）、石牆 `barrier1`（`hideIf: 'g:gc2:switch1'`）。`group: 'gc'` 不變。
- 怪物物件 id 一律用 `mon1`、`mon2`…（**不要用 `m1`、`m2`**：`gc1m`／`gc2m` 的獎勵旗標是 `m:gc1:m1`／`m:gc2:m2`，用同樣的 id 會讓打贏別隻怪時這隻也被一起隱藏）。
- 進入樓層時玩家的落腳位置固定：`gc1` 與 `gc2` 的 `start`／`respawn` 都是 `(2,1)`（左上角房間的右上格），森林的洞窟入口 `to` 也是 `(2,1)`，不改 `g` 的資料。
- 載入存檔時，如果玩家所在的格子是不能走的（新迷宮取代舊迷宮），送回該地圖的 `start`（見 Task 2）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代；**產生出來的 `src/data/mazes.ts` 由程式寫入，行尾用 `\n`**，並在檔案開頭註明「由 tools/gen-dungeon.mjs 產生，不要手改」。
- 不要用 `vite-node`；測試用 `npx vitest run`（偶爾出現「1 個 Unhandled Error」且測試數變少是已知的暫時問題，重跑即可）。
- 端對端很慢，**不要在本機跑**，只做 `node --check`。只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 分支 `maze-gen`（從 `main` 開出，規格已 commit 在上面），工作目錄乾淨。**不要再開新分支。**

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `tools/gen-dungeon.mjs` | 新增 | 產生器：`generateFloor(cfg)`；直接執行時把設定裡的樓層寫進 `src/data/mazes.ts` |
| `tools/gen-dungeon.d.mts` | 新增 | 給測試用的型別宣告 |
| `src/data/mazes.ts` | 產生 | 每層的 `rows`（格子）與 `objects`（角色、位置） |
| `src/data/maps.ts` | 修改 | `gc1`／`gc2` 改從 `mazes.ts` 組出；刪掉舊的 `fromAscii` 區塊 |
| `src/scenes/World.ts` | 修改 | 載入存檔時所在格不能走就送回 `start` |
| `tests/mazegen.test.ts` | 新增 | 產生器的結構測試、確定性、`mazes.ts` 與產生器同步 |
| `tests/velar.test.ts` | 修改 | 回音洞窟的手寫座標斷言換成新迷宮的通用斷言；用 `reachReport` 驗證 |
| `tests/e2e/play.mjs` | 修改 | 回音洞窟的點擊改成從遊戲讀位置 |

---

### Task 1: 產生器核心

**Files:**
- Create: `tools/gen-dungeon.mjs`
- Create: `tools/gen-dungeon.d.mts`
- Create: `tests/mazegen.test.ts`

**Interfaces:**
- Produces（後面的 Task 用）：
  ```ts
  // tools/gen-dungeon.d.mts
  export interface FloorConfig {
    seed: number;
    /** 房間欄數、列數（預設 10、7）。圖大小是 3*cols+1 欄、3*rows+1 列 */
    cols?: number; rows?: number;
    /** 一樓：一把鎖門＋一把鑰匙 */
    lock?: boolean;
    /** 二樓：一道石牆＋一個機關開關 */
    barrier?: boolean;
    /** 終點放頭目（頭目＋頭目寶箱）；否則終點放往下的樓梯 */
    boss?: boolean;
    /** 隱藏小密室（裂石當門，裡面一個寶箱） */
    closet?: boolean;
    /** 一般寶箱數量 */
    chests: number;
    /** 怪物：patrol 沿小路徑來回；chase 看到就追 */
    monsters: { ai: 'patrol' | 'chase'; count: number };
  }
  export type Role = 'up' | 'down' | 'key' | 'door' | 'barrier' | 'switch' | 'rock' | 'closet' | 'chest' | 'boss' | 'bossChest' | 'monster';
  export interface FloorObject { role: Role; x: number; y: number; ai?: 'patrol' | 'chase'; patrol?: { x: number; y: number }[] }
  export interface Floor {
    w: number; h: number;
    /** 格子字元：'S' 牆、':' 地板，每列一個字串 */
    rows: string[];
    objects: FloorObject[];
    /** 往上的樓梯旁邊、玩家落腳的格子（固定 (2,1)） */
    arrive: { x: number; y: number };
    /** 往下的樓梯旁邊、從下一層回來時落腳的格子（沒有往下樓梯的樓層是 null） */
    downArrive: { x: number; y: number } | null;
  }
  export function generateFloor(cfg: FloorConfig): Floor;
  ```

**座標約定：** 房間 `(rx, ry)`（`0 ≤ rx < cols`、`0 ≤ ry < rows`）的 2×2 地板左上角是 `(3*rx + 1, 3*ry + 1)`，四格是 `(x0,y0) (x0+1,y0) (x0,y0+1) (x0+1,y0+1)`。房間之間隔 1 格牆：右邊的牆在 `x = 3*rx + 3`、下面的牆在 `y = 3*ry + 3`。兩個房間相連＝打通它們之間牆上的**兩格**（2 格寬的通道）；`lock`／`barrier`／`closet` 的通道只打通**一格**（見下）。牆的交角（柱子）永遠是牆。

**演算法（照這個順序，亂數呼叫順序固定）：**

1. **亂數**：`let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);`。
2. **保留密室房間**（只有 `closet: true`）：從「邊界上、不是四個角、不是起點房間 (0,0) 也不是終點」的房間中，用 `rnd` 選一個當密室房間（先選密室再選終點會互相影響：先把房間格依固定順序列出邊界房間清單，選好密室，終點在步驟 4 排除它）。密室房間不參與迷宮。
3. **挖迷宮**：對其餘房間用遞迴回溯法（疊代版，用堆疊），從房間 (0,0) 開始，每一步把未拜訪的鄰居依固定順序（右、左、下、上）列出，用 `rnd` 選一個，記下樹的邊。得到一棵跨越所有房間的樹。
4. **起點與終點**：起點房間 (0,0)；用廣度優先搜尋算樹上每個房間離起點的距離，終點是距離最大的房間（同距離取列優先、欄優先最小的）。起點到終點的唯一路徑記為 `path`（房間序列）。
5. **鎖門／石牆**：`lock` 或 `barrier` 為真時，從 `path` 中選第 `Math.floor(path.length * 0.6)`（至少 1、至多 `path.length - 1`）個房間與它前一個房間之間的邊當「鎖邊」。這條邊對應的通道**只打通一格**：選兩格中靠上／靠左的那一格，放 `door`（`lock`）或 `barrier`（`barrier`）物件。把樹拆成兩側：起點側 A（含起點）與另一側 B（含終點）。
6. **岔路與捷徑（braid）**：對所有「相鄰、尚未相連、兩個房間都在迷宮裡、且在鎖邊同一側」的房間對，依固定順序掃過，每對用 `rnd() < 0.18` 決定是否打通（2 格寬）。**不跨鎖邊的兩側打通**，所以鎖門／石牆一定擋得住路。
7. **鑰匙或開關**：在 A 側的「死路房間」（連到的通道數為 1、不是起點、不是鎖邊兩端以外的房間）中，用 `rnd` 選一個放 `key`（`lock`）或 `switch`（`barrier`）。若 A 側沒有死路房間，退而選 A 側離起點最遠的房間（不是起點）。物件位置是該房間的 `(x0+1, y0+1)`。
8. **終點物件**：`boss` 為真：終點房間 `(x0, y0)` 放 `boss`、`(x0+1, y0+1)` 放 `bossChest`；否則 `(x0+1, y0+1)` 放往下的樓梯 `down`，`downArrive` 是 `(x0, y0+1)`（同房間內另一格）。起點房間 (0,0) 的 `(x0, y0)` 就是 `(1,1)`：往上的樓梯 `up` 放在 `(1,1)`，玩家落腳的 `arrive` 是同房間的 `(2,1)`。
9. **密室**：`closet` 為真時，在密室房間相鄰的房間中選一個（優先選死路房間，否則依固定順序第一個），把它們之間的牆**只打通一格**放 `rock`；密室房間 `(x0+1, y0+1)` 放 `closet`（寶箱）。密室不能和任何其他房間相連。
10. **寶箱**：在剩下的死路房間（排除起點、終點、鑰匙／開關房間、密室鄰居、密室）中依固定順序打散後取前 `chests` 個，物件放在 `(x0+1, y0+1)`；死路不夠就用離起點由遠到近的其他房間補。
11. **怪物**：候選房間＝不是起點、不是終點、沒有其他物件、與起點的**格子距離**（廣度優先，通道算 1 步）大於 5 的房間。依固定順序打散後取前 `count` 個。`patrol`：怪物在 `(x0, y0)`，`patrol` 路線是 `[(x0+1, y0), (x0+1, y0+1)]`；`chase`：怪物在 `(x0+1, y0+1)`，無路線。
12. **畫格子**：先全部畫成 `S`，房間 2×2 與打通的通道畫成 `:`。

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/mazegen.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { generateFloor } from '../tools/gen-dungeon.mjs';
import type { FloorConfig } from '../tools/gen-dungeon.mjs';

const cfg1: FloorConfig = { seed: 11, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } };
const cfg2: FloorConfig = { seed: 23, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } };
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

describe.each([['一樓', cfg1], ['二樓', cfg2]] as const)('generateFloor：%s', (_n, cfg) => {
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
```

（上面「有環」的最後一個測試對有鎖邊／密室的樓層，開口數會略少，所以門檻放在 60；實作完如果門檻不合理，**調整門檻到能穩定通過的值**，並在報告說明。）

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/mazegen.test.ts`
Expected: FAIL（`../tools/gen-dungeon.mjs` 不存在）。

- [ ] **Step 3: 型別宣告**

建立 `tools/gen-dungeon.d.mts`，內容是上面 Interfaces 區塊的所有 `export interface`／`export type`／`export function generateFloor` 宣告（不含實作）。

- [ ] **Step 4: 實作**

建立 `tools/gen-dungeon.mjs`，依「座標約定」與「演算法」實作並匯出 `generateFloor(cfg)`。程式碼要有中文註解，說明每一步在做什麼。這個檔案同時要能被 Vitest `import`，也能被 Node 直接執行（Task 2 加上直接執行的部分）。

- [ ] **Step 5: 執行測試**

Run: `npx vitest run tests/mazegen.test.ts`
Expected: 全部 PASS。若某個結構測試失敗（例如鑰匙落在鎖後面、怪物太靠近起點），**修產生器**，不要放寬測試（只有最後一個「有環」的門檻可以調，見上）。對 cfg1／cfg2 以外的幾個種子（例如 1～30）也自己跑一遍確認不會丟例外、所有結構不變式成立；產生器遇到無法滿足的情況（例如找不到死路房間）要有明確的後備規則，不要丟例外。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

- [ ] **Step 6: Commit**

```bash
git add tools tests/mazegen.test.ts
git commit -m "迷宮產生器：31×22、2 格寬通道、岔路與捷徑、一把鎖門與鑰匙、石牆與機關、隱藏小密室

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 產生回音洞窟並接上地圖

**Files:**
- Modify: `tools/gen-dungeon.mjs`（加直接執行的部分）
- Create（產生）: `src/data/mazes.ts`
- Modify: `src/data/maps.ts`
- Modify: `src/scenes/World.ts`
- Modify: `tests/mazegen.test.ts`
- Modify: `tests/velar.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `generateFloor`、`FloorConfig`、`Floor`
- Produces：`src/data/mazes.ts` 匯出 `MAZES: Record<'gc1' | 'gc2', Floor>`（與 `Floor` 同形）；`MAPS.gc1`／`MAPS.gc2` 用它組成。

- [ ] **Step 1: 直接執行時產生 `mazes.ts`**

在 `tools/gen-dungeon.mjs` 檔尾加（只有直接執行檔案時才跑，被 import 時不跑）：

```js
// 回音洞窟（回音森林）兩層的設定與種子。要換迷宮：改種子，重跑 `node tools/gen-dungeon.mjs`
export const FLOORS = {
  gc1: { seed: 11, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } },
  gc2: { seed: 23, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } },
};
/** 產生 src/data/mazes.ts 的內容（字串）。測試用它比對檔案有沒有和產生器同步。 */
export function renderMazes() {
  const out = Object.fromEntries(Object.entries(FLOORS).map(([id, cfg]) => [id, generateFloor(cfg)]));
  return `// 由 tools/gen-dungeon.mjs 產生，不要手改。要換迷宮：改 tools/gen-dungeon.mjs 裡的種子，重跑 node tools/gen-dungeon.mjs\n` +
    `import type { Floor } from '../../tools/gen-dungeon.mjs';\n\nexport const MAZES: Record<'gc1' | 'gc2', Floor> = ${JSON.stringify(out, null, 2)};\n`;
}
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const target = new URL('../src/data/mazes.ts', import.meta.url);
  writeFileSync(target, renderMazes(), 'utf8');
  console.log('已寫入', fileURLToPath(target));
}
```
（`import` 語句放在檔案最上面也可以，只要執行順序正確；若 `tsc` 對 `.mjs` 的型別匯入有問題，把 `.d.mts` 補上 `FLOORS`、`renderMazes` 的宣告。）

Run: `node tools/gen-dungeon.mjs`
Expected: 印出「已寫入 …/src/data/mazes.ts」。

- [ ] **Step 2: 同步與確定性測試**

在 `tests/mazegen.test.ts` 檔尾加（`readFileSync`、`renderMazes` 用 `import`）：

```ts
import { readFileSync } from 'node:fs';
import { renderMazes } from '../tools/gen-dungeon.mjs';

describe('src/data/mazes.ts 與產生器同步', () => {
  it('檔案內容和現在產生器的輸出一模一樣（改了種子或演算法記得重跑 node tools/gen-dungeon.mjs）', () => {
    const file = readFileSync(new URL('../src/data/mazes.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(file).toBe(renderMazes());
  });
});
```

- [ ] **Step 3: 組地圖**

在 `src/data/maps.ts`：
1. 檔案開頭 import 區加 `import { MAZES } from './mazes';`。
2. 找到「回音洞窟」那一段（`gc1`／`gc2` 的 `fromAscii` 區塊與 `MAPS.gc1`／`MAPS.gc2`；用 Read 看清楚邊界），**整段換成**下面的內容，**不要動 `DC1`／`DC2`／`MAPS.dc1`／`MAPS.dc2`**：

```ts
// ───────── 回音洞窟：由 tools/gen-dungeon.mjs 產生的迷宮（兩層，每層 31×22）─────────
/** 把產生器輸出的物件角色換成遊戲裡的物件定義 */
function mazeObjects(mapId: 'gc1' | 'gc2', up: MapObj['to'], down: MapObj['to'] | undefined): MapObj[] {
  const f = MAZES[mapId];
  const objs: MapObj[] = [];
  const counter: Record<string, number> = {};
  const nth = (r: string) => (counter[r] = (counter[r] ?? 0) + 1);
  for (const o of f.objects) {
    const at = { x: o.x, y: o.y };
    switch (o.role) {
      case 'up': objs.push({ id: 'up', kind: 'stairs', ...at, to: up, label: mapId === 'gc1' ? '出口' : '回 1 樓' }); break;
      case 'down': objs.push({ id: 'down', kind: 'stairs', ...at, to: down, label: '往下' }); break;
      case 'key': objs.push({ id: 'chest_key', kind: 'chest', ...at, item: 'key' }); break;
      case 'door': objs.push({ id: 'door', kind: 'lockdoor', ...at, lockText: ['門被鎖住了。', '要先找到小鑰匙。'] }); break;
      case 'barrier': objs.push({ id: 'barrier1', kind: 'barrier', ...at, hideIf: 'g:gc2:switch1', lockText: ['一道石牆擋住了路。', '好像有什麼機關可以打開它……'] }); break;
      case 'switch': objs.push({
        id: 'switch1', kind: 'gimmick', ...at, sprite: 'tree_hole', sprite2: 'tree_hole_open', ability: 'knock', fx: 'knock',
        lockText: ['一個樹洞，洞口緊緊關著。', '用啄木鳥「ㄎ」的敲擊，也許會有回音……'],
        hitText: ['夥伴「ㄎ」地輕輕一敲，樹洞「喀」地打開了！', '遠處傳來「轟隆」一聲，好像有一道牆打開了！'],
        doneText: ['樹洞開著，裡面空空的。'],
      }); break;
      case 'rock': objs.push({ id: 'rock_h', kind: 'rock', ...at }); break;
      case 'closet': objs.push({ id: 'chest_h', kind: 'chest', ...at, item: 'berry' }); break;
      case 'chest': { const n = nth('chest'); objs.push({ id: `chest_${n}`, kind: 'chest', ...at, item: n % 2 ? 'potion' : 'berry' }); break; }
      case 'boss': objs.push({ id: 'boss', kind: 'monster', ...at, battle: 'boss_g', hideIf: 'boss_g' }); break;
      case 'bossChest': objs.push({ id: 'chest_boss', kind: 'chest', ...at, item: 'bigpotion', showIf: 'boss_g' }); break;
      case 'monster': {
        const n = nth('monster');
        objs.push({ id: `mon${n}`, kind: 'monster', ...at, battle: mapId === 'gc1' ? 'gc1m' : 'gc2m', ai: o.ai, ...(o.patrol ? { patrol: o.patrol } : {}) });
        break;
      }
    }
  }
  return objs;
}
MAPS.gc1 = {
  id: 'gc1', name: '回音洞窟 1F', w: MAZES.gc1.w, h: MAZES.gc1.h, tiles: MAZES.gc1.rows, theme: 'valley', group: 'gc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: mazeObjects('gc1', { map: 'g', x: 24, y: 5 }, { map: 'gc2', x: 2, y: 1 }),
};
MAPS.gc2 = {
  id: 'gc2', name: '回音洞窟 2F', w: MAZES.gc2.w, h: MAZES.gc2.h, tiles: MAZES.gc2.rows, theme: 'valley', group: 'gc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: mazeObjects('gc2', { map: 'gc1', x: MAZES.gc1.downArrive!.x, y: MAZES.gc1.downArrive!.y }, undefined),
};
```
（`MapObj['to']` 的型別若不能這樣寫，用 `NonNullable<MapObj['to']>` 或明確的 `{ map: string; x: number; y: number }`。**重點是行為**：`gc1` 的 `up` 回森林 (24,5)；`gc1` 的 `down` 通往 `gc2` (2,1)；`gc2` 的 `up` 落在 `gc1` 的 `down` 樓梯旁。先用 Read 確認舊程式裡這些目的地的原本座標，行為要和舊的一致：森林入口 `to` 是 `gc1 (2,1)`。）

- [ ] **Step 4: 載入存檔時所在格不能走就送回起點**

在 `src/scenes/World.ts` 找到「載入存檔後把玩家放到存檔位置」的地方（用 Grep 找 `G.save.mapId` 與 `loadMap(` 的呼叫，通常在 scene 的 `create()` 裡）。在呼叫 `loadMap(G.save.mapId, G.save.x, G.save.y)` 之前，加上檢查：目標地圖的那一格如果是 `BLOCKED_TILES` 的格子，就改用該地圖的 `start`。寫成：

```ts
    const saved = MAPS[G.save.mapId];
    const blocked = !saved || BLOCKED_TILES.has(saved.tiles[G.save.y]?.[G.save.x] ?? 'S');
    const spot = blocked && saved ? saved.start : { x: G.save.x, y: G.save.y };
```
並用 `spot.x`、`spot.y` 呼叫 `loadMap`。若 `MAPS` 或 `BLOCKED_TILES` 還沒在 `World.ts` import，補上（先 grep 確認）。

- [ ] **Step 5: 更新並新增驗證測試**

在 `tests/velar.test.ts`：
1. 先跑 `npx vitest run tests/velar.test.ts`，找出會失敗的**回音洞窟手寫座標斷言**（例如「洞窟：兩層同一個 group、樓梯互相對得上、出口回森林」之外，`reachReport` 那一組、對 `gc1`／`gc2` 特定座標 `(17,6)`、`(10,6)`、`(10,7)` 的斷言）。**只改回音洞窟（`gc1`／`gc2`）的斷言**，改成不依賴座標的通用斷言（物件 id 存在、型別對、目的地對得上）；不要動 `dc1`／`dc2`、蛙鳴灣、森林的測試。
2. 在檔尾加（`reachReport` 的呼叫形狀照既有的 `reachReport([...], { map, x, y }, [...abilities])`，看 `tests/dungeon.test.ts` 與 `tests/velar.test.ts` 裡現有的呼叫）：

```ts
describe('回音洞窟（產生的迷宮）：用 reachReport 驗證一定解得開', () => {
  const abilities = ['blast', 'gust', 'croak', 'knock'];
  it('兩層一起走：沒有走不到的地板與物件，鑰匙剛好用完', () => {
    const r = reachReport([MAPS.gc1, MAPS.gc2], { map: 'gc1', x: 2, y: 1 }, abilities);
    expect(r.unreachableFloor, '有走不到的地板').toEqual([]);
    expect(r.unreachableObjects, '有走不到的物件').toEqual([]);
    expect(r.keysLeft).toBe(0);
  });
  it('沒有 knock 招式時，石牆後面走不到（機關一定要用招式啟動）', () => {
    const r = reachReport([MAPS.gc1, MAPS.gc2], { map: 'gc1', x: 2, y: 1 }, ['blast', 'gust']);
    expect(r.unreachableFloor.length).toBeGreaterThan(0);
  });
  it('沒有 blast 招式時，隱藏小密室走不到（裂石要用招式打）', () => {
    const r = reachReport([MAPS.gc1, MAPS.gc2], { map: 'gc1', x: 2, y: 1 }, ['gust', 'croak', 'knock']);
    expect(r.unreachableFloor.length).toBeGreaterThan(0);
  });
  it('尺寸 31×22；一樓有一把鎖門與一把鑰匙；二樓有石牆、開關、頭目與頭目寶箱', () => {
    for (const m of [MAPS.gc1, MAPS.gc2]) { expect(m.w).toBe(31); expect(m.h).toBe(22); }
    const has = (m: typeof MAPS.gc1, id: string) => m.objects.some((o) => o.id === id);
    expect(has(MAPS.gc1, 'door')).toBe(true);
    expect(has(MAPS.gc1, 'chest_key')).toBe(true);
    for (const id of ['barrier1', 'switch1', 'boss', 'chest_boss']) expect(has(MAPS.gc2, id), id).toBe(true);
  });
  it('怪物 id 不和獎勵旗標（m1、m2）撞名', () => {
    for (const m of [MAPS.gc1, MAPS.gc2]) for (const o of m.objects.filter((x) => x.kind === 'monster' && x.id !== 'boss')) expect(o.id).toMatch(/^mon\d+$/);
  });
});
```
若 `reachReport` 在這些迷宮上報有走不到的地板，**修產生器**（Task 1 的檔案），再重跑 `node tools/gen-dungeon.mjs`，讓檔案和產生器同步；不要放寬測試。

- [ ] **Step 6: 執行所有測試與打包**

Run: `npx vitest run`
Expected: 全部 PASS（含 `tests/dungeon.test.ts` 對 `dc1`／`dc2` 的全部斷言完全沒改動、`tests/hub.test.ts`、`tests/game.test.ts` 對新地圖的通用檢查）。若 `tests/game.test.ts` 的「起點能走到所有一般物件旁」等通用檢查對新迷宮失敗，**修產生器或 `mazeObjects`**，不要改那些通用測試。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 7: Commit**

```bash
git add tools src tests
git commit -m "回音洞窟換成產生的大迷宮（31×22）：岔路、鎖門與鑰匙、石牆與機關、隱藏小密室；載入存檔時所在格不能走就送回起點

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 端對端改成動態讀位置

**Files:**
- Modify: `tests/e2e/play.mjs`

端對端**不在本機跑**，只做 `node --check`。目前走回音洞窟的那一段（從 `doTap` 點森林的洞窟入口 `cave` 到打完頭目、走回森林）用的是舊迷宮的寫死座標。新迷宮的座標在每次換種子都會變，所以改成**每一步從遊戲裡讀出物件位置**。

- [ ] **Step 1: 看懂舊的那一段**

用 Read 看 `tests/e2e/play.mjs` 裡搜尋 `回音洞窟`／`gc1`／`gc2` 的段落（第三關那一段）：怎麼進洞窟、一樓打裂石／拿鑰匙／開鎖門／下樓梯、二樓打小怪／敲樹洞開石牆／打頭目、檢查哪些旗標。

- [ ] **Step 2: 加一個「找物件」的輔助函式**

在輔助函式區（`doTap` 附近）加：

```js
/** 讀出目前這張地圖上某個物件的座標；找不到就丟出錯誤（有 hideIf／showIf 隱藏或已消失的物件不在列表裡） */
const objPos = async (id) => {
  const p = await ev((id) => { const o = window.__game.world().objs.get(id); return o ? { x: o.def.x, y: o.def.y } : null; }, id);
  if (!p) throw new Error('找不到物件：' + id);
  return p;
};
```
先用 Read／Grep 確認 `window.__game.world().objs` 是以物件 `id` 為 key 的 `Map`（`refreshObjects` 裡 `this.objs.set(...)` 的 key；`snap` 的 FAIL 訊息用了 `[...w.objs.keys()]`）；若 key 不是 `def.id`，改用 `[...w.objs.values()].find((o) => o.def.id === id)`。

- [ ] **Step 3: 改寫洞窟那一段**

把洞窟那一段每個寫死座標的 `doTap(x, y, …)` 改成 `const p = await objPos('id'); await doTap(p.x, p.y, '…');`，流程與檢查**維持原樣**：
1. `up`／`down`／`door`／`chest_key`／`rock_h`／`chest_h`／`barrier1`／`switch1`／`boss`／`chest_boss` 都用 `objPos` 取位置（物件 id 見 `mazeObjects`）。
2. 一樓走到鎖門前需要鑰匙：先 `doTap` 鑰匙寶箱 `chest_key`，再 `doTap` 鎖門 `door`；樓梯 `down` 在鎖門後面。檢查 `flags['k:gc1:door']` 與鑰匙用完。
3. 隱藏小密室（`rock_h`）：點裂石（要有 blast 招式，機器人有），再點 `chest_h`；檢查 `flags['r:gc1:rock_h']`、`flags['c:gc1:chest_h']`。
4. 二樓：先走到 `switch1`（樹洞）、敲開（檢查 `flags['g:gc2:switch1']`），再走到 `boss`。進頭目戰前的魔力補滿保留。
5. 路上的怪物（`mon1`…）：機器人把怪物移動關掉，所以怪物不會走過來；`doTap` 走過去的路徑會被擋住時，先用 `objPos` 取該怪物位置、`doTap` 它打一場（`pump` 會自動打完），再繼續。**用迴圈處理**：`for (const id of ['mon1', 'mon2', 'mon3', 'mon4'])` 每個 id 先檢查是否還在（`ev` 查 `objs.has(id)`），在就打。
6. 打完頭目檢查 `flags.boss_g` 與 `abilities` 含 `breath`；走回森林（先走到 `up` 兩次：`gc2` 的 `up` 到 `gc1`，`gc1` 的 `up` 回森林）。

- [ ] **Step 4: 語法檢查**

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出。

確認：沒有留下任何 `gc1`／`gc2` 的寫死座標（Grep `gc1`／`gc2` 附近的 `doTap(` 數字）；輔助函式名稱沒有和檔案裡既有的 `const` 重複。

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/play.mjs
git commit -m "端對端：回音洞窟改成從遊戲讀物件位置，換迷宮種子不用改腳本

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 進洞窟**

`npm run dev`，用跳關 code 去回音森林、學會 ㄍㄎ 後進洞窟（跳關 code 第 4 段）。Expected：一樓比以前大很多，要往前探索；通道比較寬；有岔路與死路。

- [ ] **Step 2: 一樓**

找到鑰匙（在鎖門之前的死路裡）、打開鎖門、往下的樓梯在門後面。Expected：走得通、有寶箱、一樓怪物沿著小路來回走。

- [ ] **Step 3: 隱藏小密室**

找一個看起來像死路、中間隔著一塊裂石的地方，用爆破拳（ㄅ）打碎。Expected：裡面有一個寶箱。

- [ ] **Step 4: 二樓與蝙蝠王**

二樓蝙蝠會追人；找到敲樹洞的機關、石牆打開、走到蝙蝠王前；開戰有護盾提示。Expected：整座迷宮不會卡死，也不會走到覺得迷路到放棄。

- [ ] **Step 5: 舊的沒有動**

舌尖中音島的試煉洞窟跟以前一模一樣。舊存檔如果停在回音洞窟裡，載入後會回到洞窟起點。

- [ ] **Step 6: 不滿意的話換種子**

編輯 `tools/gen-dungeon.mjs` 裡 `FLOORS` 的 `seed`，重跑 `node tools/gen-dungeon.mjs`，再跑測試；測試過了就是另一座新的迷宮。

---

## Self-Review

- **只重做回音洞窟、試煉洞窟不動**：Task 2 只換 `gc1`／`gc2`；Global Constraints 與 Task 2 Step 6 明確要求 `dc1`／`dc2` 與 `tests/dungeon.test.ts` 完全不改。
- **31×22、2 格寬通道、岔路與捷徑**：Task 1（座標約定、遞迴回溯＋braid）與測試。
- **一把鑰匙＋鎖門、機關＋石牆、隱藏房間、寶箱、怪物**：Task 1 演算法第 5～11 步與結構測試。
- **一定解得開（`reachReport`）**：Task 1 的結構測試（鑰匙／開關在鎖前面、終點被鎖擋住、全部打開後連通）＋ Task 2 的 `reachReport` 驗證與「少了招式就走不到」的反向測試。
- **固定種子可重現、換種子重產**：Task 1（確定性測試）、Task 2（`mazes.ts` 與產生器同步測試、換種子的說明）。
- **舊存檔不會卡在牆裡**：Task 2 Step 4。
- **端對端不再寫死座標**：Task 3。
- **未涵蓋**：試煉洞窟的重做、怪物島 B、迷宮編輯器。

型別一致性：`FloorConfig`／`Floor`／`FloorObject`／`Role` 在 Task 1 的 `.d.mts` 定義，Task 2 的 `mazes.ts`、`mazeObjects` 使用；物件 id（`up`、`down`、`door`、`chest_key`、`barrier1`、`switch1`、`rock_h`、`chest_h`、`chest_1…`、`boss`、`chest_boss`、`mon1…`）在 Task 2 的 `mazeObjects` 定義，Task 2 的測試與 Task 3 的端對端使用；旗標 `k:gc1:door`、`r:gc1:rock_h`、`c:gc1:chest_h`、`g:gc2:switch1`、`boss_g` 由遊戲既有規則決定。
