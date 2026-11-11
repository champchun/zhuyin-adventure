# 迷宮元件（階段 3）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出迷宮需要的零件，並用一座兩層的小「試煉洞窟」示範：文字圖地圖、樓梯、鎖門與小鑰匙、機關開關與擋路的石牆、用招式打通的隱藏房間，以及一個會檢查「每個地方都走得到、不會卡死」的迷宮驗證。

**Architecture:** 迷宮每一層是獨立的地圖，用文字圖手寫（`fromAscii`），物件用圖例（legend）標在文字圖上。新增三種物件：樓梯（`stairs`）、鎖門（`lockdoor`，用小鑰匙）、擋路石牆（`barrier`，由機關的旗標打開）。機關開關直接沿用現有的 `gimmick`（用招式啟動，也會要求寫字）。迷宮驗證是不依賴 Phaser 的純函式：模擬「走路、拿鑰匙、開鎖、用招式、踩樓梯」，找出走不到的地板和物件。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest、Playwright（端對端）。

來源規格：`docs/superpowers/specs/2026-11-11-level-structure-design.md` 的「迷宮元件」一節（本計畫是它的「階段 3」）。階段 1、2（主島與碼頭、會動的怪物）已完成並合併；寫字施法已完成。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- 迷宮每一層是獨立地圖，id 例如 `dc1`、`dc2`；樓梯物件用 `to` 連到另一層的指定格子。旗標沿用 `m:<map>:<id>`、`c:<map>:<id>`，每層各自記錄。
- 鑰匙是道具（`key`），放在地圖某處的寶箱裡；鎖門（`lockdoor`）需要一把鑰匙，用掉一把。鑰匙不能在商店買、也不能在戰鬥中使用。
- 機關開關＝現有的 `gimmick`（用招式啟動、也要寫字）；擋路石牆（`barrier`）用 `hideIf: 'g:<地圖>:<機關id>'` 在機關啟動後消失。
- 隱藏房間用現有的裂石（爆破拳、要寫 ㄅ）。
- 同一個洞窟（`MapDef.group` 相同）的樓層之間走動，野生怪**不重生**；從洞窟外面進來才重生。
- 示範洞窟的怪物要有**自己的戰鬥 id 與旗標**（`dc1m`、`dc2m`），不能和島上的 `d1`～`d3` 共用旗標（否則會把島上的怪物打掉）。
- 迷宮驗證要能抓到：缺招式打不開的、鑰匙放在鎖門後面（卡死）、鑰匙不夠用的、被牆圍起來走不到的地方。
- 第 0 關與舌尖中音島現有行為不變（島上只多一個洞窟入口，要先通過練習戰 `dPractice` 才看得到）。
- 任何 `say()` / modal 都會增減 `ui.blocking`，新增流程務必成對。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本（在這台機器會卡住）；測試用 `npx vitest run`。
- 端對端很慢，**不要在本機跑**；由控制端把分支 push 後交給 GitHub Actions。
- 只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差，不要寫成其他模型名稱）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 工作目錄乾淨、在 `main`。執行者先開分支：`git switch -c stage3-dungeon-parts`。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/data/ascii.ts` | 新增 | `fromAscii`：文字圖＋圖例 → 格子與物件 |
| `src/core/dungeon.ts` | 新增 | `reachReport`：迷宮驗證（純函式） |
| `src/core/travel.ts` | 修改 | `shouldRespawn(from, to)` |
| `src/data/maps.ts` | 修改 | 新物件種類、`MapDef.group`、示範洞窟兩層、島上入口 |
| `src/data/monsters.ts` | 修改 | `ItemDef.key`、道具 `key` |
| `src/data/levels.ts` | 修改 | 洞窟的兩場戰鬥 |
| `src/gfx/sprites.ts` | 修改 | 樓梯、鎖門、石牆的圖 |
| `src/core/battleui.ts` | 修改 | 戰鬥道具清單不含鑰匙 |
| `src/scenes/World.ts` | 修改 | 樓梯、鎖門、石牆互動；換樓層不重生；鑰匙寶箱訊息 |
| `tests/ascii.test.ts` | 新增 | `fromAscii` 測試 |
| `tests/dungeon.test.ts` | 新增 | 驗證器測試（假地圖）＋示範洞窟的驗證 |
| `tests/game.test.ts` | 修改 | 迷宮樓層不套用「起點能走到所有物件旁」的一般測試 |
| `tests/e2e/play.mjs` | 修改 | 洞窟流程 |

---

### Task 1: 文字圖 `fromAscii`

**Files:**
- Create: `src/data/ascii.ts`
- Create: `tests/ascii.test.ts`

**Interfaces:**
- Produces（後面的 Task 會用）：
  ```ts
  export type Legend = Record<string, Omit<MapObj, 'x' | 'y'>>;   // 每個圖例都要有 id
  export interface AsciiFloor { w: number; h: number; tiles: string[]; objects: MapObj[] }
  export function fromAscii(rows: string[], legend?: Legend): AsciiFloor;
  ```
  字元規則：`#`＝牆（格子字元 `S`，懸崖）、`.`＝地板（`:`，泥土）、圖例裡的字元＝地板上放一個物件（物件座標就是該字元的位置）；其他字元一律丟出錯誤。

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/ascii.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { fromAscii } from '../src/data/ascii';

describe('fromAscii：文字圖', () => {
  const legend = {
    K: { id: 'key_chest', kind: 'chest' as const, item: 'key' },
    '>': { id: 'down', kind: 'stairs' as const, to: { map: 'next', x: 1, y: 1 } },
  };
  it('# 是牆（S）、. 是地板（:），並量出大小', () => {
    const f = fromAscii(['####', '#..#', '####']);
    expect(f.w).toBe(4);
    expect(f.h).toBe(3);
    expect(f.tiles).toEqual(['SSSS', 'S::S', 'SSSS']);
    expect(f.objects).toEqual([]);
  });
  it('圖例的字元變成物件，座標就是字元的位置，底下是地板', () => {
    const f = fromAscii(['#####', '#K.>#', '#####'], legend);
    expect(f.tiles[1]).toBe('S:::S');
    expect(f.objects).toEqual([
      { id: 'key_chest', kind: 'chest', item: 'key', x: 1, y: 1 },
      { id: 'down', kind: 'stairs', to: { map: 'next', x: 1, y: 1 }, x: 3, y: 1 },
    ]);
  });
  it('每一行長度要一樣，否則丟出錯誤並說明哪一行', () => {
    expect(() => fromAscii(['####', '#.#', '####'])).toThrow(/第 1 行/);
  });
  it('沒有定義的字元丟出錯誤並說明位置', () => {
    expect(() => fromAscii(['###', '#?#', '###'])).toThrow(/第 1 行第 1 欄.*\?/);
  });
  it('同一個物件字元出現兩次（id 重複）會丟出錯誤', () => {
    expect(() => fromAscii(['#####', '#K.K#', '#####'], legend)).toThrow(/重複/);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/ascii.test.ts`
Expected: FAIL，訊息類似 `Failed to resolve import "../src/data/ascii"`。

- [ ] **Step 3: 實作**

建立 `src/data/ascii.ts`：

```ts
// 迷宮用的文字圖：一行一行寫地圖，比用程式蓋格子更容易看出路徑。
// 這裡只負責把文字圖變成「格子字元」與「物件」；樓層的名字、起點等由 maps.ts 組起來。
import type { MapObj } from './maps';

/** 圖例：文字圖裡的某個字元代表哪一種物件（座標由字元的位置決定，所以不用寫 x、y；id 一定要寫） */
export type Legend = Record<string, Omit<MapObj, 'x' | 'y'>>;

export interface AsciiFloor {
  w: number;
  h: number;
  /** 格子字元，可以直接放進 MapDef.tiles（S＝懸崖牆、:＝泥土地板） */
  tiles: string[];
  objects: MapObj[];
}

/**
 * rows：文字圖。`#` 牆、`.` 地板、圖例裡的字元＝地板上放一個物件。其他字元會丟出錯誤。
 * 起點、玩家可以進來的位置不用特別標記：由地圖的 start 與樓梯的 to 決定。
 */
export function fromAscii(rows: string[], legend: Legend = {}): AsciiFloor {
  const w = rows[0].length;
  const tiles: string[] = [];
  const objects: MapObj[] = [];
  const seen = new Set<string>();
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`第 ${y} 行長度是 ${row.length}，應該跟第 0 行一樣是 ${w}`);
    let line = '';
    [...row].forEach((c, x) => {
      if (c === '#') line += 'S';
      else if (c === '.') line += ':';
      else if (legend[c]) {
        const def = legend[c];
        if (seen.has(def.id)) throw new Error(`物件 id 重複：${def.id}（字元「${c}」出現不只一次？）`);
        seen.add(def.id);
        objects.push({ ...def, x, y });
        line += ':';
      } else throw new Error(`第 ${y} 行第 ${x} 欄的字元「${c}」沒有定義`);
    });
    tiles.push(line);
  });
  return { w, h: rows.length, tiles, objects };
}
```

- [ ] **Step 4: 執行，確認通過**

Run: `npx vitest run tests/ascii.test.ts`
Expected: 全部 PASS（5 個）。

- [ ] **Step 5: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。（`MapObj` 此時還沒有 `'stairs'` 種類，測試裡的 `kind: 'stairs' as const` 會在 Task 2 加上型別前編譯失敗；如果這裡報錯，先在 `src/data/maps.ts` 的 `ObjKind` 補上 `| 'stairs' | 'lockdoor' | 'barrier'`，這是 Task 2 要做的同一個改動，只是提前，記在報告裡。）

- [ ] **Step 6: Commit**

```bash
git add src/data/ascii.ts tests/ascii.test.ts src/data/maps.ts
git commit -m "新增迷宮用的文字圖 fromAscii

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
（如果 Step 5 沒有動到 `maps.ts`，commit 時就不要加它。）

---

### Task 2: 小鑰匙、樓梯、鎖門、石牆（資料、圖、World 互動）

**Files:**
- Modify: `src/data/maps.ts`（`ObjKind`、`MapDef.group`）
- Modify: `src/data/monsters.ts`（`ItemDef.key`、道具 `key`）
- Modify: `src/gfx/sprites.ts`（三張圖）
- Modify: `src/core/battleui.ts`（戰鬥道具清單不含鑰匙）
- Modify: `src/core/travel.ts`（`shouldRespawn`）
- Modify: `src/scenes/World.ts`
- Test: `tests/dungeon.test.ts`（新建，先放這個 Task 的測試）

**Interfaces:**
- Consumes: 現有 `addItem`、`itemCount`、`setFlag`、`flag`、`travel`、`refreshObjects`、`visible`
- Produces:
  ```ts
  // maps.ts
  ObjKind 新增 'stairs' | 'lockdoor' | 'barrier'；MapDef.group?: string
  // monsters.ts
  ItemDef.key?: boolean；ITEMS.key（小鑰匙，沒有價格、沒有 hp/mp）
  // travel.ts
  export function shouldRespawn(from: MapDef | undefined, to: MapDef): boolean;
  ```

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/dungeon.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef } from '../src/data/maps';
import { ITEMS } from '../src/data/monsters';
import { shouldRespawn } from '../src/core/travel';

describe('小鑰匙', () => {
  it('是不能買、不能在戰鬥中使用的道具', () => {
    const k = ITEMS.key;
    expect(k).toBeDefined();
    expect(k.key).toBe(true);
    expect(k.price).toBeUndefined();
    expect(k.hp).toBeUndefined();
    expect(k.mp).toBeUndefined();
  });
  it('其他道具都不是鑰匙', () => {
    for (const [id, it] of Object.entries(ITEMS)) if (id !== 'key') expect(it.key, id).toBeFalsy();
  });
});

describe('shouldRespawn：換地圖時野生怪要不要重生', () => {
  const m = (id: string, group?: string): MapDef => ({ ...MAPS.shop, id, name: id, group });
  it('第一次進地圖（沒有上一張）會重生', () => {
    expect(shouldRespawn(undefined, m('a', 'g'))).toBe(true);
  });
  it('同一個洞窟（group 相同）的樓層之間不重生', () => {
    expect(shouldRespawn(m('a', 'g'), m('b', 'g'))).toBe(false);
  });
  it('從洞窟外面進來、或換到別的洞窟，會重生', () => {
    expect(shouldRespawn(m('out'), m('a', 'g'))).toBe(true);
    expect(shouldRespawn(m('a', 'g'), m('b', 'h'))).toBe(true);
    expect(shouldRespawn(m('a', 'g'), m('out'))).toBe(true);
  });
  it('兩張都沒有 group 的一般地圖：照舊重生', () => {
    expect(shouldRespawn(m('x'), m('y'))).toBe(true);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/dungeon.test.ts`
Expected: FAIL（`ITEMS.key`、`shouldRespawn`、`MapDef.group` 不存在）。

- [ ] **Step 3: 型別與資料**

在 `src/data/maps.ts`，把 `ObjKind` 結尾的 `| 'gimmick' | 'dock';` 改成：

```ts
| 'gimmick' | 'dock' | 'stairs' | 'lockdoor' | 'barrier';
```

（如果 Task 1 已經加過，就跳過。）

在 `MapDef` 介面裡，`hub?: { dock: ...; defeat?: ... };` 那一行後面加：

```ts
  /** 迷宮：同一個洞窟的各樓層設成同一個 group；樓層之間走動，野生怪不會重生（從外面進來才重生） */
  group?: string;
```

在 `src/data/monsters.ts` 的 `ItemDef` 介面裡，`need?: string;` 那一行後面加：

```ts
  /** 鑰匙：用來開鎖住的門。不能買、也不能在戰鬥中使用 */
  key?: boolean;
```

在 `ITEMS` 物件最後一個道具（`bigpotion`）那一行後面加：

```ts
  key: { id: 'key', name: '小鑰匙', icon: '🗝️', key: true, desc: '可以打開洞窟裡鎖住的門，開一道門要用掉一把。' },
```

在 `src/core/travel.ts` 檔尾加：

```ts

/** 換地圖時，要不要讓已經打倒的野生怪重生：同一個洞窟（group 相同）的樓層之間不重生，從外面進來才重生。 */
export function shouldRespawn(from: MapDef | undefined, to: MapDef): boolean {
  return !(from?.group && from.group === to.group);
}
```

- [ ] **Step 4: 戰鬥道具清單不含鑰匙**

在 `src/core/battleui.ts` 找到

```ts
      const ids = Object.keys(ITEMS).filter((id) => itemCount(id) > 0);
```
改成
```ts
      const ids = Object.keys(ITEMS).filter((id) => itemCount(id) > 0 && (ITEMS[id].hp || ITEMS[id].mp)); // 鑰匙不能在戰鬥中用
```

找到
```ts
      const hasItems = Object.keys(ITEMS).some((id) => itemCount(id) > 0);
```
改成
```ts
      const hasItems = Object.keys(ITEMS).some((id) => itemCount(id) > 0 && (ITEMS[id].hp || ITEMS[id].mp));
```

- [ ] **Step 5: 三張圖**

在 `src/gfx/sprites.ts` 找到 `make('dock', 16, 16, (c) => {` 這一行，在它**前面**加：

```ts
  // 迷宮的零件：樓梯口、鎖住的門、擋路的石牆
  make('stairs', 16, 16, (c) => {
    px(c, '#2b2140', 1, 1, 14, 14); px(c, '#6a6a84', 2, 2, 12, 12);
    px(c, '#8a8aa3', 2, 4, 12, 2); px(c, '#55556e', 2, 6, 12, 2); px(c, '#8a8aa3', 2, 8, 12, 2); px(c, '#3a3a52', 2, 10, 12, 2);
    px(c, '#2b2140', 4, 5, 8, 1); px(c, '#2b2140', 5, 8, 6, 1); px(c, '#2b2140', 6, 11, 4, 1);
  });
  make('lockdoor', 16, 16, (c) => {
    px(c, '#2b2140', 1, 1, 14, 15); px(c, '#b9824f', 2, 2, 12, 14); px(c, '#8b5a3c', 7, 2, 2, 14); px(c, '#d9a26a', 2, 2, 12, 1);
    px(c, '#2b2140', 5, 7, 6, 6); px(c, '#ffd84a', 6, 8, 4, 4); px(c, '#2b2140', 7, 9, 2, 2);
  });
  make('barrier', 16, 16, (c) => {
    px(c, '#2b2140', 0, 1, 16, 15); px(c, '#9a9ab2', 1, 2, 14, 13); px(c, '#c2c2d6', 1, 2, 14, 2);
    px(c, '#6a6a84', 1, 8, 14, 1); px(c, '#6a6a84', 5, 2, 1, 6); px(c, '#6a6a84', 10, 9, 1, 6); px(c, '#55556e', 1, 13, 14, 2);
  });
```

- [ ] **Step 6: World：畫出來、互動、換樓層不重生**

在 `src/scenes/World.ts` 的 import 區：

把這行
```ts
  G, activeSymbols, addCoins, addExp, addItem, flag, giveMonster, hasAbility, healAll, saveGame, setFlag, spriteOf,
```
改成
```ts
  G, activeSymbols, addCoins, addExp, addItem, flag, giveMonster, hasAbility, healAll, itemCount, saveGame, setFlag, spriteOf,
```

把這行
```ts
import { defeatSpot, dockSpot, markArrival, visitedHubs } from '../core/travel';
```
改成
```ts
import { defeatSpot, dockSpot, markArrival, shouldRespawn, visitedHubs } from '../core/travel';
```

在 `visible()` 裡，`if (o.kind === 'gimmick' && o.vanish && flag(...)) return false;` 那一行後面加：

```ts
    if (o.kind === 'lockdoor' && flag(`k:${m}:${o.id}`)) return false; // 用鑰匙打開過的門就不見了
```

在 `refreshObjects()` 的 `switch (def.kind)` 裡，`case 'dock': ...` 那一行後面加：

```ts
        case 'stairs': spr = this.add.image(px, py, 'stairs').setOrigin(0).setDepth(depth); break;
        case 'lockdoor': spr = this.add.image(px, py, 'lockdoor').setOrigin(0).setDepth(depth); break;
        case 'barrier': spr = this.add.image(px, py, 'barrier').setOrigin(0).setDepth(depth); break;
```

在 `interact()` 的 `switch (d.kind)` 裡，`case 'dock': return this.useDock();` 那一行後面加：

```ts
      case 'stairs': await this.travel(d.to!.map, d.to!.x, d.to!.y); return;
      case 'lockdoor': return this.useLockdoor(o);
      case 'barrier': return say((d.lockText ?? ['路被擋住了。']).map((text) => ({ text })));
```

在 `useDock` 的註解（`/** 碼頭：列出去過的其他主島…`）**前面**加新方法：

```ts
  /** 鎖住的門：有小鑰匙就用掉一把打開，沒有就提示去找鑰匙 */
  private async useLockdoor(o: Obj) {
    const d = o.def;
    if (itemCount('key') < 1) return say((d.lockText ?? ['門鎖住了。', '要先找到小鑰匙。']).map((text) => ({ text })));
    addItem('key', -1);
    setFlag(`k:${this.map.id}:${d.id}`);
    this.refreshObjects();
    audio.sfx('chest');
    return say([{ text: '用小鑰匙打開了門！' }]);
  }

```

在 `travel()` 裡，把

```ts
    this.respawnWild(map);
```
改成
```ts
    if (shouldRespawn(this.map, MAPS[map])) this.respawnWild(map); // 洞窟的樓層之間走動不重生
```

在 `openChest()` 裡，找到這一行：

```ts
      lines.push(`還有 ${ITEMS[o.def.item].icon} ${ITEMS[o.def.item].name}！戰鬥時可以用。`);
```
改成
```ts
      const it = ITEMS[o.def.item];
      lines.push(it.key ? `還有 ${it.icon} ${it.name}！可以用來開鎖住的門。` : `還有 ${it.icon} ${it.name}！戰鬥時可以用。`);
```

- [ ] **Step 7: 執行測試、型別檢查、打包**

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 8: Commit**

```bash
git add src/data/maps.ts src/data/monsters.ts src/gfx/sprites.ts src/core/battleui.ts src/core/travel.ts src/scenes/World.ts tests/dungeon.test.ts
git commit -m "小鑰匙、樓梯、鎖門、擋路石牆；洞窟樓層之間走動不重生

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 迷宮驗證 `reachReport`

**Files:**
- Create: `src/core/dungeon.ts`
- Modify: `tests/dungeon.test.ts`（加驗證器的測試）

**Interfaces:**
- Consumes: Task 1 的 `fromAscii`／`Legend`；Task 2 的物件種類；現有 `abilityOf`、`BLOCKED_TILES`
- Produces（Task 4 會用）：
  ```ts
  export interface Cell { map: string; x: number; y: number }
  export interface Report {
    reached: Set<string>;               // 走得到的格子，key 是 `${map}:${x},${y}`
    unreachableFloor: string[];         // 應該走得到、但走不到的格子（同樣格式）
    unreachableObjects: string[];       // 走不到旁邊的物件，格式 `${map}/${id}`（不含怪物與有 showIf 的物件）
    keysLeft: number;                   // 全部走完之後手上剩幾把鑰匙
  }
  export function reachReport(floors: MapDef[], entry: Cell, abilities: string[]): Report;
  ```

模擬規則（要實作成這樣）：
- 從 `entry` 出發，只走非阻擋地形（`BLOCKED_TILES` 以外）、而且沒有「實心物件」的格子。
- **怪物不算擋路**（假設可以打倒）；有 `showIf` 的物件一律忽略（不擋路、不互動）。
- 實心物件：寶箱、樓梯、機關、NPC…一律實心；**會被移除**的是 裂石／落葉／迷霧／鎖門／會消失的機關（`vanish`）；石牆（`barrier`）在它的 `hideIf` 旗標被「已啟動的機關」設定後消失。
- 走到物件**旁邊**（上下左右任一格已走得到）才能互動：寶箱拿到物品（`item === 'key'` 就 +1 鑰匙）；鎖門有鑰匙就 −1 並移除；樓梯把目標格子加入走得到的範圍（目標地圖要在 `floors` 裡）；其他需要招式的物件（`abilityOf(o)` 有值）若 `abilities` 包含該招式就啟動（機關會設定 `g:<地圖>:<id>` 旗標、可移除的就移除）。
- 一直重複「走路 → 互動」直到沒有任何變化。

- [ ] **Step 1: 寫會失敗的測試**

在 `tests/dungeon.test.ts` 最上面的 import 區，改成：

```ts
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef, MapObj } from '../src/data/maps';
import { ITEMS } from '../src/data/monsters';
import { shouldRespawn } from '../src/core/travel';
import { fromAscii } from '../src/data/ascii';
import type { Legend } from '../src/data/ascii';
import { reachReport } from '../src/core/dungeon';
```

檔尾加：

```ts
/** 用文字圖造一層假的迷宮（測試用） */
const floor = (id: string, rows: string[], legend: Legend = {}, extra: MapObj[] = []): MapDef => {
  const f = fromAscii(rows, legend);
  return { id, name: id, w: f.w, h: f.h, tiles: f.tiles, start: { x: 1, y: 1 }, respawn: { x: 1, y: 1 }, objects: [...f.objects, ...extra], theme: 'valley', group: 'test' };
};
const at = (map: string, x: number, y: number) => ({ map, x, y });

describe('reachReport：迷宮驗證', () => {
  it('一條沒有機關的走廊，全部走得到', () => {
    const f = floor('t', ['######', '#....#', '######']);
    const r = reachReport([f], at('t', 1, 1), []);
    expect(r.unreachableFloor).toEqual([]);
    expect(r.unreachableObjects).toEqual([]);
  });

  describe('鑰匙與鎖門', () => {
    const legend: Legend = {
      K: { id: 'k', kind: 'chest', item: 'key' },
      D: { id: 'd', kind: 'lockdoor' },
      C: { id: 'c', kind: 'chest', item: 'potion' },
    };
    it('鑰匙在門前面：拿到鑰匙、開門、後面的寶箱走得到，鑰匙用掉了', () => {
      const f = floor('t', ['#########', '#..K#..C#', '#...D...#', '#########'], legend);
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.unreachableFloor).toEqual([]);
      expect(r.unreachableObjects).toEqual([]);
      expect(r.keysLeft).toBe(0);
    });
    it('鑰匙放在鎖門的後面（卡死）：鑰匙和後面的地方都走不到', () => {
      const f = floor('t', ['#########', '#..C#..K#', '#...D...#', '#########'], legend);
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.unreachableObjects).toContain('t/k');
      expect(r.unreachableFloor.length).toBeGreaterThan(0);
    });
    it('鑰匙不夠用（兩道門、只有一把鑰匙）：最後一個房間走不到', () => {
      // 三個房間排成一排，中間各隔一道鎖門；鑰匙只有一把，寶箱在最右邊的房間
      const f = floor('t', ['#############', '#..K#...#..C#', '#...D...E...#', '#############'], {
        ...legend,
        E: { id: 'e', kind: 'lockdoor' },
      });
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.keysLeft).toBe(0);
      expect(r.unreachableObjects).toContain('t/c');
      expect(r.unreachableFloor.length).toBeGreaterThan(0);
    });
  });

  describe('隱藏房間（用招式打通裂石）', () => {
    const f = floor('t', ['#######', '#..R..#', '#######'], { R: { id: 'r', kind: 'rock' } });
    it('沒學會爆破拳：裂石後面走不到', () => {
      const r = reachReport([f], at('t', 1, 1), []);
      expect(r.unreachableFloor.length).toBeGreaterThan(0);
    });
    it('學會爆破拳：全部走得到', () => {
      const r = reachReport([f], at('t', 1, 1), ['blast']);
      expect(r.unreachableFloor).toEqual([]);
    });
  });

  describe('機關開關與擋路石牆', () => {
    const f = floor('t', ['#########', '#...#...#', '#.W.B...#', '#...#...#', '#########'], {
      W: { id: 'sw', kind: 'gimmick', ability: 'drum', fx: 'drum' },
      B: { id: 'b', kind: 'barrier', hideIf: 'g:t:sw' },
    });
    it('沒學會擊鼓拳：石牆打不開，另一邊走不到', () => {
      expect(reachReport([f], at('t', 1, 1), []).unreachableFloor.length).toBeGreaterThan(0);
    });
    it('學會擊鼓拳：啟動開關、石牆消失，全部走得到', () => {
      const r = reachReport([f], at('t', 1, 1), ['drum']);
      expect(r.unreachableFloor).toEqual([]);
      expect(r.unreachableObjects).toEqual([]);
    });
  });

  describe('樓梯連到另一層', () => {
    const a = floor('a', ['#####', '#..>#', '#####'], { '>': { id: 'down', kind: 'stairs', to: { map: 'b', x: 1, y: 1 } } });
    const b = floor('b', ['#####', '#.C.#', '#####'], { C: { id: 'c', kind: 'chest', item: 'potion' } });
    it('走到樓梯旁，另一層的地方也走得到', () => {
      const r = reachReport([a, b], at('a', 1, 1), []);
      expect(r.unreachableFloor).toEqual([]);
      expect(r.unreachableObjects).toEqual([]);
    });
    it('只給第一層：樓梯的目標不在範圍內，不會當成走得到別層', () => {
      const r = reachReport([a], at('a', 1, 1), []);
      expect(r.reached.has('b:1,1')).toBe(false);
    });
  });

  it('怪物不算擋路；有 showIf 的物件被忽略', () => {
    const f = floor('t', ['#####', '#...#', '#####'], {}, [
      { id: 'm', kind: 'monster', x: 2, y: 1, battle: 'x' },
      { id: 'hid', kind: 'chest', x: 3, y: 1, showIf: 'someFlag' },
    ]);
    const r = reachReport([f], at('t', 1, 1), []);
    expect(r.unreachableFloor).toEqual([]);
    expect(r.unreachableObjects).toEqual([]);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/dungeon.test.ts`
Expected: FAIL（`../src/core/dungeon` 不存在）。

- [ ] **Step 3: 實作**

建立 `src/core/dungeon.ts`：

```ts
// 迷宮驗證（純函式，不依賴 Phaser）：模擬「走路、拿鑰匙、開鎖、用招式、踩樓梯」，
// 找出走不到的地板與物件，確保迷宮不會卡死。
import { BLOCKED_TILES, abilityOf } from '../data/maps';
import type { MapDef, MapObj } from '../data/maps';

export interface Cell { map: string; x: number; y: number }
export interface Report {
  /** 走得到的格子，key 是 `${map}:${x},${y}` */
  reached: Set<string>;
  /** 應該走得到、但走不到的格子（同樣格式）。被永久擋住的寶箱、樓梯所在格不算 */
  unreachableFloor: string[];
  /** 走不到旁邊的物件，格式 `${map}/${id}`。怪物（可以打倒）與有 showIf 的物件不算 */
  unreachableObjects: string[];
  /** 全部走完之後手上剩幾把鑰匙 */
  keysLeft: number;
}

const key = (map: string, x: number, y: number) => `${map}:${x},${y}`;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** 用對的招式／鑰匙之後會消失的物件種類 */
const REMOVABLE = new Set(['rock', 'leaves', 'fog', 'lockdoor']);
const removable = (o: MapObj) => REMOVABLE.has(o.kind) || (o.kind === 'gimmick' && !!o.vanish);

export function reachReport(floors: MapDef[], entry: Cell, abilities: string[]): Report {
  const byId = new Map(floors.map((f) => [f.id, f]));
  const opened = new Set<string>(); // 已經移除（打開）的物件 `${map}/${id}`
  const collected = new Set<string>(); // 已經打開的寶箱
  const switched = new Set<string>(); // 已啟動的機關旗標 `g:${map}:${id}`
  const reached = new Set<string>();
  const queue: Cell[] = [];
  let keys = 0;

  const ignored = (o: MapObj) => !!o.showIf || o.kind === 'monster';
  const isSolid = (f: MapDef, o: MapObj): boolean => {
    if (ignored(o)) return false;
    if (o.hideIf && switched.has(o.hideIf)) return false;
    if (removable(o) && opened.has(`${f.id}/${o.id}`)) return false;
    return true;
  };
  const solidAt = (f: MapDef, x: number, y: number) => f.objects.some((o) => o.x === x && o.y === y && isSolid(f, o));
  const walkable = (f: MapDef, x: number, y: number) => y >= 0 && x >= 0 && y < f.h && x < f.w && !BLOCKED_TILES.has(f.tiles[y][x]);

  const add = (c: Cell) => { const k = key(c.map, c.x, c.y); if (!reached.has(k)) { reached.add(k); queue.push(c); } };
  const flood = () => {
    while (queue.length) {
      const c = queue.pop()!;
      const f = byId.get(c.map)!;
      for (const [dx, dy] of N4) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!walkable(f, nx, ny) || solidAt(f, nx, ny)) continue;
        add({ map: c.map, x: nx, y: ny });
      }
    }
  };
  const near = (f: MapDef, o: MapObj) => N4.some(([dx, dy]) => reached.has(key(f.id, o.x + dx, o.y + dy)));

  add(entry);
  for (;;) {
    flood();
    let acted = false;
    for (const f of floors) {
      for (const o of f.objects) {
        const id = `${f.id}/${o.id}`;
        if (ignored(o) || !near(f, o)) continue;
        if (o.kind === 'chest') {
          if (!collected.has(id)) { collected.add(id); if (o.item === 'key') keys++; acted = true; }
        } else if (o.kind === 'lockdoor') {
          if (!opened.has(id) && keys > 0) { keys--; opened.add(id); acted = true; }
        } else if (o.kind === 'stairs') {
          const to = o.to;
          if (to && byId.has(to.map) && !reached.has(key(to.map, to.x, to.y))) { add(to); acted = true; }
        } else {
          const ability = abilityOf(o);
          if (ability && abilities.includes(ability) && !opened.has(id)) {
            opened.add(id);
            if (o.kind === 'gimmick') switched.add(`g:${f.id}:${o.id}`);
            acted = true;
          }
        }
      }
    }
    if (!acted && !queue.length) break;
  }

  const unreachableFloor: string[] = [];
  const unreachableObjects: string[] = [];
  for (const f of floors) {
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        if (!walkable(f, x, y) || reached.has(key(f.id, x, y))) continue;
        const o = f.objects.find((p) => p.x === x && p.y === y && !ignored(p));
        // 這格有永久擋路的物件（寶箱、樓梯、機關…）就不算「應該走得到」；可移除的（裂石、鎖門、石牆）要走得到
        if (o && !removable(o) && !o.hideIf) continue;
        unreachableFloor.push(key(f.id, x, y));
      }
    }
    for (const o of f.objects) if (!ignored(o) && !near(f, o)) unreachableObjects.push(`${f.id}/${o.id}`);
  }
  return { reached, unreachableFloor, unreachableObjects, keysLeft: keys };
}
```

- [ ] **Step 4: 執行，確認通過**

Run: `npx vitest run tests/dungeon.test.ts`
Expected: 全部 PASS。如果「鑰匙放在鎖門的後面（卡死）」或「鑰匙不夠用」失敗，先印出 `reachReport` 的結果看是模擬的哪一步不符，**修實作不要改測試的期望**（除了前面說明的整理 `f`／`g`）。

- [ ] **Step 5: 型別檢查與完整測試**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/core/dungeon.ts tests/dungeon.test.ts
git commit -m "新增迷宮驗證 reachReport（鑰匙、鎖門、機關、樓梯、招式的模擬）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 示範洞窟（兩層）與島上入口

**Files:**
- Modify: `src/data/maps.ts`（`import`、`dc1`、`dc2`、島上入口）
- Modify: `src/data/levels.ts`（兩場戰鬥）
- Modify: `tests/game.test.ts`（迷宮樓層不套用一般的「能走到所有物件旁」測試）
- Modify: `tests/dungeon.test.ts`（真實洞窟的驗證）

**Interfaces:**
- Consumes: Task 1 `fromAscii`；Task 2 物件種類與 `MapDef.group`；Task 3 `reachReport`
- Produces: `MAPS.dc1`、`MAPS.dc2`（`group: 'dc'`）；`MAPS.d` 新增物件 `cave`（`stairs`，要通過 `dPractice` 才看得到）；`BATTLES.dc1m`、`BATTLES.dc2m`

洞窟設計（這是起點版本；驗證器是裁判，需要時可以微調牆，但要保留下面的每一個元素）：

- **1 樓**：入口樓梯（回島）→ 左邊起點房 → 中間房（有一隻巡邏的怪）→ 往下通到鑰匙房（鑰匙寶箱，死路）→ 右邊房 → **鎖門** → 樓梯往 2 樓。起點房南邊有一顆**裂石**，打碎後是**隱藏房間**（藥水寶箱）。
- **2 樓**：入口樓梯（回 1 樓）→ 起點房 → 中間房（有一隻會追的怪）→ 右邊房有**機關開關**（擊鼓拳）→ 打開中間房南邊的**擋路石牆**，通到寶藏房（魔力果寶箱）。

- [ ] **Step 1: 寫會失敗的測試**

在 `tests/dungeon.test.ts` 檔尾加：

```ts
describe('示範洞窟（舌尖中音島的小迷宮）', () => {
  const dc1 = MAPS.dc1, dc2 = MAPS.dc2;
  it('兩層都存在、屬於同一個洞窟，島上有入口、兩層之間與回島的樓梯都對得上', () => {
    expect(dc1).toBeDefined();
    expect(dc2).toBeDefined();
    expect(dc1.group).toBe('dc');
    expect(dc2.group).toBe('dc');
    const cave = MAPS.d.objects.find((o) => o.id === 'cave')!;
    expect(cave.kind).toBe('stairs');
    expect(cave.showIf).toBe('dPractice');
    expect(cave.to).toEqual({ map: 'dc1', x: 2, y: 1 });
    expect(dc1.objects.find((o) => o.id === 'down')!.to!.map).toBe('dc2');
    expect(dc2.objects.find((o) => o.id === 'up')!.to!.map).toBe('dc1');
    expect(dc1.objects.find((o) => o.id === 'up')!.to!.map).toBe('d');
  });
  it('學會爆破拳和擊鼓拳之後：每個地方、每個物件都走得到，鑰匙剛好用完', () => {
    const r = reachReport([dc1, dc2], { map: 'dc1', x: 2, y: 1 }, ['blast', 'drum']);
    expect(r.unreachableFloor, r.unreachableFloor.join(' ')).toEqual([]);
    expect(r.unreachableObjects, r.unreachableObjects.join(' ')).toEqual([]);
    expect(r.keysLeft).toBe(0);
  });
  it('缺爆破拳：隱藏房間走不到；缺擊鼓拳：寶藏房走不到（證明這兩個元素真的有擋路）', () => {
    const noBlast = reachReport([dc1, dc2], { map: 'dc1', x: 2, y: 1 }, ['drum']);
    expect(noBlast.unreachableObjects).toContain('dc1/chest_f');
    const noDrum = reachReport([dc1, dc2], { map: 'dc1', x: 2, y: 1 }, ['blast']);
    expect(noDrum.unreachableObjects).toContain('dc2/chest_berry');
  });
  it('洞窟的怪物有自己的戰鬥與旗標，不會和島上的怪物共用', () => {
    const ms = [...dc1.objects, ...dc2.objects].filter((o) => o.kind === 'monster');
    expect(ms.length).toBeGreaterThanOrEqual(2);
    const flags = ms.map((o) => `m:${o.id === 'm1' ? 'dc1' : 'dc2'}:${o.id}`);
    for (const o of ms) {
      const b = BATTLES[o.battle!];
      expect(b, o.id).toBeDefined();
      expect(b.reward.flag.startsWith('m:dc'), `${o.id} 的旗標 ${b.reward.flag}`).toBe(true);
    }
    expect(new Set(flags).size).toBe(flags.length);
  });
  it('一隻巡邏、一隻追擊', () => {
    expect(dc1.objects.find((o) => o.id === 'm1')!.ai).toBe('patrol');
    expect(dc2.objects.find((o) => o.id === 'm2')!.ai).toBe('chase');
  });
});
```

並在 `tests/dungeon.test.ts` 最上面的 import 區加上一行（和其他 import 放在一起）：

```ts
import { BATTLES } from '../src/data/levels';
```

在 `tests/game.test.ts` 裡找到這一行：

```ts
    it(`${m.id}: 起點能走到所有一般物件旁`, () => {
```
在它的**下一行**（函式本體第一行）加上：

```ts
      if (m.group) return; // 迷宮樓層有鎖門、機關、裂石，由 tests/dungeon.test.ts 用模擬來驗證
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/dungeon.test.ts`
Expected: FAIL（`MAPS.dc1` 不存在）。

- [ ] **Step 3: 兩場戰鬥**

在 `src/data/levels.ts` 找到

```ts
  // 畢業區：風車草原，四個唇音全部複習
```
在它**前面**加：

```ts
  // 試煉洞窟（舌尖中音島的小迷宮）：怪物要有自己的旗標，不能和島上的 d1～d3 共用，否則會把島上的怪物打掉
  dc1m: wild('dc1m', 'crabby', 3, ['ㄉ', 'ㄊ'], ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'], 'm:dc1:m1'),
  dc2m: wild('dc2m', 'drippy', 3, ['ㄉ', 'ㄊ'], ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ'], 'm:dc2:m2'),
```

- [ ] **Step 4: 洞窟兩層與島上入口**

在 `src/data/maps.ts` 最上面的第一行註解（`// 地圖資料：以程式建構格子，再列出物件。新增關卡只要在這裡加一張地圖。`）之後加一行：

```ts
import { fromAscii } from './ascii';
```

在 `export const TILE_KEY: Record<string, string> = {` 的**前面**加：

```ts
// ───────── 試煉洞窟：階段 3 的小迷宮示範（兩層）─────────
// 文字圖：# 牆、. 地板、其他字元看圖例。每層 21×9。
const DC1 = fromAscii([
  '#####################',
  '#<....##.....##.....#',
  '#...................#',
  '#.....##.....##.....#',
  '###R######.######D###',
  '#.....##.....##.....#',
  '#.....##.....##.....#',
  '#..C..##..K..##..>..#',
  '#####################',
], {
  '<': { id: 'up', kind: 'stairs', to: { map: 'd', x: 3, y: 4 }, label: '出口' },
  '>': { id: 'down', kind: 'stairs', to: { map: 'dc2', x: 2, y: 1 }, label: '往下' },
  R: { id: 'rock_f', kind: 'rock' },
  C: { id: 'chest_f', kind: 'chest', item: 'potion' },
  K: { id: 'chest_key', kind: 'chest', item: 'key' },
  D: { id: 'door', kind: 'lockdoor', lockText: ['門被鎖住了。', '要先找到小鑰匙。'] },
});
MAPS.dc1 = {
  id: 'dc1', name: '試煉洞窟 1F', w: DC1.w, h: DC1.h, tiles: DC1.tiles, theme: 'valley', group: 'dc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: [...DC1.objects, { id: 'm1', kind: 'monster', x: 9, y: 1, battle: 'dc1m', ai: 'patrol', patrol: [{ x: 10, y: 1 }, { x: 11, y: 1 }] }],
};
const DC2 = fromAscii([
  '#####################',
  '#<....##.....##.....#',
  '#...................#',
  '#.....##...H.##..W..#',
  '##########B##########',
  '########.....########',
  '########.....########',
  '########..C..########',
  '#####################',
], {
  '<': { id: 'up', kind: 'stairs', to: { map: 'dc1', x: 17, y: 6 }, label: '回 1 樓' },
  H: { id: 'm2', kind: 'monster', battle: 'dc2m', ai: 'chase' },
  W: {
    id: 'switch1', kind: 'gimmick', sprite: 'drum_big', ability: 'drum', fx: 'drum',
    lockText: ['一面大鼓。', '用「ㄉ」的力氣敲下去，也許會有回音……'],
    hitText: ['夥伴舌尖一彈「ㄉ」，大鼓「咚！」地響了！', '遠處傳來「轟隆」一聲，好像有一道牆打開了！'],
    doneText: ['大鼓還在「咚咚」地輕輕回響。'],
  },
  B: { id: 'barrier1', kind: 'barrier', hideIf: 'g:dc2:switch1', lockText: ['一道石牆擋住了路。', '好像有什麼機關可以打開它……'] },
  C: { id: 'chest_berry', kind: 'chest', item: 'berry' },
});
MAPS.dc2 = {
  id: 'dc2', name: '試煉洞窟 2F', w: DC2.w, h: DC2.h, tiles: DC2.tiles, theme: 'valley', group: 'dc',
  start: { x: 2, y: 1 }, respawn: { x: 2, y: 1 },
  objects: DC2.objects,
};

```

在 `MAPS.d` 的物件列表裡，找到這一行：

```ts
    { id: 'exit', kind: 'exit', x: 4, y: 18, to: { map: 'village', x: 10, y: 15 }, label: '回村' },
```
在它**後面**加：

```ts
    { id: 'cave', kind: 'stairs', x: 3, y: 3, to: { map: 'dc1', x: 2, y: 1 }, label: '洞窟', showIf: 'dPractice' },
```

- [ ] **Step 5: 執行測試、型別檢查、打包**

Run: `npx vitest run`
Expected: 全部 PASS。如果示範洞窟的驗證失敗，訊息會列出走不到的格子或物件：**只微調那一層的文字圖（牆與門的位置）**，保留所有元素（隱藏房間、鑰匙與鎖門、機關與石牆、兩層樓梯、一隻巡邏一隻追擊），重跑直到通過；調整寫進報告。**不要**改驗證器來讓它通過。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 6: Commit**

```bash
git add src/data/maps.ts src/data/levels.ts tests/game.test.ts tests/dungeon.test.ts
git commit -m "示範洞窟：兩層小迷宮（隱藏房間、鑰匙與鎖門、機關與石牆、樓梯），島上加入口

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 端對端：走一遍洞窟

**Files:**
- Modify: `tests/e2e/play.mjs`

**Interfaces:**
- Consumes: Task 4 的洞窟（物件座標見下）

機器人預設把「怪物會走動」與「寫字挑戰」關掉（已經是這樣），所以洞窟裡的怪物不動、機關與裂石直接點就會啟動。端對端**不在本機跑**，由控制端交給 GitHub Actions。

洞窟的座標（1 樓 `dc1`、2 樓 `dc2`）：
- 島上入口 `cave`：(3,3)；進 1 樓後落在 (2,1)。
- 1 樓：裂石 `rock_f` (3,4)、藥水寶箱 `chest_f` (3,7)、鑰匙寶箱 `chest_key` (10,7)、鎖門 `door` (17,4)、往下樓梯 `down` (17,7)、回島樓梯 `up` (1,1)。
- 2 樓：往上樓梯 `up` (1,1)、機關開關 `switch1` (17,3)、擋路石牆 `barrier1` (10,4)、魔力果寶箱 `chest_berry` (10,7)。

- [ ] **Step 1: 加洞窟流程**

在 `tests/e2e/play.mjs` 找到島上的最後一步（打完鼓王、水壩和泡泡球之後、回村之前）：

```js
log('✓ 流水衝沖開水壩、嗯嗯泡飄走泡泡球，各取得寶箱');
```

在它**後面**加：

```js
// ───── 試煉洞窟（階段 3 的迷宮元件）─────
await doTap(3, 3, '洞窟入口');
if ((await save()).mapId !== 'dc1') throw new Error('沒有進入洞窟 1 樓');
await snap('cave-1f');
await doTap(3, 4, '裂石（爆破拳）'); await doTap(3, 7, '隱藏房間的寶箱');
f = await flags();
if (!f['r:dc1:rock_f'] || !f['c:dc1:chest_f']) throw new Error('洞窟的裂石／隱藏寶箱失敗 ' + JSON.stringify(f));
await doTap(10, 7, '鑰匙寶箱');
if (((await save()).items.key ?? 0) !== 1) throw new Error('沒有拿到小鑰匙');
await doTap(17, 4, '鎖住的門');
f = await flags();
if (!f['k:dc1:door'] || ((await save()).items.key ?? 0) !== 0) throw new Error('鎖門沒有打開、或鑰匙沒有用掉 ' + JSON.stringify(f));
log('✓ 洞窟 1 樓：打碎裂石、拿到小鑰匙、用鑰匙開了鎖門');
await doTap(17, 7, '往 2 樓的樓梯');
if ((await save()).mapId !== 'dc2') throw new Error('沒有走到洞窟 2 樓');
await snap('cave-2f');
await doTap(17, 3, '機關開關（擊鼓拳）');
f = await flags();
if (!f['g:dc2:switch1']) throw new Error('2 樓的機關沒有啟動');
await doTap(10, 7, '石牆後的寶箱');
f = await flags();
if (!f['c:dc2:chest_berry']) throw new Error('石牆打開後拿不到魔力果寶箱');
log('✓ 洞窟 2 樓：啟動機關、石牆消失、取得寶箱');
await doTap(1, 1, '回 1 樓的樓梯');
if ((await save()).mapId !== 'dc1') throw new Error('沒有回到洞窟 1 樓');
await doTap(1, 1, '回島的樓梯');
if ((await save()).mapId !== 'd') throw new Error('沒有走回舌尖中音島');
log('✓ 洞窟：樓層之間來回、走回島上');
```

（這一步用到的 `doTap`、`flags`、`save`、`snap`、`log` 都已經存在；`flags()`／`save()` 取的是遊戲內的存檔。小怪不動、也不會被點到。如果 `doTap` 找不到路，檢查該格是否被怪物擋住，並在報告裡說明。）

- [ ] **Step 2: 語法檢查**

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出。

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/play.mjs
git commit -m "端對端：走一遍試煉洞窟（鑰匙與鎖門、機關與石牆、樓梯、隱藏房間）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 進洞窟**

Run: `npm run dev`；到舌尖中音島，練習戰（稻草布偶）之後，島的左上角會出現一個樓梯口（洞窟入口）。Expected：點它進入「試煉洞窟 1F」。

- [ ] **Step 2: 1 樓**

Expected：
- 起點旁邊的出口樓梯可以回島。
- 起點房南邊有一顆裂石，打碎後（會要求寫 ㄅ）是隱藏房間，有藥水寶箱。
- 中間房有一隻怪在巡邏；往下走到鑰匙房，打開寶箱會拿到 🗝️ 小鑰匙（說明是「可以用來開鎖住的門」）。
- 右邊房的鎖門：沒鑰匙時說「門被鎖住了」；有鑰匙就打開，鑰匙用掉。
- 戰鬥中的「道具」清單不會出現小鑰匙。

- [ ] **Step 3: 2 樓**

Expected：往下的樓梯通到 2 樓；中間房有一隻會追你的怪；右邊房的大鼓（擊鼓拳，要寫 ㄉ）敲了之後，中間房南邊的石牆消失，後面的房間有魔力果寶箱。

- [ ] **Step 4: 樓層之間走動不重生**

Expected：打倒 1 樓的巡邏怪後，上下樓梯來回，那隻怪**不會**重生；離開洞窟回到島上、再進洞窟，怪物才會重生。

- [ ] **Step 5: 迷路程度**

Expected：這座小迷宮對孩子來說會不會太容易或太難、岔路與死路夠不夠明顯；這是之後做大迷宮（每層約 40×30）的依據，請告訴我感受。

---

## Self-Review（對照規格）

- **文字圖**：Task 1（`fromAscii`），Task 4 用它蓋兩層。
- **多層、樓梯**：Task 2（`stairs`，每層獨立地圖）、Task 4（`dc1`、`dc2`）。
- **鑰匙與機關門**：Task 2（小鑰匙、`lockdoor`、`barrier`）；機關開關沿用 `gimmick`（Task 4 的 `switch1`），要寫字沿用現有 `castWrite`。
- **隱藏房間與捷徑**：Task 4（`rock_f` 打通的隱藏房間；機關打開石牆形成新通道）。捷徑用同一組元件（機關＋石牆，旗標是全域的，可以跨樓層），驗證器的測試涵蓋跨層樓梯。
- **同洞窟樓層不重生**：Task 2（`shouldRespawn`＋ World `travel`）。
- **迷宮驗證（不會卡死）**：Task 3（`reachReport`；抓得到缺招式、鑰匙在鎖門後、鑰匙不夠、被牆圍住）、Task 4（真實洞窟必須通過）。
- **鑰匙不能買、不能在戰鬥用**：Task 2（`ItemDef.key`、戰鬥道具清單過濾、商店只列有價格的）。
- **第 0 關與島的現有行為不變**：島上只新增一個 `showIf: 'dPractice'` 的入口；Task 4 的一般地圖測試只對 `group` 地圖跳過。
- **未涵蓋（屬於後續階段）**：旅館與主島模板、用這套零件重做舌尖中音島與每層約 40×30 的大迷宮（階段 4）。

型別一致性：`fromAscii`／`Legend` 在 Task 1 定義，Task 3、4 使用；`ObjKind` 的 `stairs`/`lockdoor`/`barrier` 與 `MapDef.group` 在 Task 2 定義，Task 3、4 使用；`reachReport` 在 Task 3 定義，Task 4 使用；`shouldRespawn` 在 Task 2 定義並由 World 使用；物件 id（`up`、`down`、`rock_f`、`chest_f`、`chest_key`、`door`、`m1`、`switch1`、`barrier1`、`chest_berry`、`m2`）在 Task 4 定義，Task 4 的測試與 Task 5 的端對端使用。
