# 世界地圖與碼頭（階段 1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出「主島」的概念：進入主島會被記錄、被打倒時送回最近的主島、主島有碼頭可以免費搭船到去過的其他主島。

**Architecture:** 純邏輯（去過哪些主島、被打倒送去哪、落腳位置）放在新的 `src/core/travel.ts`，不依賴 Phaser，用 Vitest 直接測。地圖資料新增 `hub`（主島資訊）與 `dock`（碼頭）物件；World 場景只負責在進入地圖時呼叫 `markArrival`、互動碼頭時開彈窗、被打倒時用 `defeatSpot`。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest。

來源規格：`docs/superpowers/specs/2026-11-11-level-structure-design.md`（本計畫是它的「階段 1」）。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- **第 0 關（起始村、村外小徑、風車草原）的玩法完全不動。** 起始村只多一個「主島」資訊和一個預設看不到的碼頭（`showIf: 'dockOpen'`，階段 4 才會打開這個旗標）。
- 旗標命名：去過的主島用 `visited:<mapId>`。
- 存檔格式不改版本號；新欄位 `homeMap` 是選填，舊存檔沒有時視為起始村。
- 任何 `say()` / modal 都會增減 `ui.blocking`，新增流程務必成對（曾因 `say([])` 例外造成地圖輸入鎖死）；`say([])` 空陣列會直接 resolve，不會增減。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本（在這台機器會卡住）；測試用 `npx vitest run`。
- 只在使用者明確要求時才 push。本計畫的每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件（開工前先確認）

工作目錄目前有**還沒 commit 的舌尖中音島、對話點任何地方下一頁等改動**，其中 `src/data/maps.ts`、`src/core/save.ts`、`src/core/ui.ts`、`src/scenes/World.ts`、`src/gfx/sprites.ts`、`src/data/levels.ts`、`tests/game.test.ts` 都包含這些改動。本計畫會再改同樣這些檔案。

- [ ] **Step 0: 請使用者決定先 commit 那些改動**

向使用者確認「先把目前未 commit 的內容整理成一個 commit」。得到同意後：

```bash
git add -A
git commit -m "舌尖中音島（ㄉㄊㄋㄌ）、對話點任何地方下一頁、答錯懲罰與端對端測試更新

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git status --short
```

Expected: `git status --short` 沒有輸出（工作目錄乾淨）。如果使用者不同意，之後每個 Task 的 commit 要改用 `git add -p` 只挑本計畫的片段。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/core/travel.ts` | 新增 | 純函式：`visitedHubs`、`dockSpot`、`defeatSpot`、`markArrival` |
| `tests/travel.test.ts` | 新增 | 上面四個函式與起始村資料的測試 |
| `src/data/maps.ts` | 修改 | `ObjKind` 加 `'dock'`、`MapDef` 加 `hub`、起始村加 `hub` 與碼頭物件 |
| `src/core/save.ts` | 修改 | `SaveData` 加選填欄位 `homeMap` |
| `src/data/levels.ts` | 修改 | `STORY.dockEmpty` |
| `src/gfx/sprites.ts` | 修改 | `dock` 圖 |
| `src/core/ui.ts` | 修改 | `openWorldMap()` 彈窗 |
| `src/scenes/World.ts` | 修改 | 進入地圖記錄、碼頭互動、被打倒送回主島 |

---

### Task 1: 純邏輯 `travel.ts` 與型別

**Files:**
- Create: `src/core/travel.ts`
- Create: `tests/travel.test.ts`
- Modify: `src/data/maps.ts`（`ObjKind`、`MapDef`）
- Modify: `src/core/save.ts`（`SaveData`）

**Interfaces:**
- Produces（後面的 Task 都會用）：
  ```ts
  export interface Spot { map: string; x: number; y: number }
  export function visitedHubs(flags: Record<string, boolean>, maps?: Record<string, MapDef>): MapDef[];
  export function dockSpot(m: MapDef): Spot;                       // m.hub 必須存在
  export function defeatSpot(homeMap: string | undefined, maps?: Record<string, MapDef>): Spot;
  export function markArrival(save: { flags: Record<string, boolean>; homeMap?: string }, m: MapDef): void;
  ```
  `MapDef.hub?: { dock: { x: number; y: number }; defeat?: { map: string; x: number; y: number } }`
  `SaveData.homeMap?: string`

- [ ] **Step 1: 先改型別（讓測試能編譯）**

在 `src/data/maps.ts` 第 2 行的 `ObjKind` 結尾加上 `| 'dock'`：

把
```ts
| 'woodgate' | 'bell' | 'fog' | 'gimmick';
```
改成
```ts
| 'woodgate' | 'bell' | 'fog' | 'gimmick' | 'dock';
```

在 `MapDef` 介面裡，`respawn: { x: number; y: number };` 後面加：

```ts
  /** 主島：有碼頭可以搭船。dock＝搭船抵達時落腳的格子；defeat＝被打倒時改送去別的地方（例如起始村送回自己的房間） */
  hub?: { dock: { x: number; y: number }; defeat?: { map: string; x: number; y: number } };
```

在 `src/core/save.ts` 的 `SaveData` 裡，`cleared: string[];` 後面加：

```ts
  /** 最近到過的主島；被打倒時送回這裡。舊存檔沒有時視為起始村 */
  homeMap?: string;
```

- [ ] **Step 2: 寫會失敗的測試**

建立 `tests/travel.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { defeatSpot, dockSpot, markArrival, visitedHubs } from '../src/core/travel';

// 用商店地圖當底，造出幾個假的主島與一個不是主島的迷宮，測試不用依賴之後才會做的真實內容
const fakeHub = (id: string, x = 4, y = 6): MapDef => ({ ...MAPS.shop, id, name: id, hub: { dock: { x, y } } });
const fakes: Record<string, MapDef> = {
  village: MAPS.village,
  isleA: fakeHub('isleA'),
  isleB: fakeHub('isleB', 3, 5),
  cave: { ...MAPS.shop, id: 'cave', name: 'cave' },
};

describe('visitedHubs：去過的主島', () => {
  it('沒去過任何主島就是空的', () => {
    expect(visitedHubs({}, fakes)).toEqual([]);
  });
  it('只列出有 visited 旗標的主島，順序依地圖資料', () => {
    const r = visitedHubs({ 'visited:isleB': true, 'visited:village': true }, fakes);
    expect(r.map((m) => m.id)).toEqual(['village', 'isleB']);
  });
  it('不是主島的地圖，就算有旗標也不列出', () => {
    expect(visitedHubs({ 'visited:cave': true }, fakes)).toEqual([]);
  });
});

describe('dockSpot：搭船抵達的位置', () => {
  it('落在主島設定的碼頭格', () => {
    expect(dockSpot(fakes.isleB)).toEqual({ map: 'isleB', x: 3, y: 5 });
  });
});

describe('defeatSpot：被打倒後送去哪', () => {
  it('沒去過任何主島：回起始村（起始村設定送回自己的房間）', () => {
    expect(defeatSpot(undefined)).toEqual({ map: 'room', x: 2, y: 3 });
  });
  it('最近的主島是 isleA：送到那座島的 respawn 位置', () => {
    const r = fakes.isleA.respawn;
    expect(defeatSpot('isleA', fakes)).toEqual({ map: 'isleA', x: r.x, y: r.y });
  });
  it('homeMap 不是主島或不存在：退回起始村的設定', () => {
    expect(defeatSpot('cave', fakes)).toEqual({ map: 'room', x: 2, y: 3 });
    expect(defeatSpot('nowhere', fakes)).toEqual({ map: 'room', x: 2, y: 3 });
  });
});

describe('markArrival：進入地圖時記錄', () => {
  it('進入主島：設 visited 旗標、更新 homeMap', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, fakes.isleA);
    expect(save.flags['visited:isleA']).toBe(true);
    expect(save.homeMap).toBe('isleA');
  });
  it('進入不是主島的地圖：什麼都不改', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: 'isleA' as string | undefined };
    markArrival(save, fakes.cave);
    expect(save.flags).toEqual({});
    expect(save.homeMap).toBe('isleA');
  });
});
```

注意：`defeatSpot(undefined)` 與起始村那兩個 expect 用的是真實的 `MAPS.village`，它要到 Task 2 才有 `hub` 資料。所以這個 Step 預期**這兩個**會失敗、其他也會因為模組不存在而失敗。

- [ ] **Step 3: 執行，確認失敗**

Run: `npx vitest run tests/travel.test.ts`
Expected: FAIL，訊息類似 `Failed to resolve import "../src/core/travel"`。

- [ ] **Step 4: 寫最小實作**

建立 `src/core/travel.ts`：

```ts
// 主島與搭船的純邏輯（不依賴 Phaser，可直接用 Vitest 測）。
import { MAPS } from '../data/maps';
import type { MapDef } from '../data/maps';

export interface Spot { map: string; x: number; y: number }

/** 去過的主島（依地圖資料的順序）。進入主島時 markArrival 會設旗標 visited:<mapId>。 */
export function visitedHubs(flags: Record<string, boolean>, maps: Record<string, MapDef> = MAPS): MapDef[] {
  return Object.values(maps).filter((m) => m.hub && flags[`visited:${m.id}`]);
}

/** 搭船到這座主島時，落腳在碼頭旁。m 必須是主島（有 hub）。 */
export function dockSpot(m: MapDef): Spot {
  return { map: m.id, x: m.hub!.dock.x, y: m.hub!.dock.y };
}

/**
 * 被打倒後送去哪：最近到過的主島（沒有紀錄、或紀錄的不是主島，就用起始村）。
 * 主島可以用 hub.defeat 自訂（起始村送回自己的房間），否則送到該島的 respawn 位置。
 */
export function defeatSpot(homeMap: string | undefined, maps: Record<string, MapDef> = MAPS): Spot {
  const hub = homeMap ? maps[homeMap] : undefined;
  const m = hub?.hub ? hub : maps.village;
  return m.hub?.defeat ?? { map: m.id, x: m.respawn.x, y: m.respawn.y };
}

/** 進入地圖時呼叫：如果是主島，記下「去過」並把它當成最近的主島。 */
export function markArrival(save: { flags: Record<string, boolean>; homeMap?: string }, m: MapDef): void {
  if (!m.hub) return;
  save.flags[`visited:${m.id}`] = true;
  save.homeMap = m.id;
}
```

- [ ] **Step 5: 執行，確認大部分通過**

Run: `npx vitest run tests/travel.test.ts`
Expected: `visitedHubs`、`dockSpot`、`markArrival`、`defeatSpot('isleA')` 都 PASS；`defeatSpot(undefined)` 與 `defeatSpot('cave'|'nowhere')` 這三個 FAIL（因為起始村還沒有 `hub`，回傳 `{map:'village',...}` 而不是 room）。這是預期的，Task 2 會補上。

- [ ] **Step 6: Commit**

```bash
git add src/core/travel.ts tests/travel.test.ts src/data/maps.ts src/core/save.ts
git commit -m "新增主島與搭船的純邏輯（travel.ts）與型別

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 起始村的主島資料、碼頭物件與圖

**Files:**
- Modify: `src/data/maps.ts`（起始村加 `hub` 與 `dock` 物件）
- Modify: `src/data/levels.ts`（`STORY.dockEmpty`）
- Modify: `src/gfx/sprites.ts`（`dock` 圖）
- Test: `tests/travel.test.ts`（加真實資料的測試）

**Interfaces:**
- Consumes: Task 1 的 `MapDef.hub`、`ObjKind 'dock'`、`defeatSpot`、`dockSpot`
- Produces: `MAPS.village.hub = { dock: { x: 20, y: 11 }, defeat: { map: 'room', x: 2, y: 3 } }`；起始村有一個物件 `{ id: 'dock', kind: 'dock', x: 21, y: 11, showIf: 'dockOpen' }`；貼圖 key `dock`；`STORY.dockEmpty: string[]`

- [ ] **Step 1: 寫會失敗的測試（真實資料）**

在 `tests/travel.test.ts` 檔尾加：

```ts
import { BLOCKED_TILES } from '../src/data/maps';

describe('起始村是主島，第 0 關的行為不變', () => {
  const v = MAPS.village;
  it('有 hub 設定，被打倒仍然送回自己的房間', () => {
    expect(v.hub).toBeDefined();
    expect(defeatSpot('village')).toEqual({ map: 'room', x: 2, y: 3 });
    expect(MAPS.room).toBeDefined();
    expect(BLOCKED_TILES.has(MAPS.room.tiles[3][2])).toBe(false);
  });
  it('碼頭落腳點是可以走的格子，且碼頭物件就在它旁邊', () => {
    const d = v.hub!.dock;
    expect(BLOCKED_TILES.has(v.tiles[d.y][d.x])).toBe(false);
    const dock = v.objects.find((o) => o.kind === 'dock')!;
    expect(dock).toBeDefined();
    expect(Math.abs(dock.x - d.x) + Math.abs(dock.y - d.y)).toBe(1);
  });
  it('碼頭預設看不到（階段 4 才會打開 dockOpen 旗標），所以第 0 關看起來沒變', () => {
    expect(v.objects.find((o) => o.kind === 'dock')!.showIf).toBe('dockOpen');
  });
  it('dockSpot 指向起始村的碼頭旁', () => {
    expect(dockSpot(v)).toEqual({ map: 'village', x: v.hub!.dock.x, y: v.hub!.dock.y });
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/travel.test.ts`
Expected: FAIL（`v.hub` 為 undefined）。

- [ ] **Step 3: 起始村加上主島資料與碼頭**

在 `src/data/maps.ts` 的 `MAPS.village` 定義裡，把

```ts
    start: { x: 5, y: 4 }, respawn: { x: 5, y: 4 },
    objects: [
      { id: 'door_home', kind: 'door', x: 5, y: 3, to: { map: 'room', x: 5, y: 6 } },
```

改成

```ts
    start: { x: 5, y: 4 }, respawn: { x: 5, y: 4 },
    hub: { dock: { x: 20, y: 11 }, defeat: { map: 'room', x: 2, y: 3 } },
    objects: [
      { id: 'dock', kind: 'dock', x: 21, y: 11, showIf: 'dockOpen' },
      { id: 'door_home', kind: 'door', x: 5, y: 3, to: { map: 'room', x: 5, y: 6 } },
```

- [ ] **Step 4: 加對話文字**

在 `src/data/levels.ts` 的 `STORY` 裡，`defeat: [...]` 那一行後面加：

```ts
  dockEmpty: ['一艘小船停在碼頭邊。', '現在還沒有別的主島可以去。'],
```

- [ ] **Step 5: 加碼頭的圖**

在 `src/gfx/sprites.ts` 找到 `make('bell', 16, 16, (c) => {` 這一行，在它**前面**加：

```ts
  make('dock', 16, 16, (c) => {
    px(c, '#4aa8f0', 0, 0, 16, 16); px(c, '#8ad0ff', 2, 3, 4, 1); px(c, '#8ad0ff', 10, 13, 4, 1);
    px(c, '#2b2140', 0, 5, 16, 7); px(c, '#b9824f', 0, 6, 16, 5); px(c, '#d9a26a', 0, 6, 16, 1);
    for (let x = 3; x < 16; x += 4) px(c, '#8b5a3c', x, 6, 1, 5);
    px(c, '#2b2140', 2, 1, 5, 4); px(c, '#e8514a', 3, 2, 3, 2); px(c, '#ffffff', 11, 1, 1, 5); px(c, '#ffffff', 11, 1, 4, 3);
  });
```

（一座木頭碼頭，上面有一艘小紅船和一面白帆。）

- [ ] **Step 6: 執行，確認通過**

Run: `npx vitest run tests/travel.test.ts`
Expected: 全部 PASS（含 Task 1 留下的三個）。

再跑完整單元測試，確認地圖可達性等既有檢查沒被打壞：

Run: `npx vitest run`
Expected: 全部 PASS（碼頭在 `showIf` 之後仍被可達性測試檢查，位置 (21,11) 必須走得到旁邊，否則這裡會 FAIL，需要換位置）。

- [ ] **Step 7: Commit**

```bash
git add src/data/maps.ts src/data/levels.ts src/gfx/sprites.ts tests/travel.test.ts
git commit -m "起始村設為主島並加入預設隱藏的碼頭

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 世界地圖彈窗與 World 整合

**Files:**
- Modify: `src/core/ui.ts`（`openWorldMap`）
- Modify: `src/scenes/World.ts`（import、`loadMap`、`refreshObjects`、`interact`、`useDock`、被打倒）
- Test: 型別檢查 + 既有測試 + 端對端（第 0 關流程不變）

**Interfaces:**
- Consumes: Task 1 的 `visitedHubs`、`dockSpot`、`defeatSpot`、`markArrival`；Task 2 的 `dock` 貼圖、`STORY.dockEmpty`
- Produces: `openWorldMap(dests: { id: string; name: string }[]): Promise<string | null>`（按取消回傳 `null`）

這個 Task 動到畫面與場景，沒辦法像純邏輯那樣單元測試；驗證靠型別檢查、既有測試、端對端（確認第 0 關沒被影響），以及下面「手動確認」。

- [ ] **Step 1: 世界地圖彈窗**

在 `src/core/ui.ts` 的 `choose()` 函式（結尾 `}` 後、`// ───── 夥伴 ─────` 之前）加：

```ts
/** 世界地圖：列出去過的主島，選一個就搭船過去。回傳地圖 id；按「先不要」回傳 null。 */
export function openWorldMap(dests: { id: string; name: string }[]): Promise<string | null> {
  return new Promise((resolve) => {
    const m = openModal(`<h2>🗺️ 要去哪裡？</h2><p>搭船不用錢，隨時可以回家喔。</p>
      <div class="foot" style="flex-direction:column;gap:10px">${dests.map((d, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-a="go" data-id="${d.id}">⛵ ${d.name}</button>`).join('')}
      <button class="btn small" data-a="no">先不要</button></div>`);
    audio.speak('要去哪裡？搭船不用錢，隨時可以回家喔。');
    delegate(m, (a, el) => {
      if (a !== 'go' && a !== 'no') return;
      audio.sfx('tap');
      closeModal();
      resolve(a === 'go' ? el.dataset.id! : null);
    });
  });
}
```

- [ ] **Step 2: World 的 import**

在 `src/scenes/World.ts` 開頭的 import 區：

把
```ts
import { choose, openParty, openResults, openSettings, openShop, say, setHudInfo, toast, ui } from '../core/ui';
```
改成
```ts
import { choose, openParty, openResults, openSettings, openShop, openWorldMap, say, setHudInfo, toast, ui } from '../core/ui';
import { defeatSpot, dockSpot, markArrival, visitedHubs } from '../core/travel';
```

- [ ] **Step 3: 進入地圖時記錄主島**

在 `loadMap()` 裡，找到

```ts
    if (m.id === 'd' && !flag('dEntered')) setFlag('dEntered'); // 進到舌尖中音島：開始教 ㄉㄊ
```

在它**後面**加：

```ts
    markArrival(G.save, m); // 進到主島：記下「去過」，並當成最近的主島（被打倒時送回這裡）
```

- [ ] **Step 4: 畫出碼頭**

在 `refreshObjects()` 的 `switch (def.kind)` 裡，找到 `case 'woodgate':` 那行，在它**前面**加：

```ts
        case 'dock': spr = this.add.image(px, py, 'dock').setOrigin(0).setDepth(depth); break;
```

- [ ] **Step 5: 碼頭互動**

在 `interact()` 的 `switch (d.kind)` 裡，找到 `case 'gimmick': return this.useGimmick(o);`，在它**後面**加：

```ts
      case 'dock': return this.useDock();
```

接著在 `useGimmick` 方法**前面**加上新方法：

```ts
  /** 碼頭：列出去過的其他主島，選一個就免費搭船過去（沒有別的島時只說明一下） */
  private async useDock() {
    const dests = visitedHubs(G.save.flags).filter((h) => h.id !== this.map.id);
    if (!dests.length) { await say(STORY.dockEmpty.map((text) => ({ text }))); return; }
    const id = await openWorldMap(dests.map((h) => ({ id: h.id, name: h.name })));
    if (!id) return;
    const spot = dockSpot(MAPS[id]);
    await this.travel(spot.map, spot.x, spot.y);
  }
```

- [ ] **Step 6: 被打倒送回最近的主島**

在 `startBattle()` 裡，找到

```ts
      await this.travel('room', 2, 3);
      healAll();
```

改成

```ts
      const back = defeatSpot(G.save.homeMap);
      await this.travel(back.map, back.x, back.y);
      healAll();
```

（起始村的 `hub.defeat` 就是 `room (2,3)`，所以第 0 關的行為跟以前完全一樣。）

- [ ] **Step 7: 型別檢查與完整單元測試**

Run: `npx tsc --noEmit`
Expected: 沒有輸出（沒有錯誤）。

Run: `npx vitest run`
Expected: 全部 PASS。

- [ ] **Step 8: 打包並跑端對端（確認第 0 關沒被影響）**

端對端很吃資源；如果使用者希望交給 GitHub 跑，這一步改成只跑 `npm run build` 並在 push 後看 GitHub 的結果。要在本機跑時：

```bash
npm run build
```

另開一個背景終端機：`npx vite preview --port 5190 --host 127.0.0.1`，再執行：

```bash
STARTER=momo node tests/e2e/play.mjs http://127.0.0.1:5190/ e2e-shots
```

Expected: 每一行都是 `✓`，最後有 `✓ 沒有瀏覽器錯誤`，結束碼 0。

- [ ] **Step 9: 手動確認（第 1 次可看到碼頭）**

這個階段碼頭預設看不到。要親眼看一下，開發時在瀏覽器主控台輸入：

```js
__game.G.save.flags.dockOpen = true; __game.world().refreshObjects();
```

Expected: 起始村池塘左邊出現碼頭；點它會說「一艘小船停在碼頭邊。現在還沒有別的主島可以去。」；對話結束後可以正常走路（沒有鎖死）。

- [ ] **Step 10: Commit**

```bash
git add src/core/ui.ts src/scenes/World.ts
git commit -m "世界地圖彈窗、碼頭互動、被打倒送回最近的主島

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review（對照規格）

- **世界地圖與碼頭**：`openWorldMap`（Task 3 Step 1）、`useDock`（Step 5）、`dockSpot`（Task 1）。
- **去過的主島**：`visited:<mapId>` 旗標由 `markArrival`（Task 1）設定，World 在 `loadMap` 呼叫（Task 3 Step 3）。
- **被打倒送回最近的主島**：`homeMap` 欄位（Task 1）、`defeatSpot`（Task 1）、World 使用（Task 3 Step 6）。
- **第 0 關不動**：起始村 `hub.defeat` 指回自己的房間（Task 2 Step 3）；碼頭 `showIf: 'dockOpen'` 預設看不到；端對端確認（Task 3 Step 8）。
- **舊存檔**：`homeMap` 選填，`defeatSpot(undefined)` 退回起始村（Task 1 測試涵蓋）。
- **未涵蓋、屬於後續階段**：旅館與商店（階段 4）、會動的怪物（階段 2）、迷宮元件（階段 3）、`dockOpen` 旗標何時打開（階段 4）。

型別一致性：`visitedHubs` / `dockSpot` / `defeatSpot` / `markArrival` 在 Task 1 定義，Task 2、3 的呼叫簽名一致；`MapDef.hub` 的 `dock` / `defeat` 欄位名稱在 Task 1 Step 1 定義，Task 2 Step 3 使用。
