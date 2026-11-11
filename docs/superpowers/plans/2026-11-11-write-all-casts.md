# 寫字施法擴充（所有障礙物與機關都要寫注音）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 所有要用招式處理的障礙物與機關（裂石、落葉、風車、鈴鐺、迷霧、大鼓、乾花、泡泡球、小水壩），執行前都要先用手指照筆順寫出該招式綁定的注音。

**Architecture:** 筆順資料補上 ㄆㄇㄈㄉㄊㄋㄌ（`src/data/strokes.ts`）。「要寫哪個字」不再寫在每個物件上，而是由物件需要的招式自動查出（`abilityOf(obj)` → `castSymbol(ability)`）。World 用一個 `castWrite(obj)` 方法在六種互動裡擋一道。寫字畫布與判定規則沿用上一個功能，不改。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest、Playwright（端對端）。

來源規格：`docs/superpowers/specs/2026-11-11-write-all-casts-design.md`（承接 `2026-11-11-write-to-cast-design.md`）。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- 寫字畫布、判定規則（取樣 8、補點 2、容許 14）、寫錯無懲罰、可「先不要」都**沿用現有實作，不要改**；不要改 `TOLERANCE`。
- 「寫字挑戰」設定仍是同一個開關，預設開；關掉時所有互動行為與寫字功能出現之前完全一樣。
- 範圍只有「用招式處理」的物件：`rock`、`leaves`、`windmill`、`bell`、`fog`，以及 `gimmick`（用它自己的 `ability`）。**木門（`woodgate`）、告示牌、NPC、戰鬥不要求寫字。**
- 筆畫數：ㄅ 1、ㄆ 2、ㄇ 2、ㄈ 2、ㄉ 2、ㄊ 3、ㄋ 1、ㄌ 2。座標是從使用者的筆順圖用眼睛估的近似值，**資料品質測試失敗時只調整座標，不要放寬或改掉測試**，並在報告裡寫明改了哪些點、為什麼。
- 任何 `say()` / modal 都會增減 `ui.blocking`，新增流程務必成對（寫字畫布已經處理好，這次只是更多地方呼叫它）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本（在這台機器會卡住）；測試用 `npx vitest run`。
- 端對端很慢，**不要在本機跑**；由控制端把分支 push 後交給 GitHub Actions。
- 只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差，不要寫成其他模型名稱）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 工作目錄乾淨、在 `main`。執行者先開分支：`git switch -c write-all-casts`。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/data/strokes.ts` | 修改 | 補 ㄆㄇㄈㄉㄊㄋㄌ 的筆順 |
| `src/data/maps.ts` | 修改 | 移除 `MapObj.write`；新增 `abilityOf(obj)` |
| `src/data/monsters.ts` | 修改 | 新增 `castSymbol(ability)` |
| `src/scenes/World.ts` | 修改 | `castWrite(obj)`；六種互動呼叫它 |
| `src/core/ui.ts` | 修改 | 設定列文字 |
| `src/main.ts` | 修改 | `__game` 加 `writeSymbol`、`STROKES` |
| `tests/strokes.test.ts` | 修改 | 全部筆順的品質測試、招式→注音對照、物件對照 |
| `tests/e2e/play.mjs` | 修改 | 鈴鐺（ㄇ，兩畫）改成真的用滑鼠寫 |

---

### Task 1: 補齊筆順資料與品質測試

**Files:**
- Modify: `src/data/strokes.ts`
- Modify: `tests/strokes.test.ts`

**Interfaces:**
- Consumes: 現有 `STROKES`、`sampleStroke`、`strokeDone`（`src/core/strokes.ts`）
- Produces: `STROKES` 新增 `'ㄆ' 'ㄇ' 'ㄈ' 'ㄉ' 'ㄊ' 'ㄋ' 'ㄌ'`（Task 2 的測試與執行時都會用）

- [ ] **Step 1: 寫會失敗的測試**

在 `tests/strokes.test.ts` 檔尾加（不要動既有測試；`trace`、`STROKES`、`sampleStroke`、`strokeDone` 這個檔案裡已經有）：

```ts
describe('全部筆順資料的品質', () => {
  const EXPECTED: Record<string, number> = { 'ㄅ': 1, 'ㄆ': 2, 'ㄇ': 2, 'ㄈ': 2, 'ㄉ': 2, 'ㄊ': 3, 'ㄋ': 1, 'ㄌ': 2 };
  it('有筆順的符號和筆畫數，照筆順圖', () => {
    expect(Object.keys(STROKES).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const [ch, n] of Object.entries(EXPECTED)) expect(STROKES[ch], ch).toHaveLength(n);
  });
  for (const [ch, strokes] of Object.entries(STROKES)) {
    it(`${ch}：每一畫照著描會過；方向反、或拿別畫來描，都不會過`, () => {
      const targets = strokes.map((s) => sampleStroke(s.points));
      strokes.forEach((s, i) => {
        expect(strokeDone(trace(s.points), targets[i]), `${ch} 第 ${i + 1} 畫`).toBe(true);
        expect(strokeDone(trace([...s.points].reverse() as StrokePoint[]), targets[i]), `${ch} 第 ${i + 1} 畫反向`).toBe(false);
        strokes.forEach((o, j) => {
          if (j !== i) expect(strokeDone(trace(o.points), targets[i]), `${ch} 用第 ${j + 1} 畫去描第 ${i + 1} 畫`).toBe(false);
        });
      });
    });
  }
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/strokes.test.ts`
Expected: FAIL（「有筆順的符號和筆畫數」失敗：目前只有 ㄅ）。

- [ ] **Step 3: 補筆順資料**

把 `src/data/strokes.ts` 裡的 `STROKES` 整個換成下面這個（檔案最上面的註解與 `StrokePoint`、`StrokeDef` 型別不變）：

```ts
export const STROKES: Record<string, StrokeDef[]> = {
  'ㄅ': [{ points: [[31, 14], [19, 40], [78, 31], [76, 50], [66, 72], [55, 86], [49, 87]] }],
  // ㄆ：①像 ㄅ 的上半，再從右端斜著往左下撇出去　②由左往右下斜
  'ㄆ': [
    { points: [[35, 13], [15, 34], [77, 31], [43, 64], [9, 91]] },
    { points: [[21, 51], [54, 72], [88, 92]] },
  ],
  // ㄇ：①左邊的直線　②上面橫過去再直直往下
  'ㄇ': [
    { points: [[17, 26], [19, 83]] },
    { points: [[29, 25], [86, 22], [86, 83]] },
  ],
  // ㄈ：①上面的橫　②左邊往下再橫過去
  'ㄈ': [
    { points: [[13, 24], [88, 22]] },
    { points: [[17, 34], [19, 79], [88, 82]] },
  ],
  // ㄉ：①像 ㄅ，最後勾向左下　②從裡面往左下撇
  'ㄉ': [
    { points: [[25, 14], [8, 36], [71, 32], [76, 53], [58, 79], [44, 86]] },
    { points: [[40, 44], [25, 64], [11, 83]] },
  ],
  // ㄊ：①斜著往下再往右勾　②橫　③右下的小撇
  'ㄊ': [
    { points: [[48, 13], [36, 45], [22, 72], [26, 78], [62, 74]] },
    { points: [[9, 42], [50, 40], [91, 36]] },
    { points: [[66, 60], [80, 84]] },
  ],
  // ㄋ：一筆，橫、往左下折回、再橫、再往左下
  'ㄋ': [{ points: [[11, 17], [51, 14], [42, 34], [67, 38], [62, 58], [48, 76], [30, 86]] }],
  // ㄌ：①像 ㄅ，最後勾向左下　②從上面斜著往左下撇
  'ㄌ': [
    { points: [[20, 14], [7, 35], [82, 34], [78, 59], [61, 79], [45, 88]] },
    { points: [[53, 10], [32, 48], [11, 84]] },
  ],
};
```

- [ ] **Step 4: 執行，確認通過**

Run: `npx vitest run tests/strokes.test.ts`
Expected: 全部 PASS。如果品質測試失敗，訊息會指出是哪個符號的哪一畫、哪一種情況（例如「ㄊ 用第 1 畫去描第 3 畫」）：**只調整那幾個座標**（例如把兩畫的起點拉開），重跑直到通過；不要改測試、不要改 `TOLERANCE`；把每個調整記在報告裡。

- [ ] **Step 5: 型別檢查與完整測試**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/data/strokes.ts tests/strokes.test.ts
git commit -m "補齊 ㄆㄇㄈㄉㄊㄋㄌ 的筆順資料，加全部筆順的品質測試

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 由招式自動決定要寫的字，六種互動都要寫

**Files:**
- Modify: `src/data/maps.ts`（移除 `write`、新增 `abilityOf`）
- Modify: `src/data/monsters.ts`（`castSymbol`）
- Modify: `src/scenes/World.ts`（`castWrite` 與六種互動）
- Modify: `src/core/ui.ts`（設定列文字）
- Modify: `src/main.ts`（`__game`）
- Test: `tests/strokes.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `STROKES`；現有 `openWriteSymbol(symbol): Promise<boolean>`（`src/core/ui.ts`）
- Produces:
  ```ts
  // src/data/maps.ts
  export const abilityOf: (o: MapObj) => string | undefined;      // rock→'blast'、leaves/windmill→'gust'、bell→'hum'、fog→'fog'、gimmick→o.ability，其他 undefined
  // src/data/monsters.ts
  export function castSymbol(ability: string): string | undefined; // 'blast'→'ㄅ' …
  // src/scenes/World.ts（private）
  castWrite(d: MapObj): Promise<boolean>;
  // window.__game.writeSymbol(symbol) / window.__game.STROKES
  ```

- [ ] **Step 1: 寫會失敗的測試**

在 `tests/strokes.test.ts` 最上面的 import 區，把

```ts
import { MAPS } from '../src/data/maps';
```
改成
```ts
import { MAPS, abilityOf } from '../src/data/maps';
import { MOVES, castSymbol } from '../src/data/monsters';
```

把檔案裡的整個 `describe('寫字挑戰的資料', ...)` 區塊（含它裡面的三個 `it`）換成：

```ts
describe('招式互動物件要寫的注音（由招式自動決定）', () => {
  it('castSymbol：每一招綁定的注音', () => {
    expect(castSymbol('blast')).toBe('ㄅ');
    expect(castSymbol('gust')).toBe('ㄆ');
    expect(castSymbol('hum')).toBe('ㄇ');
    expect(castSymbol('fog')).toBe('ㄈ');
    expect(castSymbol('drum')).toBe('ㄉ');
    expect(castSymbol('splash')).toBe('ㄊ');
    expect(castSymbol('nasal')).toBe('ㄋ');
    expect(castSymbol('stream')).toBe('ㄌ');
    expect(castSymbol('nope')).toBeUndefined();
  });
  it('每個需要能力的招式，綁定的注音都有筆順資料', () => {
    for (const m of Object.values(MOVES)) {
      if (!m.needAbility) continue;
      const s = castSymbol(m.needAbility);
      expect(s, m.id).toBeDefined();
      expect(STROKES[s!], `${m.id} → ${s}`).toBeDefined();
    }
  });
  it('每個招式互動物件都對得上一個有筆順資料的注音', () => {
    const kinds = ['rock', 'leaves', 'windmill', 'bell', 'fog', 'gimmick'];
    let count = 0;
    for (const m of Object.values(MAPS)) {
      for (const o of m.objects.filter((x) => kinds.includes(x.kind))) {
        const ab = abilityOf(o);
        expect(ab, `${m.id}/${o.id}`).toBeDefined();
        const s = castSymbol(ab!);
        expect(s, `${m.id}/${o.id}`).toBeDefined();
        expect(STROKES[s!], `${m.id}/${o.id} → ${s}`).toBeDefined();
        count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(9); // 裂石 2、落葉、風車、鈴鐺、迷霧，加上島上 4 個機關物件
  });
  it('木門、告示牌、NPC 等不是招式互動物件：沒有對應招式', () => {
    for (const k of ['woodgate', 'sign', 'npc', 'chest', 'monster', 'dock'] as const) {
      expect(abilityOf({ id: 'x', kind: k, x: 0, y: 0 }), k).toBeUndefined();
    }
  });
  it('「寫字挑戰」設定預設開', () => {
    expect(defaultSettings().writeChallenge).toBe(true);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/strokes.test.ts`
Expected: FAIL（`abilityOf` / `castSymbol` 不存在）。

- [ ] **Step 3: `abilityOf` 與移除 `write`**

在 `src/data/maps.ts` 的 `MapObj` 介面裡，刪掉這兩行（註解加欄位）：

```ts
  /** rock：要先用手指照筆順寫出這個注音，才會出招打碎（要有 STROKES 資料） */
  write?: string;
```

把兩顆裂石：

```ts
      { id: 'rock_a', kind: 'rock', x: 23, y: 4, write: 'ㄅ' },
```
改回
```ts
      { id: 'rock_a', kind: 'rock', x: 23, y: 4 },
```

```ts
    { id: 'rock_b', kind: 'rock', x: 10, y: 11, write: 'ㄅ' },
```
改回
```ts
    { id: 'rock_b', kind: 'rock', x: 10, y: 11 },
```

在 `src/data/maps.ts` 裡 `export const BLOCKED_TILES = new Set(...)` 那一行**後面**加：

```ts

/** 招式互動物件固定需要的招式（障礙物：裂石、落葉、迷霧；機關：鈴鐺、風車）。機關物件 gimmick 看它自己的 ability。 */
const KIND_ABILITY: Partial<Record<ObjKind, string>> = { rock: 'blast', leaves: 'gust', windmill: 'gust', bell: 'hum', fog: 'fog' };
/** 這個物件要用哪一招處理；不是招式互動物件（木門、寶箱、NPC…）就是 undefined */
export const abilityOf = (o: MapObj): string | undefined => (o.kind === 'gimmick' ? o.ability : KIND_ABILITY[o.kind]);
```

- [ ] **Step 4: `castSymbol`**

在 `src/data/monsters.ts` 裡找到 `export const SPECIES: Record<string, SpeciesDef> = {` 整個物件結束的地方（`};` 之後、`/** 博士桌上的三隻初始夥伴 */` 之前），加：

```ts
/** 這個招式能力綁定的注音（用來決定要寫哪個字）；沒有綁定就是 undefined */
export function castSymbol(ability: string): string | undefined {
  return Object.values(MOVES).find((m) => m.needAbility === ability)?.symbol;
}
```

- [ ] **Step 5: World：`castWrite` 與六種互動**

在 `src/scenes/World.ts` 的 import 區：

把
```ts
import { BLOCKED_TILES, MAPS, TILE_KEY } from '../data/maps';
```
改成
```ts
import { BLOCKED_TILES, MAPS, TILE_KEY, abilityOf } from '../data/maps';
```

把
```ts
import { ENEMIES, ITEMS, SPECIES } from '../data/monsters';
```
改成
```ts
import { ENEMIES, ITEMS, SPECIES, castSymbol } from '../data/monsters';
import { STROKES } from '../data/strokes';
```

在 `private async useGimmick(o: Obj) {` 的**前面**加新方法：

```ts
  /**
   * 用招式之前先寫字：設定開、而且這個招式綁定的注音有筆順資料時，要先用手指寫出來。
   * 回傳 false（按了「先不要」）就什麼都不發生。要寫哪個字由招式決定：物件需要的招式 → 綁定的注音。
   */
  private async castWrite(d: MapObj): Promise<boolean> {
    if (!G.settings.writeChallenge) return true;
    const ability = abilityOf(d);
    const symbol = ability ? castSymbol(ability) : undefined;
    if (!symbol || !STROKES[symbol]) return true;
    return openWriteSymbol(symbol);
  }
```

在 `interact()` 的 `switch (d.kind)` 裡，把這幾段改成（只動有標註的行）：

裂石：把
```ts
        // 要先用手指照筆順寫出注音才會出招；「先不要」就什麼都不發生（石頭還在）
        if (d.write && G.settings.writeChallenge && !(await openWriteSymbol(d.write))) return;
```
改成
```ts
        if (!(await this.castWrite(d))) return; // 要先用手指照筆順寫出注音才會出招；「先不要」就什麼都不發生（石頭還在）
```

落葉：把
```ts
        if (!hasAbility('gust')) return say(STORY.leavesLocked);
        audio.sfx('wind');
```
改成
```ts
        if (!hasAbility('gust')) return say(STORY.leavesLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('wind');
```

風車：把
```ts
        if (!hasAbility('gust')) return say(STORY.windLocked);
        audio.sfx('wind');
```
改成
```ts
        if (!hasAbility('gust')) return say(STORY.windLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('wind');
```

鈴鐺：把
```ts
        if (!hasAbility('hum')) return say(STORY.bellLocked);
        audio.sfx('chest');
```
改成
```ts
        if (!hasAbility('hum')) return say(STORY.bellLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('chest');
```

迷霧：把
```ts
        if (!hasAbility('fog')) return say(STORY.fogLocked);
        audio.sfx('wind');
```
改成
```ts
        if (!hasAbility('fog')) return say(STORY.fogLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('wind');
```

機關物件（`useGimmick`）：把
```ts
    if (!hasAbility(d.ability!)) return say((d.lockText ?? []).map((text) => ({ text })));
    await this.gimmickFx(d.fx!, o.spr.x + 8, o.spr.y + 8);
```
改成
```ts
    if (!hasAbility(d.ability!)) return say((d.lockText ?? []).map((text) => ({ text })));
    if (!(await this.castWrite(d))) return;
    await this.gimmickFx(d.fx!, o.spr.x + 8, o.spr.y + 8);
```

（每個 anchor 都應該只出現一次；找不到或出現多次就停下來回報，不要猜。）

- [ ] **Step 6: 設定文字與測試後門**

在 `src/core/ui.ts` 把

```ts
    <div class="row">用手指寫出注音才能打碎石頭（比較小的孩子可以關掉） ${sw('writeChallenge', s.writeChallenge)}</div>
```
改成
```ts
    <div class="row">用手指寫出注音才能使用招式機關（比較小的孩子可以關掉） ${sw('writeChallenge', s.writeChallenge)}</div>
```

在 `src/main.ts`：把 import

```ts
import { applyBodyClasses, hooks, openSettings, setupHud, showHud, showTitle, ui } from './core/ui';
```
改成
```ts
import { applyBodyClasses, hooks, openSettings, openWriteSymbol, setupHud, showHud, showTitle, ui } from './core/ui';
import { STROKES } from './data/strokes';
```

把
```ts
(window as any).__game = { game, G, audio, world, ui, hasSave };
```
改成
```ts
// writeSymbol('ㄊ')：直接開那個注音的寫字畫布（檢查筆順用）；STROKES：筆順資料（端對端測試用它產生滑鼠軌跡）
(window as any).__game = { game, G, audio, world, ui, hasSave, writeSymbol: openWriteSymbol, STROKES };
```

- [ ] **Step 7: 型別檢查、測試、打包**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 8: Commit**

```bash
git add src/data/maps.ts src/data/monsters.ts src/scenes/World.ts src/core/ui.ts src/main.ts tests/strokes.test.ts
git commit -m "所有障礙物與機關都要先寫出對應的注音（由招式自動決定要寫哪個字）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 端對端：鈴鐺（ㄇ，兩畫）改成真的用滑鼠寫

**Files:**
- Modify: `tests/e2e/play.mjs`

**Interfaces:**
- Consumes: Task 2 的 `window.__game.STROKES`、`G.settings.writeChallenge`

機器人預設把寫字挑戰關掉（已經是這樣）。這個 Task 讓**鈴鐺**真的用滑鼠依筆順寫 ㄇ（兩畫），驗證多筆畫流程。端對端**不在本機跑**，由控制端交給 GitHub Actions。

- [ ] **Step 1: 改鈴鐺那一步**

在 `tests/e2e/play.mjs` 找到這一行：

```js
await doTap(21, 7, '鈴鐺（哼哼波）'); await doTap(22, 8, '鈴鐺寶箱');
```

改成：

```js
// ───── 寫字施法（兩筆畫）：鈴鐺要先用滑鼠依筆順寫出 ㄇ ─────
await ev(() => { window.__game.G.settings.writeChallenge = true; });
await doTap(21, 6, '走到鈴鐺旁'); // 先走近，鈴鐺才在畫面內（(21,6) 必須是可以走的空格；不是的話改成鈴鐺旁邊另一個可走的格子）
await tapTile(21, 7);
await page.waitForSelector('#writecv');
await snap('write-bell');
const bellStrokes = await ev(() => window.__game.STROKES['ㄇ'].map((s) => s.points));
if (bellStrokes.length !== 2) throw new Error('ㄇ 應該是兩畫');
const wbox = await page.locator('#writecv').boundingBox();
const wat = ([x, y]) => [wbox.x + (x / 100) * wbox.width, wbox.y + (y / 100) * wbox.height];
for (const pts of bellStrokes) { // 每一畫：按下、依序經過各點（每段補 6 步）、放開
  await page.mouse.move(...wat(pts[0])); await page.mouse.down();
  for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 6; k++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    await page.mouse.move(...wat([ax + ((bx - ax) * k) / 6, ay + ((by - ay) * k) / 6]));
  }
  await page.mouse.up();
}
await pump(() => ev(() => !!window.__game.G.save.flags.bellRung), '寫完 ㄇ 後鈴鐺響了');
await pump(idle, '鈴鐺響了之後的對話'); // 旗標一設好 pump 就會回來，但對話還開著，要先按掉才能繼續點地面
await snap('write-bell-done');
log('✓ 寫字施法（兩筆畫）：照筆順寫出 ㄇ，鈴鐺響了');
await ev(() => { window.__game.G.settings.writeChallenge = false; }); // 後面的流程維持機器人點擊
await doTap(22, 8, '鈴鐺寶箱');
```

做這步之前，先用 Read 看 `src/data/maps.ts` 的起始村（`village` 的格子與物件）確認 `(21,6)` 是可以走的空格、沒有物件；不是的話選鈴鐺 `(21,7)` 旁邊另一個可走且沒有物件的格子，並同步改上面 `doTap(21, 6, ...)` 那行。

- [ ] **Step 2: 語法檢查**

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出。

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/play.mjs
git commit -m "端對端：鈴鐺改成真的用滑鼠依筆順寫出 ㄇ（兩畫）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 逐個看筆順是否像筆順圖**

Run: `npm run dev`，進遊戲後開主控台，逐個輸入：

```js
__game.writeSymbol('ㄆ')
__game.writeSymbol('ㄇ')
__game.writeSymbol('ㄈ')
__game.writeSymbol('ㄉ')
__game.writeSymbol('ㄊ')
__game.writeSymbol('ㄋ')
__game.writeSymbol('ㄌ')
```

Expected：每次都出現寫字畫布，畫面上的虛線、起點圓點（有 1、2、3 的順序數字）、終點箭頭，和筆順圖的**形狀、順序、方向**一致。座標是估的，不像的符號請告訴我是哪一個、哪裡不對（例如「ㄉ 最後的勾太短」），我只改座標。

- [ ] **Step 2: 實際玩一遍**

Expected：落葉、風車（寫 ㄆ）、鈴鐺（寫 ㄇ）、迷霧（寫 ㄈ）、島上的大鼓（ㄉ）、乾花（ㄊ）、泡泡球（ㄋ）、小水壩（ㄌ）、裂石（ㄅ），用招式前都會先出現寫字畫布；寫對才會出招，「先不要」就什麼都不發生。

- [ ] **Step 3: 家長設定**

Expected：關掉「用手指寫出注音才能使用招式機關」→ 所有物件都跟以前一樣直接觸發。

- [ ] **Step 4: 手機或平板**

Expected：兩筆畫、三筆畫的符號，手指離開再寫下一畫能正常接下去；交叉的筆畫（ㄆ、ㄊ、ㄌ）沒有問題。

---

## Self-Review（對照規格）

- **所有招式互動物件都要寫**：Task 2 Step 5（裂石、落葉、風車、鈴鐺、迷霧、機關物件六處）。
- **由招式自動決定要寫哪個字、移除 `write` 欄位**：Task 2 Step 3、4（`abilityOf`、`castSymbol`）。
- **筆順資料與筆畫數**：Task 1 Step 3，與測試 `EXPECTED`。
- **資料品質（照著描過、反向與別畫不過）**：Task 1 Step 1。
- **木門等不寫**：Task 2 測試「木門、告示牌、NPC 等不是招式互動物件」。
- **家長開關一個管全部、設定列文字**：Task 2 Step 6；`castWrite` 第一行檢查設定。
- **驗證用後門**：Task 2 Step 6（`__game.writeSymbol`、`__game.STROKES`）。
- **端對端多筆畫**：Task 3（鈴鐺 ㄇ）。
- **未涵蓋（規格列為不在範圍）**：其他 28 個符號的筆順、木門、NPC、戰鬥的寫字。

型別一致性：`STROKES` 的新增符號在 Task 1 定義，Task 2 的 `castWrite`、測試與 Task 3 使用；`abilityOf`（`maps.ts`）與 `castSymbol`（`monsters.ts`）在 Task 2 Step 3、4 定義，同一 Task 的 `castWrite` 與測試使用；`__game.STROKES`、`__game.writeSymbol` 在 Task 2 Step 6 定義，Task 3 與 Task 4 使用。
