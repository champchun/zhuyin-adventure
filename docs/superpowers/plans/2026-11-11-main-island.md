# 主島「鼓聲港」（階段 4a）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出舌尖中音島這一關的主島「鼓聲港」：島民、旅館（25 金幣）、商店、碼頭，並接到現有的舌尖中音島（暫時當怪物島 A）與起始村。

**Architecture:** 主島是一張戶外地圖 `dh` 加兩張室內地圖（旅館 `dh_inn`、商店 `dh_shop`），用階段 1 的「主島」機制（`hub`、碼頭、被打倒送回主島）。旅館的收費與判斷是純函式（`src/core/inn.ts`）；World 只負責畫老闆、問玩家、扣錢、淡出回血存檔。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest、Playwright（端對端）。

來源規格：`docs/superpowers/specs/2026-11-11-main-island-design.md`；上層規格 `2026-11-11-level-structure-design.md`。階段 1～3（主島骨架與碼頭、會動的怪物、迷宮元件）與寫字施法都已完成並合併。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- **旅館住一晚 25 金幣**；金幣不夠**不能住**且**不扣錢**，並提醒「搭船回起始村，回家睡覺是免費的」；住宿回滿夥伴 HP／魔力並存檔。
- 第 0 關（起始村、村外小徑、風車草原）的玩法與資料不動，**只有**起始村第四扇圓門的去向改變（經 `LEVELS.d.mapId`）。
- 起始村的碼頭原本就預設隱藏（`showIf: 'dockOpen'`）；第一次到主島 `dh` 才設 `dockOpen`（用 `MapDef.hub.opensDock`），不要改起始村的地圖資料。
- 被打倒在怪物島時送回主島 `dh` 的 `respawn` 位置、HP／魔力回滿、不扣錢（階段 1 的 `defeatSpot` 已經會做，`dh` 不要設 `hub.defeat`）。
- 不要重做怪物島、不要做怪物島 B 的內容（只放一個封住的告示牌）。
- 任何 `say()` / modal 都會增減 `ui.blocking`，新增流程務必成對（`say` 的陣列不能是空的）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本（在這台機器會卡住）；測試用 `npx vitest run`。
- 端對端很慢，**不要在本機跑**；由控制端把分支 push 後交給 GitHub Actions。
- 只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差，不要寫成其他模型名稱）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 工作目錄乾淨、在 `main`。執行者先開分支：`git switch -c stage4a-main-island`。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/core/inn.ts` | 新增 | `stayOutcome(coins, price)`：住宿判斷（純函式） |
| `src/core/travel.ts` | 修改 | `markArrival` 在 `hub.opensDock` 時設 `dockOpen` |
| `src/data/maps.ts` | 修改 | 型別（`innkeeper`、`price`、`opensDock`）、主島與兩張室內地圖、島 `d` 的出口 |
| `src/data/levels.ts` | 修改 | `LEVELS.d.mapId`、`STORY.innHello`、`STORY.innBye` |
| `src/scenes/World.ts` | 修改 | 旅館老闆的畫法與互動 |
| `tests/hub.test.ts` | 新增 | 住宿判斷、碼頭開放、主島資料完整性 |
| `tests/e2e/play.mjs` | 修改 | 進主島、旅館、走到怪物島、回主島、回起始村 |

---

### Task 1: 住宿判斷與碼頭開放（純邏輯與型別）

**Files:**
- Create: `src/core/inn.ts`
- Create: `tests/hub.test.ts`
- Modify: `src/core/travel.ts`
- Modify: `src/data/maps.ts`（型別）

**Interfaces:**
- Produces（後面的 Task 會用）：
  ```ts
  // src/core/inn.ts
  export function stayOutcome(coins: number | undefined, price: number): { ok: boolean; coinsAfter: number };
  // maps.ts 型別
  ObjKind 新增 'innkeeper'；MapObj.price?: number；MapDef.hub 新增 opensDock?: boolean
  // travel.ts
  markArrival：進入 hub.opensDock 為 true 的主島時，同時設 save.flags.dockOpen = true
  ```

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/hub.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { markArrival } from '../src/core/travel';
import { stayOutcome } from '../src/core/inn';

describe('stayOutcome：旅館住宿', () => {
  it('金幣夠：扣掉住宿費；剛好夠也可以住', () => {
    expect(stayOutcome(100, 25)).toEqual({ ok: true, coinsAfter: 75 });
    expect(stayOutcome(25, 25)).toEqual({ ok: true, coinsAfter: 0 });
  });
  it('金幣不夠：不能住，也不扣錢', () => {
    expect(stayOutcome(24, 25)).toEqual({ ok: false, coinsAfter: 24 });
    expect(stayOutcome(0, 25)).toEqual({ ok: false, coinsAfter: 0 });
  });
  it('舊存檔沒有金幣欄位（undefined）視為 0', () => {
    expect(stayOutcome(undefined, 25)).toEqual({ ok: false, coinsAfter: 0 });
  });
});

describe('markArrival：到主島時開放起始村的碼頭', () => {
  const hub = (opensDock?: boolean): MapDef => ({ ...MAPS.shop, id: 'h', name: 'h', hub: { dock: { x: 1, y: 1 }, opensDock } });
  it('進入會開放碼頭的主島：設 dockOpen、visited、homeMap', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, hub(true));
    expect(save.flags.dockOpen).toBe(true);
    expect(save.flags['visited:h']).toBe(true);
    expect(save.homeMap).toBe('h');
  });
  it('進入不會開放碼頭的主島（例如起始村）：只記去過，不設 dockOpen', () => {
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, hub());
    expect(save.flags.dockOpen).toBeUndefined();
    expect(save.flags['visited:h']).toBe(true);
  });
  it('起始村本身不會開放碼頭', () => {
    expect(MAPS.village.hub!.opensDock).toBeFalsy();
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/hub.test.ts`
Expected: FAIL（`../src/core/inn` 不存在；`opensDock` 型別不存在）。

- [ ] **Step 3: 型別**

在 `src/data/maps.ts` 的 `ObjKind` 結尾，把 `| 'stairs' | 'lockdoor' | 'barrier';` 改成：

```ts
| 'stairs' | 'lockdoor' | 'barrier' | 'innkeeper';
```

在 `MapObj` 介面裡，`write` 已移除，找到 `patrol?: { x: number; y: number }[];` 這一行，在它**後面**加：

```ts
  /** innkeeper：住一晚要多少金幣 */
  price?: number;
```

在 `MapDef` 介面裡，把

```ts
  hub?: { dock: { x: number; y: number }; defeat?: { map: string; x: number; y: number } };
```
改成
```ts
  hub?: { dock: { x: number; y: number }; defeat?: { map: string; x: number; y: number }; /** 第一次到這座主島，起始村的碼頭才會出現 */ opensDock?: boolean };
```

- [ ] **Step 4: 住宿判斷**

建立 `src/core/inn.ts`：

```ts
// 旅館住宿（純函式）：金幣夠就扣錢，不夠就不能住、也不扣錢。
export function stayOutcome(coins: number | undefined, price: number): { ok: boolean; coinsAfter: number } {
  const have = coins ?? 0; // 舊存檔沒有金幣欄位
  return have >= price ? { ok: true, coinsAfter: have - price } : { ok: false, coinsAfter: have };
}
```

- [ ] **Step 5: 碼頭開放**

在 `src/core/travel.ts` 的 `markArrival` 裡，把

```ts
  save.flags[`visited:${m.id}`] = true;
  save.homeMap = m.id;
```
改成
```ts
  save.flags[`visited:${m.id}`] = true;
  save.homeMap = m.id;
  if (m.hub.opensDock) save.flags.dockOpen = true; // 到了這座主島，起始村的碼頭才會出現
```

- [ ] **Step 6: 執行測試、型別檢查**

Run: `npx vitest run tests/hub.test.ts`
Expected: 全部 PASS。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add src/core/inn.ts src/core/travel.ts src/data/maps.ts tests/hub.test.ts
git commit -m "旅館住宿判斷 stayOutcome；主島可以開放起始村的碼頭

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 主島與兩張室內地圖，接上起始村與怪物島

**Files:**
- Modify: `src/data/maps.ts`（`dh`、`dh_inn`、`dh_shop`、島 `d` 的出口）
- Modify: `src/data/levels.ts`（`LEVELS.d.mapId`）
- Modify: `tests/hub.test.ts`（資料完整性）

**Interfaces:**
- Consumes: Task 1 的型別（`innkeeper`、`price`、`hub.opensDock`）
- Produces: `MAPS.dh`、`MAPS.dh_inn`、`MAPS.dh_shop`；`LEVELS.d.mapId === 'dh'`；物件 id：`dh` 的 `back`、`isle_a`、`isle_b`、`door_inn`、`door_shop`、`dock`；`dh_inn` 的 `keeper`、`door`；`dh_shop` 的 `clerk`、`door`

- [ ] **Step 1: 寫會失敗的測試**

在 `tests/hub.test.ts` 最上面的 import 區，改成：

```ts
import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { LEVELS } from '../src/data/levels';
import { defeatSpot, dockSpot, markArrival } from '../src/core/travel';
import { stayOutcome } from '../src/core/inn';
```

檔尾加：

```ts
describe('主島「鼓聲港」', () => {
  const dh = MAPS.dh;
  it('是主島：有碼頭、第一次到會開放起始村的碼頭；被打倒會送回主島的 respawn 位置', () => {
    expect(dh).toBeDefined();
    expect(dh.hub).toBeDefined();
    expect(dh.hub!.opensDock).toBe(true);
    expect(dh.hub!.defeat).toBeUndefined();
    expect(defeatSpot('dh')).toEqual({ map: 'dh', x: dh.respawn.x, y: dh.respawn.y });
  });
  it('碼頭的落腳點可以走，碼頭物件就在它旁邊', () => {
    const d = dockSpot(dh);
    expect(BLOCKED_TILES.has(dh.tiles[d.y][d.x])).toBe(false);
    const dock = dh.objects.find((o) => o.kind === 'dock')!;
    expect(dock).toBeDefined();
    expect(dock.showIf).toBeUndefined();
    expect(Math.abs(dock.x - d.x) + Math.abs(dock.y - d.y)).toBe(1);
  });
  it('第四扇圓門通到主島；怪物島 A 的出口回主島；主島有通往怪物島 A 與回起始村的出口', () => {
    expect(LEVELS.d.mapId).toBe('dh');
    expect(MAPS.d.objects.find((o) => o.id === 'exit')!.to!.map).toBe('dh');
    expect(dh.objects.find((o) => o.id === 'isle_a')!.to!.map).toBe('d');
    expect(dh.objects.find((o) => o.id === 'back')!.to).toEqual({ map: 'village', x: 10, y: 15 });
  });
  it('怪物島 B 的入口先封著：只是一個告示牌', () => {
    const b = dh.objects.find((o) => o.id === 'isle_b')!;
    expect(b.kind).toBe('sign');
    expect((b.text ?? []).length).toBeGreaterThan(0);
  });
  it('至少三位島民，每位都有依進度的對話', () => {
    const npcs = dh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
  });
});

describe('旅館與商店', () => {
  const dh = MAPS.dh, inn = MAPS.dh_inn, shop = MAPS.dh_shop;
  it('主島的門通到室內，室內的門回到主島的門口（路上）', () => {
    const doorInn = dh.objects.find((o) => o.id === 'door_inn')!;
    const doorShop = dh.objects.find((o) => o.id === 'door_shop')!;
    expect(doorInn.to!.map).toBe('dh_inn');
    expect(doorShop.to!.map).toBe('dh_shop');
    const back = (m: MapDef) => m.objects.find((o) => o.id === 'door')!.to!;
    expect(back(inn)).toEqual({ map: 'dh', x: doorInn.x, y: doorInn.y + 1 });
    expect(back(shop)).toEqual({ map: 'dh', x: doorShop.x, y: doorShop.y + 1 });
  });
  it('旅館老闆住一晚收 25 金幣', () => {
    const keeper = inn.objects.find((o) => o.kind === 'innkeeper')!;
    expect(keeper).toBeDefined();
    expect(keeper.price).toBe(25);
  });
  it('商店有一位店員（id 是 clerk，會開商店）', () => {
    expect(shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
  });
  it('起始村第四扇圓門還在原地，主島的出口回到它前面', () => {
    expect(MAPS.village.objects.some((o) => o.id === 'gate_d')).toBe(true);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/hub.test.ts`
Expected: FAIL（`MAPS.dh` 不存在）。

- [ ] **Step 3: 第四扇圓門與怪物島的出口**

在 `src/data/levels.ts` 的 `LEVELS` 裡，把

```ts
  d: { id: 'd', symbol: 'ㄉㄊ', name: '舌尖中音島（鼓與流水）', open: true, mapId: 'd', partner: '夥伴' },
```
改成
```ts
  d: { id: 'd', symbol: 'ㄉㄊ', name: '舌尖中音島（鼓與流水）', open: true, mapId: 'dh', partner: '夥伴' },
```

在 `src/data/maps.ts` 的 `MAPS.d` 物件列表裡，把

```ts
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'village', x: 10, y: 15 }, label: '回村' },
```
改成
```ts
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'dh', x: 3, y: 10 }, label: '回主島' },
```

- [ ] **Step 4: 主島與室內地圖**

在 `src/data/maps.ts` 的 `export const TILE_KEY: Record<string, string> = {` 的**前面**加：

```ts
// ───────── 鼓聲港：舌尖中音島這一關的主島（階段 4a）─────────
// 沙灘小島，四周是海；北邊旅館（左）與商店（右），一條橫路接兩扇門，一條直路通到南邊出口；東邊海灣旁是碼頭。
const dhGrid = (() => {
  const g = new Grid(28, 20, 'a').border('~');
  g.rect('~', 24, 7, 3, 7); // 東邊的海灣
  g.many(',', [[3, 14], [9, 16], [12, 7], [18, 15], [21, 8]]);
  g.many('#', [[2, 3], [11, 2], [16, 2], [3, 17], [24, 17], [10, 12], [19, 7], [8, 9]]);
  g.rect('h', 4, 2, 5, 1).rect('H', 4, 3, 5, 1).set(6, 3, 'D'); // 旅館：門在 (6,3)
  g.rect('h', 19, 2, 5, 1).rect('H', 19, 3, 5, 1).set(21, 3, 'D'); // 商店：門在 (21,3)
  g.rect('=', 6, 4, 16, 1).rect('=', 14, 5, 1, 13); // 橫路（y=4）與直路（x=14）
  return g;
})();
MAPS.dh = {
  id: 'dh', name: '鼓聲港', w: 28, h: 20, tiles: dhGrid.rows(), theme: 'island',
  start: { x: 14, y: 17 }, respawn: { x: 7, y: 4 },
  hub: { dock: { x: 22, y: 10 }, opensDock: true },
  objects: [
    { id: 'back', kind: 'exit', x: 14, y: 18, to: { map: 'village', x: 10, y: 15 }, label: '回起始村' },
    { id: 'isle_a', kind: 'exit', x: 2, y: 10, to: { map: 'd', x: 4, y: 17 }, label: '怪物島' },
    { id: 'isle_b', kind: 'sign', x: 24, y: 16, sprite: 'gate_off', text: ['南邊的怪物島，被濃濃的迷霧罩住了。', '等我們變得更強，也許就能過去！'] },
    { id: 'door_inn', kind: 'door', x: 6, y: 3, to: { map: 'dh_inn', x: 4, y: 6 } },
    { id: 'door_shop', kind: 'door', x: 21, y: 3, to: { map: 'dh_shop', x: 4, y: 6 } },
    { id: 'dock', kind: 'dock', x: 23, y: 10 },
    {
      id: 'drummer', kind: 'npc', x: 10, y: 8, sprite: 'npc_kid', label: '小鼓手',
      talk: [
        { not: 'dPractice', lines: ['歡迎來到鼓聲港！', '這座島的注音，都是舌尖頂著上牙齦後面發出來的。', '西邊的出口通到怪物島，島上有稻草布偶，先去練習看看吧！'] },
        { not: 'boss_d', lines: ['聽說怪物島上的洞窟，要先找到小鑰匙才能走到更深的地方。', '累了就來旅館住一晚。'] },
        { lines: ['鼓聲回來了！謝謝你！', '南邊還有一座更遠的怪物島，現在迷霧還很濃……'] },
      ],
    },
    {
      id: 'fisher', kind: 'npc', x: 18, y: 12, sprite: 'npc_elder', label: '漁夫爺爺',
      talk: [
        { lines: ['打倒怪獸會得到金幣，可以到商店買藥水。', '旅館住一晚 25 金幣。沒錢的話，搭船回起始村的家睡覺，是免費的喔！'] },
      ],
    },
    {
      id: 'sailor', kind: 'npc', x: 8, y: 15, sprite: 'npc_girl', label: '船長小桃',
      talk: [
        { lines: ['東邊碼頭的小船，可以載你回起始村。', '想回家的時候，隨時都可以搭！'] },
      ],
    },
  ],
};
// 旅館與商店的室內：沿用商店的房間格子
MAPS.dh_inn = {
  id: 'dh_inn', name: '鼓聲港旅館', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'keeper', kind: 'innkeeper', x: 6, y: 3, sprite: 'npc_clerk', label: '旅館老闆', price: 25 },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'dh', x: 6, y: 4 } },
  ],
};
MAPS.dh_shop = {
  id: 'dh_shop', name: '鼓聲港商店', w: 10, h: 8, tiles: shop.rows(), theme: 'village',
  start: { x: 4, y: 6 }, respawn: { x: 4, y: 6 },
  objects: [
    { id: 'clerk', kind: 'npc', x: 6, y: 3, sprite: 'npc_clerk', label: '店員小福' },
    { id: 'door', kind: 'door', x: 4, y: 7, to: { map: 'dh', x: 21, y: 4 } },
  ],
};

```

- [ ] **Step 5: 執行測試、型別檢查、打包**

Run: `npx vitest run`
Expected: 全部 PASS。如果既有的地圖測試（「起點能走到所有物件旁」、「物件不放在被阻擋的地形上」、「門的目的地落在可走的格子」、「村民對話最後一句不設條件」）對新地圖失敗，訊息會指出是哪個物件；**只調整新地圖上的那個物件座標**（例如樹挪開一格），不要改測試。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 6: Commit**

```bash
git add src/data/maps.ts src/data/levels.ts tests/hub.test.ts
git commit -m "主島「鼓聲港」與旅館、商店兩張室內地圖；第四扇圓門改通往主島

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: World：旅館老闆（畫出來、互動、住宿）

**Files:**
- Modify: `src/scenes/World.ts`
- Modify: `src/data/levels.ts`（`STORY.innHello`、`STORY.innBye`）

**Interfaces:**
- Consumes: Task 1 的 `stayOutcome`、`innkeeper`、`MapObj.price`；現有 `rest()`、`choose()`、`say()`、`G.save.coins`
- Produces: 旅館老闆互動 `useInn`

這個 Task 動場景，沒辦法單元測試；驗證靠型別檢查、既有測試、打包，以及 Task 4 的端對端。

- [ ] **Step 1: 對話文字**

在 `src/data/levels.ts` 的 `STORY` 裡找到

```ts
  shopBye: ['謝謝惠顧！下次再來喔～'],
```
在它**後面**加：

```ts
  innHello: ['歡迎光臨鼓聲港旅館！', '住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。'],
  innBye: ['睡得好嗎？夥伴們都精神飽滿了！', '歡迎再來～'],
```

- [ ] **Step 2: 畫出旅館老闆**

在 `src/scenes/World.ts` 的 `refreshObjects()` 裡，找到

```ts
        case 'npc': shadow();
```
改成
```ts
        case 'npc':
        case 'innkeeper': shadow();
```
（原本那一行後面接的 `spr = this.add.image(...)` 與 `bob(spr); break;` 不變。）

- [ ] **Step 3: 互動與住宿**

在 `src/scenes/World.ts` 的 import 區，`import { defeatSpot, dockSpot, markArrival, ... } from '../core/travel';` 那一行**後面**加：

```ts
import { stayOutcome } from '../core/inn';
```

在 `interact()` 的 `switch (d.kind)` 裡，找到

```ts
      case 'npc': return d.id === 'doctor' ? this.talkGuide() : d.id === 'clerk' ? this.talkClerk(d) : this.talkNpc(d);
```
在它**後面**加：

```ts
      case 'innkeeper': return this.useInn(d);
```

在 `talkClerk` 的註解 `/** 店員：打招呼後開商店 */` 的**前面**加新方法：

```ts
  /** 旅館：付錢住一晚，夥伴 HP／魔力回滿並存檔。金幣不夠就不能住（搭船回起始村睡覺是免費的），也不扣錢。 */
  private async useInn(d: MapObj) {
    const who = d.label ?? '旅館老闆';
    const price = d.price ?? 25;
    await say(STORY.innHello.map((text) => ({ who, text })));
    const stay = stayOutcome(G.save.coins, price);
    if (!stay.ok) {
      await say([`住一晚要 ${price} 金幣，你的金幣還不夠喔。`, '沒關係！碼頭的小船可以載你回起始村，回家睡覺是免費的。'].map((text) => ({ who, text })));
      return;
    }
    const i = await choose(`住一晚要 ${price} 金幣？`, `夥伴的 HP 和魔力都會回滿，還會幫你存檔。你有 ${G.save.coins} 枚金幣。`, ['住一晚 💤', '先不要']);
    if (i !== 0) return;
    G.save.coins = stay.coinsAfter;
    await this.rest(); // 淡出、全部回滿、存檔
    await say(STORY.innBye.map((text) => ({ who, text })));
  }

```

- [ ] **Step 4: 型別檢查、測試、打包**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 5: Commit**

```bash
git add src/scenes/World.ts src/data/levels.ts
git commit -m "旅館老闆：收 25 金幣住一晚、回滿並存檔；金幣不夠不能住

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 端對端：進主島、旅館、怪物島、回起始村

**Files:**
- Modify: `tests/e2e/play.mjs`

**Interfaces:**
- Consumes: Task 2 的主島座標與物件 id；Task 3 的旅館互動

機器人預設把怪物移動與寫字挑戰關掉；金幣可以用 `window.__game.G.save` 直接設定。端對端**不在本機跑**，由控制端交給 GitHub Actions。

主島座標：圓門進來落在起點 (14,17)；旅館門 (6,3)、旅館老闆在室內 (6,3)、室內的門 (4,7)；通往怪物島 A 的出口 (2,10)（過去落在島上 (4,17)）；回起始村的出口 (14,18)；島 `d` 的出口 (4,18) 現在回主島 (3,10)。

- [ ] **Step 1: 進主島、旅館、走到怪物島**

在 `tests/e2e/play.mjs` 找到這三行（第四扇圓門）：

```js
await doTap(10, 17, '第四扇圓門（舌尖中音島）');
if ((await save()).mapId !== 'd') throw new Error('沒有進入舌尖中音島');
f = await flags();
```

換成：

```js
await doTap(10, 17, '第四扇圓門（主島鼓聲港）');
if ((await save()).mapId !== 'dh') throw new Error('沒有進入主島鼓聲港');
f = await flags();
if (!f['visited:dh'] || !f.dockOpen) throw new Error('到主島後應該記下去過、並開放起始村的碼頭 ' + JSON.stringify(f));
await snap('hub');
// 旅館：金幣不夠不能住（不扣錢）；夠了才住（回滿 HP、扣 25 金幣）
await ev(() => { const g = window.__game.G.save; g.coins = 10; g.party[0].hp = 1; });
await doTap(6, 3, '旅館的門');
if ((await save()).mapId !== 'dh_inn') throw new Error('沒有進入旅館');
await doTap(6, 3, '旅館老闆（金幣不夠）');
let inn = await save();
if (inn.coins !== 10 || inn.party[0].hp !== 1) throw new Error('金幣不夠時不該扣錢或回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
await ev(() => { window.__game.G.save.coins = 100; });
await doTap(6, 3, '旅館老闆（住一晚）'); // choose() 彈窗由 pump 自動選第一個選項「住一晚」
inn = await save();
if (inn.coins !== 75 || !(inn.party[0].hp > 1)) throw new Error('住一晚後應該扣 25 金幣並回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
log('✓ 主島旅館：金幣不夠不能住，夠了住一晚回滿並扣 25 金幣');
await doTap(4, 7, '離開旅館');
if ((await save()).mapId !== 'dh') throw new Error('沒有走出旅館');
await doTap(2, 10, '通往怪物島的出口');
if ((await save()).mapId !== 'd') throw new Error('沒有進入舌尖中音島（怪物島）');
```

- [ ] **Step 2: 從怪物島回主島、再回起始村**

在檔案裡找到這兩行（島的洞窟走完之後，回到村子）：

```js
await doTap(4, 18, '回村');
if ((await save()).mapId !== 'village') throw new Error('沒有從島回到村子');
```

換成：

```js
await doTap(4, 18, '回主島');
if ((await save()).mapId !== 'dh') throw new Error('沒有從怪物島回到主島');
await doTap(14, 18, '回起始村的圓門');
if ((await save()).mapId !== 'village') throw new Error('沒有從主島回到起始村');
```

- [ ] **Step 3: 語法檢查**

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出。

先用 Read 確認第 1 步與第 2 步的「找到這幾行」都剛好出現一次；沒有找到就停下來回報，不要猜。另外確認 `let inn = ...` 沒有和檔案裡既有的 `inn` 變數衝突（有的話改個名字）。

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/play.mjs
git commit -m "端對端：進主島、旅館住宿、走到怪物島、回主島與起始村

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 進主島**

Run: `npm run dev`；打完草原頭目後，村子下面第四扇圓門會亮。Expected：點它進入「鼓聲港」，起始村池塘旁的碼頭**從這時候才出現**。

- [ ] **Step 2: 看主島**

Expected：沙灘小島；北邊旅館（左）和商店（右），橫路連到兩扇門；東邊海灣旁有碼頭；西邊有出口通往怪物島；東南有一個封著的告示牌（說南邊怪物島被迷霧罩住）；三位島民依進度說不同的話。

- [ ] **Step 3: 旅館**

Expected：金幣不夠 25 時，老闆說明不夠、提醒搭船回起始村睡覺免費，**不會扣錢**；金幣夠時問「住一晚要 25 金幣？」，選「住一晚」才扣錢、淡出、HP 和魔力回滿；選「先不要」什麼都不發生。

- [ ] **Step 4: 商店**

Expected：店員打招呼後開商店，可以買小藥水、魔力果、大藥水。

- [ ] **Step 5: 碼頭與回家**

Expected：點碼頭出現「要去哪裡？」，列出起始村（去過的主島）；選起始村就搭船回去，落在起始村的碼頭旁；回到起始村後，到房間睡覺仍然免費。

- [ ] **Step 6: 被打倒送回主島**

Expected：在怪物島（舌尖中音島）把夥伴打到倒下，會回到**主島的旅館門前**（不是起始村的房間），HP 和魔力回滿，沒有扣錢。

- [ ] **Step 7: 舊行為沒壞**

Expected：怪物島 A（原本的舌尖中音島）還能玩，裡面的洞窟也一樣；它的出口現在回到主島；主島南邊的出口回起始村的圓門前。

---

## Self-Review（對照規格）

- **主島 `dh`（島民、旅館、商店、碼頭）**：Task 2（地圖與物件）、Task 3（旅館互動）。
- **旅館 25 金幣、沒錢不能住、不扣錢、回滿並存檔**：Task 1（`stayOutcome`）、Task 3（`useInn`）、Task 4（端對端）。
- **碼頭第一次到主島才出現**：Task 1（`opensDock`＋`markArrival`），Task 2（`dh.hub.opensDock = true`）；起始村資料不動。
- **圓門改通主島、怪物島出口回主島**：Task 2 Step 3（`LEVELS.d.mapId`、島 `d` 的出口）。
- **被打倒送回主島**：Task 2 測試（`defeatSpot('dh')`，`dh` 不設 `hub.defeat`）。
- **怪物島 B 先封著**：Task 2（`isle_b` 告示牌）。
- **島民依進度說話**：Task 2（`drummer` 的三段對話；其餘兩位只有一句無條件的話）。
- **第 0 關不動**：只改 `LEVELS.d.mapId` 與島 `d` 的出口；起始村地圖資料未修改。
- **未涵蓋（規格列為不在範圍）**：怪物島重做成多層大迷宮、怪物島 B 的內容、新道具與新商品。

型別一致性：`innkeeper`／`price`／`opensDock` 在 Task 1 定義，Task 2 的資料與 Task 3 的 `useInn` 使用；`stayOutcome` 在 Task 1 定義，Task 3 使用；物件 id（`back`、`isle_a`、`isle_b`、`door_inn`、`door_shop`、`dock`、`keeper`、`clerk`、`door`）在 Task 2 定義，Task 2 的測試與 Task 4 的端對端使用。
