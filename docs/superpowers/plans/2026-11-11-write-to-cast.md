# 寫字施法（用手指寫出 ㄅ 才能打碎石頭）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 玩家要用手指（或滑鼠）在畫面上照筆順描出 ㄅ，寫完之後，裂石才會被爆破拳打碎。

**Architecture:** 筆順資料放在 `src/data/strokes.ts`；判定規則是不依賴畫面的純函式（`src/core/strokes.ts`），用 Vitest 測。畫布用彈窗＋ `<canvas>` ＋ Pointer Events 做在 `src/core/ui.ts`（跟現有商店、世界地圖同一種彈窗做法）。World 的裂石互動在出招前先等這個畫布。家長設定加開關。

**Tech Stack:** TypeScript、Vite、Phaser 3.80（只有 World 場景會用到結果）、Vitest、Playwright（端對端）。

來源規格：`docs/superpowers/specs/2026-11-11-write-to-cast-design.md`。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- **ㄅ 是一筆寫完**（讀自使用者提供的筆順圖）：`(31,14) → (19,40) → (78,31) → (76,50) → (66,72) → (55,86) → (49,87)`，座標為 0～100 的近似值。
- 判定：目標筆畫每約 8 單位取一個關鍵點（含起點、終點）；孩子的軌跡補點到每約 2 單位；軌跡依序走到「下一個關鍵點」14 單位內就算經過；全部依序經過才算這一畫完成。方向反了、切轉角、只寫一半都不能算完成。
- 寫錯沒有任何懲罰，可以無限次重來；畫面有「先不要」，回到地圖、石頭還在。
- 家長設定「寫字挑戰」預設**開**；關掉時行為跟現在完全一樣（點石頭就打碎）。
- 範圍只有兩顆裂石（`rock_a`、`rock_b`）、符號只有 ㄅ；其他機關不動。
- 還沒學會爆破拳時，維持現在「需要很強的拳頭」的說明，不開畫布。
- 任何 `say()` / modal 都會增減 `ui.blocking`，新增流程務必成對：畫布彈窗所有結束路徑（寫完、先不要）都必須 `closeModal()`，而且只能關一次。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本（在這台機器會卡住）；測試用 `npx vitest run`。
- 只在使用者明確要求時才 push。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差，不要寫成其他模型名稱）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 工作目錄乾淨、在 `main`。執行者先開分支：`git switch -c write-to-cast`。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/data/strokes.ts` | 新增 | 筆順資料 `STROKES` |
| `src/core/strokes.ts` | 新增 | 純函式：`sampleStroke`、`densify`、`strokeProgress`、`strokeDone` |
| `tests/strokes.test.ts` | 新增 | 判定規則、資料驗證、設定預設值 |
| `src/core/ui.ts` | 修改 | `openWriteSymbol()` 寫字畫布、家長設定開關 |
| `src/core/save.ts` | 修改 | `Settings.writeChallenge`（預設 `true`） |
| `src/data/maps.ts` | 修改 | `MapObj.write?`、兩顆裂石設 `write: 'ㄅ'` |
| `src/scenes/World.ts` | 修改 | 裂石互動先等寫字畫布 |
| `tests/e2e/play.mjs` | 修改 | 預設關掉寫字挑戰；對村裡的裂石開啟並用滑鼠描 ㄅ |

---

### Task 1: 筆順資料與判定規則（純邏輯）

**Files:**
- Create: `src/data/strokes.ts`
- Create: `src/core/strokes.ts`
- Create: `tests/strokes.test.ts`

**Interfaces:**
- Produces（Task 2 會用）：
  ```ts
  // src/data/strokes.ts
  export type StrokePoint = [number, number];
  export interface StrokeDef { points: StrokePoint[] }
  export const STROKES: Record<string, StrokeDef[]>;       // 目前只有 'ㄅ'

  // src/core/strokes.ts
  export interface Pt { x: number; y: number }
  export const SAMPLE_STEP = 8, DENSE_STEP = 2, TOLERANCE = 14;
  export function sampleStroke(points: StrokePoint[], step?: number): Pt[];
  export function densify(trail: Pt[], step?: number): Pt[];
  export function strokeProgress(trail: Pt[], target: Pt[], tol?: number): number;   // 0..1
  export function strokeDone(trail: Pt[], target: Pt[], tol?: number): boolean;
  ```

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/strokes.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { STROKES } from '../src/data/strokes';
import type { StrokePoint } from '../src/data/strokes';
import { DENSE_STEP, SAMPLE_STEP, TOLERANCE, densify, sampleStroke, strokeDone, strokeProgress } from '../src/core/strokes';
import { ALL_SYMBOLS } from '../src/data/symbols';

const BO: StrokePoint[] = STROKES['ㄅ'][0].points;
const target = sampleStroke(BO);
/** 模擬孩子畫的線：沿著這條折線每 3 單位一個點，可整體偏移 */
const trace = (pts: StrokePoint[], dx = 0, dy = 0) => sampleStroke(pts, 3).map((p) => ({ x: p.x + dx, y: p.y + dy }));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('筆順資料', () => {
  it('ㄅ 是一筆，路徑照圖：起點在左上、終點在中下', () => {
    expect(STROKES['ㄅ']).toHaveLength(1);
    expect(BO[0]).toEqual([31, 14]);
    expect(BO[BO.length - 1]).toEqual([49, 87]);
  });
  it('每個有筆順的符號都是已知的注音，每一畫至少 2 個點，座標在 0～100 內', () => {
    for (const [ch, strokes] of Object.entries(STROKES)) {
      expect(ALL_SYMBOLS.includes(ch), ch).toBe(true);
      for (const s of strokes) {
        expect(s.points.length).toBeGreaterThanOrEqual(2);
        for (const [x, y] of s.points) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(100); }
      }
    }
  });
});

describe('sampleStroke：沿折線取關鍵點', () => {
  it('包含起點與終點', () => {
    expect(target[0]).toEqual({ x: 31, y: 14 });
    expect(target[target.length - 1]).toEqual({ x: 49, y: 87 });
  });
  it('相鄰兩點的距離不超過 SAMPLE_STEP', () => {
    for (let i = 1; i < target.length; i++) expect(dist(target[i - 1], target[i])).toBeLessThanOrEqual(SAMPLE_STEP + 0.01);
  });
  it('一條 20 單位的直線、每 8 單位取點：0、8、16、20', () => {
    expect(sampleStroke([[0, 0], [20, 0]]).map((p) => p.x)).toEqual([0, 8, 16, 20]);
  });
});

describe('densify：補點避免手指太快跳過關鍵點', () => {
  it('相鄰兩點不超過 DENSE_STEP，首尾不變', () => {
    const d = densify([{ x: 0, y: 0 }, { x: 30, y: 0 }]);
    expect(d[0]).toEqual({ x: 0, y: 0 });
    expect(d[d.length - 1]).toEqual({ x: 30, y: 0 });
    for (let i = 1; i < d.length; i++) expect(dist(d[i - 1], d[i])).toBeLessThanOrEqual(DENSE_STEP + 0.01);
  });
  it('少於 2 個點原樣回傳', () => {
    expect(densify([])).toEqual([]);
    expect(densify([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
  });
});

describe('strokeProgress / strokeDone：判定 ㄅ', () => {
  it('完全照著描：完成', () => {
    expect(strokeProgress(trace(BO), target)).toBe(1);
    expect(strokeDone(trace(BO), target)).toBe(true);
  });
  it('整體歪一點（偏 6、-5，約 7.8 單位，在容許範圍內）：仍然完成', () => {
    expect(strokeDone(trace(BO, 6, -5), target)).toBe(true);
  });
  it(`整體偏很多（偏 20、20，超過容許 ${TOLERANCE}）：不算完成`, () => {
    expect(strokeDone(trace(BO, 20, 20), target)).toBe(false);
  });
  it('方向反了（從終點寫回起點）：不算完成', () => {
    expect(strokeDone(trace([...BO].reverse() as StrokePoint[]), target)).toBe(false);
  });
  it('切轉角（從起點直接劃到右上角，跳過左下的轉角）：不算完成', () => {
    const cut: StrokePoint[] = [BO[0], BO[2], BO[3], BO[4], BO[5], BO[6]];
    expect(strokeDone(trace(cut), target)).toBe(false);
  });
  it('只寫一半：進度在 0 和 1 之間', () => {
    const half = strokeProgress(trace(BO.slice(0, 3)), target);
    expect(half).toBeGreaterThan(0.2);
    expect(half).toBeLessThan(1);
  });
  it('沒有軌跡：進度 0', () => {
    expect(strokeProgress([], target)).toBe(0);
  });
  it('手指移動很快、只有稀疏的幾個點（補點之後）仍可完成', () => {
    const sparse = BO.map(([x, y]) => ({ x, y }));
    expect(strokeDone(sparse, target)).toBe(true);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/strokes.test.ts`
Expected: FAIL，訊息類似 `Failed to resolve import "../src/data/strokes"`。

- [ ] **Step 3: 筆順資料**

建立 `src/data/strokes.ts`：

```ts
// 注音筆順資料。座標是 0～100 的方形畫布（左上角 0,0），每一畫是依序要經過的點。
// ㄅ 一筆寫完：從左上起點往左下斜寫，轉角後水平往右，到右上角再轉彎往下彎、最後勾向左下。
// 數值是照筆順圖量的近似值，畫布上的虛線與箭頭若不順，改這裡的座標即可。
export type StrokePoint = [number, number];
export interface StrokeDef { points: StrokePoint[] }

export const STROKES: Record<string, StrokeDef[]> = {
  'ㄅ': [{ points: [[31, 14], [19, 40], [78, 31], [76, 50], [66, 72], [55, 86], [49, 87]] }],
};
```

- [ ] **Step 4: 判定規則**

建立 `src/core/strokes.ts`：

```ts
// 寫字判定（純函式，不依賴 Phaser 或 DOM，可直接用 Vitest 測）。
// 做法：把目標筆畫取成一串關鍵點；孩子畫的軌跡補點之後，依序走訪，
// 每次軌跡離「下一個關鍵點」夠近就算經過；全部依序經過才算這一畫完成。
import type { StrokePoint } from '../data/strokes';

export interface Pt { x: number; y: number }

/** 目標筆畫每隔多少單位取一個關鍵點 */
export const SAMPLE_STEP = 8;
/** 孩子的軌跡補點到每隔多少單位一個 */
export const DENSE_STEP = 2;
/** 軌跡離關鍵點多近（單位）才算經過 */
export const TOLERANCE = 14;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** 沿折線每 step 單位取一個點，一定包含起點與終點。 */
export function sampleStroke(points: StrokePoint[], step = SAMPLE_STEP): Pt[] {
  const out: Pt[] = [{ x: points[0][0], y: points[0][1] }];
  let carry = 0; // 距離上一個取樣點已經走了多長
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = step - carry;
    while (d <= len) {
      const t = d / len;
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t });
      d += step;
    }
    carry = len - (d - step);
  }
  const last = points[points.length - 1];
  if (dist(out[out.length - 1], { x: last[0], y: last[1] }) > 0.001) out.push({ x: last[0], y: last[1] });
  return out;
}

/** 在相鄰兩點之間補點，讓手指移動太快時不會跳過關鍵點。 */
export function densify(trail: Pt[], step = DENSE_STEP): Pt[] {
  if (trail.length < 2) return trail.slice();
  const out: Pt[] = [trail[0]];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i];
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/** 軌跡依序經過了多少比例的關鍵點（0～1）。1 代表這一畫寫完了。 */
export function strokeProgress(trail: Pt[], target: Pt[], tol = TOLERANCE): number {
  if (!target.length) return 0;
  let i = 0;
  for (const p of densify(trail)) {
    while (i < target.length && dist(p, target[i]) <= tol) i++;
    if (i >= target.length) break;
  }
  return i / target.length;
}

export const strokeDone = (trail: Pt[], target: Pt[], tol = TOLERANCE): boolean => strokeProgress(trail, target, tol) >= 1;
```

- [ ] **Step 5: 執行，確認通過**

Run: `npx vitest run tests/strokes.test.ts`
Expected: 全部 PASS（約 14 個）。如果「切轉角」或「方向反了」失敗，先確認它們為什麼沒有被擋下（印出 `strokeProgress` 的值），不要放寬或改掉測試；判定規則不達標時要回頭調整 `TOLERANCE` 或取樣，並在報告裡說明。

- [ ] **Step 6: 型別檢查與完整測試**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add src/data/strokes.ts src/core/strokes.ts tests/strokes.test.ts
git commit -m "新增注音筆順資料（ㄅ）與寫字判定規則

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 寫字畫布、設定開關、裂石資料與 World 整合

**Files:**
- Modify: `src/core/ui.ts`（`openWriteSymbol`、家長設定開關、import）
- Modify: `src/core/save.ts`（`Settings.writeChallenge`）
- Modify: `src/data/maps.ts`（`MapObj.write`、兩顆裂石）
- Modify: `src/scenes/World.ts`（import、裂石互動）
- Test: `tests/strokes.test.ts`（加資料驗證）

**Interfaces:**
- Consumes: Task 1 的 `STROKES`、`sampleStroke`、`strokeDone`、`Pt`
- Produces: `openWriteSymbol(symbol: string): Promise<boolean>`（寫完回傳 `true`，「先不要」回傳 `false`；沒有該符號的筆順資料時直接回傳 `true`）；`MapObj.write?: string`；`Settings.writeChallenge: boolean`

- [ ] **Step 1: 寫會失敗的測試（資料驗證與設定預設值）**

在 `tests/strokes.test.ts` 最上面的 import 區加兩行：

```ts
import { MAPS } from '../src/data/maps';
import { defaultSettings } from '../src/core/save';
```

檔尾加：

```ts
describe('寫字挑戰的資料', () => {
  it('兩顆裂石都要求寫 ㄅ，且 ㄅ 有筆順資料', () => {
    const rocks = Object.values(MAPS).flatMap((m) => m.objects.filter((o) => o.kind === 'rock').map((o) => ({ map: m.id, o })));
    expect(rocks.map((r) => r.o.id).sort()).toEqual(['rock_a', 'rock_b']);
    for (const { map, o } of rocks) {
      expect(o.write, `${map}/${o.id}`).toBe('ㄅ');
      expect(STROKES[o.write!], `${map}/${o.id}`).toBeDefined();
    }
  });
  it('只有裂石會要求寫字（其他機關這次不動）', () => {
    for (const m of Object.values(MAPS)) for (const o of m.objects) if (o.write) expect(o.kind, `${m.id}/${o.id}`).toBe('rock');
  });
  it('「寫字挑戰」設定預設開', () => {
    expect(defaultSettings().writeChallenge).toBe(true);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/strokes.test.ts`
Expected: FAIL（`write` / `writeChallenge` 型別不存在，或裂石還沒有 `write`）。

- [ ] **Step 3: 資料欄位與設定**

在 `src/data/maps.ts` 的 `MapObj` 介面裡，`patrol?: ...;` 那一行後面加：

```ts
  /** rock：要先用手指照筆順寫出這個注音，才會出招打碎（要有 STROKES 資料） */
  write?: string;
```

把兩顆裂石：

```ts
      { id: 'rock_a', kind: 'rock', x: 23, y: 4 },
```
改成
```ts
      { id: 'rock_a', kind: 'rock', x: 23, y: 4, write: 'ㄅ' },
```

```ts
    { id: 'rock_b', kind: 'rock', x: 10, y: 11 },
```
改成
```ts
    { id: 'rock_b', kind: 'rock', x: 10, y: 11, write: 'ㄅ' },
```

在 `src/core/save.ts` 的 `Settings` 介面裡，`monstersMove: boolean;` 後面加：

```ts
  /** 要先用手指寫出注音，裂石才會被打碎（比較小的孩子可以關掉） */
  writeChallenge: boolean;
```

在 `defaultSettings` 裡，`monstersMove: true,` 後面加：

```ts
  writeChallenge: true,
```

（`loadSettings` 先建預設值再蓋上存起來的設定，所以舊設定檔沒有這個欄位時自動是 `true`。）

在 `src/core/ui.ts` 的家長設定 HTML 裡，找到這一行：

```ts
    <div class="row">怪物會在地圖上走動（比較小的孩子可以關掉） ${sw('monstersMove', s.monstersMove)}</div>
```

在它後面加：

```ts
    <div class="row">用手指寫出注音才能打碎石頭（比較小的孩子可以關掉） ${sw('writeChallenge', s.writeChallenge)}</div>
```

- [ ] **Step 4: 寫字畫布 `openWriteSymbol`**

在 `src/core/ui.ts` 的 import 區（`import { statOf } from './learning';` 附近）加：

```ts
import { STROKES } from '../data/strokes';
import { sampleStroke, strokeDone } from './strokes';
import type { Pt } from './strokes';
```

在 `openWorldMap()` 函式**後面**（`// ───── 夥伴 ─────` 之前）加：

```ts
/**
 * 寫字：照著虛線描出注音（每一畫要依序經過關鍵點才算過）。
 * 全部寫完回傳 true；按「先不要」回傳 false。沒有這個符號的筆順資料時不擋，直接回傳 true。
 */
export function openWriteSymbol(symbol: string): Promise<boolean> {
  const strokes = STROKES[symbol];
  if (!strokes?.length) return Promise.resolve(true);
  return new Promise((resolve) => {
    const SIZE = Math.max(220, Math.min(360, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.6)));
    const m = openModal(`<h2>✍️ 寫出「${symbol}」</h2><p id="wmsg" style="min-height:1.5em">照著箭頭，從圓點開始描一描。</p>
      <div style="display:flex;justify-content:center"><canvas id="writecv" width="${SIZE}" height="${SIZE}" style="width:${SIZE}px;height:${SIZE}px;touch-action:none;background:#fffaf0;border:4px solid var(--ink);border-radius:14px"></canvas></div>
      <div class="foot" style="justify-content:center"><button class="btn small" data-a="no">先不要</button></div>`);
    audio.speak(`照著箭頭，把${symbol}寫出來`);
    const cv = m.querySelector<HTMLCanvasElement>('#writecv')!;
    const ctx = cv.getContext('2d')!;
    const msg = (t: string) => { m.querySelector('#wmsg')!.textContent = t; };
    const px = (v: number) => (v / 100) * SIZE;
    const targets = strokes.map((s) => sampleStroke(s.points));
    let cur = 0; // 目前要寫第幾畫
    let trail: Pt[] = [];
    let drawing = false;
    let closed = false;
    const close = (ok: boolean) => { if (closed) return; closed = true; closeModal(); resolve(ok); };

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = 'rgba(43,33,64,.10)'; ctx.font = `bold ${SIZE * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(symbol, SIZE / 2, SIZE / 2 + SIZE * 0.04);
      ctx.lineWidth = SIZE * 0.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokes.forEach((s, i) => {
        const done = i < cur;
        ctx.setLineDash(done ? [] : [SIZE * 0.02, SIZE * 0.035]);
        ctx.strokeStyle = done ? '#2fa84f' : i === cur ? '#8a7aa8' : '#cfc6dd';
        ctx.beginPath();
        s.points.forEach(([x, y], k) => (k ? ctx.lineTo(px(x), px(y)) : ctx.moveTo(px(x), px(y))));
        ctx.stroke();
      });
      ctx.setLineDash([]);
      // 每一畫：起點圓點（含順序數字）與終點箭頭
      strokes.forEach((s, i) => {
        const [sx, sy] = s.points[0];
        ctx.fillStyle = i < cur ? '#2fa84f' : '#ff8a3a';
        ctx.beginPath(); ctx.arc(px(sx), px(sy), SIZE * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${SIZE * 0.06}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), px(sx), px(sy) + 1);
        const [ex, ey] = s.points[s.points.length - 1];
        const [bx, by] = s.points[s.points.length - 2];
        const ang = Math.atan2(ey - by, ex - bx);
        const L = SIZE * 0.06;
        ctx.fillStyle = i < cur ? '#2fa84f' : '#8a7aa8';
        ctx.beginPath();
        ctx.moveTo(px(ex) + Math.cos(ang) * L, px(ey) + Math.sin(ang) * L);
        ctx.lineTo(px(ex) + Math.cos(ang + 2.5) * L, px(ey) + Math.sin(ang + 2.5) * L);
        ctx.lineTo(px(ex) + Math.cos(ang - 2.5) * L, px(ey) + Math.sin(ang - 2.5) * L);
        ctx.closePath(); ctx.fill();
      });
      // 孩子畫的線
      if (trail.length > 1) {
        ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = SIZE * 0.045;
        ctx.beginPath();
        trail.forEach((p, k) => (k ? ctx.lineTo(px(p.x), px(p.y)) : ctx.moveTo(px(p.x), px(p.y))));
        ctx.stroke();
      }
    };

    const toUnit = (e: PointerEvent): Pt => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
    };
    cv.onpointerdown = (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; trail = [toUnit(e)]; draw(); };
    cv.onpointermove = (e) => { if (!drawing) return; trail.push(toUnit(e)); draw(); };
    const finish = () => {
      if (!drawing) return;
      drawing = false;
      if (strokeDone(trail, targets[cur])) {
        cur++; trail = [];
        if (cur >= strokes.length) {
          draw(); audio.sfx('correct'); msg('寫好了！');
          m.querySelector<HTMLButtonElement>('[data-a=no]')!.disabled = true; // 已經寫完：不能再取消
          setTimeout(() => close(true), G.settings.reduceMotion ? 350 : 700);
          return;
        }
        audio.sfx('hint'); msg('好棒！換下一畫。');
      } else {
        trail = []; audio.sfx('wrong'); msg('再試一次，從圓點開始喔！');
      }
      draw();
    };
    cv.onpointerup = finish;
    cv.onpointercancel = finish;
    delegate(m, (a) => { if (a === 'no') { audio.sfx('tap'); audio.stopSpeech(); close(false); } });
    draw();
  });
}
```

- [ ] **Step 5: World 的裂石互動**

在 `src/scenes/World.ts` 的 import 區，把

```ts
import { choose, openParty, openResults, openSettings, openShop, openWorldMap, say, setHudInfo, toast, ui } from '../core/ui';
```
改成
```ts
import { choose, openParty, openResults, openSettings, openShop, openWorldMap, openWriteSymbol, say, setHudInfo, toast, ui } from '../core/ui';
```

在 `interact()` 裡找到

```ts
      case 'rock':
        if (!hasAbility('blast')) return say(STORY.rockLocked);
        await this.breakRock(o);
```
改成
```ts
      case 'rock':
        if (!hasAbility('blast')) return say(STORY.rockLocked);
        // 要先用手指照筆順寫出注音才會出招；「先不要」就什麼都不發生（石頭還在）
        if (d.write && G.settings.writeChallenge && !(await openWriteSymbol(d.write))) return;
        await this.breakRock(o);
```

- [ ] **Step 6: 執行測試、型別檢查、打包**

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 7: Commit**

```bash
git add src/core/ui.ts src/core/save.ts src/data/maps.ts src/scenes/World.ts tests/strokes.test.ts
git commit -m "寫字施法：用手指照筆順寫出 ㄅ，裂石才會被打碎（可在家長設定關閉）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 端對端測試調整

**Files:**
- Modify: `tests/e2e/play.mjs`

**Interfaces:**
- Consumes: Task 2 的寫字畫布（`#writecv`）、`G.settings.writeChallenge`

機器人預設會被寫字畫布擋住（它不會寫字），所以預設關掉；另外對村裡的裂石開啟，並用滑鼠依筆順拖曳，真實驗證畫布與判定。這個 Task 只改測試腳本；端對端很吃資源，**由控制端決定這一輪要不要跑**，沒跑的話在回報裡寫明。

- [ ] **Step 1: 預設關掉寫字挑戰**

在 `tests/e2e/play.mjs` 找到

```js
await ev(() => { window.__game.G.settings.monstersMove = false; }); // 機器人用座標點擊走路：怪物不動，流程才穩定
```
改成
```js
await ev(() => { const s = window.__game.G.settings; s.monstersMove = false; s.writeChallenge = false; }); // 機器人用座標點擊走路：怪物不動、也不用寫字，流程才穩定
```

- [ ] **Step 2: 村裡的裂石改成真的用滑鼠寫 ㄅ**

找到這一行（村裡裂石與隱藏寶箱）：

```js
await doTap(23, 4, '村裡裂石'); await doTap(23, 3, '隱藏寶箱');
```
改成：

```js
// ───── 寫字施法：開啟寫字挑戰，用滑鼠依筆順描出 ㄅ，石頭才會碎 ─────
await ev(() => { window.__game.G.settings.writeChallenge = true; });
await tapTile(23, 4); // 走到石頭旁並點它。不能用 doTap：寫字畫布開著時不會自己結束，doTap 會一直等
await page.waitForSelector('#writecv');
await snap('write-overlay');
const box = await page.locator('#writecv').boundingBox();
const BO = [[31, 14], [19, 40], [78, 31], [76, 50], [66, 72], [55, 86], [49, 87]]; // 與 src/data/strokes.ts 的 ㄅ 相同
const at = ([x, y]) => [box.x + (x / 100) * box.width, box.y + (y / 100) * box.height];
// 先故意寫錯（隨便劃一條短線）：畫布不該關閉，也不該打碎石頭
await page.mouse.move(...at([20, 80])); await page.mouse.down(); await page.mouse.move(...at([30, 85])); await page.mouse.up();
if (!(await page.locator('#writecv').count())) throw new Error('寫錯了畫布不該關閉');
if ((await flags())['r:village:rock_a']) throw new Error('寫錯了石頭不該碎');
// 再照筆順描一次
await page.mouse.move(...at(BO[0])); await page.mouse.down();
for (let i = 1; i < BO.length; i++) for (let k = 1; k <= 6; k++) {
  const [ax, ay] = BO[i - 1], [bx, by] = BO[i];
  await page.mouse.move(...at([ax + ((bx - ax) * k) / 6, ay + ((by - ay) * k) / 6]));
}
await page.mouse.up();
await pump(() => ev(() => !!window.__game.G.save.flags['r:village:rock_a']), '寫完 ㄅ 後石頭碎掉');
await pump(idle, '石頭碎掉之後的對話'); // 旗標一設好 pump 就會回來，但「碎石四散」的對話還開著，要先按掉才能繼續點地面
await snap('write-done');
log('✓ 寫字施法：寫錯不會碎，照筆順描出 ㄅ 後石頭碎了');
await ev(() => { window.__game.G.settings.writeChallenge = false; }); // 後面的流程維持機器人點擊
await doTap(23, 3, '隱藏寶箱');
```

（如果 `tapTile` 之後主角還在走路，`waitForSelector('#writecv')` 會等到畫布出現；預設逾時 30 秒，若這台機器太慢可在呼叫時加 `{ timeout: 60000 }`。）

- [ ] **Step 3: 檢查腳本語法**

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出（語法正確）。

端對端（`npm run build`、`npx vite preview --port 5190 --host 127.0.0.1` 開背景，再 `STARTER=momo node tests/e2e/play.mjs http://127.0.0.1:5190/ e2e-shots`）由控制端決定是否執行。

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/play.mjs
git commit -m "端對端：預設關閉寫字挑戰，村裡裂石改用滑鼠依筆順描 ㄅ

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 手動確認清單（由使用者或控制端在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 開發環境**

Run: `npm run dev`；進村子，打完練習戰學會爆破拳，走到村子右上角的裂石（或用主控台把 `__game.G.save.abilities.push('blast')`）。

- [ ] **Step 2: 畫布外觀**

Expected：點裂石後出現「寫出「ㄅ」」畫布：淡淡的 ㄅ、灰紫色虛線、橘色起點圓點（寫著 1）、終點箭頭；畫布在手機寬度也放得下。**請特別看虛線的形狀像不像你給的筆順圖**；不順的話告訴我，只要調 `src/data/strokes.ts` 的幾個座標。

- [ ] **Step 3: 描對與描錯**

Expected：照著描完 → 線變綠、播放答對音效、畫布關閉、石頭碎掉（跟以前一樣）。亂畫、方向反、只寫一半 → 線清掉、柔和的錯誤音、提示「再試一次，從圓點開始喔！」，可以一直重寫，沒有任何懲罰。

- [ ] **Step 4: 先不要**

Expected：按「先不要」→ 畫布關閉，石頭還在，之後再點可以再開。

- [ ] **Step 5: 觸控與滑鼠**

Expected：手機／平板用手指寫、電腦用滑鼠寫都可以；寫字時頁面不會被捲動。

- [ ] **Step 6: 家長設定**

Expected：家長設定把「用手指寫出注音才能打碎石頭」關掉 → 點石頭直接打碎，跟以前一樣。

- [ ] **Step 7: 沒學會爆破拳**

Expected：還沒學會爆破拳時點石頭，仍然是「需要很強的拳頭」的說明，不開畫布。

---

## Self-Review（對照規格）

- **照虛線描、依序經過關鍵點**：Task 1（`sampleStroke`、`densify`、`strokeProgress`、`strokeDone`）。
- **方向反、切轉角、只寫一半不算完成；稍微歪仍算完成**：Task 1 測試。
- **ㄅ 一筆、座標**：Task 1 Step 3 與測試。
- **畫布：淡字、虛線、起點圓點與數字、終點箭頭、語音提示**：Task 2 Step 4。
- **寫錯沒懲罰、可重來；先不要；寫完才出招**：Task 2 Step 4、Step 5。
- **只有裂石、只有 ㄅ**：Task 2 Step 3 與測試（只有 `rock` 有 `write`）。
- **家長設定開關、預設開、關掉行為不變**：Task 2 Step 3、5。
- **沒學會爆破拳不開畫布**：Task 2 Step 5（`hasAbility` 在前）。
- **`ui.blocking` 成對**：Task 2 Step 4 的 `close()` 只關一次，所有結束路徑都走它。
- **端對端**：Task 3。
- **未涵蓋（規格列為不在範圍）**：其他符號的筆順、其他機關要求寫字、示範筆順的小手指、手寫辨識。

型別一致性：`STROKES` / `StrokePoint` 在 Task 1 Step 3 定義，Task 1 的 `sampleStroke` 與 Task 2 的 `openWriteSymbol` 使用；`Pt`、`sampleStroke`、`strokeDone` 在 Task 1 Step 4 定義，Task 2 Step 4 使用；`MapObj.write`、`Settings.writeChallenge` 在 Task 2 Step 3 定義，Task 2 Step 5、Task 3 使用。
